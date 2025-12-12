import { Worker, Job } from 'bullmq';
import { config } from '../config/env';
import Redis from 'ioredis';
import { db } from '../services/supabase';
import { metaApi, buildTemplateComponents } from '../services/metaApi';

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, // Требуется для BullMQ
});

interface MessageJobData {
  recipientId: string;
  campaignId: string;
}

export const messageWorker = new Worker<MessageJobData>(
  'message-sending',
  async (job: Job<MessageJobData>) => {
    const { recipientId, campaignId } = job.data;

    try {
      // 1. Получить данные получателя
      const recipient = await db.campaignRecipients.findById(recipientId);
      const campaign = await db.campaigns.findById(campaignId);
      const template = await db.templates.findById(campaign.template_id);
      const contact = await db.contacts.findById(recipient.contact_id);

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

      // 4. Отправить через Meta API
      const response = await metaApi.sendTemplateMessage({
        to: contact.phone,
        template: template.name,
        language: template.language,
        components,
      });

      // 5. Обновить статус получателя
      await db.campaignRecipients.update(recipientId, {
        status: 'sent',
        whatsapp_message_id: response.messages?.[0]?.id,
        sent_at: new Date().toISOString(),
      });

      // 6. Обновить счетчики кампании
      await db.campaigns.increment(campaignId, 'sent_count');

      // 7. Записать в лог
      await db.activityLogs.create({
        campaign_id: campaignId,
        contact_id: contact.id,
        action: 'message_sent',
        phone: contact.phone,
      });

      return { success: true, messageId: response.messages?.[0]?.id };
    } catch (error: any) {
      // Обновить статус на failed
      await db.campaignRecipients.update(recipientId, {
        status: 'failed',
        error_message: error.message || 'Unknown error',
      });

      // Обновить счетчик ошибок
      await db.campaigns.increment(campaignId, 'failed_count');

      // Записать в лог
      const recipient = await db.campaignRecipients.findById(recipientId);
      const contact = await db.contacts.findById(recipient.contact_id);
      await db.activityLogs.create({
        campaign_id: campaignId,
        contact_id: contact.id,
        action: 'message_failed',
        phone: contact.phone,
        metadata: { error: error.message },
      });

      throw error;
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

