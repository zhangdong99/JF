from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

SCHEMA = "product_governance"


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class ProductDomain(Base):
    __tablename__ = "product_domain"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text)
    products: Mapped[list["Product"]] = relationship(back_populates="domain")


class Product(Base):
    __tablename__ = "product"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.product_domain.id"))
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    owner: Mapped[str | None] = mapped_column(String(64))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="规划")  # 规划/运营/维护/退出

    domain: Mapped[ProductDomain] = relationship(back_populates="products")
    systems: Mapped[list["SystemInfo"]] = relationship(back_populates="main_product")


class SystemInfo(Base):
    __tablename__ = "sys_system"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    main_product_id: Mapped[int | None] = mapped_column(ForeignKey(f"{SCHEMA}.product.id"))
    department: Mapped[str | None] = mapped_column(String(128))
    business_owner: Mapped[str | None] = mapped_column(String(64))
    tech_owner: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="运行中")  # 运行中/维护中/已退役
    annual_cost: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    user_count: Mapped[int | None] = mapped_column(Integer)
    go_live_date: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text)
    source_file: Mapped[str | None] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    main_product: Mapped[Product | None] = relationship(back_populates="systems")
    dependencies: Mapped[list["SystemProductDependency"]] = relationship(back_populates="system")
    scores: Mapped[list["SystemScore"]] = relationship(back_populates="system")
    score_totals: Mapped[list["SystemScoreTotal"]] = relationship(back_populates="system")
    disposals: Mapped[list["Disposal"]] = relationship(back_populates="system")


class SystemProductDependency(Base):
    __tablename__ = "system_product_dependency"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    system_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sys_system.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.product.id"))
    note: Mapped[str | None] = mapped_column(Text)

    system: Mapped[SystemInfo] = relationship(back_populates="dependencies")


class ScoreDimension(Base):
    __tablename__ = "score_dimension"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    description: Mapped[str | None] = mapped_column(Text)


class SystemScore(Base):
    __tablename__ = "system_score"
    __table_args__ = (
        UniqueConstraint("system_id", "dimension_id", name="uq_system_dimension"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    system_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sys_system.id"))
    dimension_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.score_dimension.id"))
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2))

    system: Mapped[SystemInfo] = relationship(back_populates="scores")


class SystemScoreTotal(Base):
    __tablename__ = "system_score_total"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    system_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sys_system.id"))
    total: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    grade: Mapped[str] = mapped_column(String(32))  # 高价值/有价值需改善/价值存疑/低价值候选
    comment: Mapped[str | None] = mapped_column(Text)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    system: Mapped[SystemInfo] = relationship(back_populates="score_totals")


class Requirement(Base):
    __tablename__ = "requirement"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(256))
    main_product_id: Mapped[int | None] = mapped_column(ForeignKey(f"{SCHEMA}.product.id"))
    coop_products: Mapped[str | None] = mapped_column(Text)
    biz_value: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    urgency: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    reuse_match: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    roi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    tech_feasible: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    synergy: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    weighted_total: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    decision: Mapped[str | None] = mapped_column(String(32))  # 复用/扩展/跨产品协同/新建论证/驳回
    decision_note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="待评审")  # 待评审/已评审
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Disposal(Base):
    __tablename__ = "disposal"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    system_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sys_system.id"))
    action: Mapped[str] = mapped_column(String(16))  # 保留/优化/整合/替换/停用
    priority: Mapped[int | None] = mapped_column(Integer)
    reason: Mapped[str | None] = mapped_column(Text)
    risk_note: Mapped[str | None] = mapped_column(Text)
    target_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default="提议")  # 提议/批准/完成

    system: Mapped[SystemInfo] = relationship(back_populates="disposals")


class Indicator(Base):
    __tablename__ = "indicator"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    category: Mapped[str | None] = mapped_column(String(64))
    target_value: Mapped[Decimal | None] = mapped_column(Numeric)
    current_value: Mapped[Decimal | None] = mapped_column(Numeric)
    unit: Mapped[str | None] = mapped_column(String(32))
    period: Mapped[str | None] = mapped_column(String(32))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlanDoc(Base):
    __tablename__ = "plan_doc"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    category: Mapped[str] = mapped_column(String(32))  # 战略运营/项目运营/架构运营/产品运营/需求运营/流程运营
    related_domains: Mapped[str | None] = mapped_column(Text)  # 逗号分隔关联域
    content_md: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="草稿")  # 草稿/评审中/已发布
    owner: Mapped[str | None] = mapped_column(String(64))
    owner_email: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    versions: Mapped[list["PlanVersion"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="PlanVersion.version_no"
    )
    feedbacks: Mapped[list["PlanFeedback"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )
    suggestions: Mapped[list["PlanSuggestion"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )


class PlanVersion(Base):
    __tablename__ = "plan_version"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.plan_doc.id"))
    content_md: Mapped[str | None] = mapped_column(Text)
    version_no: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(32))  # 人工编辑/AI采纳/初始导入/回滚
    created_by: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plan: Mapped[PlanDoc] = relationship(back_populates="versions")


class PlanFeedback(Base):
    __tablename__ = "plan_feedback"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.plan_doc.id"))
    content: Mapped[str] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="待处理")  # 待处理/已处理
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plan: Mapped[PlanDoc] = relationship(back_populates="feedbacks")


class PlanSuggestion(Base):
    __tablename__ = "plan_suggestion"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.plan_doc.id"))
    trigger_type: Mapped[str] = mapped_column(String(32))  # data_change/leader_feedback/manual
    trigger_detail: Mapped[str | None] = mapped_column(Text)
    suggestion_md: Mapped[str | None] = mapped_column(Text)
    base_content_md: Mapped[str | None] = mapped_column(Text)  # 建议生成时刻的方案内容快照（对比基准）
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending/adopted/rejected
    n8n_execution_id: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    confirmed_by: Mapped[str | None] = mapped_column(String(64))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    plan: Mapped[PlanDoc] = relationship(back_populates="suggestions")


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(16))  # POST/PATCH/DELETE
    detail: Mapped[dict | None] = mapped_column(JSONB)
    actor: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
