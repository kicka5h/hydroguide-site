from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings
from app.db import async_session_factory
from app.services.session_service import get_or_create_session


class SessionMiddleware(BaseHTTPMiddleware):
    """Assigns an anonymous session cookie to every browser request."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        session_id = request.cookies.get(settings.session_cookie_name)

        async with async_session_factory() as db:
            try:
                user_session = await get_or_create_session(db, session_id)
                request.state.session_id = user_session.id
                is_new = user_session.id != session_id
                await db.commit()
            except Exception:
                await db.rollback()
                raise

        response = await call_next(request)

        if is_new:
            max_age = settings.session_max_age_days * 86400
            response.set_cookie(
                key=settings.session_cookie_name,
                value=request.state.session_id,
                max_age=max_age,
                httponly=True,
                samesite="lax",
                secure=not settings.debug,
            )

        return response
