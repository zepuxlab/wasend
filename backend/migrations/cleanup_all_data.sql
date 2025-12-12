-- SQL скрипт для очистки всех данных кроме пользователей и их ролей
-- ВНИМАНИЕ: Этот скрипт удаляет ВСЕ данные из следующих таблиц:
-- - campaigns, campaign_recipients
-- - chats, messages
-- - contacts, contact_lists, contact_list_members
-- - templates
-- - notifications
-- - activity_logs
-- 
-- НЕ удаляет:
-- - users (если есть таблица)
-- - user_roles
-- - settings (настройки системы)

BEGIN;

-- 1. Удалить получателей кампаний
DELETE FROM campaign_recipients;

-- 2. Удалить кампании
DELETE FROM campaigns;

-- 3. Удалить сообщения
DELETE FROM messages;

-- 4. Удалить чаты
DELETE FROM chats;

-- 5. Удалить связи контактов со списками
DELETE FROM contact_list_members;

-- 6. Удалить списки контактов
DELETE FROM contact_lists;

-- 7. Удалить контакты
DELETE FROM contacts;

-- 8. Удалить шаблоны
DELETE FROM templates;

-- 9. Удалить уведомления
DELETE FROM notifications;

-- 10. Удалить логи активности
DELETE FROM activity_logs;

-- Сбросить последовательности (автоинкременты) для чистоты
ALTER SEQUENCE IF EXISTS campaigns_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS campaign_recipients_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS chats_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS messages_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS contacts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS contact_lists_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS templates_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS activity_logs_id_seq RESTART WITH 1;

COMMIT;

-- Проверка: показать оставшиеся данные
SELECT 
  'campaigns' as table_name, COUNT(*) as count FROM campaigns
UNION ALL
SELECT 'campaign_recipients', COUNT(*) FROM campaign_recipients
UNION ALL
SELECT 'chats', COUNT(*) FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'contact_lists', COUNT(*) FROM contact_lists
UNION ALL
SELECT 'contact_list_members', COUNT(*) FROM contact_list_members
UNION ALL
SELECT 'templates', COUNT(*) FROM templates
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
ORDER BY table_name;

