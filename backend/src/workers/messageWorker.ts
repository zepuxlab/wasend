import { Worker, Job } from 'bullmq';
import { db } from '../services/supabase';
import { metaApi, buildTemplateComponents } from '../services/metaApi';
import { connection } from '../services/queue';
import { config } from '../config/env';
import { zohoService } from '../services/zoho';

interface MessageJobData {
  recipientId: string;
  campaignId: string;
}

export const messageWorker = new Worker<MessageJobData>(
  'message-sending',
  async (job: Job<MessageJobData>) => {
    const { recipientId, campaignId } = job.data;

    try {
      // 0. Проверить статус кампании - если остановлена/удалена, пропустить задачу
      const campaign = await db.campaigns.findById(campaignId);
      if (!campaign) {
        // Кампания удалена - обновить статус получателя и пропустить
        try {
          await db.campaignRecipients.update(recipientId, {
            status: 'failed',
            error_message: 'Campaign was deleted',
          });
        } catch (e) {
          // Игнорировать ошибки обновления
        }
        return { success: false, skipped: true, reason: 'Campaign deleted' };
      }

      if (campaign.status === 'stopped' || campaign.status === 'failed' || campaign.status === 'completed') {
        // Кампания остановлена - обновить статус получателя и пропустить
        try {
          await db.campaignRecipients.update(recipientId, {
            status: 'pending',
            error_message: `Campaign ${campaign.status}`,
          });
        } catch (e) {
          // Игнорировать ошибки обновления
        }
        return { success: false, skipped: true, reason: `Campaign ${campaign.status}` };
      }

      // 1. Получить данные получателя
      const recipient = await db.campaignRecipients.findById(recipientId);
      if (!recipient) {
        return { success: false, error: 'Recipient not found' };
      }

      const template = await db.templates.findById(campaign.template_id);
      if (!template) {
        throw new Error('Template not found');
      }

      const contact = await db.contacts.findById(recipient.contact_id);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // 2. Подготовить переменные
      const variables: Record<string, string> = {};
      for (const [placeholder, field] of Object.entries(
        campaign.variable_mapping
      )) {
        const fieldName = field as string;
        variables[placeholder] =
          (contact as any)[fieldName] ||
          contact.custom_fields?.[fieldName] ||
          '';
      }

      // 3. Построить components для шаблона
      const components = buildTemplateComponents(
        template.components,
        variables
      );

      // 4. Финальная проверка opt_in перед отправкой (дополнительная защита)
      if (!contact.opt_in) {
        throw new Error('Contact has not opted in - message not sent');
      }

      // 5. Отправить шаблон через Meta API (MARKETING шаблоны всегда платные)
      const response = await metaApi.sendTemplateMessage({
        to: contact.phone,
        template: template.name,
        language: template.language,
        components,
      });

      // 6. Обновить или создать чат и продлить окно ответа (для будущих бесплатных текстовых сообщений)
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
        await db.chats.update(chat.id, {
          last_message_at: now.toISOString(),
          reply_window_expires_at: new Date(
            now.getTime() + 24 * 60 * 60 * 1000
          ).toISOString(),
          status: 'open',
        });
      }

      // 7. Сохранить сообщение в чат
      await db.messages.create({
        chat_id: chat.id,
        direction: 'outbound',
        message_type: 'template',
        content: template.name,
        whatsapp_message_id: response.messages?.[0]?.id,
        template_name: template.name,
        status: 'sent',
        created_at: now.toISOString(),
      });

      // 8. Обновить статус получателя
      await db.campaignRecipients.update(recipientId, {
        status: 'sent',
        whatsapp_message_id: response.messages?.[0]?.id,
        sent_at: now.toISOString(),
      });

      // 9. Обновить счетчики кампании
      await db.campaigns.increment(campaignId, 'sent_count');

      // 9.1. Проверить, завершена ли кампания (все сообщения отправлены или провалились)
      const updatedCampaign = await db.campaigns.findById(campaignId);
      if (updatedCampaign) {
        const totalProcessed = (updatedCampaign.sent_count || 0) + (updatedCampaign.failed_count || 0);
        if (totalProcessed >= updatedCampaign.total_recipients && updatedCampaign.status === 'running') {
          // Все сообщения обработаны - завершить кампанию
          await db.campaigns.update(campaignId, {
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
          console.log(`Campaign ${campaignId} completed: ${updatedCampaign.sent_count} sent, ${updatedCampaign.failed_count} failed out of ${updatedCampaign.total_recipients} total`);
        }
      }

                  // 10. Записать в лог
                  await db.activityLogs.create({
                    campaign_id: campaignId,
                    contact_id: contact.id,
                    action: 'message_sent',
                    phone: contact.phone,
                    details: {
                      message_type: 'template',
                      template_category: template.category,
                    },
                  });

                  // 11. Не синхронизируем исходящие сообщения из рассылок с Zoho
                  // Они появляются автоматически через нативную интеграцию Zoho
                  // Синхронизируем только входящие сообщения (inbound) в webhook.ts

                  // Возвращаем простой объект для BullMQ (избегаем вложенных объектов)
                  const messageId = response?.messages?.[0]?.id || null;
                  return { 
                    success: true, 
                    messageId: messageId || undefined 
                  };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.response?.data?.error?.code;
      
      // Критические ошибки Meta API - остановить кампанию
      const criticalErrors = [
        'RATE_LIMIT_HIT',
        'TOO_MANY_REQUESTS',
        'INVALID_OAUTH_ACCESS_TOKEN',
        'PHONE_NUMBER_NOT_OWNED',
      ];

      if (errorCode && criticalErrors.includes(errorCode)) {
        // Остановить кампанию при критических ошибках
        await db.campaigns.update(campaignId, {
          status: 'stopped',
          error_message: `Campaign stopped due to critical error: ${errorMessage}`,
        });
        
        // Записать критическую ошибку в лог
        await db.activityLogs.create({
          campaign_id: campaignId,
          action: 'campaign_stopped_critical_error',
          error: errorMessage,
          details: { error_code: errorCode },
        });
      }

      // Обновить статус на failed
      await db.campaignRecipients.update(recipientId, {
        status: 'failed',
        error_message: errorMessage,
      });

      // Обновить счетчик ошибок
      await db.campaigns.increment(campaignId, 'failed_count');

      // Проверить, завершена ли кампания (все сообщения отправлены или провалились)
      const updatedCampaign = await db.campaigns.findById(campaignId);
      if (updatedCampaign) {
        const totalProcessed = (updatedCampaign.sent_count || 0) + (updatedCampaign.failed_count || 0);
        if (totalProcessed >= updatedCampaign.total_recipients && updatedCampaign.status === 'running') {
          // Все сообщения обработаны - завершить кампанию
          await db.campaigns.update(campaignId, {
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
          console.log(`Campaign ${campaignId} completed: ${updatedCampaign.sent_count} sent, ${updatedCampaign.failed_count} failed out of ${updatedCampaign.total_recipients} total`);
        }
      }

      // Записать в лог
      try {
        const recipient = await db.campaignRecipients.findById(recipientId);
        const contact = await db.contacts.findById(recipient.contact_id);
        await db.activityLogs.create({
          campaign_id: campaignId,
          contact_id: contact.id,
          action: 'message_failed',
          phone: contact.phone,
          error: errorMessage,
          details: { error_code: errorCode },
        });
      } catch (logError) {
        // Игнорировать ошибки логирования
        console.error('Failed to log error:', logError);
      }

      // Не бросать ошибку для некритических случаев, чтобы не останавливать всю очередь
      if (errorCode && criticalErrors.includes(errorCode)) {
        throw error; // Бросить только критические ошибки
      }
      
      // Для остальных ошибок просто вернуть неудачу
      // Убеждаемся, что возвращаем простой объект для BullMQ
      return { 
        success: false, 
        error: errorMessage.substring(0, 200) // Ограничиваем длину для сериализации
      };
    }
  },
  {
    connection,
    concurrency: 5, // Обрабатывать до 5 сообщений одновременно
    limiter: {
      max: 50, // Максимум 50 сообщений
      duration: 60000, // за 60 секунд (для соблюдения rate limits)
    },
  }
);

// Обработка событий воркера
messageWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

messageWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

messageWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Message worker started');

