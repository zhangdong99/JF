FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# 启动前自动执行数据库迁移；SEED_ON_START=true 时导入种子数据
CMD ["sh", "-c", "alembic upgrade head && (python -m app.seed.seed_data || true) && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
