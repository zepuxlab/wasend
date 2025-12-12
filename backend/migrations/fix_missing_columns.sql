-- SQL скрипт для добавления недостающих колонок и индексов
-- Основан на анализе кода приложения

-- ============================================
-- 1. НЕДОСТАЮЩИЕ КОЛОНКИ
-- ============================================

-- 1.1. Добавить колонку reply_window_expires_at в chats
-- Используется в: webhook.ts (строки 80, 88), chats.ts (строка 70)
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS reply_window_expires_at timestamptz;

-- 1.2. Добавить колонку error_message в campaigns
-- Используется в: messageWorker.ts (строка 94), campaigns.ts (строки 268, 278)
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS error_message text;

-- 1.3. Исправить колонку message_type в messages
-- В коде webhook.ts используется 'type', но в схеме БД указан 'message_type'
-- Проверяем и исправляем
DO $$
BEGIN
  -- Если есть колонка 'type', переименовать в 'message_type'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN type TO message_type;
  END IF;
  
  -- Если нет ни type, ни message_type, создать message_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'message_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN message_type message_type DEFAULT 'text';
  END IF;
END $$;

-- ============================================
-- 2. УНИКАЛЬНЫЕ ИНДЕКСЫ (для upsert)
-- ============================================

-- 2.1. Уникальный индекс для contact_list_members (нужен для upsert в supabase.ts:294)
CREATE UNIQUE INDEX IF NOT EXISTS contact_list_members_unique 
ON public.contact_list_members(list_id, contact_id);

-- ============================================
-- 3. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индексы для campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON public.campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);

-- Индексы для campaign_recipients
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON public.campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_whatsapp_message_id ON public.campaign_recipients(whatsapp_message_id);

-- Индексы для contacts
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_opt_in ON public.contacts(opt_in);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN(tags);

-- Индексы для chats
CREATE INDEX IF NOT EXISTS idx_chats_contact_id ON public.chats(contact_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON public.chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON public.chats(last_message_at);

-- Индексы для messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id ON public.messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Индексы для activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_campaign_id ON public.activity_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_contact_id ON public.activity_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Индексы для notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_chat_id ON public.notifications(chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contact_id ON public.notifications(contact_id);

-- Индексы для user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Индексы для templates
CREATE INDEX IF NOT EXISTS idx_templates_whatsapp_template_id ON public.templates(whatsapp_template_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON public.templates(status);

-- Индексы для contact_lists
CREATE INDEX IF NOT EXISTS idx_contact_lists_created_at ON public.contact_lists(created_at);

-- ============================================
-- 4. ПРОВЕРКА ENUM ЗНАЧЕНИЙ
-- ============================================

-- В БД указан enum campaign_status: draft, ready, running, paused, stopped, completed, failed
-- В коде используется: draft, running, paused, stopped, completed, failed
-- Значение 'ready' не используется в коде, но есть в enum - это нормально

-- ============================================
-- 5. ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================

-- Проверка добавленных колонок
SELECT 
  'chats.reply_window_expires_at' as column_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chats' 
    AND column_name = 'reply_window_expires_at'
  ) as exists

UNION ALL

SELECT 
  'campaigns.error_message' as column_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'campaigns' 
    AND column_name = 'error_message'
  ) as exists

UNION ALL

SELECT 
  'messages.message_type' as column_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'message_type'
  ) as exists;

