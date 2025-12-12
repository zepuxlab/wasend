import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';
import { metaApi } from '../services/metaApi';
import { z } from 'zod';

const router = Router();

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const addTagSchema = z.object({
  tag: z.string().min(1),
});

// GET /api/chats - Получить все чаты
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const chats = await db.chats.findAll({ status });
    res.json(chats);
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/chats/:id - Получить чат по ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const chat = await db.chats.findById(id);
    res.json(chat);
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: true,
        message: 'Chat not found',
        code: 'NOT_FOUND',
      });
    }
    return next(error);
  }
});

// GET /api/chats/:id/messages - Получить сообщения чата
router.get(
  '/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const messages = await db.messages.findByChatId(id);
      res.json(messages);
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/chats/:id/messages - Отправить ответ в чат
router.post(
  '/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = sendMessageSchema.parse(req.body);

      const chat = await db.chats.findById(id);

      // Проверить окно ответа (24 часа)
      if (chat.reply_window_expires_at) {
        const expiresAt = new Date(chat.reply_window_expires_at);
        if (expiresAt < new Date()) {
          return res.status(400).json({
            error: true,
            message: 'Reply window has expired',
            code: 'REPLY_WINDOW_EXPIRED',
          });
        }
      }

      const contact = await db.contacts.findById(chat.contact_id);

      // Отправить через Meta API
      const response = await metaApi.sendTextMessage({
        to: contact.phone,
        text: body.content,
      });

      // Сохранить сообщение
      await db.messages.create({
        chat_id: id,
        direction: 'outbound',
        message_type: 'text',
        content: body.content,
        whatsapp_message_id: response.messages?.[0]?.id,
        status: 'sent',
      });

      // Обновить чат и продлить окно ответа на 24 часа
      const now = new Date();
      await db.chats.update(id, {
        last_message_at: now.toISOString(),
        reply_window_expires_at: new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      res.status(201).json({ message: 'Message sent' });
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

// POST /api/chats/:id/resolve - Закрыть чат
router.post(
  '/:id/resolve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const chat = await db.chats.update(id, { status: 'closed' });
      res.json(chat);
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/chats/:id/reopen - Переоткрыть чат
router.post(
  '/:id/reopen',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const chat = await db.chats.update(id, { status: 'open' });
      res.json(chat);
    } catch (error: any) {
      return next(error);
    }
  }
);

// POST /api/chats/:id/tag - Добавить тег к чату
router.post(
  '/:id/tag',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = addTagSchema.parse(req.body);

      const chat = await db.chats.findById(id);
      const tags = chat.tags || [];
      if (!tags.includes(body.tag)) {
        tags.push(body.tag);
      }

      const updated = await db.chats.update(id, { tags });
      res.json(updated);
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

