import { Router, Request, Response } from 'express';
import { config } from '../config/env';

const router = Router();

// GET /api/config - Получить публичную конфигурацию для фронтенда
// ВАЖНО: Этот endpoint НЕ требует авторизации и возвращает только публичные данные
router.get('/', (req: Request, res: Response) => {
  res.json({
    supabase_url: config.supabase.url,
    supabase_anon_key: config.supabase.anonKey,
    meta_phone_number_id: config.meta.phoneNumberId,
    // НЕ возвращаем секретные ключи!
  });
});

export default router;

