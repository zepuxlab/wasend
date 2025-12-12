import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';

const router = Router();

// GET /api/logs - Получить логи активности
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.query.campaign_id as string | undefined;
    const action = req.query.action as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 100;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;

    const logs = await db.activityLogs.findAll({
      campaign_id: campaignId,
      action,
      limit,
      offset,
    });

    res.json(logs);
  } catch (error: any) {
    return next(error);
  }
});

export default router;

