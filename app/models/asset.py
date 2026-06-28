from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

VALID_TYPES = {"domain", "ip", "service"}
VALID_STATUSES = {"active", "inactive"}


class Asset(BaseModel):
    id: str
    name: str
    type: str
    status: str
    created_at: datetime


class CreateAssetRequest(BaseModel):
    name: str
    type: str
    status: str = "active"


def new_asset(req: CreateAssetRequest) -> Asset:
    return Asset(
        id=str(uuid.uuid4()),
        name=req.name,
        type=req.type,
        status=req.status,
        created_at=datetime.utcnow(),
    )


def validate_asset(req: CreateAssetRequest) -> Optional[str]:
    if not req.name or not req.name.strip():
        return "name is required"
    if req.type not in VALID_TYPES:
        return f"type must be one of {sorted(VALID_TYPES)}"
    if req.status not in VALID_STATUSES:
        return f"status must be one of {sorted(VALID_STATUSES)}"
    return None
