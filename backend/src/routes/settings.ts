import { Router, Request, Response, NextFunction } from 'express';
import { metaApi } from '../services/metaApi';
import { config } from '../config/env';
import { supabase } from '../services/supabase';

const router = Router();

// GET /api/settings/status - Проверить статус подключений
router.get(
  '/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status: any = {
        meta_api: {
          connected: false,
          last_check: new Date().toISOString(),
        },
        webhook: {
          active: !!config.meta.webhookVerifyToken,
          last_received: null, // Можно добавить логику отслеживания последнего webhook
        },
        database: {
          connected: false,
        },
      };

      // Проверить Meta API
      try {
        const phoneInfo = await metaApi.getPhoneNumberInfo();
        const businessInfo = await metaApi.getBusinessAccountInfo();
        status.meta_api = {
          connected: true,
          last_check: new Date().toISOString(),
          phone_number: phoneInfo.display_phone_number,
          business_name: businessInfo.name,
        };
      } catch (error: any) {
        status.meta_api = {
          connected: false,
          last_check: new Date().toISOString(),
          error: error.message || 'Connection failed',
        };
      }

      // Проверить базу данных
      try {
        const { error } = await supabase.from('templates').select('id').limit(1);
        status.database.connected = !error;
      } catch (error) {
        status.database.connected = false;
      }

      res.json(status);
    } catch (error: any) {
      return next(error);
    }
  }
);

// GET /api/settings - Получить настройки
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Здесь можно добавить логику получения настроек из БД
    res.json({
      rate_limits: {
        default_batch: 50,
        default_delay_minutes: 1,
      },
    });
  } catch (error: any) {
    return next(error);
  }
});

// PATCH /api/settings - Обновить настройки
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Здесь можно добавить логику сохранения настроек в БД
    res.json({ message: 'Settings updated' });
  } catch (error: any) {
    return next(error);
  }
});

export default router;

