-- Скрипт для проверки существующих таблиц в Supabase
-- Запустите этот скрипт в Supabase SQL Editor, чтобы увидеть, какие таблицы уже есть

-- Проверка всех таблиц в схеме public
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'user_roles',
      'profiles',
      'settings',
      'contacts',
      'contact_lists',
      'contact_list_members',
      'templates',
      'campaigns',
      'campaign_recipients',
      'message_queue',
      'activity_logs',
      'chats',
      'messages'
    ) THEN '✅ Нужна'
    ELSE '⚠️ Дополнительная'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 
  CASE 
    WHEN table_name IN (
      'user_roles',
      'profiles',
      'settings',
      'contacts',
      'contact_lists',
      'contact_list_members',
      'templates',
      'campaigns',
      'campaign_recipients',
      'message_queue',
      'activity_logs',
      'chats',
      'messages'
    ) THEN 1
    ELSE 2
  END,
  table_name;

-- Список ОБЯЗАТЕЛЬНЫХ таблиц для работы системы
-- Если какой-то таблицы нет в списке выше, её нужно создать

