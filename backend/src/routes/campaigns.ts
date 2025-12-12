import { Router, Request, Response, NextFunction } from 'express';
import { db, dbSupabase } from '../services/supabase';
import { messageQueue, queueUtils } from '../services/queue';
import { z } from 'zod';

const router = Router();

// Схемы валидации
const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  template_id: z.string().uuid(),
  variable_mapping: z.record(z.string()),
  contact_list_id: z.string().uuid().optional(),
  contact_ids: z.array(z.string().uuid()).optional(),
  contact_tags: z.array(z.string()).optional(),
  // rate_limit убран - теперь берется из настроек
}).refine(
  (data) => {
    // Должен быть указан хотя бы один способ выбора контактов
    return (
      (data.contact_list_id !== undefined && data.contact_list_id !== null) ||
      (data.contact_ids !== undefined && data.contact_ids !== null && data.contact_ids.length > 0) ||
      (data.contact_tags !== undefined && data.contact_tags !== null && data.contact_tags.length > 0)
    );
  },
  {
    message: 'Must provide contact_list_id, contact_ids, or contact_tags',
    path: ['contact_list_id'], // Указываем путь для ошибки
  }
);

// GET /api/campaigns - Получить все кампании
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await db.campaigns.findAll();
    res.json(campaigns);
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/campaigns/:id - Получить кампанию по ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const campaign = await db.campaigns.findById(id);
    res.json(campaign);
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: true,
        message: 'Campaign not found',
        code: 'NOT_FOUND',
      });
    }
    return next(error);
  }
});

// GET /api/campaigns/:id/stats - Получить статистику кампании
router.get(
  '/:id/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const recipients = await db.campaignRecipients.findByCampaignId(id);

      const stats = {
        total_recipients: recipients.length,
        pending: recipients.filter((r) => r.status === 'pending').length,
        queued: recipients.filter((r) => r.status === 'queued').length,
        sent: recipients.filter((r) => r.status === 'sent').length,
        delivered: recipients.filter((r) => r.status === 'delivered').length,
        read: recipients.filter((r) => r.status === 'read').length,
        failed: recipients.filter((r) => r.status === 'failed').length,
        progress_percent: 0,
      };

      if (stats.total_recipients > 0) {
        stats.progress_percent = Math.round(
          ((stats.sent + stats.delivered + stats.read + stats.failed) /
            stats.total_recipients) *
            100
        );
      }

      res.json(stats);
    } catch (error: any) {
      return next(error);
    }
  }
);

// GET /api/campaigns/:id/recipients - Получить получателей кампании
router.get(
  '/:id/recipients',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const recipients = await db.campaignRecipients.findByCampaignId(id);
      res.json(recipients);
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/campaigns - Создать кампанию
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCampaignSchema.parse(req.body);

    // Получить контакты
    let contacts: any[] = [];

    if (body.contact_list_id) {
      const listMembers = await db.contactLists.getContacts(
        body.contact_list_id
      );
      contacts = listMembers.map((m: any) => m.contact);
    } else if (body.contact_ids && body.contact_ids.length > 0) {
      contacts = await Promise.all(
        body.contact_ids.map((id) => db.contacts.findById(id))
      );
    } else if (body.contact_tags && body.contact_tags.length > 0) {
      contacts = await db.contacts.findByTags(body.contact_tags);
    } else {
      return res.status(400).json({
        error: true,
        message: 'Must provide contact_list_id, contact_ids, or contact_tags',
        code: 'VALIDATION_ERROR',
      });
    }

    // Фильтровать только opt-in контакты
    contacts = contacts.filter((c) => c && c.opt_in === true);

    if (contacts.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No opt-in contacts found',
        code: 'VALIDATION_ERROR',
      });
    }

    // Получить rate_limit из настроек
    const campaignSettingsValue = await db.settings.get('campaign_settings');
    let rateLimitSettings = {
      defaultBatchSize: 50,
      defaultDelaySeconds: 60,
      defaultHourlyCap: null as number | null,
      defaultDailyCap: null as number | null,
    };

    if (campaignSettingsValue) {
      try {
        const parsed = JSON.parse(campaignSettingsValue);
        rateLimitSettings = {
          defaultBatchSize: parsed.defaultBatchSize || 50,
          defaultDelaySeconds: parsed.defaultDelaySeconds || 60,
          defaultHourlyCap: parsed.defaultHourlyCap || null,
          defaultDailyCap: parsed.defaultDailyCap || null,
        };
      } catch (e) {
        console.warn('Failed to parse campaign_settings from DB:', e);
      }
    }

    // Создать кампанию
    // Используем rate_limit из настроек
    const campaign = await db.campaigns.create({
      name: body.name,
      description: body.description,
      template_id: body.template_id,
      status: 'draft',
      variable_mapping: body.variable_mapping,
      rate_limit_per_batch: rateLimitSettings.defaultBatchSize,
      rate_limit_delay_seconds: rateLimitSettings.defaultDelaySeconds,
      hourly_cap: rateLimitSettings.defaultHourlyCap,
      daily_cap: rateLimitSettings.defaultDailyCap,
      total_recipients: contacts.length,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      failed_count: 0,
    });

    // Создать получателей
    const recipients = contacts.map((contact) => {
      const variables: Record<string, string> = {};
      for (const [placeholder, field] of Object.entries(
        body.variable_mapping
      )) {
        variables[placeholder] =
          contact[field] || contact.custom_fields?.[field] || '';
      }

      return {
        campaign_id: campaign.id,
        contact_id: contact.id,
        status: 'pending',
        variables,
      };
    });

    await db.campaignRecipients.createMany(recipients);

    const createdCampaign = await db.campaigns.findById(campaign.id);
    res.status(201).json(createdCampaign);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: true,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }
    return next(error);
  }
});

// PATCH /api/campaigns/:id - Обновить кампанию
router.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await db.campaigns.findById(id);

      if (campaign.status !== 'draft') {
        return res.status(400).json({
          error: true,
          message: 'Can only update campaigns in draft status',
          code: 'CAMPAIGN_INVALID_STATUS',
        });
      }

      // Убираем rate_limit из обновлений - он теперь только в настройках
      const updates: any = { ...req.body };
      delete updates.rate_limit;
      delete updates.rate_limit_per_batch;
      delete updates.rate_limit_delay_seconds;
      delete updates.hourly_cap;
      delete updates.daily_cap;

      const updated = await db.campaigns.update(id, updates);
      res.json(updated);
    } catch (error: any) {
      return next(error);
    }
  }
);

// DELETE /api/campaigns/:id - Удалить кампанию
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await db.campaigns.findById(id);

      // Если кампания запущена или на паузе, сначала останавливаем её
      if (campaign.status === 'running' || campaign.status === 'paused') {
        // Остановить кампанию
        await db.campaigns.update(id, {
          status: 'stopped',
        });

        // Очистить очередь от задач этой кампании
        try {
          await queueUtils.clean(id);
        } catch (queueError) {
          // Игнорируем ошибки очистки очереди, продолжаем удаление
          console.warn('Failed to clean queue for campaign:', queueError);
        }
      }

      // Удалить кампанию (теперь она в статусе stopped или уже была в draft/stopped/completed/failed)
      await db.campaigns.delete(id);
      res.status(204).send();
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/campaigns/:id/start - Запустить кампанию
// Оптимизировано для больших кампаний: возвращает ответ сразу, обработка асинхронная
router.post(
  '/:id/start',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await db.campaigns.findById(id);

      if (campaign.status !== 'draft') {
        return res.status(400).json({
          error: true,
          message: 'Can only start campaigns in draft status',
          code: 'CAMPAIGN_INVALID_STATUS',
        });
      }

      // Получить количество получателей для быстрого ответа
      const recipients = await db.campaignRecipients.findByStatus(id, 'pending');
      const totalRecipients = recipients.length;

      // Обновить статус кампании сразу
      await db.campaigns.update(id, {
        status: 'running',
        started_at: new Date().toISOString(),
      });

      // Вернуть ответ сразу (202 Accepted - запрос принят, обрабатывается)
      res.status(202).json({ 
        message: 'Campaign is starting...', 
        total: totalRecipients,
        status: 'processing',
      });

      // Обработать получателей асинхронно (не блокируем ответ)
      processCampaignStart(id, campaign, recipients).catch((error) => {
        console.error('Error processing campaign start:', error);
        // Обновить статус кампании на failed при ошибке
        db.campaigns.update(id, {
          status: 'failed',
          error_message: error.message || 'Failed to start campaign',
        }).catch(console.error);
      });
    } catch (error: any) {
      return next(error);
    }
  }
);

// Асинхронная функция для обработки старта кампании
async function processCampaignStart(
  campaignId: string,
  campaign: any,
  recipients: any[]
) {
  const BATCH_SIZE = 100; // Обрабатываем батчами по 100 получателей
  let validRecipients = 0;
  let skippedRecipients = 0;

  // Обрабатываем батчами
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    
    // Получить все контакты батча одним запросом
    const contactIds = batch.map((r: any) => r.contact_id);
    const { data: contacts, error: contactsError } = await dbSupabase
      .from('contacts')
      .select('id, phone, opt_in')
      .in('id', contactIds);

    if (contactsError) {
      console.error('Error fetching contacts batch:', contactsError);
      continue;
    }

    // Создать Map для быстрого поиска контактов
    const contactsMap = new Map((contacts || []).map((c: any) => [c.id, c]));

    // Подготовить задачи для очереди и обновления статусов
    const queueJobs: any[] = [];
    const validRecipientIds: string[] = [];
    const failedRecipientUpdates: any[] = [];

    for (const recipient of batch) {
      const contact = contactsMap.get(recipient.contact_id);
      
      if (!contact) {
        failedRecipientUpdates.push({
          id: recipient.id,
          status: 'failed',
          error_message: 'Contact not found',
        });
        skippedRecipients++;
        continue;
      }

      // Пропустить контакты без opt_in
      if (!(contact as any).opt_in) {
        failedRecipientUpdates.push({
          id: recipient.id,
          status: 'failed',
          error_message: 'Contact has not opted in',
        });
        skippedRecipients++;
        continue;
      }

      // Валидация формата телефона
      const contactPhone = (contact as any).phone;
      if (!contactPhone || !/^\+?[1-9]\d{1,14}$/.test(contactPhone.replace(/\s/g, ''))) {
        failedRecipientUpdates.push({
          id: recipient.id,
          status: 'failed',
          error_message: 'Invalid phone number format',
        });
        skippedRecipients++;
        continue;
      }

      // Вычислить задержку для соблюдения rate limits
      const delay = validRecipients * (campaign.rate_limit_delay_seconds * 1000) / campaign.rate_limit_per_batch;
      
      // Добавить задачу в очередь
      queueJobs.push({
        name: 'send-message',
        data: {
          recipientId: recipient.id,
          campaignId: campaignId,
        },
        opts: {
          delay: Math.floor(delay),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

      validRecipientIds.push(recipient.id);
      validRecipients++;
    }

    // Bulk операции: добавить задачи в очередь и обновить статусы
    try {
      // Добавить все задачи в очередь параллельно
      await Promise.all(
        queueJobs.map(job => messageQueue.add(job.name, job.data, job.opts))
      );

      // Bulk update статусов на queued для валидных получателей
      if (validRecipientIds.length > 0) {
        await dbSupabase
          .from('campaign_recipients')
          .update({ status: 'queued' })
          .in('id', validRecipientIds);
      }

      // Bulk update статусов на failed для невалидных получателей
      if (failedRecipientUpdates.length > 0) {
        // Supabase не поддерживает bulk update с разными значениями напрямую
        // Обновляем по одному, но это быстрее чем делать все операции последовательно
        await Promise.all(
          failedRecipientUpdates.map(update =>
            db.campaignRecipients.update(update.id, {
              status: update.status,
              error_message: update.error_message,
            })
          )
        );
      }
    } catch (batchError) {
      console.error(`Error processing batch ${i / BATCH_SIZE + 1}:`, batchError);
      // Продолжаем обработку следующих батчей
    }
  }

  console.log(`Campaign ${campaignId} started: ${validRecipients} queued, ${skippedRecipients} skipped`);
}

// POST /api/campaigns/:id/pause - Приостановить кампанию
router.post(
  '/:id/pause',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await db.campaigns.findById(id);

      if (campaign.status !== 'running') {
        return res.status(400).json({
          error: true,
          message: 'Can only pause running campaigns',
          code: 'CAMPAIGN_INVALID_STATUS',
        });
      }

      await queueUtils.pause();
      await db.campaigns.update(id, { status: 'paused' });

      res.json({ message: 'Campaign paused' });
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/campaigns/:id/resume - Возобновить кампанию
router.post(
  '/:id/resume',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await db.campaigns.findById(id);

      if (campaign.status !== 'paused') {
        return res.status(400).json({
          error: true,
          message: 'Can only resume paused campaigns',
          code: 'CAMPAIGN_INVALID_STATUS',
        });
      }

      await queueUtils.resume();
      await db.campaigns.update(id, { status: 'running' });

      res.json({ message: 'Campaign resumed' });
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/campaigns/:id/stop - Остановить кампанию
router.post(
  '/:id/stop',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await db.campaigns.findById(id);

      if (!['running', 'paused'].includes(campaign.status)) {
        return res.status(400).json({
          error: true,
          message: 'Can only stop running or paused campaigns',
          code: 'CAMPAIGN_INVALID_STATUS',
        });
      }

      // Удалить задачи из очереди
      await queueUtils.clean(id);

      // Обновить статус всех pending получателей
      await db.campaignRecipients.updateByCampaignId(id, {
        status: 'pending',
      });

      // Обновить статус кампании
      await db.campaigns.update(id, { status: 'stopped' });

      res.json({ message: 'Campaign stopped' });
    } catch (error: any) {
      return next(error);
    }
  }
);

export default router;

