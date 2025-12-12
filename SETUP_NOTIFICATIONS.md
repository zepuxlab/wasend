# Настройка системы уведомлений

## Шаг 1: Создание таблицы notifications

Выполните SQL миграцию в Supabase SQL Editor:

```sql
-- Создать таблицу notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'new_message',
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policy (разрешить пользователям читать свои уведомления)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика для создания уведомлений (для backend)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

Или используйте файл миграции:
```bash
# Скопируйте содержимое backend/migrations/create_notifications.sql
# и выполните в Supabase SQL Editor
```

## Как это работает

### 1. Автоматическое создание уведомлений

Когда приходит входящее сообщение через webhook:
- Система находит или создает контакт
- Создает или обновляет чат
- Сохраняет сообщение
- **Создает уведомление для всех пользователей с ролями admin и manager**

### 2. Отображение уведомлений

В правом верхнем углу панели:
- **Иконка колокольчика** с бейджем количества непрочитанных
- При клике открывается попап со списком уведомлений
- Показываются только непрочитанные уведомления

### 3. Функции уведомлений

- **Просмотр уведомлений**: Клик на иконку колокольчика
- **Переход в чат**: Клик на уведомление открывает соответствующий чат
- **Отметить как прочитанное**: Автоматически при клике на уведомление
- **Отметить все как прочитанные**: Кнопка "Mark all read"
- **Автообновление**: Уведомления обновляются каждые 30 секунд

### 4. Информация в уведомлении

Каждое уведомление содержит:
- **Заголовок**: "New message from [Имя контакта]"
- **Текст сообщения**: Первые 100 символов
- **Имя/телефон контакта**
- **Время получения**

## Проверка работы

1. Отправьте тестовое сообщение на WhatsApp номер из кампании
2. Проверьте, что уведомление появилось в панели
3. Кликните на уведомление - должен открыться соответствующий чат
4. Уведомление должно автоматически отметиться как прочитанное

## Важно

- Уведомления создаются только для пользователей с ролями **admin** и **manager**
- Пользователи с ролью **user** не получают уведомления
- Уведомления автоматически обновляются каждые 30 секунд
- При клике на уведомление открывается соответствующий чат

## API Endpoints

- `GET /api/notifications` - Получить все уведомления
- `GET /api/notifications/unread-count` - Получить количество непрочитанных
- `PATCH /api/notifications/:id/read` - Отметить как прочитанное
- `PATCH /api/notifications/read-all` - Отметить все как прочитанные

