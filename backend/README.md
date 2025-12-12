# WhatsApp Admin Panel Backend

Node.js REST API сервер для управления WhatsApp рассылками через Meta WhatsApp Cloud API.

## Технологии

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **ORM:** @supabase/supabase-js
- **Meta API:** axios
- **Queue:** BullMQ + Redis
- **Validation:** Zod

## Установка

1. Установите зависимости:

```bash
npm install
```

2. Скопируйте `.env.example` в `.env` и заполните переменные окружения:

```bash
cp .env.example .env
```

3. Убедитесь, что Redis запущен (для очередей):

```bash
redis-server
```

## Запуск

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Templates

- `GET /api/templates` - Получить все шаблоны
- `GET /api/templates/:id` - Получить шаблон по ID
- `POST /api/templates/sync` - Синхронизировать шаблоны из Meta API

### Campaigns

- `GET /api/campaigns` - Получить все кампании
- `GET /api/campaigns/:id` - Получить кампанию по ID
- `GET /api/campaigns/:id/stats` - Получить статистику кампании
- `GET /api/campaigns/:id/recipients` - Получить получателей кампании
- `POST /api/campaigns` - Создать кампанию
- `PATCH /api/campaigns/:id` - Обновить кампанию
- `DELETE /api/campaigns/:id` - Удалить кампанию
- `POST /api/campaigns/:id/start` - Запустить кампанию
- `POST /api/campaigns/:id/pause` - Приостановить кампанию
- `POST /api/campaigns/:id/resume` - Возобновить кампанию
- `POST /api/campaigns/:id/stop` - Остановить кампанию

### Contacts

- `GET /api/contacts` - Получить все контакты
- `GET /api/contacts/:id` - Получить контакт по ID
- `POST /api/contacts` - Создать контакт
- `POST /api/contacts/import` - Импорт контактов
- `PATCH /api/contacts/:id` - Обновить контакт
- `DELETE /api/contacts/:id` - Удалить контакт

### Contact Lists

- `GET /api/contact-lists` - Получить все списки
- `GET /api/contact-lists/:id` - Получить список по ID
- `GET /api/contact-lists/:id/contacts` - Получить контакты из списка
- `POST /api/contact-lists` - Создать список
- `POST /api/contact-lists/:id/contacts` - Добавить контакты в список

### Chats

- `GET /api/chats` - Получить все чаты
- `GET /api/chats/:id` - Получить чат по ID
- `GET /api/chats/:id/messages` - Получить сообщения чата
- `POST /api/chats/:id/messages` - Отправить ответ в чат
- `POST /api/chats/:id/resolve` - Закрыть чат
- `POST /api/chats/:id/reopen` - Переоткрыть чат
- `POST /api/chats/:id/tag` - Добавить тег к чату

### Webhook

- `GET /api/webhook` - Верификация вебхука Meta
- `POST /api/webhook` - Получение событий от Meta

### Logs

- `GET /api/logs` - Получить логи активности

### Settings

- `GET /api/settings/status` - Проверить статус подключений
- `GET /api/settings` - Получить настройки
- `PATCH /api/settings` - Обновить настройки

## Структура проекта

```
backend/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   └── env.ts               # Environment variables
│   ├── routes/
│   │   ├── templates.ts
│   │   ├── campaigns.ts
│   │   ├── contacts.ts
│   │   ├── contactLists.ts
│   │   ├── chats.ts
│   │   ├── logs.ts
│   │   ├── settings.ts
│   │   └── webhook.ts
│   ├── services/
│   │   ├── metaApi.ts           # Meta WhatsApp Cloud API client
│   │   ├── supabase.ts          # Supabase client
│   │   └── queue.ts             # Bull queue setup
│   ├── workers/
│   │   └── messageWorker.ts    # Message sending worker
│   ├── middleware/
│   │   ├── cors.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Переменные окружения

См. `.env.example` для полного списка переменных окружения.

## Тестирование

### Проверка подключения

```bash
curl http://localhost:3001/api/settings/status
```

### Синхронизация шаблонов

```bash
curl -X POST http://localhost:3001/api/templates/sync
```

### Создание кампании

```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "template_id": "uuid",
    "contact_ids": ["uuid1"],
    "variable_mapping": {"{{1}}": "name"},
    "rate_limit": {"batch": 50, "delay_minutes": 1}
  }'
```

## Лицензия

ISC

