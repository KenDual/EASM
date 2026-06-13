from typing import Optional
from app.models.asset import Asset, CreateAssetRequest, new_asset, validate_asset
from app.storage.memory_storage import MemoryStorage


class AssetService:
    def __init__(self, storage: MemoryStorage):
        self._storage = storage

    def create(self, req: CreateAssetRequest) -> tuple[Optional[Asset], Optional[str]]:
        err = validate_asset(req)
        if err:
            return None, err
        asset = new_asset(req)
        return self._storage.create(asset), None

    def batch_create(self, reqs: list[CreateAssetRequest]) -> tuple[Optional[list[Asset]], Optional[str]]:
        if len(reqs) > 100:
            return None, "maximum 100 assets per request"
        for req in reqs:
            err = validate_asset(req)
            if err:
                return None, err
        assets = [new_asset(req) for req in reqs]
        return self._storage.batch_create(assets), None

    def get(self, asset_id: str) -> Optional[Asset]:
        return self._storage.get(asset_id)

    def list_all(self) -> list[Asset]:
        return self._storage.list_all()

    def update(self, asset_id: str, req: CreateAssetRequest) -> tuple[Optional[Asset], Optional[str]]:
        existing = self._storage.get(asset_id)
        if not existing:
            return None, "not found"
        err = validate_asset(req)
        if err:
            return None, err
        updated = existing.model_copy(update={"name": req.name, "type": req.type, "status": req.status})
        return self._storage.update(updated), None

    def delete(self, asset_id: str) -> bool:
        return self._storage.delete(asset_id)

    def batch_delete(self, ids: list[str]) -> tuple[int, int]:
        return self._storage.batch_delete(ids)

    def get_stats(self) -> dict:
        assets = self._storage.list_all()
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for a in assets:
            by_type[a.type] = by_type.get(a.type, 0) + 1
            by_status[a.status] = by_status.get(a.status, 0) + 1
        return {"total": len(assets), "by_type": by_type, "by_status": by_status}

    def count_by_filter(self, type_filter: Optional[str], status_filter: Optional[str]) -> dict:
        assets = self._storage.list_all()
        filtered = [
            a for a in assets
            if (type_filter is None or a.type == type_filter)
            and (status_filter is None or a.status == status_filter)
        ]
        filters = {}
        if type_filter:
            filters["type"] = type_filter
        if status_filter:
            filters["status"] = status_filter
        return {"count": len(filtered), "filters": filters}

    def search(self, query: str, limit: int = 100) -> list[Asset]:
        q = query.lower()
        results = [a for a in self._storage.list_all() if q in a.name.lower()]
        return results[:limit]

    def list_paginated(self, page: int, limit: int, type_filter: Optional[str], status_filter: Optional[str]) -> dict:
        assets = self._storage.list_all()
        filtered = [
            a for a in assets
            if (type_filter is None or a.type == type_filter)
            and (status_filter is None or a.status == status_filter)
        ]
        total = len(filtered)
        total_pages = max(1, (total + limit - 1) // limit)
        start = (page - 1) * limit
        data = filtered[start:start + limit]
        return {
            "data": data,
            "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
        }

    def storage_count(self) -> int:
        return self._storage.count()
