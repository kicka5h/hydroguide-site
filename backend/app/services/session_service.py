from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import UserSession


async def get_or_create_session(
    db: AsyncSession, session_id: str | None
) -> UserSession:
    """Retrieve an existing session or create a new one."""
    if session_id:
        result = await db.execute(
            select(UserSession).where(UserSession.id == session_id)
        )
        user_session = result.scalar_one_or_none()
        if user_session:
            user_session.last_seen_at = datetime.now(timezone.utc)
            return user_session

    # Create new session
    user_session = UserSession()
    db.add(user_session)
    await db.flush()
    return user_session
