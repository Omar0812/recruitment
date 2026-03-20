from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.engine.errors import BusinessError
from app.entry.api import (
    actions,
    admin,
    analytics,
    applications,
    auth,
    briefing,
    candidates,
    events,
    expenses,
    files,
    jobs,
    suppliers,
    terms,
)

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(admin.router)
router.include_router(actions.router)
router.include_router(candidates.router)
router.include_router(jobs.router)
router.include_router(applications.router)
router.include_router(events.router)
router.include_router(suppliers.router)
router.include_router(terms.router)
router.include_router(expenses.router)
router.include_router(files.router)
router.include_router(briefing.router)
router.include_router(analytics.router)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(BusinessError)
    async def _handle_business_error(_: Request, exc: BusinessError):
        return JSONResponse(
            status_code=422,
            content={"code": exc.code, "message": exc.message},
        )

    @app.exception_handler(HTTPException)
    async def _handle_http_exception(_: Request, exc: HTTPException):
        detail = exc.detail
        code = f"http_{exc.status_code}"
        message = f"HTTP {exc.status_code}"

        if isinstance(detail, dict):
            code = str(detail.get("code") or code)
            message = str(
                detail.get("message")
                or detail.get("detail")
                or message
            )
        elif detail not in (None, ""):
            message = str(detail)

        return JSONResponse(
            status_code=exc.status_code,
            content={"code": code, "message": message},
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(_: Request, exc: RequestValidationError):
        first_error = exc.errors()[0] if exc.errors() else {}
        location = ".".join(str(item) for item in first_error.get("loc", []))
        reason = first_error.get("msg", "请求参数不合法")
        message = reason if not location else f"{location}: {reason}"

        return JSONResponse(
            status_code=422,
            content={"code": "validation_error", "message": message},
        )
