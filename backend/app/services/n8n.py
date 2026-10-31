"""n8n webhook fire-and-forget 触发。

任何异常只记日志，绝不向上抛出，保证业务接口不受 n8n 可用性影响。
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("app.n8n")


def trigger_plan_review(plan_id: int, trigger_type: str, detail: str = "") -> None:
    """fire-and-forget 触发 n8n plan-review webhook。"""
    payload = {
        "plan_id": plan_id,
        "trigger_type": trigger_type,  # leader_feedback / data_change
        "detail": detail,
    }
    try:
        resp = httpx.post(settings.N8N_WEBHOOK_URL, json=payload, timeout=3.0)
        logger.info(
            "n8n webhook 触发完成 plan_id=%s trigger=%s status=%s",
            plan_id, trigger_type, resp.status_code,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("n8n webhook 触发失败（已忽略）url=%s err=%s", settings.N8N_WEBHOOK_URL, exc)
