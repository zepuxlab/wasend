import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '../config/env';
import Redis from 'ioredis';

export const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, // Требуется для BullMQ
  retryStrategy: (times) => {
    // Экспоненциальная задержка с максимумом 3 секунды
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Переподключиться при READONLY ошибке
    }
    return false;
  },
  enableOfflineQueue: false, // Отключить очередь офлайн, чтобы не накапливать запросы
});

// Обработка ошибок соединения с Redis
connection.on('error', (err) => {
  console.error('Redis connection error:', err.message);
  // Не завершаем процесс, позволяем переподключиться
});

connection.on('connect', () => {
  console.log('✅ Redis connected');
});

connection.on('ready', () => {
  console.log('✅ Redis ready');
});

connection.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

connection.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Очередь для отправки сообщений
export const messageQueue = new Queue('message-sending', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // хранить завершенные задачи 1 час
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // хранить неудачные задачи 24 часа
    },
  },
});

// События очереди для мониторинга
export const queueEvents = new QueueEvents('message-sending', {
  connection,
});

// Вспомогательные функции для управления очередью
export const queueUtils = {
  pause: async () => {
    await messageQueue.pause();
  },
  resume: async () => {
    await messageQueue.resume();
  },
  clean: async (campaignId: string) => {
    const jobs = await messageQueue.getJobs(['waiting', 'active', 'delayed']);
    for (const job of jobs) {
      if (job.data.campaignId === campaignId) {
        await job.remove();
      }
    }
  },
  getJobCounts: async () => {
    return await messageQueue.getJobCounts();
  },
};

