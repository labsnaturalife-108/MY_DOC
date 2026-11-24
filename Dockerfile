# Stage 1: Build Next.js static frontend with relative /api URL
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# Stage 2: Python FastAPI backend + static web UI (Hugging Face Spaces port 7860)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs containers as UID 1000
RUN useradd -m -u 1000 user

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user backend/ ./backend/
COPY --chown=user:user hf_server.py ./hf_server.py
COPY --chown=user:user --from=frontend-builder /frontend/out ./dist_web/

# Ensure clean writable data directories for UID 1000
RUN rm -rf /app/backend/data /app/backend/venv /app/backend/__pycache__ && \
    mkdir -p /app/backend/data/uploads /app/backend/data/chroma && \
    chown -R user:user /app

USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HOST=0.0.0.0 \
    PORT=7860 \
    PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["python", "hf_server.py"]
