"""种子数据导入：python -m app.seed.seed_data [--reset]

幂等：按 code 先查后插；--reset 清空 schema 内业务表后重灌（不 drop 表）。
"""

import sys
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models import (
    Disposal,
    Indicator,
    Product,
    ProductDomain,
    Requirement,
    ScoreDimension,
    SystemInfo,
    SystemProductDependency,
    SystemScore,
    SystemScoreTotal,
)
from app.services.scoring import save_scores

DOMAINS = [
    ("RD", "研发与工程", "覆盖产品规划、研发流程、工程效率与技术创新平台化能力。"),
    ("MFG", "制造与供应链", "覆盖生产制造执行、计划排程、仓储物流与供应商协同能力。"),
    ("MKT", "营销与客户", "覆盖品牌营销、线索转化、客户关系与全渠道服务能力。"),
    ("OPS", "经营与管理", "覆盖财务、人力、行政办公与经营决策支持能力。"),
    ("DATA", "数据与技术平台", "覆盖数据中台、集成平台、云基础设施与公共技术服务能力。"),
]

DIMENSIONS = [
    ("BIZ_IMPORTANCE", "业务重要性", 20),
    ("USER_COVERAGE", "使用覆盖率", 10),
    ("USER_ACTIVITY", "使用活跃度", 8),
    ("UNIQUENESS", "功能独特性与重叠", 12),
    ("BIZ_VALUE", "业务价值与成效", 12),
    ("DATA_INTEGRATION", "数据与集成价值", 8),
    ("COMPLIANCE", "合规与安全重要性", 8),
    ("COST_LIFECYCLE", "运维与全生命周期成本", 8),
    ("TECH_HEALTH", "技术健康度与风险", 6),
    ("STRATEGY_FIT", "未来战略匹配度", 8),
]

PRODUCTS = [
    # (code, name, domain_code, owner, status, desc)
    ("PRD-RD-01", "研发项目管理域", "RD", "陈工", "运营", "项目立项、进度与质量管理能力集"),
    ("PRD-RD-02", "工程工艺数字化", "RD", "刘敏", "运营", "工艺设计与仿真、工时定额管理"),
    ("PRD-MFG-01", "智能制造执行", "MFG", "王强", "运营", "车间执行、设备联网与质量追溯"),
    ("PRD-MFG-02", "供应链协同", "MFG", "赵芳", "规划", "采购寻源、库存与物流协同"),
    ("PRD-MKT-01", "客户全生命周期", "MKT", "李娜", "运营", "线索、商机、客户服务与复购运营"),
    ("PRD-OPS-01", "经营管理中台", "OPS", "周涛", "运营", "预算、核算、报销与经营分析"),
    ("PRD-OPS-02", "协同办公平台", "OPS", "吴霞", "运营", "流程审批、公文、会议与门户"),
    ("PRD-DATA-01", "数据与集成平台", "DATA", "郑凯", "运营", "主数据、数据仓库与系统集成总线"),
]

SYSTEMS = [
    # (code, name, product_code|None, dept, biz_owner, tech_owner, status, cost, users, go_live)
    ("SYS-ERP-01", "金蝶云星空 ERP", "PRD-OPS-01", "财务部", "周涛", "孙浩", "运行中", 980000, 1200, date(2019, 6, 1)),
    ("SYS-OA-01", "泛微 OA 协同办公", "PRD-OPS-02", "行政部", "吴霞", "孙浩", "运行中", 260000, 1500, date(2018, 3, 1)),
    ("SYS-MES-01", "西门子 MES", "PRD-MFG-01", "制造中心", "王强", "李斌", "运行中", 1250000, 800, date(2020, 9, 1)),
    ("SYS-CRM-01", "销售易 CRM", "PRD-MKT-01", "营销中心", "李娜", "马原", "运行中", 430000, 350, date(2021, 4, 1)),
    ("SYS-PLM-01", "华天 PLM", "PRD-RD-01", "研发中心", "陈工", "李斌", "运行中", 760000, 420, date(2020, 1, 1)),
    ("SYS-WMS-01", "唯智 WMS", "PRD-MFG-02", "供应链部", "赵芳", "马原", "维护中", 310000, 260, date(2022, 5, 1)),
    ("SYS-SRM-01", "甄云 SRM", "PRD-MFG-02", "采购部", "赵芳", "马原", "运行中", 280000, 180, date(2022, 11, 1)),
    ("SYS-QMS-01", "太友 QMS 质量管理", "PRD-MFG-01", "质量部", "王强", "李斌", "运行中", 190000, 300, date(2021, 8, 1)),
    ("SYS-BI-01", "帆软 FineBI", "PRD-DATA-01", "信息部", "郑凯", "孙浩", "运行中", 350000, 900, date(2021, 12, 1)),
    ("SYS-MDM-01", "主数据管理平台", "PRD-DATA-01", "信息部", "郑凯", "孙浩", "运行中", 220000, 500, date(2022, 3, 1)),
    ("SYS-HR-01", "北森一体化 HR", None, "人力资源部", "何静", "马原", "维护中", 180000, 1500, date(2017, 10, 1)),
    ("SYS-DOC-01", "老版本文档管理系统", None, "研发中心", "陈工", "李斌", "已退役", 40000, 80, date(2013, 5, 1)),
]

DEPENDENCIES = [
    ("SYS-BI-01", "PRD-OPS-01", "BI 读取 ERP 财务数据做经营分析"),
    ("SYS-BI-01", "PRD-MFG-01", "BI 读取 MES 产量与质量数据"),
    ("SYS-MES-01", "PRD-DATA-01", "MES 通过集成平台上报工单数据"),
    ("SYS-CRM-01", "PRD-DATA-01", "CRM 共享客户主数据"),
]

REQUIREMENTS = [
    # (code, name, product, coop, six scores, decision, note, status)
    ("REQ-2026-001", "供应商门户在线对账", "PRD-MFG-02", "PRD-MFG-01;PRD-DATA-01", (85, 80, 70, 75, 85, 60), "新建论证", "现有 SRM 缺对账模块，需新建并复用主数据", "已评审"),
    ("REQ-2026-002", "客户投诉统一受理", "PRD-MKT-01", "PRD-OPS-02", (90, 85, 80, 80, 90, 70), "扩展", "在 CRM 基础上扩展投诉工单模块", "已评审"),
    ("REQ-2026-003", "移动端审批能力", "PRD-OPS-02", "PRD-MKT-01", (75, 90, 85, 70, 80, 65), "复用", "OA 已有移动审批，直接复用", "已评审"),
    ("REQ-2026-004", "跨产品营销活动数据看板", "PRD-MKT-01", "PRD-DATA-01;PRD-OPS-01", (70, 60, 55, 65, 75, 85), "跨产品协同", "CRM+ERP+BI 三方协同建设", "已评审"),
    ("REQ-2026-005", "自研报表平台", "PRD-DATA-01", "", (40, 50, 20, 30, 45, 35), "驳回", "与现有 BI 功能重叠度过高", "已评审"),
]

DISPOSALS = [
    ("SYS-DOC-01", "停用", 1, "功能老旧，已被协同办公平台取代", "历史文档需迁移归档", date(2026, 6, 30), "批准"),
    ("SYS-HR-01", "替换", 2, "版本老化，运维成本高", "需评估数据迁移与新选型", date(2026, 12, 31), "提议"),
    ("SYS-ERP-01", "优化", 3, "性能瓶颈集中在报表模块", "优化期间需保障月结", date(2026, 9, 30), "提议"),
    ("SYS-WMS-01", "整合", 2, "与 SRM 仓储功能重叠", "整合后需重新划分权限", date(2026, 10, 31), "提议"),
    ("SYS-QMS-01", "保留", 5, "运行稳定，满足质量追溯要求", "", None, "完成"),
    ("SYS-OA-01", "优化", 4, "流程引擎响应慢", "升级期间有短暂停机风险", date(2026, 8, 15), "提议"),
]

INDICATORS = [
    ("IND-LEDGER-RATE", "系统台账完整率", "台账治理", 100, 86, "%", "2026-Q4"),
    ("IND-ATTR-RATE", "系统归属明确率", "台账治理", 100, 83.33, "%", "2026-Q4"),
    ("IND-REUSE-RATE", "能力复用率", "组合效能", 40, 28, "%", "2026-Q4"),
    ("IND-OVERLAP-RATE", "功能重叠率", "组合效能", 10, 17, "%", "2026-Q4"),
    ("IND-HIGH-VALUE-RATE", "高价值系统占比", "组合效能", 50, 30, "%", "2026-Q4"),
    ("IND-SCORE-COVERAGE", "系统评分覆盖率", "评价体系", 100, 16.67, "%", "2026-Q4"),
    ("IND-DISPOSAL-DONE", "处置项完成率", "退出治理", 80, 16.67, "%", "2026-Q4"),
    ("IND-COST-PER-USER", "人均系统成本", "成本效率", 600, 760, "元/人/年", "2026-Q4"),
    ("IND-INTEGRATION-RATE", "标准集成覆盖率", "数据与集成", 90, 65, "%", "2026-Q4"),
    ("IND-SLA-MEET", "系统 SLA 达标率", "运维质量", 99.5, 99.2, "%", "2026-Q4"),
]


def seed(db: Session, reset: bool = False) -> None:
    if reset:
        for t in [
            "audit_log", "system_score_total", "system_score", "system_product_dependency",
            "disposal", "requirement", "sys_system", "indicator", "score_dimension",
            "product", "product_domain",
        ]:
            db.execute(text(f"DELETE FROM product_governance.{t}"))
        for t in [
            "audit_log", "system_score_total", "system_score", "system_product_dependency",
            "disposal", "requirement", "sys_system", "indicator", "score_dimension",
            "product", "product_domain",
        ]:
            db.execute(text(
                f"ALTER SEQUENCE product_governance.{t}_id_seq RESTART WITH 1"
            ))
        db.commit()

    # 域
    domains = {}
    for code, name, desc in DOMAINS:
        d = db.query(ProductDomain).filter_by(code=code).one_or_none()
        if not d:
            d = ProductDomain(code=code, name=name, description=desc)
            db.add(d)
            db.flush()
        domains[code] = d

    # 维度
    for code, name, weight in DIMENSIONS:
        if not db.query(ScoreDimension).filter_by(code=code).one_or_none():
            db.add(ScoreDimension(code=code, name=name, weight=weight, description=f"{name}（权重 {weight}%）"))
    db.flush()

    # 产品
    products = {}
    for code, name, dom, owner, status, desc in PRODUCTS:
        p = db.query(Product).filter_by(code=code).one_or_none()
        if not p:
            p = Product(code=code, name=name, domain_id=domains[dom].id, owner=owner, status=status, description=desc)
            db.add(p)
            db.flush()
        products[code] = p

    # 系统
    systems = {}
    for row in SYSTEMS:
        code, name, pcode = row[0], row[1], row[2]
        s = db.query(SystemInfo).filter_by(code=code).one_or_none()
        if not s:
            s = SystemInfo(
                code=code, name=name,
                main_product_id=products[pcode].id if pcode else None,
                department=row[3], business_owner=row[4], tech_owner=row[5],
                status=row[6], annual_cost=row[7], user_count=row[8],
                go_live_date=row[9], description=f"{name}（示例台账数据）",
                source_file="seed_data",
            )
            db.add(s)
            db.flush()
        systems[code] = s

    for scode, pcode, note in DEPENDENCIES:
        exists = (
            db.query(SystemProductDependency)
            .filter_by(system_id=systems[scode].id, product_id=products[pcode].id)
            .one_or_none()
        )
        if not exists:
            db.add(SystemProductDependency(
                system_id=systems[scode].id, product_id=products[pcode].id, note=note
            ))
    db.flush()

    # 需求
    weights = {"biz_value": 30, "urgency": 20, "reuse_match": 20, "roi": 15, "tech_feasible": 10, "synergy": 5}
    from decimal import Decimal

    for code, name, pcode, coop, scores6, decision, note, status in REQUIREMENTS:
        if db.query(Requirement).filter_by(code=code).one_or_none():
            continue
        data = dict(zip(weights.keys(), map(Decimal, scores6)))
        weighted = sum(v * w for v, w in zip(map(Decimal, scores6), weights.values())) / 100
        db.add(Requirement(
            code=code, name=name,
            main_product_id=products[pcode].id if pcode else None,
            coop_products=coop, weighted_total=weighted.quantize(Decimal("0.01")),
            decision=decision, decision_note=note, status=status, **data,
        ))
    db.flush()

    # 处置
    for scode, action, prio, reason, risk, tdate, status in DISPOSALS:
        if not db.query(Disposal).filter_by(system_id=systems[scode].id, action=action).one_or_none():
            db.add(Disposal(
                system_id=systems[scode].id, action=action, priority=prio,
                reason=reason, risk_note=risk, target_date=tdate, status=status,
            ))
    db.flush()

    # 指标
    for code, name, cat, target, current, unit, period in INDICATORS:
        if not db.query(Indicator).filter_by(code=code).one_or_none():
            db.add(Indicator(code=code, name=name, category=cat, target_value=target,
                             current_value=current, unit=unit, period=period))
    db.flush()

    # 评分：2 个系统完整 10 维度打分 + 总分
    score_sheets = {
        "SYS-ERP-01": [88, 90, 85, 70, 86, 90, 82, 60, 72, 85],
        "SYS-MES-01": [92, 80, 88, 85, 90, 84, 88, 55, 78, 90],
    }
    for scode, values in score_sheets.items():
        if (db.query(SystemScoreTotal)
                .filter_by(system_id=systems[scode].id)
                .order_by(SystemScoreTotal.evaluated_at.desc())
                .first()):
            continue
        items = [{"dimension_code": DIMENSIONS[i][0], "score": v} for i, v in enumerate(values)]
        save_scores(db, systems[scode].id, items, f"{systems[scode].name} 年度组合价值评估")

    db.commit()


def main() -> None:
    reset = "--reset" in sys.argv
    db = SessionLocal()
    try:
        seed(db, reset)
        print("种子数据导入完成" + ("（已重置）" if reset else ""))
    finally:
        db.close()


if __name__ == "__main__":
    main()
