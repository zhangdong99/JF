"""方案文档 + AI 修改建议 + 人工确认。"""

import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import (
    Disposal,
    PlanDoc,
    PlanFeedback,
    PlanSuggestion,
    PlanVersion,
    Requirement,
    SystemInfo,
    SystemScoreTotal,
)
from app.schemas import (
    ApiResponse,
    GradeDist,
    PageData,
    PlanContextOut,
    PlanDetailOut,
    PlanFeedbackIn,
    PlanFeedbackOut,
    PlanIn,
    PlanOut,
    PlanRelatedData,
    PlanRequirementBrief,
    PlanSuggestionConfirmIn,
    PlanSuggestionIn,
    PlanSuggestionOut,
    PlanSuggestionUpdateIn,
    PlanUpdate,
    PlanVersionOut,
)
from app.services import crud
from app.services.n8n import trigger_plan_review

logger = logging.getLogger("app.plans")

router_plans = APIRouter(prefix="/plans", tags=["plans"])

P = Query


def _actor(request: Request) -> str:
    return request.headers.get("X-Actor", "system")


def _add_version(db: Session, plan: PlanDoc, source: str, created_by: str | None) -> PlanVersion:
    next_no = (
        db.scalar(
            select(func.coalesce(func.max(PlanVersion.version_no), 0)).where(
                PlanVersion.plan_id == plan.id
            )
        )
        or 0
    ) + 1
    v = PlanVersion(
        plan_id=plan.id, content_md=plan.content_md, version_no=next_no,
        source=source, created_by=created_by,
    )
    db.add(v)
    db.flush()
    return v


def _plan_out(db: Session, plan: PlanDoc) -> PlanOut:
    o = PlanOut.model_validate(plan)
    o.version_count = (
        db.scalar(select(func.count()).select_from(PlanVersion).where(PlanVersion.plan_id == plan.id))
        or 0
    )
    o.pending_suggestions = (
        db.scalar(
            select(func.count()).select_from(PlanSuggestion).where(
                PlanSuggestion.plan_id == plan.id, PlanSuggestion.status == "pending"
            )
        )
        or 0
    )
    return o


def _plans_for_data_change(db: Session) -> list[PlanDoc]:
    """数据变更需触发的方案：related_domains 含“需求运营”或 category=需求运营。"""
    conds = (PlanDoc.category == "需求运营") | (PlanDoc.related_domains.ilike("%需求运营%"))
    return list(db.scalars(select(PlanDoc).where(conds)).all())


# ================= plan CRUD =================


@router_plans.get("", response_model=ApiResponse[PageData])
def list_plans(
    db: Session = Depends(get_db),
    page: int = P(1, ge=1, description="页码"),
    page_size: int = P(20, ge=1, le=200, description="每页条数"),
    keyword: str | None = P(None, description="关键字（title 模糊）"),
    title: str | None = P(None, description="标题过滤"),
    category: str | None = P(None, description="分类过滤"),
):
    q = select(PlanDoc)
    if keyword:
        q = q.where(PlanDoc.title.ilike(f"%{keyword}%"))
    if title:
        q = q.where(PlanDoc.title.ilike(f"%{title}%"))
    if category:
        q = q.where(PlanDoc.category == category)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(
        q.order_by(PlanDoc.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    data = PageData(
        total=total or 0, page=page, page_size=page_size,
        items=[_plan_out(db, x).model_dump() for x in items],
    )
    return ApiResponse(data=data)


@router_plans.get("/suggestions/{suggestion_id:int}/confirm", include_in_schema=False)
def confirm_get_not_allowed(suggestion_id: int):
    return ApiResponse(code=405, message="请使用 POST 提交确认")


@router_plans.post("", response_model=ApiResponse[PlanDetailOut], status_code=201)
def create_plan(payload: PlanIn, request: Request, db: Session = Depends(get_db)):
    obj = PlanDoc(**payload.model_dump())
    db.add(obj)
    db.flush()
    _add_version(db, obj, "初始导入", _actor(request))
    crud.write_audit(db, request, "plan_doc", obj.id, "POST", payload.model_dump())
    db.commit()
    return ApiResponse(data=PlanDetailOut.model_validate(_plan_out(db, obj)))


@router_plans.get("/{plan_id}", response_model=ApiResponse[PlanDetailOut])
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)
    o = PlanDetailOut.model_validate(_plan_out(db, plan))
    o.versions = [PlanVersionOut.model_validate(v) for v in plan.versions]
    o.feedbacks = [PlanFeedbackOut.model_validate(f) for f in plan.feedbacks]
    o.suggestions = [PlanSuggestionOut.model_validate(s) for s in plan.suggestions]
    return ApiResponse(data=o)


@router_plans.put("/{plan_id}", response_model=ApiResponse[PlanDetailOut])
def update_plan(plan_id: int, payload: PlanUpdate, request: Request, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)
    data = payload.model_dump(exclude_unset=True)
    content_changed = "content_md" in data and data["content_md"] != plan.content_md
    for k, v in data.items():
        setattr(plan, k, v)
    if content_changed:
        _add_version(db, plan, "人工编辑", _actor(request))
    crud.write_audit(db, request, "plan_doc", plan_id, "PUT", data)
    db.commit()
    return ApiResponse(data=PlanDetailOut.model_validate(_plan_out(db, plan)))


@router_plans.delete("/{plan_id}", response_model=ApiResponse)
def delete_plan(plan_id: int, request: Request, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)
    db.delete(plan)  # 级联删 versions/feedbacks/suggestions
    crud.write_audit(db, request, "plan_doc", plan_id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")


@router_plans.post("/{plan_id}/versions/{version_no}/rollback", response_model=ApiResponse[PlanDetailOut])
def rollback_plan(plan_id: int, version_no: int, request: Request, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)
    version = db.scalar(
        select(PlanVersion).where(PlanVersion.plan_id == plan_id, PlanVersion.version_no == version_no)
    )
    if not version:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=f"版本 version_no={version_no} 不存在")
    plan.content_md = version.content_md
    _add_version(db, plan, "回滚", _actor(request))
    crud.write_audit(db, request, "plan_doc", plan_id, "ROLLBACK", {"version_no": version_no})
    db.commit()
    return ApiResponse(data=PlanDetailOut.model_validate(_plan_out(db, plan)))


# ================= feedback =================


@router_plans.post("/{plan_id}/feedback", response_model=ApiResponse[PlanFeedbackOut], status_code=201)
def create_feedback(plan_id: int, payload: PlanFeedbackIn, request: Request, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)
    fb = PlanFeedback(plan_id=plan.id, content=payload.content, author=payload.author)
    db.add(fb)
    db.flush()
    crud.write_audit(db, request, "plan_feedback", fb.id, "POST", payload.model_dump())
    db.commit()
    trigger_plan_review(plan.id, "leader_feedback", payload.content)
    return ApiResponse(data=PlanFeedbackOut.model_validate(fb))


# ================= suggestions =================


@router_plans.post("/{plan_id}/suggestions", response_model=ApiResponse[PlanSuggestionOut], status_code=201)
def create_suggestion(plan_id: int, payload: PlanSuggestionIn, request: Request, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)
    s = PlanSuggestion(
        plan_id=plan.id,
        trigger_type=payload.trigger_type,
        trigger_detail=payload.trigger_detail,
        suggestion_md=payload.suggestion_md,
        # 记录建议生成时刻的方案内容快照，作为前端对比基准
        base_content_md=payload.base_content_md if payload.base_content_md else plan.content_md,
        n8n_execution_id=payload.n8n_execution_id,
    )
    db.add(s)
    db.flush()
    crud.write_audit(db, request, "plan_suggestion", s.id, "POST", payload.model_dump())
    db.commit()
    return ApiResponse(data=PlanSuggestionOut.model_validate(s))


@router_plans.patch("/suggestions/{suggestion_id}", response_model=ApiResponse[PlanSuggestionOut])
def update_suggestion(suggestion_id: int, payload: PlanSuggestionUpdateIn, request: Request, db: Session = Depends(get_db)):
    """人工修改待确认的建议内容（仅待确认状态可改）。"""
    s = crud.get_or_404(db, PlanSuggestion, suggestion_id)
    if s.status != "待确认":
        return ApiResponse(code=400, message=f"建议状态为 {s.status}，不能编辑")
    if payload.suggestion_md is not None:
        if not payload.suggestion_md.strip():
            return ApiResponse(code=400, message="建议内容不能为空")
        s.suggestion_md = payload.suggestion_md
    if payload.trigger_detail is not None:
        s.trigger_detail = payload.trigger_detail
    crud.write_audit(db, request, "plan_suggestion", s.id, "PATCH", {"suggestion_md_len": len(payload.suggestion_md or "")})
    db.commit()
    return ApiResponse(data=PlanSuggestionOut.model_validate(s))


@router_plans.post("/suggestions/{suggestion_id}/confirm", response_model=ApiResponse[PlanSuggestionOut])
def confirm_suggestion(suggestion_id: int, payload: PlanSuggestionConfirmIn, request: Request, db: Session = Depends(get_db)):
    from datetime import datetime, timezone

    s = crud.get_or_404(db, PlanSuggestion, suggestion_id)
    if s.status != "pending":
        return ApiResponse(code=400, message=f"建议状态为 {s.status}，不能重复确认")
    if payload.action == "adopt":
        plan = crud.get_or_404(db, PlanDoc, s.plan_id)
        plan.content_md = s.suggestion_md
        _add_version(db, plan, "AI采纳", payload.confirmed_by or _actor(request))
        if s.trigger_type == "leader_feedback":
            db.query(PlanFeedback).filter(
                PlanFeedback.plan_id == s.plan_id, PlanFeedback.status == "待处理"
            ).update({"status": "已处理"})
        s.status = "adopted"
    elif payload.action == "reject":
        s.status = "rejected"
    else:
        return ApiResponse(code=400, message="action 必须为 adopt 或 reject")
    s.confirmed_by = payload.confirmed_by or _actor(request)
    s.confirmed_at = datetime.now(timezone.utc)
    crud.write_audit(db, request, "plan_suggestion", s.id, "CONFIRM", payload.model_dump())
    db.commit()
    return ApiResponse(data=PlanSuggestionOut.model_validate(s))


# ================= AI context =================


@router_plans.get("/{plan_id}/context", response_model=ApiResponse[PlanContextOut])
def plan_context(plan_id: int, db: Session = Depends(get_db)):
    plan = crud.get_or_404(db, PlanDoc, plan_id)

    recent = db.execute(
        select(Requirement.code, Requirement.name, Requirement.decision)
        .order_by(Requirement.created_at.desc(), Requirement.id.desc())
        .limit(5)
    ).all()
    grade_rows = db.execute(
        select(SystemScoreTotal.grade, func.count()).group_by(SystemScoreTotal.grade)
    ).all()

    ctx = PlanContextOut(
        plan={
            "title": plan.title,
            "category": plan.category,
            "content_md": plan.content_md,
        },
        related_data=PlanRelatedData(
            requirements_total=db.query(Requirement).count(),
            requirements_recent=[
                PlanRequirementBrief(code=c, name=n, decision=d) for c, n, d in recent
            ],
            disposals_total=db.query(Disposal).count(),
            systems_total=db.query(SystemInfo).count(),
            grade_distribution=[GradeDist(grade=g or "未评分", count=c) for g, c in grade_rows],
        ),
    )
    return ApiResponse(data=ctx)


# ================= 数据变更触发（供 resources 模块调用） =================


def notify_requirement_change(detail: str) -> None:
    """需求 POST/PATCH 成功后触发关联方案。"""
    from app.core.db import SessionLocal

    db = SessionLocal()
    try:
        for p in _plans_for_data_change(db):
            trigger_plan_review(p.id, "data_change", detail)
    finally:
        db.close()


def notify_disposal_change(detail: str) -> None:
    """处置 POST/PATCH 成功后触发关联方案。"""
    from app.core.db import SessionLocal

    db = SessionLocal()
    try:
        for p in _plans_for_data_change(db):
            trigger_plan_review(p.id, "data_change", detail)
    finally:
        db.close()
