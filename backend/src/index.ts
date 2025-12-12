import express from 'express';
import helmet from 'helmet';
import { config, validateEnv } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { apiRateLimiter, webhookRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Валидация переменных окружения при старте
validateEnv();

// Роуты
import templatesRouter from './routes/templates';
import campaignsRouter from './routes/campaigns';
import contactsRouter from './routes/contacts';
import contactListsRouter from './routes/contactLists';
import chatsRouter from './routes/chats';
import webhookRouter from './routes/webhook';
import logsRouter from './routes/logs';
import settingsRouter from './routes/settings';
import configRouter from './routes/config';
import notificationsRouter from './routes/notifications';

// Импортировать воркер (чтобы он запустился)
import './workers/messageWorker';

const app = express();

// Middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiRateLimiter);
app.use('/api/webhook', webhookRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/config', configRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/contact-lists', contactListsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/logs', logsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Запуск сервера
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

