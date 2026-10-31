from datetime import date, datetime
from decimal import Decimal
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- 通用 ----------
class PageBase(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=200)


class PageData(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[Any]


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = "ok"
    data: T | None = None


# ---------- 域 ----------
class DomainIn(BaseModel):
    code: str
    name: str
    description: str | None = None


class DomainOut(ORMModel):
    id: int
    code: str
    name: str
    description: str | None


# ---------- 产品 ----------
class ProductIn(BaseModel):
    domain_id: int
    code: str
    name: str
    owner: str | None = None
    description: str | None = None
    status: str = "规划"


class ProductUpdate(BaseModel):
    domain_id: int | None = None
    code: str | None = None
    name: str | None = None
    owner: str | None = None
    description: str | None = None
    status: str | None = None


class ProductOut(ORMModel):
    id: int
    domain_id: int
    code: str
    name: str
    owner: str | None
    description: str | None
    status: str
    domain_name: str | None = None


# ---------- 系统 ----------
class SystemIn(BaseModel):
    code: str
    name: str
    main_product_id: int | None = None
    department: str | None = None
    business_owner: str | None = None
    tech_owner: str | None = None
    status: str = "运行中"
    annual_cost: Decimal | None = None
    user_count: int | None = None
    go_live_date: date | None = None
    description: str | None = None
    source_file: str | None = None


class SystemUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    main_product_id: int | None = None
    department: str | None = None
    business_owner: str | None = None
    tech_owner: str | None = None
    status: str | None = None
    annual_cost: Decimal | None = None
    user_count: int | None = None
    go_live_date: date | None = None
    description: str | None = None
    source_file: str | None = None


class SystemOut(ORMModel):
    id: int
    code: str
    name: str
    main_product_id: int | None
    main_product_name: str | None = None
    department: str | None
    business_owner: str | None
    tech_owner: str | None
    status: str
    annual_cost: Decimal | None
    user_count: int | None
    go_live_date: date | None
    description: str | None
    source_file: str | None
    latest_score_total: Decimal | None = None
    latest_grade: str | None = None


# ---------- 评分 ----------
class ScoreItemIn(BaseModel):
    dimension_code: str
    score: Decimal = Field(ge=0, le=100)


class ScoresIn(BaseModel):
    scores: list[ScoreItemIn]
    comment: str | None = None


class ScoreResultOut(BaseModel):
    system_id: int
    total: Decimal
    grade: str
    detail: list[ScoreItemIn]


class DimensionOut(ORMModel):
    id: int
    code: str
    name: str
    weight: Decimal
    description: str | None


# ---------- 需求 ----------
class RequirementIn(BaseModel):
    code: str
    name: str
    main_product_id: int | None = None
    coop_products: str | None = None
    biz_value: Decimal | None = None
    urgency: Decimal | None = None
    reuse_match: Decimal | None = None
    roi: Decimal | None = None
    tech_feasible: Decimal | None = None
    synergy: Decimal | None = None
    decision: str | None = None
    decision_note: str | None = None
    status: str = "待评审"


class RequirementUpdate(BaseModel):
    name: str | None = None
    main_product_id: int | None = None
    coop_products: str | None = None
    biz_value: Decimal | None = None
    urgency: Decimal | None = None
    reuse_match: Decimal | None = None
    roi: Decimal | None = None
    tech_feasible: Decimal | None = None
    synergy: Decimal | None = None
    weighted_total: Decimal | None = None
    decision: str | None = None
    decision_note: str | None = None
    status: str | None = None


class RequirementOut(ORMModel):
    id: int
    code: str
    name: str
    main_product_id: int | None
    coop_products: str | None
    biz_value: Decimal | None
    urgency: Decimal | None
    reuse_match: Decimal | None
    roi: Decimal | None
    tech_feasible: Decimal | None
    synergy: Decimal | None
    weighted_total: Decimal | None
    decision: str | None
    decision_note: str | None
    status: str
    created_at: datetime


# ---------- 处置 ----------
class DisposalIn(BaseModel):
    system_id: int
    action: str
    priority: int | None = None
    reason: str | None = None
    risk_note: str | None = None
    target_date: date | None = None
    status: str = "提议"


class DisposalUpdate(BaseModel):
    system_id: int | None = None
    action: str | None = None
    priority: int | None = None
    reason: str | None = None
    risk_note: str | None = None
    target_date: date | None = None
    status: str | None = None


class DisposalOut(ORMModel):
    id: int
    system_id: int
    system_name: str | None = None
    action: str
    priority: int | None
    reason: str | None
    risk_note: str | None
    target_date: date | None
    status: str


# ---------- 指标 ----------
class IndicatorIn(BaseModel):
    code: str
    name: str
    category: str | None = None
    target_value: Decimal | None = None
    current_value: Decimal | None = None
    unit: str | None = None
    period: str | None = None


class IndicatorUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    target_value: Decimal | None = None
    current_value: Decimal | None = None
    unit: str | None = None
    period: str | None = None


class IndicatorOut(ORMModel):
    id: int
    code: str
    name: str
    category: str | None
    target_value: Decimal | None
    current_value: Decimal | None
    unit: str | None
    period: str | None
    updated_at: datetime


# ---------- 方案文档 ----------
class GradeDist(BaseModel):
    grade: str
    count: int


PLAN_CATEGORIES = ["战略运营", "项目运营", "架构运营", "产品运营", "需求运营", "流程运营"]


class PlanIn(BaseModel):
    title: str
    category: str
    related_domains: str | None = None
    content_md: str | None = None
    owner: str | None = None
    owner_email: str | None = None
    status: str = "草稿"


class PlanUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    related_domains: str | None = None
    content_md: str | None = None
    owner: str | None = None
    owner_email: str | None = None
    status: str | None = None


class PlanOut(ORMModel):
    id: int
    title: str
    category: str
    related_domains: str | None
    content_md: str | None
    status: str
    owner: str | None
    owner_email: str | None
    created_at: datetime
    updated_at: datetime
    version_count: int = 0
    pending_suggestions: int = 0


class PlanVersionOut(ORMModel):
    id: int
    version_no: int
    source: str
    created_by: str | None
    created_at: datetime


class PlanFeedbackIn(BaseModel):
    content: str
    author: str | None = None


class PlanFeedbackOut(ORMModel):
    id: int
    plan_id: int
    content: str
    author: str | None
    status: str
    created_at: datetime


class PlanSuggestionIn(BaseModel):
    trigger_type: str  # data_change/leader_feedback/manual
    trigger_detail: str | None = None
    suggestion_md: str
    base_content_md: str | None = None  # 不传则自动取当前方案内容快照
    n8n_execution_id: str | None = None


class PlanSuggestionOut(ORMModel):
    id: int
    plan_id: int
    trigger_type: str
    trigger_detail: str | None
    suggestion_md: str | None
    base_content_md: str | None = None
    status: str
    n8n_execution_id: str | None
    created_at: datetime
    confirmed_by: str | None
    confirmed_at: datetime | None


class PlanSuggestionConfirmIn(BaseModel):
    action: str  # adopt / reject
    confirmed_by: str | None = None


class PlanSuggestionUpdateIn(BaseModel):
    suggestion_md: str | None = None
    trigger_detail: str | None = None


class PlanDetailOut(PlanOut):
    versions: list[PlanVersionOut] = []
    feedbacks: list[PlanFeedbackOut] = []
    suggestions: list[PlanSuggestionOut] = []


class PlanRequirementBrief(BaseModel):
    code: str
    name: str
    decision: str | None


class PlanRelatedData(BaseModel):
    requirements_total: int
    requirements_recent: list[PlanRequirementBrief]
    disposals_total: int
    systems_total: int
    grade_distribution: list[GradeDist]


class PlanContextOut(BaseModel):
    plan: dict[str, Any]
    related_data: PlanRelatedData


# ---------- Dashboard ----------
class TopCostSystem(BaseModel):
    id: int
    name: str
    annual_cost: Decimal | None


class IndicatorBrief(BaseModel):
    code: str
    name: str
    target_value: Decimal | None
    current_value: Decimal | None
    unit: str | None


class DomainCoverage(BaseModel):
    domain_name: str
    product_count: int
    system_count: int


class DashboardOverview(BaseModel):
    total_systems: int
    total_products: int
    total_domains: int
    total_requirements: int
    attributed_rate: float
    grade_distribution: list[GradeDist]
    disposal_status_counts: dict[str, int]
    requirement_decision_counts: dict[str, int]
    top10_cost_systems: list[TopCostSystem]
    indicators: list[IndicatorBrief]
    domain_coverage: list[DomainCoverage]
