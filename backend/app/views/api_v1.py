from fastapi import APIRouter
from app.views.auth_router import router as auth_router
from app.views.org_router import router as org_router
from app.views.dashboard_router import router as dashboard_router
from app.views.superadmin_router import router as superadmin_router
from app.views.calling_router import router as calling_router
from app.views.public_router import router as public_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(org_router)
api_router.include_router(dashboard_router)
api_router.include_router(superadmin_router)
api_router.include_router(calling_router)
api_router.include_router(public_router)
