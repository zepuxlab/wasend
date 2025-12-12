-- SQL скрипт для удаления ВСЕХ тестовых данных
-- ВНИМАНИЕ: Этот скрипт удалит все данные, содержащие "Тестово" в названии:
-- - Шаблоны
-- - Кампании
-- - Получатели кампаний
-- - Логи активности
-- - Контакты
-- - Чаты
-- - Сообщения
-- - Уведомления

BEGIN;

-- 1. Удалить получателей кампаний с тестовыми шаблонами
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

-- 3. Удалить кампании с тестовыми шаблонами
DELETE FROM public.campaigns
WHERE template_id IN (
  SELECT id
  FROM public.templates
  WHERE name LIKE '%Тестово%'
);

-- 4. Удалить тестовые шаблоны
DELETE FROM public.templates
WHERE name LIKE '%Тестово%';

-- 5. Удалить сообщения из чатов тестовых контактов
DELETE FROM public.messages
WHERE chat_id IN (
  SELECT id
  FROM public.chats
  WHERE contact_id IN (
    SELECT id
    FROM public.contacts
    WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
  )
);

-- 6. Удалить уведомления для тестовых контактов
DELETE FROM public.notifications
WHERE contact_id IN (
  SELECT id
  FROM public.contacts
  WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
)
OR chat_id IN (
  SELECT id
  FROM public.chats
  WHERE contact_id IN (
    SELECT id
    FROM public.contacts
    WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
  )
);

-- 7. Удалить чаты тестовых контактов
DELETE FROM public.chats
WHERE contact_id IN (
  SELECT id
  FROM public.contacts
  WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
);

-- 8. Удалить контакты из списков
DELETE FROM public.contact_list_members
WHERE contact_id IN (
  SELECT id
  FROM public.contacts
  WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%'
);

-- 9. Удалить тестовые контакты
DELETE FROM public.contacts
WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%';

COMMIT;

-- Для проверки перед удалением выполните:
-- SELECT 
--   (SELECT COUNT(*) FROM public.templates WHERE name LIKE '%Тестово%') as templates,
--   (SELECT COUNT(*) FROM public.campaigns c 
--    INNER JOIN public.templates t ON c.template_id = t.id 
--    WHERE t.name LIKE '%Тестово%') as campaigns,
--   (SELECT COUNT(*) FROM public.campaign_recipients cr
--    INNER JOIN public.campaigns c ON cr.campaign_id = c.id
--    INNER JOIN public.templates t ON c.template_id = t.id
--    WHERE t.name LIKE '%Тестово%') as recipients,
--   (SELECT COUNT(*) FROM public.contacts
--    WHERE name LIKE '%Тестово%' OR phone LIKE '%тест%') as contacts,
--   (SELECT COUNT(*) FROM public.chats ch
--    INNER JOIN public.contacts co ON ch.contact_id = co.id
--    WHERE co.name LIKE '%Тестово%' OR co.phone LIKE '%тест%') as chats,
--   (SELECT COUNT(*) FROM public.messages m
--    INNER JOIN public.chats ch ON m.chat_id = ch.id
--    INNER JOIN public.contacts co ON ch.contact_id = co.id
--    WHERE co.name LIKE '%Тестово%' OR co.phone LIKE '%тест%') as messages;

