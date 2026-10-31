"""domains / products / systems / requirements / disposals / indicators 标准 CRUD。"""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import (
    Disposal,
    Indicator,
    Product,
    ProductDomain,
    Requirement,
    SystemInfo,
    SystemScoreTotal,
)
from app.schemas import (
    ApiResponse,
    DisposalIn,
    DisposalOut,
    DisposalUpdate,
    DomainIn,
    DomainOut,
    IndicatorIn,
    IndicatorOut,
    IndicatorUpdate,
    PageData,
    ProductIn,
    ProductOut,
    ProductUpdate,
    RequirementIn,
    RequirementOut,
    RequirementUpdate,
    SystemIn,
    SystemOut,
    SystemUpdate,
)
from app.api import plans as plan_events
from app.services import crud

P = Query


def _page_params(
    page: int = P(1, ge=1, description="页码"),
    page_size: int = P(20, ge=1, le=200, description="每页条数"),
    keyword: str | None = P(None, description="关键字（code/name 模糊）"),
    status: str | None = P(None, description="状态过滤"),
):
    return {"page": page, "page_size": page_size, "keyword": keyword, "status": status}


def _filter(db: Session, model, params, search_fields):
    q = select(model)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        conds = [getattr(model, f).ilike(kw) for f in search_fields]
        from functools import reduce
        from operator import or_

        q = q.where(reduce(or_, conds))
    if params["status"] and hasattr(model, "status"):
        q = q.where(model.status == params["status"])
    return db.scalar(
        select(func.count()).select_from(q.subquery()
        if hasattr(q, "subquery") else q)
    ) or 0, q


def _wrap_page(total, params, items):
    return PageData(total=total, page=params["page"], page_size=params["page_size"], items=items)


# ================= domains =================
router_domains = APIRouter(prefix="/domains", tags=["domains"])


@router_domains.get("", response_model=ApiResponse[PageData])
def list_domains(db: Session = Depends(get_db), params: dict = Depends(_page_params)):
    q = select(ProductDomain)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        q = q.where((ProductDomain.code.ilike(kw)) | (ProductDomain.name.ilike(kw)))
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(ProductDomain.id).offset((params["page"] - 1) * params["page_size"]).limit(params["page_size"])).all()
    return ApiResponse(data=_wrap_page(total, params, [DomainOut.model_validate(x) for x in items]))


@router_domains.get("/{id}", response_model=ApiResponse[DomainOut])
def get_domain(id: int, db: Session = Depends(get_db)):
    return ApiResponse(data=DomainOut.model_validate(crud.get_or_404(db, ProductDomain, id)))


@router_domains.post("", response_model=ApiResponse[DomainOut], status_code=201)
def create_domain(payload: DomainIn, request: Request, db: Session = Depends(get_db)):
    obj = ProductDomain(**payload.model_dump())
    db.add(obj)
    db.flush()
    crud.write_audit(db, request, "product_domain", obj.id, "POST", payload.model_dump())
    db.commit()
    return ApiResponse(data=DomainOut.model_validate(obj))


@router_domains.patch("/{id}", response_model=ApiResponse[DomainOut])
def update_domain(id: int, payload: DomainIn, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, ProductDomain, id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    crud.write_audit(db, request, "product_domain", id, "PATCH", payload.model_dump(exclude_unset=True))
    db.commit()
    return ApiResponse(data=DomainOut.model_validate(obj))


@router_domains.delete("/{id}", response_model=ApiResponse)
def delete_domain(id: int, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, ProductDomain, id)
    db.delete(obj)
    crud.write_audit(db, request, "product_domain", id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")


# ================= products =================
router_products = APIRouter(prefix="/products", tags=["products"])


def _product_out(db: Session, x: Product) -> ProductOut:
    d = ProductOut.model_validate(x)
    d.domain_name = x.domain.name if x.domain else None
    return d


@router_products.get("", response_model=ApiResponse[PageData])
def list_products(db: Session = Depends(get_db), params: dict = Depends(_page_params)):
    q = select(Product)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        q = q.where((Product.code.ilike(kw)) | (Product.name.ilike(kw)) | (Product.owner.ilike(kw)))
    if params["status"]:
        q = q.where(Product.status == params["status"])
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(Product.id).offset((params["page"] - 1) * params["page_size"]).limit(params["page_size"])).all()
    return ApiResponse(data=_wrap_page(total, params, [_product_out(db, x) for x in items]))


@router_products.get("/{id}", response_model=ApiResponse[ProductOut])
def get_product(id: int, db: Session = Depends(get_db)):
    return ApiResponse(data=_product_out(db, crud.get_or_404(db, Product, id)))


@router_products.post("", response_model=ApiResponse[ProductOut], status_code=201)
def create_product(payload: ProductIn, request: Request, db: Session = Depends(get_db)):
    crud.get_or_404(db, ProductDomain, payload.domain_id)
    obj = Product(**payload.model_dump())
    db.add(obj)
    db.flush()
    crud.write_audit(db, request, "product", obj.id, "POST", payload.model_dump())
    db.commit()
    return ApiResponse(data=_product_out(db, obj))


@router_products.patch("/{id}", response_model=ApiResponse[ProductOut])
def update_product(id: int, payload: ProductUpdate, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Product, id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    crud.write_audit(db, request, "product", id, "PATCH", payload.model_dump(exclude_unset=True))
    db.commit()
    return ApiResponse(data=_product_out(db, obj))


@router_products.delete("/{id}", response_model=ApiResponse)
def delete_product(id: int, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Product, id)
    db.delete(obj)
    crud.write_audit(db, request, "product", id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")


# ================= systems =================
router_systems = APIRouter(prefix="/systems", tags=["systems"])


def _system_out(x: SystemInfo) -> SystemOut:
    o = SystemOut.model_validate(x)
    o.main_product_name = x.main_product.name if x.main_product else None
    if x.score_totals:
        latest = max(x.score_totals, key=lambda t: t.evaluated_at)
        o.latest_score_total = latest.total
        o.latest_grade = latest.grade
    return o


@router_systems.get("", response_model=ApiResponse[PageData])
def list_systems(db: Session = Depends(get_db), params: dict = Depends(_page_params)):
    q = select(SystemInfo)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        q = q.where(
            (SystemInfo.code.ilike(kw))
            | (SystemInfo.name.ilike(kw))
            | (SystemInfo.department.ilike(kw))
        )
    if params["status"]:
        q = q.where(SystemInfo.status == params["status"])
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(SystemInfo.id).offset((params["page"] - 1) * params["page_size"]).limit(params["page_size"])).all()
    return ApiResponse(data=_wrap_page(total, params, [_system_out(x) for x in items]))


@router_systems.get("/{id}", response_model=ApiResponse[SystemOut])
def get_system(id: int, db: Session = Depends(get_db)):
    return ApiResponse(data=_system_out(crud.get_or_404(db, SystemInfo, id)))


@router_systems.post("", response_model=ApiResponse[SystemOut], status_code=201)
def create_system(payload: SystemIn, request: Request, db: Session = Depends(get_db), upsert: bool = False):
    if upsert and payload.code:
        existing = db.scalar(select(SystemInfo).where(SystemInfo.code == payload.code))
        if existing:
            data = payload.model_dump(exclude_unset=True, exclude={"code"})
            for k, v in data.items():
                setattr(existing, k, v)
            db.flush()
            crud.write_audit(db, request, "sys_system", existing.id, "UPSERT", payload.model_dump())
            db.commit()
            return ApiResponse(data=_system_out(existing))
    obj = SystemInfo(**payload.model_dump())
    db.add(obj)
    db.flush()
    crud.write_audit(db, request, "sys_system", obj.id, "POST", payload.model_dump())
    db.commit()
    return ApiResponse(data=_system_out(obj))


@router_systems.patch("/{id}", response_model=ApiResponse[SystemOut])
def update_system(id: int, payload: SystemUpdate, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, SystemInfo, id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    crud.write_audit(db, request, "sys_system", id, "PATCH", payload.model_dump(exclude_unset=True))
    db.commit()
    return ApiResponse(data=_system_out(obj))


@router_systems.delete("/{id}", response_model=ApiResponse)
def delete_system(id: int, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, SystemInfo, id)
    db.delete(obj)
    crud.write_audit(db, request, "sys_system", id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")


# ================= requirements =================
router_requirements = APIRouter(prefix="/requirements", tags=["requirements"])


@router_requirements.get("", response_model=ApiResponse[PageData])
def list_requirements(db: Session = Depends(get_db), params: dict = Depends(_page_params)):
    q = select(Requirement)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        q = q.where((Requirement.code.ilike(kw)) | (Requirement.name.ilike(kw)))
    if params["status"]:
        q = q.where(Requirement.status == params["status"])
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(Requirement.id).offset((params["page"] - 1) * params["page_size"]).limit(params["page_size"])).all()
    return ApiResponse(data=_wrap_page(total, params, [RequirementOut.model_validate(x) for x in items]))


@router_requirements.get("/{id}", response_model=ApiResponse[RequirementOut])
def get_requirement(id: int, db: Session = Depends(get_db)):
    return ApiResponse(data=RequirementOut.model_validate(crud.get_or_404(db, Requirement, id)))


@router_requirements.post("", response_model=ApiResponse[RequirementOut], status_code=201)
def create_requirement(payload: RequirementIn, request: Request, db: Session = Depends(get_db)):
    data = payload.model_dump()
    weights = {"biz_value": 30, "urgency": 20, "reuse_match": 20, "roi": 15, "tech_feasible": 10, "synergy": 5}
    weighted = sum(Decimal(str(data.get(k) or 0)) * w for k, w in weights.items()) / 100
    data["weighted_total"] = weighted.quantize(Decimal("0.01"))
    obj = Requirement(**data)
    db.add(obj)
    db.flush()
    crud.write_audit(db, request, "requirement", obj.id, "POST", data)
    db.commit()
    plan_events.notify_requirement_change(f"新增需求 {obj.code} {obj.name}")
    return ApiResponse(data=RequirementOut.model_validate(obj))


@router_requirements.patch("/{id}", response_model=ApiResponse[RequirementOut])
def update_requirement(id: int, payload: RequirementUpdate, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Requirement, id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    crud.write_audit(db, request, "requirement", id, "PATCH", payload.model_dump(exclude_unset=True))
    db.commit()
    plan_events.notify_requirement_change(f"更新需求 {obj.code} {obj.name}")
    return ApiResponse(data=RequirementOut.model_validate(obj))


@router_requirements.delete("/{id}", response_model=ApiResponse)
def delete_requirement(id: int, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Requirement, id)
    db.delete(obj)
    crud.write_audit(db, request, "requirement", id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")


# ================= disposals =================
router_disposals = APIRouter(prefix="/disposals", tags=["disposals"])


def _disposal_out(x: Disposal) -> DisposalOut:
    o = DisposalOut.model_validate(x)
    o.system_name = x.system.name if x.system else None
    return o


@router_disposals.get("", response_model=ApiResponse[PageData])
def list_disposals(db: Session = Depends(get_db), params: dict = Depends(_page_params)):
    q = select(Disposal)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        q = q.where((Disposal.action.ilike(kw)) | (Disposal.reason.ilike(kw)))
    if params["status"]:
        q = q.where(Disposal.status == params["status"])
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(Disposal.id).offset((params["page"] - 1) * params["page_size"]).limit(params["page_size"])).all()
    return ApiResponse(data=_wrap_page(total, params, [_disposal_out(x) for x in items]))


@router_disposals.get("/{id}", response_model=ApiResponse[DisposalOut])
def get_disposal(id: int, db: Session = Depends(get_db)):
    return ApiResponse(data=_disposal_out(crud.get_or_404(db, Disposal, id)))


@router_disposals.post("", response_model=ApiResponse[DisposalOut], status_code=201)
def create_disposal(payload: DisposalIn, request: Request, db: Session = Depends(get_db)):
    crud.get_or_404(db, SystemInfo, payload.system_id)
    obj = Disposal(**payload.model_dump())
    db.add(obj)
    db.flush()
    crud.write_audit(db, request, "disposal", obj.id, "POST", payload.model_dump())
    db.commit()
    plan_events.notify_disposal_change(
        f"新增处置：系统 {obj.system.name if obj.system else obj.system_id} 动作 {obj.action}"
    )
    return ApiResponse(data=_disposal_out(obj))


@router_disposals.patch("/{id}", response_model=ApiResponse[DisposalOut])
def update_disposal(id: int, payload: DisposalUpdate, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Disposal, id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    crud.write_audit(db, request, "disposal", id, "PATCH", payload.model_dump(exclude_unset=True))
    db.commit()
    plan_events.notify_disposal_change(
        f"更新处置：系统 {obj.system.name if obj.system else obj.system_id} 动作 {obj.action} 状态 {obj.status}"
    )
    return ApiResponse(data=_disposal_out(obj))


@router_disposals.delete("/{id}", response_model=ApiResponse)
def delete_disposal(id: int, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Disposal, id)
    db.delete(obj)
    crud.write_audit(db, request, "disposal", id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")


# ================= indicators =================
router_indicators = APIRouter(prefix="/indicators", tags=["indicators"])


@router_indicators.get("", response_model=ApiResponse[PageData])
def list_indicators(db: Session = Depends(get_db), params: dict = Depends(_page_params)):
    q = select(Indicator)
    if params["keyword"]:
        kw = f"%{params['keyword']}%"
        q = q.where((Indicator.code.ilike(kw)) | (Indicator.name.ilike(kw)))
    if params["status"]:
        q = q.where(Indicator.category == params["status"])
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(Indicator.id).offset((params["page"] - 1) * params["page_size"]).limit(params["page_size"])).all()
    return ApiResponse(data=_wrap_page(total, params, [IndicatorOut.model_validate(x) for x in items]))


@router_indicators.get("/{id}", response_model=ApiResponse[IndicatorOut])
def get_indicator(id: int, db: Session = Depends(get_db)):
    return ApiResponse(data=IndicatorOut.model_validate(crud.get_or_404(db, Indicator, id)))


@router_indicators.post("", response_model=ApiResponse[IndicatorOut], status_code=201)
def create_indicator(payload: IndicatorIn, request: Request, db: Session = Depends(get_db)):
    obj = Indicator(**payload.model_dump())
    db.add(obj)
    db.flush()
    crud.write_audit(db, request, "indicator", obj.id, "POST", payload.model_dump())
    db.commit()
    return ApiResponse(data=IndicatorOut.model_validate(obj))


@router_indicators.patch("/{id}", response_model=ApiResponse[IndicatorOut])
def update_indicator(id: int, payload: IndicatorUpdate, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Indicator, id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    crud.write_audit(db, request, "indicator", id, "PATCH", payload.model_dump(exclude_unset=True))
    db.commit()
    return ApiResponse(data=IndicatorOut.model_validate(obj))


@router_indicators.delete("/{id}", response_model=ApiResponse)
def delete_indicator(id: int, request: Request, db: Session = Depends(get_db)):
    obj = crud.get_or_404(db, Indicator, id)
    db.delete(obj)
    crud.write_audit(db, request, "indicator", id, "DELETE", None)
    db.commit()
    return ApiResponse(message="deleted")
