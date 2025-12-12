# Техническое задание: Node.js Backend для WhatsApp Admin Panel

## 1. Общее описание

### 1.1 Назначение
REST API сервер на Node.js для управления WhatsApp рассылками через Meta WhatsApp Cloud API. Сервер является посредником между Admin Panel (React) и Meta API.

### 1.2 Архитектура
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Panel    │────▶│  Node.js API    │────▶│  Meta WhatsApp  │
│  (React/Vite)   │◀────│  Server         │◀────│  Cloud API      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Supabase      │
                        │   PostgreSQL    │
                        └─────────────────┘
```

### 1.3 Стек технологий
- **Runtime:** Node.js 18+
- **Framework:** Express.js или Fastify
- **Database:** Supabase (PostgreSQL)
- **ORM:** @supabase/supabase-js
- **Meta API:** axios или node-fetch
- **Auth:** JWT (опционально)
- **Queue:** Bull/BullMQ + Redis (для очередей рассылок)

---

## 2. Переменные окружения

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase (ОБЯЗАТЕЛЬНО)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-public-key

# Meta WhatsApp Cloud API (ОБЯЗАТЕЛЬНО)
META_ACCESS_TOKEN=your-permanent-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
META_BUSINESS_ACCOUNT_ID=your-business-account-id
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Redis (для очередей)
REDIS_URL=redis://localhost:6379

# Optional
JWT_SECRET=your-jwt-secret
```

### 2.1 Валидация переменных при старте

```javascript
// src/config/env.ts
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
  'META_BUSINESS_ACCOUNT_ID',
  'META_WEBHOOK_VERIFY_TOKEN',
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN!,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID!,
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID!,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN!,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};
```

---

## 3. API Endpoints

### 3.0 Config API (для фронтенда)

#### GET /api/config
Возвращает публичную конфигурацию для фронтенда.
**ВАЖНО:** Этот endpoint НЕ требует авторизации и возвращает только публичные данные.

**Response:**
```json
{
  "supabase_url": "https://xxxxx.supabase.co",
  "supabase_anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "meta_phone_number_id": "123456789012345",
  "meta_business_name": "Amprio Milano"
}
```

**Реализация:**
```javascript
// routes/config.ts
router.get('/config', (req, res) => {
  res.json({
    supabase_url: config.supabase.url,
    supabase_anon_key: config.supabase.anonKey,
    meta_phone_number_id: config.meta.phoneNumberId,
    // НЕ возвращаем секретные ключи!
  });
});
```

---

## 3. API Endpoints

### 3.1 Templates API

#### GET /api/templates
Получить все шаблоны из базы данных.

**Response:**
```json
[
  {
    "id": "uuid",
    "whatsapp_template_id": "template_123",
    "name": "order_confirmation",
    "category": "MARKETING",
    "language": "ru",
    "status": "approved",
    "components": [...],
    "variables": ["{{1}}", "{{2}}"],
    "preview_text": "Здравствуйте {{1}}, ваш заказ {{2}} подтвержден",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/templates/sync
Синхронизировать шаблоны из Meta WhatsApp Business API.

**Логика:**
1. Запрос к Meta API: `GET /{BUSINESS_ACCOUNT_ID}/message_templates`
2. Для каждого шаблона: upsert в таблицу `templates`
3. Вернуть количество синхронизированных

**Meta API Call:**
```javascript
const response = await axios.get(
  `https://graph.facebook.com/v19.0/${BUSINESS_ACCOUNT_ID}/message_templates`,
  {
    headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    params: { limit: 100 }
  }
);
```

**Response:**
```json
{ "synced": 15 }
```

#### GET /api/templates/:id
Получить шаблон по ID.

---

### 3.2 Campaigns API

#### GET /api/campaigns
Получить все кампании с информацией о шаблоне.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "New Year Promo",
    "description": "Новогодняя акция",
    "template_id": "uuid",
    "template": { "name": "promo_template", ... },
    "status": "draft",
    "variable_mapping": { "{{1}}": "name", "{{2}}": "phone" },
    "rate_limit": {
      "batch": 50,
      "delay_minutes": 1,
      "hourly_cap": 1000,
      "daily_cap": 5000
    },
    "total_recipients": 1500,
    "sent_count": 0,
    "delivered_count": 0,
    "read_count": 0,
    "failed_count": 0,
    "scheduled_at": null,
    "started_at": null,
    "completed_at": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /api/campaigns/:id
Получить кампанию по ID с детальной информацией.

#### GET /api/campaigns/:id/stats
Получить real-time статистику кампании.

**Response:**
```json
{
  "total_recipients": 1500,
  "pending": 500,
  "queued": 100,
  "sent": 800,
  "delivered": 750,
  "read": 400,
  "failed": 50,
  "progress_percent": 60
}
```

#### GET /api/campaigns/:id/recipients
Получить список получателей кампании со статусами.

**Response:**
```json
[
  {
    "id": "uuid",
    "contact_id": "uuid",
    "contact": { "phone": "+79001234567", "name": "Иван" },
    "status": "delivered",
    "variables": { "{{1}}": "Иван", "{{2}}": "+79001234567" },
    "whatsapp_message_id": "wamid.xxx",
    "error_message": null,
    "sent_at": "2024-01-01T12:00:00Z",
    "delivered_at": "2024-01-01T12:00:05Z",
    "read_at": null
  }
]
```

#### POST /api/campaigns
Создать новую кампанию.

**Request Body:**
```json
{
  "name": "Spring Sale",
  "description": "Весенняя распродажа",
  "template_id": "uuid",
  "variable_mapping": {
    "{{1}}": "name",
    "{{2}}": "phone"
  },
  "contact_list_id": "uuid",       // или
  "contact_ids": ["uuid1", "uuid2"], // или
  "contact_tags": ["vip", "active"], // все opt-in контакты
  "rate_limit": {
    "batch": 50,
    "delay_minutes": 1
  }
}
```

**Логика:**
1. Создать запись в `campaigns` со статусом `draft`
2. Получить контакты по `contact_list_id` / `contact_ids` / `contact_tags`
3. Создать записи в `campaign_recipients` со статусом `pending`
4. Обновить `total_recipients` в кампании

#### PATCH /api/campaigns/:id
Обновить кампанию (только для статуса `draft`).

#### DELETE /api/campaigns/:id
Удалить кампанию (только для `draft` или `stopped`).

---

### 3.3 Campaign State Machine

```
                    ┌──────────┐
                    │  draft   │
                    └────┬─────┘
                         │ start
                         ▼
    ┌──────────┐    ┌──────────┐    ┌───────────┐
    │  paused  │◀───│ running  │───▶│ completed │
    └────┬─────┘    └────┬─────┘    └───────────┘
         │ resume       │ stop
         └──────────────┼──────────▶┌──────────┐
                        │           │ stopped  │
                        ▼           └──────────┘
                   ┌──────────┐
                   │  failed  │
                   └──────────┘
```

#### POST /api/campaigns/:id/start
Запустить кампанию.

**Логика:**
1. Проверить статус = `draft`
2. Получить всех получателей со статусом `pending`
3. Создать задачи в очереди (Bull/BullMQ)
4. Обновить статус кампании на `running`
5. Запустить воркер для отправки

#### POST /api/campaigns/:id/pause
Приостановить кампанию.

**Логика:**
1. Проверить статус = `running`
2. Приостановить очередь
3. Обновить статус на `paused`

#### POST /api/campaigns/:id/resume
Возобновить кампанию.

**Логика:**
1. Проверить статус = `paused`
2. Возобновить очередь
3. Обновить статус на `running`

#### POST /api/campaigns/:id/stop
Остановить кампанию (без возможности возобновления).

**Логика:**
1. Удалить все задачи из очереди
2. Обновить статус всех `pending` получателей на... (оставить pending или failed)
3. Обновить статус кампании на `stopped`

---

### 3.4 Message Sending Worker

```javascript
// Псевдокод воркера
async function processMessageJob(job) {
  const { recipientId, campaignId } = job.data;
  
  // 1. Получить данные получателя
  const recipient = await db.campaign_recipients.findById(recipientId);
  const campaign = await db.campaigns.findById(campaignId);
  const template = await db.templates.findById(campaign.template_id);
  const contact = await db.contacts.findById(recipient.contact_id);
  
  // 2. Подготовить переменные
  const variables = {};
  for (const [placeholder, field] of Object.entries(campaign.variable_mapping)) {
    variables[placeholder] = contact[field] || contact.custom_fields[field] || '';
  }
  
  // 3. Отправить через Meta API
  try {
    const response = await sendWhatsAppTemplate({
      to: contact.phone,
      template: template.name,
      language: template.language,
      components: buildComponents(template, variables)
    });
    
    // 4. Обновить статус получателя
    await db.campaign_recipients.update(recipientId, {
      status: 'sent',
      whatsapp_message_id: response.messages[0].id,
      sent_at: new Date()
    });
    
    // 5. Обновить счетчики кампании
    await db.campaigns.increment(campaignId, 'sent_count');
    
    // 6. Записать в лог
    await db.activity_logs.create({
      campaign_id: campaignId,
      contact_id: contact.id,
      action: 'message_sent',
      phone: contact.phone
    });
    
  } catch (error) {
    await db.campaign_recipients.update(recipientId, {
      status: 'failed',
      error_message: error.message
    });
    await db.campaigns.increment(campaignId, 'failed_count');
  }
}
```

**Meta API для отправки шаблона:**
```javascript
async function sendWhatsAppTemplate({ to, template, language, components }) {
  return axios.post(
    `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: template,
        language: { code: language },
        components: components
      }
    },
    {
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` }
    }
  );
}
```

---

### 3.5 Contacts API

#### GET /api/contacts
Получить все контакты с фильтрацией.

**Query params:**
- `tags` - фильтр по тегам (через запятую)
- `opt_in` - фильтр по opt_in статусу

#### GET /api/contacts/:id
Получить контакт по ID.

#### POST /api/contacts
Создать контакт.

**Request Body:**
```json
{
  "phone": "+79001234567",
  "name": "Иван Иванов",
  "country": "RU",
  "tags": ["vip"],
  "custom_fields": { "city": "Москва" },
  "opt_in": true
}
```

#### POST /api/contacts/import
Импорт контактов (bulk).

**Request Body:**
```json
{
  "contacts": [
    { "phone": "+79001234567", "name": "Иван" },
    { "phone": "+79007654321", "name": "Петр" }
  ]
}
```

**Логика:**
- Upsert по полю `phone`
- Вернуть количество импортированных и пропущенных

#### PATCH /api/contacts/:id
Обновить контакт.

#### DELETE /api/contacts/:id
Удалить контакт.

---

### 3.6 Contact Lists API

#### GET /api/contact-lists
Получить все списки контактов с количеством участников.

#### GET /api/contact-lists/:id
Получить список по ID.

#### GET /api/contact-lists/:id/contacts
Получить контакты из списка.

#### POST /api/contact-lists
Создать список.

**Request Body:**
```json
{
  "name": "VIP клиенты",
  "description": "Премиум сегмент"
}
```

#### POST /api/contact-lists/:id/contacts
Добавить контакты в список.

**Request Body:**
```json
{
  "contact_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### 3.7 Chats API

#### GET /api/chats
Получить все чаты.

**Query params:**
- `status` - `open` | `closed`

#### GET /api/chats/:id
Получить чат с сообщениями.

#### GET /api/chats/:id/messages
Получить сообщения чата.

#### POST /api/chats/:id/messages
Отправить ответ в чат (только если в 24h окне).

**Request Body:**
```json
{
  "content": "Спасибо за обращение!"
}
```

**Логика:**
1. Проверить `reply_window_expires_at > NOW()`
2. Отправить через Meta API (text message, не template)
3. Сохранить в `messages`
4. Обновить `last_message_at`

**Meta API для текстового сообщения:**
```javascript
await axios.post(
  `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: content }
  },
  { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } }
);
```

#### POST /api/chats/:id/resolve
Закрыть чат.

#### POST /api/chats/:id/reopen
Переоткрыть чат.

#### POST /api/chats/:id/tag
Добавить тег к чату.

---

### 3.8 Webhook Endpoint

#### GET /api/webhook
Верификация вебхука Meta.

```javascript
app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

#### POST /api/webhook
Получение событий от Meta.

**События для обработки:**

1. **Входящее сообщение:**
```javascript
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "79001234567",
          "type": "text",
          "text": { "body": "Привет!" },
          "timestamp": "1234567890"
        }]
      }
    }]
  }]
}
```

**Логика:**
- Найти/создать контакт по номеру
- Найти/создать чат
- Сохранить сообщение в `messages` (direction: inbound)
- Обновить `reply_window_expires_at` (+24 часа)
- Обновить `last_message_at`

2. **Статус сообщения:**
```javascript
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered", // sent, delivered, read, failed
          "timestamp": "1234567890"
        }]
      }
    }]
  }]
}
```

**Логика:**
- Найти получателя по `whatsapp_message_id`
- Обновить статус и timestamp
- Обновить счетчики кампании

---

### 3.9 Activity Logs API

#### GET /api/logs
Получить логи активности.

**Query params:**
- `campaign_id` - фильтр по кампании
- `action` - фильтр по действию
- `limit` - лимит (default: 100)
- `offset` - смещение

---

### 3.10 Settings API

#### GET /api/settings/status
Проверить статус подключений.

**Response:**
```json
{
  "meta_api": {
    "connected": true,
    "phone_number": "+79001234567",
    "business_name": "Amprio Milano"
  },
  "webhook": {
    "configured": true,
    "url": "https://your-api.com/api/webhook"
  },
  "database": {
    "connected": true
  }
}
```

#### GET /api/settings
Получить настройки.

#### PATCH /api/settings
Обновить настройки.

---

## 4. Структура проекта

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
│   │   └── messageWorker.ts     # Message sending worker
│   ├── middleware/
│   │   ├── auth.ts              # JWT auth (optional)
│   │   ├── cors.ts
│   │   └── errorHandler.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 5. Безопасность

### 5.1 CORS
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-admin-panel.com'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 5.2 Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 5.3 Валидация
Использовать `zod` или `joi` для валидации всех входящих данных.

---

## 6. Error Handling

```javascript
// Стандартный формат ошибок
{
  "error": true,
  "message": "Описание ошибки",
  "code": "ERROR_CODE",
  "details": {} // опционально
}
```

**Коды ошибок:**
- `VALIDATION_ERROR` - ошибка валидации
- `NOT_FOUND` - ресурс не найден
- `CAMPAIGN_INVALID_STATUS` - недопустимый переход статуса
- `META_API_ERROR` - ошибка Meta API
- `REPLY_WINDOW_EXPIRED` - окно ответа истекло

---

## 7. Зависимости (package.json)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.39.0",
    "axios": "^1.6.2",
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.2",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
```

---

## 8. Дополнительные соображения

### 8.1 Rate Limiting для Meta API
Meta имеет лимиты на количество сообщений. Для новых номеров:
- Tier 1: 1,000 сообщений/день
- Tier 2: 10,000 сообщений/день
- И т.д.

Бэкенд должен учитывать эти лимиты и не превышать их.

### 8.2 Retry логика
При ошибках Meta API (429, 5xx) - повторять с exponential backoff.

### 8.3 Мониторинг
Логировать все запросы к Meta API и их результаты для отладки.

---

## 9. Тестирование

### 9.1 Проверка подключения
```bash
curl http://localhost:3001/api/settings/status
```

### 9.2 Синхронизация шаблонов
```bash
curl -X POST http://localhost:3001/api/templates/sync
```

### 9.3 Создание кампании
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","template_id":"uuid","contact_ids":["uuid1"]}'
```
