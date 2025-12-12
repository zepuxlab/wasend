# Настройка Supabase

## 📋 Как получить данные Supabase

### 1. Создайте проект в Supabase

1. Перейдите на [https://supabase.com](https://supabase.com)
2. Зарегистрируйтесь или войдите в аккаунт
3. Нажмите **"New Project"**
4. Заполните данные:
   - **Name**: название проекта (например, "WhatsApp Admin")
   - **Database Password**: придумайте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший регион
   - **Pricing Plan**: выберите Free план для тестирования

### 2. Получите ключи API

После создания проекта:

1. Перейдите в **Settings** (⚙️) → **API**
2. Найдите секцию **"Project API keys"**

Вам понадобятся:

#### SUPABASE_URL
- Находится в разделе **"Project URL"**
- Формат: `https://xxxxxxxxxxxxx.supabase.co`
- Скопируйте этот URL

#### SUPABASE_ANON_KEY (Public/Anon Key)
- Находится в разделе **"Project API keys"** → **"anon" "public"**
- Это публичный ключ для фронтенда
- Безопасно использовать на клиенте
- Скопируйте этот ключ

#### SUPABASE_SERVICE_KEY (Service Role Key)
- Находится в разделе **"Project API keys"** → **"service_role" "secret"**
- ⚠️ **ВАЖНО**: Это секретный ключ! Используйте ТОЛЬКО на бэкенде!
- Никогда не публикуйте его в клиентском коде!
- Скопируйте этот ключ

### 3. Пример данных

```
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjoxOTQ1NjY2NjY2fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjMwMDAwMDAwLCJleHAiOjE5NDU2NjY2NjZ9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

### 4. Создайте таблицы в базе данных

После получения ключей нужно создать структуру базы данных:

1. Перейдите в **SQL Editor** в Supabase
2. Создайте новый запрос
3. Скопируйте SQL схему (см. ниже или в `frontend/src/pages/Settings.tsx`)

Или используйте кнопку **"Копировать SQL схему"** на странице Settings во фронтенде.

### 5. Настройте .env файл

Создайте файл `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase (ОБЯЗАТЕЛЬНО)
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_SERVICE_KEY=ваш-service-role-key
SUPABASE_ANON_KEY=ваш-anon-key

# Meta WhatsApp Cloud API (пока можно оставить пустым для теста)
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_BUSINESS_ACCOUNT_ID=
META_WEBHOOK_VERIFY_TOKEN=

# Redis (для очередей, можно оставить по умолчанию)
REDIS_URL=redis://localhost:6379

# Optional
JWT_SECRET=
```

## 🔍 Где найти ключи в интерфейсе Supabase

```
Supabase Dashboard
├── Settings (⚙️)
    └── API
        ├── Project URL          → SUPABASE_URL
        └── Project API keys
            ├── anon public      → SUPABASE_ANON_KEY
            └── service_role     → SUPABASE_SERVICE_KEY
```

## ⚠️ Важные замечания

1. **Service Role Key** - это "супер-ключ" с полным доступом к базе данных
   - Используйте ТОЛЬКО на бэкенде
   - Никогда не публикуйте в Git
   - Добавьте в `.gitignore`

2. **Anon Key** - публичный ключ
   - Безопасно использовать на фронтенде
   - Имеет ограниченные права (зависит от Row Level Security)

3. **Database Password** - нужен только для прямого подключения к PostgreSQL
   - В нашем случае не используется (используем API)

## 🚀 Быстрый старт

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте ключи из Settings → API
3. Вставьте их в `backend/.env`
4. Запустите бэкенд: `cd backend && npm run dev`

## 📚 Дополнительные ресурсы

- [Документация Supabase](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)

