"""系统评分服务：按 score_dimension 权重计算加权总分与等级。"""

from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ScoreDimension, SystemInfo, SystemScore, SystemScoreTotal


def grade_of(total: Decimal) -> str:
    t = float(total)
    if t >= 80:
        return "高价值"
    if t >= 60:
        return "有价值需改善"
    if t >= 40:
        return "价值存疑"
    return "低价值候选"


def save_scores(
    db: Session, system_id: int, items: list[dict], comment: str | None
) -> tuple[Decimal, str, list[dict]]:
    """items: [{dimension_code, score}]。upsert system_score，插入历史 total。"""
    system = db.get(SystemInfo, system_id)
    if not system:
        raise HTTPException(404, f"系统 id={system_id} 不存在")

    dims = {d.code: d for d in db.scalars(select(ScoreDimension)).all()}
    detail: list[dict] = []
    weighted_sum = Decimal("0")
    weight_sum = Decimal("0")

    for it in items:
        code, score = it["dimension_code"], Decimal(str(it["score"]))
        dim = dims.get(code)
        if not dim:
            raise HTTPException(400, f"评分维度 {code} 不存在")
        if not (0 <= score <= 100):
            raise HTTPException(400, f"维度 {code} 分值须在 0-100")
        existing = db.scalar(
            select(SystemScore).where(
                SystemScore.system_id == system_id, SystemScore.dimension_id == dim.id
            )
        )
        if existing:
            existing.score = score
        else:
            db.add(SystemScore(system_id=system_id, dimension_id=dim.id, score=score))
        weighted_sum += score * dim.weight
        weight_sum += dim.weight
        detail.append({"dimension_code": code, "score": score})

    total = (weighted_sum / weight_sum).quantize(Decimal("0.01"), ROUND_HALF_UP)
    grade = grade_of(total)
    db.add(SystemScoreTotal(system_id=system_id, total=total, grade=grade, comment=comment))
    db.commit()
    return total, grade, detail
