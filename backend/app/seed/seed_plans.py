"""方案种子数据导入：python -m app.seed.seed_plans

幂等：按 title 查重；内容取自 app/seed/seed_plans_data.md。
"""

import sys
from pathlib import Path

from app.core.db import SessionLocal
from app.models import PlanDoc
from app.api.plans import _add_version

SEED_FILE = Path(__file__).parent / "seed_plans_data.md"

SEED_PLAN = {
    "title": "产品运营方案",
    "category": "产品运营",
    "related_domains": "产品运营,需求运营",
    "status": "已发布",
    "owner": "产品运营负责人",
    "owner_email": "product-ops@example.com",
}


def seed_plans(db) -> None:
    content = SEED_FILE.read_text(encoding="utf-8")
    existing = db.query(PlanDoc).filter_by(title=SEED_PLAN["title"]).one_or_none()
    if existing:
        print(f"方案「{SEED_PLAN['title']}」已存在，跳过")
        return
    plan = PlanDoc(**SEED_PLAN, content_md=content)
    db.add(plan)
    db.flush()
    _add_version(db, plan, "初始导入", "seed")
    db.commit()
    print(f"方案「{plan.title}」已写入（id={plan.id}）")


def main() -> None:
    db = SessionLocal()
    try:
        seed_plans(db)
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
