import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';
import { z } from 'zod';

const router = Router();

const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const addContactsSchema = z.object({
  contact_ids: z.array(z.string().uuid()),
});

// GET /api/contact-lists - Получить все списки
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lists = await db.contactLists.findAll();
    res.json(lists);
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

export default router;

