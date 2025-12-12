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
    let removed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Получить все задачи кампании (исключаем completed и failed, чтобы не обрабатывать уже завершенные)
    const jobs = await messageQueue.getJobs(['waiting', 'active', 'delayed']);
    
    for (const job of jobs) {
      if (job.data.campaignId === campaignId) {
        try {
          const isActive = await job.isActive();
          
          // Для активных задач пытаемся переместить в failed, затем удалить
          if (isActive) {
            try {
              // Переместить активную задачу в failed с причиной остановки кампании
              await job.moveToFailed(new Error('Campaign stopped'), '0', true);
            } catch (moveError: any) {
              // Если не удалось переместить (задача уже обрабатывается), логируем и продолжаем
              console.warn(`Could not move active job ${job.id} to failed:`, moveError?.message);
            }
          }
          
          // Удалить задачу (работает для waiting, delayed и failed)
          await job.remove();
          removed++;
        } catch (error: any) {
          failed++;
          const errorMsg = error.message || 'Unknown error';
          errors.push(`Job ${job.id}: ${errorMsg}`);
          
          // Если задача заблокирована воркером, пробуем подождать и повторить
          if (errorMsg.includes('locked') || errorMsg.includes('active') || errorMsg.includes('being processed')) {
            try {
              // Ждем немного, чтобы воркер мог завершить обработку
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Пробуем снова удалить
              if (!job.id) continue;
              const retryJob = await messageQueue.getJob(job.id);
              if (retryJob) {
                const stillActive = await retryJob.isActive();
                if (!stillActive) {
                  // Если задача больше не активна, удаляем
                  await retryJob.remove();
                  removed++;
                  failed--;
                } else {
                  // Если все еще активна, перемещаем в failed
                  await retryJob.moveToFailed(new Error('Campaign stopped'), '0', true);
                  await retryJob.remove();
                  removed++;
                  failed--;
                }
              }
            } catch (retryError: any) {
              // Игнорируем ошибки при повторной попытке - задача может быть уже удалена воркером
              console.warn(`Could not remove locked job ${job.id} on retry:`, retryError?.message);
            }
          }
        }
      }
    }

    // Если были ошибки, логируем, но не бросаем исключение
    if (errors.length > 0) {
      console.warn(`Campaign ${campaignId} cleanup: ${removed} removed, ${failed} failed. Some jobs may be locked by workers.`);
    }

    return { removed, failed, errors };
  },
  getJobCounts: async () => {
    return await messageQueue.getJobCounts();
  },
};

