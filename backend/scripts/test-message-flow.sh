#!/bin/bash

# Скрипт для тестирования полного цикла отправки и получения сообщений
# Использование: ./test-message-flow.sh <phone_number> <message>

PHONE=${1:-"+971501234567"}
MESSAGE=${2:-"Test message from campaign"}

BACKEND_URL=${BACKEND_URL:-"http://localhost:3005"}

echo "🧪 Testing message flow..."
echo "Phone: $PHONE"
echo "Message: $MESSAGE"
echo ""

# 1. Имитация отправки сообщения из рассылки
echo "📤 Step 1: Simulating outbound message (like from campaign)..."
OUTBOUND_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/webhook/test-outbound" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"$PHONE\",
    \"message\": \"$MESSAGE\"
  }")

echo "Response: $OUTBOUND_RESPONSE"
CHAT_ID=$(echo $OUTBOUND_RESPONSE | grep -o '"chat_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CHAT_ID" ]; then
  echo "❌ Failed to create outbound message"
  exit 1
fi

echo "✅ Outbound message created. Chat ID: $CHAT_ID"
echo ""

# 2. Имитация ответа пользователя
echo "📥 Step 2: Simulating user reply..."
sleep 2

INBOUND_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/webhook/test-incoming" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"$PHONE\",
    \"message\": \"Thank you! I received your message.\"
  }")

echo "Response: $INBOUND_RESPONSE"
echo "✅ Inbound message created"
echo ""

echo "🎉 Test complete! Check the chat in admin panel:"
echo "   Chat ID: $CHAT_ID"
echo "   URL: http://localhost:5173/wasend/chats?chat=$CHAT_ID"

