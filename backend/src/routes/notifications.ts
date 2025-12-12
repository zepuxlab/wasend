import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';

const router = Router();

// GET /api/notifications - Получить уведомления
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Получить user_id из JWT токена или сессии
    // Пока возвращаем все уведомления (для всех пользователей)
    const unreadOnly = req.query.unread_only === 'true';
    const notifications = await db.notifications.findAll(undefined, unreadOnly);
    res.json(notifications);
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/notifications/unread-count - Получить количество непрочитанных
router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Получить user_id из JWT токена или сессии
    const count = await db.notifications.getUnreadCount();
    res.json({ count });
  } catch (error: any) {
    return next(error);
  }
});

// PATCH /api/notifications/:id/read - Отметить как прочитанное
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.notifications.markAsRead(id);
    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    return next(error);
  }
});

// PATCH /api/notifications/read-all - Отметить все как прочитанные
router.patch('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Получить user_id из JWT токена или сессии
    // Пока используем пустую строку (все уведомления)
    await db.notifications.markAllAsRead('');
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    return next(error);
  }
});

export default router;

