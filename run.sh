#!/usr/bin/env bash

# Переходим в директорию скрипта независимо от того, откуда он был вызван
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================="
echo "   🩺  Запуск MY_DOC AI Medical Assistant "
echo "========================================="

# 1. Освобождаем порты 8000 и 3000, если они были заняты
lsof -ti:8000,3000 2>/dev/null | xargs kill -9 2>/dev/null

# Функция аккуратного завершения при выходе (Ctrl+C)
cleanup() {
    echo ""
    echo "🛑 Остановка сервисов MY_DOC..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Запуск бэкенда (FastAPI)
echo "⚙️  Запуск бэкенда..."
"$PROJECT_DIR/backend/venv/bin/uvicorn" backend.main:app --host 127.0.0.1 --port 8000 --log-level warning &
BACKEND_PID=$!

# 3. Запуск фронтенда (Next.js)
echo "💻 Запуск интерфейса..."
(cd "$PROJECT_DIR/frontend" && npm run dev >/dev/null 2>&1) &
FRONTEND_PID=$!

# 4. Ожидание запуска и открытие браузера
echo "⏳ Проверка доступности сервисов..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/api/health >/dev/null 2>&1 && curl -s http://127.0.0.1:3000 >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo ""
echo "✅ Система MY_DOC готова к работе!"
echo "👉 Открываю браузер: http://localhost:3000"
echo "👉 Документация API: http://localhost:8000/docs"
echo "ℹ️  Для остановки нажмите Ctrl+C в этом окне"
echo ""

# Автоматически открываем браузер на Mac
open "http://localhost:3000"

# Ожидаем завершения процессов
wait
