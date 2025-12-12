import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '../config/env';
import Redis from 'ioredis';

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, // Требуется для BullMQ
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

