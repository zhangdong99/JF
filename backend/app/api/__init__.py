from fastapi import APIRouter

from app.api import architecture, dashboard, plans, resources, scores

api_router = APIRouter()
api_router.include_router(dashboard.router)
api_router.include_router(resources.router_domains)
api_router.include_router(resources.router_products)
api_router.include_router(resources.router_systems)
api_router.include_router(resources.router_requirements)
api_router.include_router(resources.router_disposals)
api_router.include_router(resources.router_indicators)
api_router.include_router(scores.router)
api_router.include_router(architecture.router)
api_router.include_router(plans.router_plans)
