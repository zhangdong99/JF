from fastapi import APIRouter, Depends
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
    DashboardOverview,
    DomainCoverage,
    GradeDist,
    IndicatorBrief,
    TopCostSystem,
)

router = APIRouter()


@router.get("/dashboard/overview", response_model=ApiResponse[DashboardOverview])
def dashboard_overview(db: Session = Depends(get_db)):
    total_systems = db.query(SystemInfo).count()
    total_products = db.query(Product).count()
    total_domains = db.query(ProductDomain).count()
    total_requirements = db.query(Requirement).count()

    attributed = db.query(SystemInfo).filter(SystemInfo.main_product_id.isnot(None)).count()
    attributed_rate = round(attributed / total_systems, 4) if total_systems else 0.0

    grade_rows = db.execute(
        select(SystemScoreTotal.grade, func.count()).group_by(SystemScoreTotal.grade)
    ).all()

    top10 = db.execute(
        select(SystemInfo.id, SystemInfo.name, SystemInfo.annual_cost)
        .order_by(SystemInfo.annual_cost.desc().nullslast())
        .limit(10)
    ).all()

    indicators = db.query(Indicator).order_by(Indicator.id).all()

    domain_coverage_rows = db.execute(
        select(
            ProductDomain.name,
            func.count(func.distinct(Product.id)),
            func.count(func.distinct(SystemInfo.id)),
        )
        .join(Product, Product.domain_id == ProductDomain.id)
        .join(SystemInfo, SystemInfo.main_product_id == Product.id, isouter=True)
        .group_by(ProductDomain.name)
        .order_by(ProductDomain.name)
    ).all()

    disposal_counts: dict[str, int] = {}
    for action_status, cnt in db.execute(
        select(Disposal.status, func.count()).group_by(Disposal.status)
    ).all():
        disposal_counts[action_status] = cnt

    decision_counts: dict[str, int] = {}
    for decision, cnt in db.execute(
        select(Requirement.decision, func.count()).group_by(Requirement.decision)
    ).all():
        decision_counts[decision or "未决策"] = cnt

    overview = DashboardOverview(
        total_systems=total_systems,
        total_products=total_products,
        total_domains=total_domains,
        total_requirements=total_requirements,
        attributed_rate=attributed_rate,
        grade_distribution=[GradeDist(grade=g or "未评分", count=c) for g, c in grade_rows],
        disposal_status_counts=disposal_counts,
        requirement_decision_counts=decision_counts,
        top10_cost_systems=[TopCostSystem(id=i, name=n, annual_cost=c) for i, n, c in top10],
        indicators=[
            IndicatorBrief(
                code=x.code,
                name=x.name,
                target_value=x.target_value,
                current_value=x.current_value,
                unit=x.unit,
            )
            for x in indicators
        ],
        domain_coverage=[
            DomainCoverage(domain_name=n, product_count=p, system_count=s)
            for n, p, s in domain_coverage_rows
        ],
    )
    return ApiResponse(data=overview)


@router.get("/health")
def health():
    return ApiResponse(message="healthy", data={"status": "up"})
