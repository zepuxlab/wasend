import { Router, Request, Response, NextFunction } from 'express';
import { metaApi } from '../services/metaApi';
import { config } from '../config/env';
import { supabase, db } from '../services/supabase';
import { zohoService } from '../services/zoho';

const router = Router();

// GET /api/settings/status - Проверить статус подключений
router.get(
  '/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status: any = {
        backend_api: {
          connected: true, // Backend is running if we can respond to this request
          last_check: new Date().toISOString(),
        },
        database: {
          connected: false,
        },
        meta_api: {
          connected: false,
          last_check: new Date().toISOString(),
        },
        webhook: {
          active: !!config.meta.webhookVerifyToken,
          last_received: null,
        },
        zoho: {
          enabled: config.zoho.enabled,
          connected: false,
          last_check: new Date().toISOString(),
        },
      };

      // Проверить Meta API
      try {
        const health = await metaApi.getHealth();
        if (health.connected) {
          if (health.test_mode) {
            status.meta_api = {
              connected: true,
              test_mode: true,
              last_check: new Date().toISOString(),
              message: health.message || 'Test mode enabled',
            };
          } else {
            const phoneInfo = await metaApi.getPhoneNumberInfo();
            const businessInfo = await metaApi.getBusinessAccountInfo();
            status.meta_api = {
              connected: true,
              test_mode: false,
              last_check: new Date().toISOString(),
              phone_number: phoneInfo.display_phone_number,
              business_name: businessInfo.name,
            };
          }
        } else {
          status.meta_api = {
            connected: false,
            test_mode: false,
            last_check: new Date().toISOString(),
            error: health.error || 'Connection failed',
          };
        }
      } catch (error: any) {
        status.meta_api = {
          connected: false,
          test_mode: false,
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

      // Проверить Zoho CRM (если интеграция включена)
      if (config.zoho.enabled) {
        try {
          // Пробуем получить Access Token - если получили, значит подключение работает
          const accessToken = await zohoService.getAccessToken();
          if (accessToken) {
            status.zoho = {
              enabled: true,
              connected: true,
              last_check: new Date().toISOString(),
            };
          } else {
            status.zoho = {
              enabled: true,
              connected: false,
              last_check: new Date().toISOString(),
              error: 'Failed to get access token',
            };
          }
        } catch (error: any) {
          status.zoho = {
            enabled: true,
            connected: false,
            last_check: new Date().toISOString(),
            error: error.message || 'Connection failed',
          };
        }
      } else {
        status.zoho = {
          enabled: false,
          connected: false,
          last_check: new Date().toISOString(),
        };
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
    // Получить настройки кампаний из БД
    const campaignSettingsValue = await db.settings.get('campaign_settings');
    
    let campaignSettings = {
      defaultBatchSize: 50,
      defaultDelaySeconds: 60,
      defaultHourlyCap: 1000,
      defaultDailyCap: 10000,
      dailyLimitWarning: true,
      dailyLimitAmount: 100,
      pauseOnLimit: false,
    };

    if (campaignSettingsValue) {
      try {
        const parsed = JSON.parse(campaignSettingsValue);
        campaignSettings = { ...campaignSettings, ...parsed };
      } catch (e) {
        console.warn('Failed to parse campaign_settings from DB:', e);
      }
    }

    res.json({
      campaign_settings: campaignSettings,
    });
  } catch (error: any) {
    return next(error);
  }
});

// PATCH /api/settings - Обновить настройки
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaign_settings } = req.body;

    if (campaign_settings) {
      // Сохранить настройки кампаний в БД
      await db.settings.set('campaign_settings', JSON.stringify(campaign_settings));
    }

    res.json({ message: 'Settings updated', campaign_settings });
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/settings/meta-permissions - Проверить разрешения Meta API токена
router.get(
  '/meta-permissions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permissionCheck = await metaApi.testSendPermission();
      res.json(permissionCheck);
    } catch (error: any) {
      return next(error);
    }
  }
);

export default router;

