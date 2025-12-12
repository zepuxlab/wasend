import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 500, // лимит 500 запросов с одного IP (увеличено для админ-панели)
  message: {
    error: true,
    message: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Отключить проверку trust proxy, так как мы используем его для Nginx
  validate: {
    trustProxy: false,
  },
  // Пропускать успешные запросы при подсчете (не считать 2xx ответы)
  skipSuccessfulRequests: false,
  // Пропускать неудачные запросы (не считать 4xx/5xx ответы)
  skipFailedRequests: false,
});

export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 1000, // больше лимит для webhook
  message: {
    error: true,
    message: 'Too many webhook requests',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  // Отключить проверку trust proxy для webhook
  validate: {
    trustProxy: false,
  },
});

