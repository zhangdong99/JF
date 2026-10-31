"""四层治理框架静态结构，供前端绘制架构总览图。"""

from fastapi import APIRouter

from app.schemas import ApiResponse

LAYER_DECISION = "决策层"
LAYER_EXEC = "执行层"
LAYER_SUPPORT = "支撑层"
LAYER_BUDGET = "预算管控"

NODES = [
    # 决策层
    {"id": "d1", "name": "战略解码", "layer": LAYER_DECISION, "pos": [0, 0]},
    {"id": "d2", "name": "产品规划", "layer": LAYER_DECISION, "pos": [1, 0]},
    {"id": "d3", "name": "支撑规划", "layer": LAYER_DECISION, "pos": [1, 1]},
    {"id": "d4", "name": "年度重点工作", "layer": LAYER_DECISION, "pos": [2, 0]},
    {"id": "d5", "name": "进度管控", "layer": LAYER_DECISION, "pos": [3, 0]},
    {"id": "d6", "name": "目标变更", "layer": LAYER_DECISION, "pos": [4, 0]},
    {"id": "d7", "name": "战略复盘", "layer": LAYER_DECISION, "pos": [5, 0]},
    # 执行层
    {"id": "e1", "name": "项目运营", "layer": LAYER_EXEC, "pos": [0, 1]},
    {"id": "e1-1", "name": "立项", "layer": LAYER_EXEC, "pos": [0.5, 1]},
    {"id": "e1-2", "name": "进度", "layer": LAYER_EXEC, "pos": [1, 1.3]},
    {"id": "e1-3", "name": "质量风险", "layer": LAYER_EXEC, "pos": [1.5, 1]},
    {"id": "e1-4", "name": "变更", "layer": LAYER_EXEC, "pos": [2, 1.3]},
    {"id": "e1-5", "name": "结项", "layer": LAYER_EXEC, "pos": [2.5, 1]},
    {"id": "e2", "name": "架构运营", "layer": LAYER_EXEC, "pos": [3, 1]},
    {"id": "e2-1", "name": "信息架构", "layer": LAYER_EXEC, "pos": [3.3, 0.7]},
    {"id": "e2-2", "name": "应用架构", "layer": LAYER_EXEC, "pos": [3.6, 1]},
    {"id": "e2-3", "name": "技术架构", "layer": LAYER_EXEC, "pos": [3.9, 1.3]},
    {"id": "e2-4", "name": "安全架构", "layer": LAYER_EXEC, "pos": [4.2, 1]},
    {"id": "e3", "name": "产品运营", "layer": LAYER_EXEC, "pos": [0, 2]},
    {"id": "e3-1", "name": "评价指标", "layer": LAYER_EXEC, "pos": [0.5, 2]},
    {"id": "e3-2", "name": "通用/灯塔指标", "layer": LAYER_EXEC, "pos": [1, 2.3]},
    {"id": "e3-3", "name": "指标评价", "layer": LAYER_EXEC, "pos": [1.5, 2]},
    {"id": "e3-4", "name": "产品迭代", "layer": LAYER_EXEC, "pos": [2, 2]},
    {"id": "e4", "name": "需求运营", "layer": LAYER_EXEC, "pos": [3, 2]},
    {"id": "e4-1", "name": "收集", "layer": LAYER_EXEC, "pos": [3.3, 1.7]},
    {"id": "e4-2", "name": "分级", "layer": LAYER_EXEC, "pos": [3.6, 2]},
    {"id": "e4-3", "name": "评审", "layer": LAYER_EXEC, "pos": [3.9, 2.3]},
    {"id": "e4-4", "name": "排期", "layer": LAYER_EXEC, "pos": [4.2, 2]},
    {"id": "e4-5", "name": "跟踪", "layer": LAYER_EXEC, "pos": [4.5, 2.3]},
    {"id": "e4-6", "name": "评价", "layer": LAYER_EXEC, "pos": [4.8, 2]},
    {"id": "e4-7", "name": "沉淀", "layer": LAYER_EXEC, "pos": [5.1, 2]},
    # 支撑层
    {"id": "s1", "name": "流程运营", "layer": LAYER_SUPPORT, "pos": [0, 3]},
    {"id": "s1-1", "name": "流程审视", "layer": LAYER_SUPPORT, "pos": [0.5, 3]},
    {"id": "s1-2", "name": "流程监控", "layer": LAYER_SUPPORT, "pos": [1, 3.3]},
    {"id": "s1-3", "name": "流程优化", "layer": LAYER_SUPPORT, "pos": [1.5, 3]},
    # 预算管控（右侧竖列）
    {"id": "b1", "name": "预算编制", "layer": LAYER_BUDGET, "pos": [6.5, 0]},
    {"id": "b2", "name": "分级审核", "layer": LAYER_BUDGET, "pos": [6.5, 1]},
    {"id": "b3", "name": "预算批复", "layer": LAYER_BUDGET, "pos": [6.5, 2]},
    {"id": "b4", "name": "执行管控", "layer": LAYER_BUDGET, "pos": [6.5, 3]},
    {"id": "b5", "name": "变更管理", "layer": LAYER_BUDGET, "pos": [6.5, 4]},
    {"id": "b6", "name": "精益复盘", "layer": LAYER_BUDGET, "pos": [6.5, 5]},
]

EDGES = [
    ["d1", "d2"], ["d1", "d3"], ["d2", "d4"], ["d3", "d4"], ["d4", "d5"],
    ["d5", "d6"], ["d6", "d7"], ["d7", "d1"],
    ["d2", "e1"], ["d3", "e2"], ["d2", "e3"], ["d3", "e4"],
    ["e1-1", "e1-2"], ["e1-2", "e1-3"], ["e1-3", "e1-4"], ["e1-4", "e1-5"],
    ["e2", "e2-1"], ["e2", "e2-2"], ["e2", "e2-3"], ["e2", "e2-4"],
    ["e3-1", "e3-2"], ["e3-2", "e3-3"], ["e3-3", "e3-4"],
    ["e4-1", "e4-2"], ["e4-2", "e4-3"], ["e4-3", "e4-4"], ["e4-4", "e4-5"],
    ["e4-5", "e4-6"], ["e4-6", "e4-7"],
    ["e1", "s1"], ["e4", "s1"],
    ["s1", "s1-1"], ["s1-1", "s1-2"], ["s1-2", "s1-3"],
    ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"], ["b5", "b6"],
    ["d2", "b1"], ["e1", "b4"], ["e3", "b4"], ["b6", "d7"],
]

router = APIRouter(tags=["architecture"])


@router.get("/architecture", response_model=ApiResponse)
def architecture():
    return ApiResponse(
        data={
            "layers": [LAYER_DECISION, LAYER_EXEC, LAYER_SUPPORT, LAYER_BUDGET],
            "nodes": NODES,
            "edges": [{"source": s, "target": t} for s, t in EDGES],
        }
    )
