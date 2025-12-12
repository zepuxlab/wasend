import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';
import { z } from 'zod';

const router = Router();

const createContactSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  country: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
  opt_in: z.boolean().default(true),
});

const importContactsSchema = z.object({
  contacts: z.array(
    z.object({
      phone: z.string().min(1),
      name: z.string().optional(),
      country: z.string().optional(),
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

    const contacts = await db.contacts.findAll({
      tags,
      opt_in: optIn,
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
    const contact = await db.contacts.create(body);
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
      let imported = 0;
      let skipped = 0;

      for (const contactData of body.contacts) {
        try {
          await db.contacts.upsert({
            ...contactData,
            opt_in: true,
          });
          imported++;
        } catch (error: any) {
          skipped++;
          console.error('Failed to import contact:', contactData.phone, error);
        }
      }

      res.json({ imported, skipped });
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

export default router;

