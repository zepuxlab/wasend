-- SQL скрипт для удаления тестовых шаблонов и всех связанных данных
-- ВНИМАНИЕ: Этот скрипт удалит все шаблоны, содержащие "Тестово" в названии,
-- а также все кампании, получателей, логи и другие связанные данные

BEGIN;

-- 1. Удалить получателей кампаний, которые используют тестовые шаблоны
DELETE FROM public.campaign_recipients
WHERE campaign_id IN (
  SELECT c.id
  FROM public.campaigns c
  INNER JOIN public.templates t ON c.template_id = t.id
  WHERE t.name LIKE '%Тестово%'
);

-- 2. Удалить логи активности для кампаний с тестовыми шаблонами
DELETE FROM public.activity_logs
WHERE campaign_id IN (
  SELECT c.id
  FROM public.campaigns c
  INNER JOIN public.templates t ON c.template_id = t.id
  WHERE t.name LIKE '%Тестово%'
);

-- 3. Удалить кампании, которые используют тестовые шаблоны
DELETE FROM public.campaigns
WHERE template_id IN (
  SELECT id
  FROM public.templates
  WHERE name LIKE '%Тестово%'
);

-- 4. Удалить сами тестовые шаблоны
DELETE FROM public.templates
WHERE name LIKE '%Тестово%';

-- Проверка: показать сколько записей было удалено
-- (это можно выполнить отдельно для проверки перед удалением)

-- SELECT 
--   (SELECT COUNT(*) FROM public.templates WHERE name LIKE '%Тестово%') as templates_to_delete,
--   (SELECT COUNT(*) FROM public.campaigns c 
--    INNER JOIN public.templates t ON c.template_id = t.id 
--    WHERE t.name LIKE '%Тестово%') as campaigns_to_delete,
--   (SELECT COUNT(*) FROM public.campaign_recipients cr
--    INNER JOIN public.campaigns c ON cr.campaign_id = c.id
--    INNER JOIN public.templates t ON c.template_id = t.id
--    WHERE t.name LIKE '%Тестово%') as recipients_to_delete,
--   (SELECT COUNT(*) FROM public.activity_logs al
--    INNER JOIN public.campaigns c ON al.campaign_id = c.id
--    INNER JOIN public.templates t ON c.template_id = t.id
--    WHERE t.name LIKE '%Тестово%') as logs_to_delete;

COMMIT;

-- Если нужно удалить ВСЕ тестовые данные (включая контакты, чаты, сообщения),
-- раскомментируйте следующие блоки:

-- BEGIN;
-- 
-- -- Удалить сообщения из чатов тестовых контактов
-- DELETE FROM public.messages
-- WHERE chat_id IN (
--   SELECT id
--   FROM public.chats
--   WHERE contact_id IN (
--     SELECT id
--     FROM public.contacts
--     WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
--   )
-- );
-- 
-- -- Удалить чаты тестовых контактов
-- DELETE FROM public.chats
-- WHERE contact_id IN (
--   SELECT id
--   FROM public.contacts
--   WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
-- );
-- 
-- -- Удалить уведомления для тестовых контактов
-- DELETE FROM public.notifications
-- WHERE contact_id IN (
--   SELECT id
--   FROM public.contacts
--   WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
-- );
-- 
-- -- Удалить контакты из списков
-- DELETE FROM public.contact_list_members
-- WHERE contact_id IN (
--   SELECT id
--   FROM public.contacts
--   WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
-- );
-- 
-- -- Удалить тестовые контакты
-- DELETE FROM public.contacts
-- WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%';
-- 
-- COMMIT;

