"""通用 CRUD 辅助：过滤、分页、审计。"""

from typing import Any

from fastapi import HTTPException, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import String, func, inspect
from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit(
    db: Session, request: Request, entity: str, entity_id: Any, action: str, detail: dict | None
) -> None:
    db.add(
        AuditLog(
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            action=action,
            detail=jsonable_encoder(detail) if detail is not None else None,
            actor=request.headers.get("X-Actor", "system"),
        )
    )


def paginate(db: Session, model, query, page: int, page_size: int):
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return total, page, page_size, items


def apply_filters(model, query, keyword: str | None, status: str | None, search_fields: list[str]):
    if keyword:
        conds = [getattr(model, f).ilike(f"%{keyword}%") for f in search_fields]
        query = query.filter(func.coalesce(*conds, "").ilike(f"%{keyword}%"))
    if status and hasattr(model, "status"):
        query = query.filter(model.status == status)
    return query


def get_or_404(db: Session, model, id: int):
    obj = db.get(model, id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} id={id} 不存在")
    return obj


def set_attrs(obj, data: dict, model) -> None:
    cols = {c.key for c in inspect(model).mapper.column_attrs}
    for k, v in data.items():
        if k in cols and v is not None or (k in cols and v is not None):
            setattr(obj, k, v)


def order_by_id(model):
    return model.id


def like_col(col):
    return func.cast(col, String).ilike
