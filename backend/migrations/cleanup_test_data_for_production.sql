-- SQL скрипт для удаления всех тестовых данных перед переходом на реальный Meta API
-- ВАЖНО: Этот скрипт удаляет ВСЕ данные кроме пользователей и их ролей
-- Выполняйте только если уверены, что хотите очистить все данные!

BEGIN;

-- 1. Удалить все уведомления
DELETE FROM notifications;

-- 2. Удалить все сообщения
DELETE FROM messages;

-- 3. Удалить все чаты
DELETE FROM chats;

-- 4. Удалить всех получателей кампаний
DELETE FROM campaign_recipients;

-- 5. Удалить все кампании
DELETE FROM campaigns;

-- 6. Удалить все шаблоны (если они были созданы вручную для тестов)
-- ВНИМАНИЕ: Если у вас есть реальные шаблоны из Meta API, закомментируйте эту строку
-- DELETE FROM templates;

-- 7. Удалить все списки контактов
DELETE FROM contact_lists;

-- 8. Удалить все контакты (которые были созданы автоматически или вручную для тестов)
-- ВНИМАНИЕ: Если у вас есть реальные контакты, которые нужно сохранить, закомментируйте эту строку
DELETE FROM contacts;

-- 9. Удалить все логи активности
DELETE FROM activity_logs;

-- 10. Сбросить счетчики последовательностей (опционально, если нужно начать с ID=1)
-- ВНИМАНИЕ: Раскомментируйте только если хотите сбросить автоинкремент
-- ALTER SEQUENCE campaigns_id_seq RESTART WITH 1;
-- ALTER SEQUENCE contacts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE chats_id_seq RESTART WITH 1;
-- ALTER SEQUENCE messages_id_seq RESTART WITH 1;
-- ALTER SEQUENCE campaign_recipients_id_seq RESTART WITH 1;
-- ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1;

-- 11. Очистить настройки кампаний (опционально - если хотите сбросить к дефолтным)
-- DELETE FROM settings WHERE key = 'campaign_settings';

COMMIT;

-- Проверка: посмотреть сколько данных осталось
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'chats', COUNT(*) FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'campaign_recipients', COUNT(*) FROM campaign_recipients
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
ORDER BY table_name;

