import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';
import { dbSupabase } from '../services/supabase';
import { z } from 'zod';

const router = Router();

const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const addContactsSchema = z.object({
  contact_ids: z.array(z.string().uuid()),
});

const importContactsSchema = z.object({
  contacts: z.array(
    z.object({
      phone: z.string(),
      name: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      opt_in: z.boolean().optional(),
    })
  ),
});

// GET /api/contact-lists - Получить все списки
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lists = await db.contactLists.findAll();
    // Добавить количество контактов для каждого списка
    const listsWithCounts = await Promise.all(
      lists.map(async (list: any) => {
        try {
          const members = await db.contactLists.getContacts(list.id);
          return {
            ...list,
            contact_count: members.length,
          };
        } catch (err) {
          return {
            ...list,
            contact_count: 0,
          };
        }
      })
    );
    res.json(listsWithCounts);
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/contact-lists/:id - Получить список по ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const list = await db.contactLists.findById(id);
    res.json(list);
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: true,
        message: 'Contact list not found',
        code: 'NOT_FOUND',
      });
    }
    return next(error);
  }
});

// GET /api/contact-lists/:id/contacts - Получить контакты из списка
router.get(
  '/:id/contacts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const members = await db.contactLists.getContacts(id);
      res.json(members);
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/contact-lists - Создать список
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createListSchema.parse(req.body);
    const list = await db.contactLists.create(body);
    res.status(201).json(list);
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

// POST /api/contact-lists/:id/contacts - Добавить контакты в список
router.post(
  '/:id/contacts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = addContactsSchema.parse(req.body);
      const members = await db.contactLists.addContacts(id, body.contact_ids);
      res.json(members);
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

// POST /api/contact-lists/:id/import - Импортировать контакты из CSV в список
router.post(
  '/:id/import',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: listId } = req.params;
      const body = importContactsSchema.parse(req.body);
      
      // Проверить существование списка
      const list = await db.contactLists.findById(listId);
      if (!list) {
        return res.status(404).json({
          error: true,
          message: 'Contact list not found',
          code: 'NOT_FOUND',
        });
      }

      // Создать или найти контакты и добавить их в список
      const contactsToUpsert = body.contacts.map((contactData) => ({
        phone: contactData.phone,
        name: contactData.name || null,
        tags: contactData.tags || [],
        opt_in: contactData.opt_in !== undefined ? contactData.opt_in : true,
        source: 'manual', // Импортированные контакты помечаем как 'manual'
      }));

      let imported = 0;
      let skipped = 0;
      const contactIds: string[] = [];

      // Bulk upsert контактов
      try {
        const { data: upsertedContacts, error: upsertError } = await dbSupabase
          .from('contacts')
          .upsert(contactsToUpsert, { 
            onConflict: 'phone',
            ignoreDuplicates: false
          })
          .select('id, phone');

        if (upsertError) {
          throw upsertError;
        }

        if (upsertedContacts) {
          contactIds.push(...upsertedContacts.map(c => c.id));
          imported = upsertedContacts.length;
        }
      } catch (bulkError: any) {
        // Fallback: обрабатываем по одному
        for (const contactData of contactsToUpsert) {
          try {
            const existingContact = await db.contacts.findByPhone(contactData.phone);
            if (existingContact) {
              contactIds.push(existingContact.id);
              imported++;
            } else {
              const newContact = await db.contacts.create(contactData);
              contactIds.push(newContact.id);
              imported++;
            }
          } catch (err: any) {
            skipped++;
            console.error(`Failed to import contact ${contactData.phone}:`, err);
          }
        }
      }

      // Добавить контакты в список
      if (contactIds.length > 0) {
        await db.contactLists.addContacts(listId, contactIds);
      }

      res.json({ 
        imported, 
        skipped,
        added_to_list: contactIds.length
      });
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

export default router;

