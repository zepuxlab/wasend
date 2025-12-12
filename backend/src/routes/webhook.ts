import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { db, dbSupabase } from '../services/supabase';
import { MetaWebhookMessage, MetaWebhookStatus } from '../types';
import { zohoService } from '../services/zoho';

const router = Router();

// GET /api/webhook - Верификация вебхука
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST /api/webhook - Получение событий от Meta
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Meta требует быстрый ответ (200 OK)
    res.status(200).send('OK');

    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Обработка входящих сообщений
        if (value.messages) {
          for (const message of value.messages as MetaWebhookMessage[]) {
            await handleIncomingMessage(message);
          }
        }

        // Обработка статусов сообщений
        if (value.statuses) {
          for (const status of value.statuses as MetaWebhookStatus[]) {
            await handleMessageStatus(status);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    return next(error);
  }
});

async function handleIncomingMessage(message: MetaWebhookMessage) {
  try {
    const phone = message.from;
    const content = message.text?.body || '';
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    console.log(`[Webhook] Processing incoming message from ${phone}, content: ${content.substring(0, 50)}...`);

    // Найти или создать контакт
    // Автоматически созданные контакты имеют opt_in: false, чтобы не попадать в рассылки
    // Для рассылок контакты должны быть добавлены вручную через админку
    let contact = await db.contacts.findByPhone(phone);
    if (!contact) {
      console.log(`[Webhook] Contact not found for ${phone}, creating contact for chat only (opt_in: false)`);
      contact = await db.contacts.create({
        phone,
        opt_in: false, // Автоматически созданные контакты не для рассылок
      });
      console.log(`[Webhook] Created contact ${contact.id} for phone ${phone} (chat only, not for campaigns)`);
    } else {
      console.log(`[Webhook] Found existing contact ${contact.id} for phone ${phone}`);
    }

    // Найти или создать чат
    let chat = await db.chats.findByContactId(contact.id);
    if (!chat) {
      console.log(`[Webhook] Chat not found for contact ${contact.id}, creating new chat`);
      chat = await db.chats.create({
        contact_id: contact.id,
        status: 'open',
        last_message_at: timestamp.toISOString(),
        reply_window_expires_at: new Date(
          timestamp.getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
      });
      console.log(`[Webhook] Created chat ${chat.id} for contact ${contact.id}`);
    } else {
      console.log(`[Webhook] Found existing chat ${chat.id} for contact ${contact.id}`);
      // Обновить окно ответа (+24 часа)
      await db.chats.update(chat.id, {
        last_message_at: timestamp.toISOString(),
        reply_window_expires_at: new Date(
          timestamp.getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
        status: 'open',
      });
    }

    // Сохранить сообщение
    console.log(`[Webhook] Saving message to chat ${chat.id}`);
    const savedMessage = await db.messages.create({
      chat_id: chat.id,
      direction: 'inbound',
      message_type: message.type as any,
      content,
      whatsapp_message_id: message.id,
      created_at: timestamp.toISOString(),
    });
    console.log(`[Webhook] Saved message ${savedMessage.id} to chat ${chat.id}`);

    // Синхронизировать с Zoho только для новых сообщений (не из рассылок)
    // Сообщения из рассылок синхронизируются в messageWorker.ts
    // Входящие сообщения тоже синхронизируем для полноты истории
    if (config.zoho.enabled) {
      zohoService.syncMessage({
        phone: contact.phone,
        message: content,
        direction: 'inbound',
        timestamp: timestamp,
        contactName: contact.name,
        chatId: chat.id, // Добавляем chatId для создания ссылки
      }).catch((error) => {
        console.error('Zoho sync error (non-blocking):', error);
      });
    }

    // Создать уведомление для всех пользователей (или можно фильтровать по ролям)
    // Получаем всех пользователей с ролями admin и manager
    const { data: users } = await dbSupabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager']);
    
    if (users && users.length > 0) {
      const contactName = contact.name || contact.phone;
      for (const user of users) {
        await db.notifications.create({
          user_id: user.user_id,
          chat_id: chat.id,
          contact_id: contact.id,
          message_id: savedMessage.id,
          type: 'new_message',
          title: `New message from ${contactName}`,
          message: content.length > 100 ? content.substring(0, 100) + '...' : content,
          read: false,
        });
      }
    }
  } catch (error: any) {
    console.error('[Webhook] Error handling incoming message:', error);
    console.error('[Webhook] Error details:', {
      message: error.message,
      stack: error.stack,
      phone: message?.from,
      messageId: message?.id,
    });
  }
}

async function handleMessageStatus(status: MetaWebhookStatus) {
  try {
    // Найти получателя по whatsapp_message_id
    const recipient = await db.campaignRecipients.findByWhatsappMessageId(
      status.id
    );

    if (!recipient) {
      return; // Сообщение не из кампании
    }

    const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
    const updates: any = {};

    switch (status.status) {
      case 'sent':
        updates.status = 'sent';
        updates.sent_at = timestamp;
        await db.campaigns.increment(recipient.campaign_id, 'sent_count');
        break;
      case 'delivered':
        updates.status = 'delivered';
        updates.delivered_at = timestamp;
        await db.campaigns.increment(recipient.campaign_id, 'delivered_count');
        break;
      case 'read':
        updates.status = 'read';
        updates.read_at = timestamp;
        await db.campaigns.increment(recipient.campaign_id, 'read_count');
        break;
      case 'failed':
        updates.status = 'failed';
        updates.error_message = 'Message failed';
        await db.campaigns.increment(recipient.campaign_id, 'failed_count');
        break;
    }

    if (Object.keys(updates).length > 0) {
      await db.campaignRecipients.update(recipient.id, updates);
    }
  } catch (error) {
    console.error('Error handling message status:', error);
  }
}

// POST /api/webhook/test-incoming - Тестовый endpoint для имитации входящего сообщения
router.post(
  '/test-incoming',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, message, name } = req.body;

      if (!phone || !message) {
        return res.status(400).json({
          error: true,
          message: 'Phone and message are required',
          code: 'VALIDATION_ERROR',
        });
      }

      // Создаем тестовое сообщение в формате Meta Webhook с текущим временем
      const testMessage: MetaWebhookMessage = {
        from: phone,
        id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: Math.floor(Date.now() / 1000).toString(), // Текущее время
        type: 'text',
        text: {
          body: message,
        },
      };

      // Обрабатываем как входящее сообщение (оно продлит окно ответа на 24 часа)
      await handleIncomingMessage(testMessage);

      // Если указано имя, обновляем контакт
      if (name) {
        const contact = await db.contacts.findByPhone(phone);
        if (contact) {
          await db.contacts.update(contact.id, { name });
        }
      }

      res.json({
        success: true,
        message: 'Test incoming message created',
        phone,
        message_text: message,
        note: 'Reply window extended for 24 hours',
      });
    } catch (error: any) {
      console.error('Error creating test incoming message:', error);
      return next(error);
    }
  }
);

// POST /api/webhook/test-outbound - Тестовый endpoint для имитации отправки сообщения (как из рассылки)
// Это позволяет протестировать полный цикл: отправка -> ответ -> обработка ответа
router.post(
  '/test-outbound',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, message, template_name } = req.body;

      if (!phone || (!message && !template_name)) {
        return res.status(400).json({
          error: true,
          message: 'Phone and message (or template_name) are required',
          code: 'VALIDATION_ERROR',
        });
      }

      // Найти или создать контакт
      let contact = await db.contacts.findByPhone(phone);
      if (!contact) {
        // Для теста создаем контакт с opt_in: true
        contact = await db.contacts.create({
          phone,
          opt_in: true,
        });
      }

      // Найти или создать чат
      const now = new Date();
      let chat = await db.chats.findByContactId(contact.id);
      if (!chat) {
        chat = await db.chats.create({
          contact_id: contact.id,
          status: 'open',
          last_message_at: now.toISOString(),
          reply_window_expires_at: new Date(
            now.getTime() + 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      } else {
        // Продлить окно ответа
        await db.chats.update(chat.id, {
          last_message_at: now.toISOString(),
          reply_window_expires_at: new Date(
            now.getTime() + 24 * 60 * 60 * 1000
          ).toISOString(),
          status: 'open',
        });
      }

      // Сохранить исходящее сообщение (имитация отправки из рассылки)
      const savedMessage = await db.messages.create({
        chat_id: chat.id,
        direction: 'outbound',
        message_type: template_name ? 'template' : 'text',
        content: message || template_name || '',
        template_name: template_name || undefined,
        whatsapp_message_id: `test_outbound_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'sent',
        created_at: now.toISOString(),
      });

      res.json({
        success: true,
        message: 'Test outbound message created (simulating campaign send)',
        phone,
        chat_id: chat.id,
        message_id: savedMessage.id,
        reply_window_expires_at: chat.reply_window_expires_at,
        note: 'Now you can send a reply using /test-incoming to simulate user response',
      });
    } catch (error: any) {
      console.error('Error creating test outbound message:', error);
      return next(error);
    }
  }
);

export default router;

