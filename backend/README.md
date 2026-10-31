# AI-Office 产品组合治理平台 Backend

FastAPI + SQLAlchemy 2.0 (sync) + Pydantic v2 + Alembic + PostgreSQL（schema：`product_governance`）。

## 目录结构

```
backend/
├── alembic.ini
├── requirements.txt
├── .env                    # 本地默认值（含敏感信息，勿提交）
├── .env.example            # 模板，密码用 ${POSTGRES_PASSWORD} 占位
├── migrations/
│   ├── env.py              # target_metadata 指向 app Base，自动 CREATE SCHEMA IF NOT EXISTS
│   └── versions/           # 初始迁移 fa76beed33bf
└── app/
    ├── main.py             # FastAPI 应用、CORS、统一异常
    ├── core/
    │   ├── config.py       # pydantic-settings，全部配置读环境变量/.env
    │   └── db.py           # engine / SessionLocal / Base / get_db
    ├── models/__init__.py  # 11 张表的声明式模型（schema product_governance）
    ├── schemas/__init__.py # Pydantic v2 请求/响应模型，统一 ApiResponse[T]
    ├── services/
    │   ├── crud.py         # 分页/审计辅助
    │   └── scoring.py      # 加权评分：sum(score*weight)/100 → 总分+等级
    ├── api/
    │   ├── dashboard.py    # /api/v1/dashboard/overview、/health
    │   ├── resources.py    # domains/products/systems/requirements/disposals/indicators CRUD
    │   ├── scores.py       # /systems/{id}/scores、/score-dimensions
    │   └── architecture.py # /architecture 四层治理框架静态结构
    └── seed/seed_data.py   # 种子数据（python -m app.seed.seed_data [--reset]）
```

## 环境变量（.env 示例）

```ini
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=admin
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=ai_office
DB_SCHEMA=product_governance
CORS_ORIGINS=["http://localhost:5173","http://localhost:8080"]
```

代码与 README 均不硬编码密码；`.env` 提供本地默认值，生产用环境变量覆盖。

## 启动（开发模式）

```powershell
cd backend
.venv\Scripts\pip install -r requirements.txt        # 首次
.venv\Scripts\alembic upgrade head                   # 迁移（自动建 schema）
.venv\Scripts\python -m app.seed.seed_data --reset   # 种子数据（可重复执行，幂等）
.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API 一览（统一前缀 /api/v1，响应 `{code, message, data}`）

- `GET /health`
- `GET /dashboard/overview`
- `/domains` `/products` `/systems` `/requirements` `/disposals` `/indicators`：`GET ?page/page_size/keyword/status`、`GET /{id}`、`POST`、`PATCH /{id}`、`DELETE /{id}`
- `GET /score-dimensions`；`POST /systems/{id}/scores`（10 维度评分 → 加权总分与等级，等级：80-100 高价值 / 60-79 有价值需改善 / 40-59 价值存疑 / 0-39 低价值候选）
- `GET /architecture`

写操作（POST/PATCH/DELETE）自动写入 `audit_log(entity, entity_id, action, detail JSONB, actor, created_at)`，actor 取请求头 `X-Actor`（默认 system）。
