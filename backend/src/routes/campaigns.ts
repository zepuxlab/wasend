import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';
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
  rate_limit: z.object({
    batch: z.number().int().positive(),
    delay_minutes: z.number().int().positive(),
    hourly_cap: z.number().int().positive().optional(),
    daily_cap: z.number().int().positive().optional(),
  }),
});

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

    // Создать кампанию
    const campaign = await db.campaigns.create({
      name: body.name,
      description: body.description,
      template_id: body.template_id,
      status: 'draft',
      variable_mapping: body.variable_mapping,
      rate_limit: body.rate_limit,
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

      const updated = await db.campaigns.update(id, req.body);
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

      if (!['draft', 'stopped'].includes(campaign.status)) {
        return res.status(400).json({
          error: true,
          message: 'Can only delete campaigns in draft or stopped status',
          code: 'CAMPAIGN_INVALID_STATUS',
        });
      }

      await db.campaigns.delete(id);
      res.status(204).send();
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/campaigns/:id/start - Запустить кампанию
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

      // Получить всех получателей со статусом pending
      const recipients = await db.campaignRecipients.findByStatus(id, 'pending');

      // ВАЛИДАЦИЯ: Проверить opt-in перед добавлением в очередь
      let validRecipients = 0;
      let skippedRecipients = 0;

      for (const recipient of recipients) {
        // Получить контакт для проверки opt_in
        const contact = await db.contacts.findById(recipient.contact_id);
        
        // Пропустить контакты без opt_in (защита от бана)
        if (!contact.opt_in) {
          await db.campaignRecipients.update(recipient.id, {
            status: 'failed',
            error_message: 'Contact has not opted in',
          });
          skippedRecipients++;
          continue;
        }

        // Валидация формата телефона
        if (!contact.phone || !/^\+?[1-9]\d{1,14}$/.test(contact.phone.replace(/\s/g, ''))) {
          await db.campaignRecipients.update(recipient.id, {
            status: 'failed',
            error_message: 'Invalid phone number format',
          });
          skippedRecipients++;
          continue;
        }

        // Создать задачу в очереди с задержкой для соблюдения rate limits
        const delay = validRecipients * (campaign.rate_limit_delay_seconds * 1000) / campaign.rate_limit_per_batch;
        
        await messageQueue.add(
          'send-message',
          {
            recipientId: recipient.id,
            campaignId: id,
          },
          {
            delay: Math.floor(delay),
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000, // 5 секунд между попытками
            },
          }
        );

        // Обновить статус на queued
        await db.campaignRecipients.update(recipient.id, {
          status: 'queued',
        });

        validRecipients++;
      }

      // Обновить статус кампании
      await db.campaigns.update(id, {
        status: 'running',
        started_at: new Date().toISOString(),
      });

      res.json({ 
        message: 'Campaign started', 
        queued: validRecipients,
        skipped: skippedRecipients,
        total: recipients.length,
      });
    } catch (error: any) {
      return next(error);
    }
  }
);

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

