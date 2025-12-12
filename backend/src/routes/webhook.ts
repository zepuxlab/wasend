import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { db, dbSupabase } from '../services/supabase';
import { MetaWebhookMessage, MetaWebhookStatus } from '../types';

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

    // Найти или создать контакт
    let contact = await db.contacts.findByPhone(phone);
    if (!contact) {
      contact = await db.contacts.create({
        phone,
        opt_in: true,
      });
    }

    // Найти или создать чат
    let chat = await db.chats.findByContactId(contact.id);
    if (!chat) {
      chat = await db.chats.create({
        contact_id: contact.id,
        status: 'open',
        last_message_at: timestamp.toISOString(),
        reply_window_expires_at: new Date(
          timestamp.getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    } else {
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
    const savedMessage = await db.messages.create({
      chat_id: chat.id,
      direction: 'inbound',
      message_type: message.type as any,
      content,
      whatsapp_message_id: message.id,
      created_at: timestamp.toISOString(),
    });

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
  } catch (error) {
    console.error('Error handling incoming message:', error);
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

export default router;

