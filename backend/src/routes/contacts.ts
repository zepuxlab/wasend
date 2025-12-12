import { Router, Request, Response, NextFunction } from 'express';
import { db, dbSupabase } from '../services/supabase';
import { z } from 'zod';

const router = Router();

const createContactSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
  opt_in: z.boolean().default(true),
});

const importContactsSchema = z.object({
  contacts: z.array(
    z.object({
      phone: z.string().min(1),
      name: z.string().optional(),
      tags: z.array(z.string()).optional(),
      custom_fields: z.record(z.any()).optional(),
    })
  ),
});

// GET /api/contacts - Получить все контакты
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = req.query.tags
      ? (req.query.tags as string).split(',')
      : undefined;
    const optIn =
      req.query.opt_in !== undefined
        ? req.query.opt_in === 'true'
        : undefined;
    const source = req.query.source as string | undefined; // Фильтр по источнику

    const contacts = await db.contacts.findAll({
      tags,
      opt_in: optIn,
      source,
    });
    res.json(contacts);
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/contacts/:id - Получить контакт по ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const contact = await db.contacts.findById(id);
    res.json(contact);
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: true,
        message: 'Contact not found',
        code: 'NOT_FOUND',
      });
    }
    return next(error);
  }
});

// POST /api/contacts - Создать контакт
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createContactSchema.parse(req.body);
    // Вручную созданные контакты помечаем как 'manual'
    const contact = await db.contacts.create({
      ...body,
      source: 'manual',
    });
    res.status(201).json(contact);
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

// POST /api/contacts/import - Импорт контактов
router.post(
  '/import',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = importContactsSchema.parse(req.body);
      
      // Подготовить данные для bulk upsert
      const contactsToUpsert = body.contacts.map((contactData) => ({
        ...contactData,
        opt_in: true,
        source: 'manual', // Импортированные контакты помечаем как 'manual'
      }));

      // Использовать bulk upsert вместо отдельных запросов
      // Supabase поддерживает upsert массива с onConflict
      const { data, error } = await dbSupabase
        .from('contacts')
        .upsert(contactsToUpsert, { 
          onConflict: 'phone',
          ignoreDuplicates: false // Обновлять существующие контакты
        })
        .select();

      if (error) {
        console.error('Bulk import error:', error);
        // Если bulk не сработал, попробуем батчами
        const BATCH_SIZE = 100;
        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < contactsToUpsert.length; i += BATCH_SIZE) {
          const batch = contactsToUpsert.slice(i, i + BATCH_SIZE);
          try {
            const { error: batchError } = await dbSupabase
              .from('contacts')
              .upsert(batch, { onConflict: 'phone' });
            
            if (batchError) {
              console.error(`Batch ${i / BATCH_SIZE + 1} error:`, batchError);
              skipped += batch.length;
            } else {
              imported += batch.length;
            }
          } catch (batchErr: any) {
            console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, batchErr);
            skipped += batch.length;
          }
        }

        res.json({ imported, skipped });
      } else {
        // Успешный bulk upsert
        res.json({ 
          imported: data?.length || contactsToUpsert.length, 
          skipped: 0 
        });
      }
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
  }
);

// PATCH /api/contacts/:id - Обновить контакт
router.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updated = await db.contacts.update(id, req.body);
      res.json(updated);
    } catch (error: any) {
      return next(error);
    }
  }
);

// DELETE /api/contacts/:id - Удалить контакт
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await db.contacts.delete(id);
      res.status(204).send();
    } catch (error: any) {
      return next(error);
    }
  }
);

// GET /api/contacts/:id/history - Получить историю контакта
router.get(
  '/:id/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Получить чаты контакта
      const chats = await db.chats.findAll();
      const contactChats = chats.filter((chat: any) => chat.contact_id === id);

      // Получить все сообщения из чатов контакта
      const allMessages: any[] = [];
      for (const chat of contactChats) {
        const messages = await db.messages.findByChatId(chat.id);
        allMessages.push(...messages.map((msg: any) => ({ ...msg, chat })));
      }

      // Получить кампании, в которых участвовал контакт
      const { data: recipients } = await dbSupabase
        .from('campaign_recipients')
        .select('*, campaign:campaigns(*)')
        .eq('contact_id', id)
        .order('created_at', { ascending: false });

      // Получить логи активности для контакта
      const { data: logs } = await dbSupabase
        .from('activity_logs')
        .select('*, campaign:campaigns(name)')
        .eq('contact_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      res.json({
        messages: allMessages.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        campaigns: recipients || [],
        logs: logs || [],
        chats: contactChats,
      });
    } catch (error: any) {
      return next(error);
    }
  }
);

export default router;

