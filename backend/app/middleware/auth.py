"""Bearer token authentication for the public REST API."""

from datetime import datetime, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer_scheme = HTTPBearer(auto_error=False)

# Algorithm for JWT encoding/decoding
_ALGORITHM = "HS256"


def create_api_token(subject: str = "api", expires_days: int = 365) -> str:
    """Generate a signed JWT token for API access."""
    payload = {
        "sub": subject,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc).timestamp() + (expires_days * 86400),
    }
    return jwt.encode(payload, settings.api_bearer_token, algorithm=_ALGORITHM)


async def require_api_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    """
    FastAPI dependency that validates a Bearer token.

    Supports two modes:
    1. JWT mode: If the token is a valid JWT signed with the API secret,
       the decoded payload is returned.
    2. Simple mode: If the token matches the API_BEARER_TOKEN setting exactly,
       a basic payload is returned. Useful for simple integrations.

    Raises 401 if neither mode succeeds.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Try JWT decode first
    try:
        payload = jwt.decode(
            token, settings.api_bearer_token, algorithms=[_ALGORITHM]
        )
        return payload
    except jwt.InvalidTokenError:
        pass

    # Fall back to simple token comparison
    if token == settings.api_bearer_token:
        return {"sub": "api", "mode": "simple"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
