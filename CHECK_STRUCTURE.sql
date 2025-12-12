-- Проверка структуры таблиц и необходимых компонентов
-- Запустите этот скрипт в Supabase SQL Editor

-- ============================================
-- 1. ПРОВЕРКА ТИПОВ (ENUM)
-- ============================================
SELECT 
  t.typname as type_name,
  CASE 
    WHEN t.typname IN ('app_role', 'campaign_status', 'message_status', 'template_status', 'message_direction', 'message_type', 'chat_status') 
    THEN '✅ Нужен'
    ELSE '⚠️ Дополнительный'
  END as status,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('app_role', 'campaign_status', 'message_status', 'template_status', 'message_direction', 'message_type', 'chat_status')
GROUP BY t.typname
ORDER BY 
  CASE 
    WHEN t.typname IN ('app_role', 'campaign_status', 'message_status', 'template_status', 'message_direction', 'message_type', 'chat_status') 
    THEN 1 
    ELSE 2 
  END;

-- ============================================
-- 2. ПРОВЕРКА КОЛОНОК В КЛЮЧЕВЫХ ТАБЛИЦАХ
-- ============================================

-- Проверка campaigns
SELECT 
  'campaigns' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaigns'
  AND column_name IN (
    'id', 'name', 'template_id', 'status', 'variable_mapping',
    'rate_limit_per_batch', 'rate_limit_delay_seconds',
    'total_recipients', 'sent_count', 'delivered_count', 'read_count', 'failed_count',
    'started_at', 'completed_at', 'created_at', 'updated_at'
  )
ORDER BY ordinal_position;

-- Проверка campaign_recipients
SELECT 
  'campaign_recipients' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaign_recipients'
  AND column_name IN (
    'id', 'campaign_id', 'contact_id', 'status', 'variables',
    'whatsapp_message_id', 'error_message',
    'sent_at', 'delivered_at', 'read_at'
  )
ORDER BY ordinal_position;

-- Проверка contacts
SELECT 
  'contacts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND column_name IN (
    'id', 'phone', 'name', 'tags', 'custom_fields', 'opt_in', 'opt_in_at'
  )
ORDER BY ordinal_position;

-- Проверка templates
SELECT 
  'templates' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'templates'
  AND column_name IN (
    'id', 'whatsapp_template_id', 'name', 'category', 'language', 
    'status', 'components', 'variables'
  )
ORDER BY ordinal_position;

-- ============================================
-- 3. ПРОВЕРКА ИНДЕКСОВ
-- ============================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename = 'campaigns' AND indexname LIKE '%status%' OR indexname LIKE '%created_at%'
    OR tablename = 'campaign_recipients' AND (indexname LIKE '%campaign%' OR indexname LIKE '%status%')
    OR tablename = 'contacts' AND (indexname LIKE '%phone%' OR indexname LIKE '%opt_in%' OR indexname LIKE '%tags%')
    OR tablename = 'templates' AND (indexname LIKE '%status%' OR indexname LIKE '%name%')
  )
ORDER BY tablename, indexname;

-- ============================================
-- 4. ПРОВЕРКА ФУНКЦИЙ
-- ============================================
SELECT 
  routine_name as function_name,
  CASE 
    WHEN routine_name IN ('has_role', 'get_user_role', 'handle_new_user', 'update_campaign_stats', 'update_updated_at', 'get_next_queue_batch')
    THEN '✅ Нужна'
    ELSE '⚠️ Дополнительная'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY 
  CASE 
    WHEN routine_name IN ('has_role', 'get_user_role', 'handle_new_user', 'update_campaign_stats', 'update_updated_at', 'get_next_queue_batch')
    THEN 1 
    ELSE 2 
  END;

-- ============================================
-- 5. ПРОВЕРКА ТРИГГЕРОВ
-- ============================================
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%updated_at%'
    OR trigger_name LIKE '%new_user%'
  )
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 6. ПРОВЕРКА RLS (Row Level Security)
-- ============================================
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ Включен' ELSE '❌ Выключен' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles', 'profiles', 'contacts', 'contact_lists', 
    'contact_list_members', 'templates', 'campaigns', 
    'campaign_recipients', 'activity_logs', 'chats', 'messages'
  )
ORDER BY tablename;

