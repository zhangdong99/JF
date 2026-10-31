# AI-Office 产品组合治理平台

可视化治理 200+ 信息系统 → 约 10 个产品的产品组合：系统台账、产品归属、100 分制评分卡、
需求准入评分、整合处置与治理指标看板。

## 架构

```
React 18 + AntD 5 + ECharts   (frontend, :5173 dev / :8080 docker)
        │  /api/v1（vite 代理 / nginx 反代）
FastAPI + SQLAlchemy 2.0 + Alembic  (backend, :8000)
        │
PostgreSQL 17  ai_office 库 · product_governance schema（复用现有 docker/postgres）
```

## 目录

| 路径 | 说明 |
|---|---|
| `backend/` | FastAPI 后端（app/ 源码、migrations/ Alembic、seed 种子数据） |
| `frontend/` | React 前端（7 个页面：看板/架构总览/系统/产品/需求/处置/指标） |
| `docker/compose.yaml` | postgres + n8n（原有） |
| `docker/compose.apps.yaml` | backend + frontend（本平台，与上面合并使用） |

## 方式一：Docker 运行（推荐，一体化运维）

```powershell
cd D:\Projects\AI-Office\docker
docker compose -f compose.yaml -f compose.apps.yaml up -d --build
```

- 前端：http://localhost:8080
- 后端 API 文档：http://localhost:8000/docs

说明：
- 后端容器启动时自动执行 `alembic upgrade head` 并尝试导入种子数据（已初始化过则跳过）。
- 数据库密码从 `docker/.env` 的 `POSTGRES_PASSWORD` 注入，镜像与代码中不含任何密钥。
- 只影响 `product_governance` schema，不触碰 n8n 库与已有数据。

## 方式二：本地开发

后端：

```powershell
cd D:\Projects\AI-Office\backend
.venv\Scripts\alembic upgrade head                 # 迁移
.venv\Scripts\python -m app.seed.seed_data --reset # 种子数据（幂等）
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

前端：

```powershell
cd D:\Projects\AI-Office\frontend
pnpm install
pnpm dev    # http://localhost:5173，/api 代理到 8000
```

## 数据模型（schema product_governance，11 表）

- `product_domain` 一级产品域 → `product` 正式产品 → `system_info` 系统台账（主归属 + `system_product_dependency` 跨产品共享）
- `score_dimension`（10 维度权重）+ `system_score`（明细）+ `system_score_total`（评估历史）
  加权总分 = Σ(维度分 × 权重)/100；等级：80-100 高价值 / 60-79 有价值需改善 / 40-59 价值存疑 / 0-39 低价值候选
- `requirement` 需求准入（六维权重 30/20/20/15/10/5，自动算加权分与决策）
- `disposal` 整合处置（保留/优化/整合/替换/停用）
- `indicator` 治理指标、`audit_log` 审计日志（写操作经 `X-Actor` 头记录）

## 方案管理 + AI 修改建议闭环（已上线）

前台「方案管理」菜单维护治理方案（Markdown），支持版本历史与回滚。两条 AI 触发链路：

1. **数据变化**：需求/处置新增或修改后，后端自动触发关联方案（related_domains 含"需求运营"）的审查；
2. **领导意见**：方案详情页提交意见后触发。

链路：后端 → n8n `POST /webhook/plan-review` → 拉取方案+业务数据上下文 → Ollama qwen3:8b 生成修改稿 → 回写平台（状态=待确认）→ 尝试邮件通知负责人 → 负责人在前台**采纳**（生成新版本 source=AI采纳）或**驳回**。

邮件通知需在 n8n 界面为「AI-Office 方案AI审查与建议」工作流的「邮件通知负责人」节点配置 SMTP 凭据；未配置时邮件失败不影响建议入库，建议始终可在平台前台查看确认。

工作流备份：`workflows/n8n_system_import.json`（CSV 导入）、`workflows/n8n_plan_review.json`（方案AI审查）。

## 后续扩展点

- 新增业务表：改 `backend/app/models` → `alembic revision --autogenerate -m "..."` → `upgrade head`
- 对接 n8n：n8n 工作流直接调用 `/api/v1/...` REST 接口即可写入台账/需求
- Excel 批量导入：可在 n8n 解析后调 POST /systems、/requirements 入库
