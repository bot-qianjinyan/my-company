from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.storage import UPLOAD_ROOT


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description="企业内部管理平台 API：组织架构 / 请假 / 签到 / 看板 / 知识库 / 站内邮件 / 报销",
        version="0.1.0",
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(api_router)

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

    return app


app = create_app()
