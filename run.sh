#!/usr/bin/env bash

# MY_DOC: Запуск персонального медицинского AI-ассистента
echo "🚀 Запуск MY_DOC..."

# Остановка фоновых процессов при выходе
trap 'kill $(jobs -p)' EXIT

# 1. Запуск Backend (FastAPI)
echo "🩺 Запуск бэкенда на http://localhost:8000..."
./backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &

# 2. Запуск Frontend (Next.js)
echo "💻 Запуск фронтенда на http://localhost:3000..."
cd frontend && npm run dev &

echo "✨ Система MY_DOC запущена!"
echo "👉 Откройте в браузере: http://localhost:3000"
echo "👉 API Документация: http://localhost:8000/docs"

wait
