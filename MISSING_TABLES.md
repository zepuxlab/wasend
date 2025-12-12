# 📋 Список необходимых таблиц для WhatsApp Campaign System

## ✅ Обязательные таблицы (13 штук)

### 1. **user_roles** - Роли пользователей
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);
```
**Нужна для:** Управления правами доступа (admin, manager, user)

---

### 2. **profiles** - Профили пользователей
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Хранения данных пользователей

---

### 3. **settings** - Настройки системы
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Хранения настроек API и конфигурации

---

### 4. **contacts** - Контакты
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  country TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  opt_in BOOLEAN DEFAULT FALSE,
  opt_in_at TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Хранения контактов для рассылок

---

### 5. **contact_lists** - Списки контактов
```sql
CREATE TABLE contact_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Группировки контактов в списки

---

### 6. **contact_list_members** - Связь контактов и списков
```sql
CREATE TABLE contact_list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, contact_id)
);
```
**Нужна для:** Связи контактов со списками (many-to-many)

---

### 7. **templates** - WhatsApp шаблоны
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_template_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL,
  status template_status DEFAULT 'pending',
  components JSONB DEFAULT '[]',
  variables TEXT[] DEFAULT '{}',
  preview_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Хранения шаблонов сообщений WhatsApp

---

### 8. **campaigns** - Кампании рассылок
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES templates(id),
  status campaign_status DEFAULT 'draft',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  variable_mapping JSONB DEFAULT '{}',
  rate_limit_per_batch INTEGER DEFAULT 50,
  rate_limit_delay_seconds INTEGER DEFAULT 60,
  hourly_cap INTEGER,
  daily_cap INTEGER,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Управления кампаниями рассылок

---

### 9. **campaign_recipients** - Получатели кампаний
```sql
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status message_status DEFAULT 'pending',
  variables JSONB DEFAULT '{}',
  whatsapp_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);
```
**Нужна для:** Отслеживания статуса отправки каждому получателю

---

### 10. **message_queue** - Очередь сообщений (опционально)
```sql
CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Очереди сообщений (но система использует BullMQ/Redis, так что эта таблица может не использоваться)

---

### 11. **activity_logs** - Логи активности
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  phone TEXT,
  details JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Логирования всех действий в системе

---

### 12. **chats** - Чаты
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status chat_status DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Управления чатами с контактами

---

### 13. **messages** - Сообщения
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  template_name TEXT,
  status message_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Нужна для:** Хранения истории сообщений

---

## 📝 Также нужны типы (ENUM)

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE campaign_status AS ENUM ('draft', 'ready', 'running', 'paused', 'stopped', 'completed', 'failed');
CREATE TYPE message_status AS ENUM ('pending', 'queued', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE template_status AS ENUM ('approved', 'pending', 'rejected');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_type AS ENUM ('text', 'template', 'image', 'document');
CREATE TYPE chat_status AS ENUM ('open', 'closed');
```

---

## 🔍 Как проверить, какие таблицы у вас есть

1. Откройте Supabase Dashboard → SQL Editor
2. Запустите скрипт из файла `CHECK_TABLES.sql`
3. Посмотрите, какие таблицы отмечены как "✅ Нужна"
4. Создайте недостающие таблицы, используя полную SQL схему из `frontend/src/pages/Settings.tsx`

---

## ⚠️ Важно

- **message_queue** может не использоваться, если система использует BullMQ/Redis (что и происходит)
- Все остальные таблицы **обязательны** для работы системы
- Не забудьте создать индексы и RLS политики (см. полную схему в Settings.tsx)

