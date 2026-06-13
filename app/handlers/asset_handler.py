from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.models.asset import CreateAssetRequest
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


class BatchCreateRequest(BaseModel):
    assets: list[CreateAssetRequest]


def make_router(service: AssetService) -> APIRouter:
    @router.post("", status_code=201)
    def create_asset(req: CreateAssetRequest):
        asset, err = service.create(req)
        if err:
            raise HTTPException(status_code=400, detail=err)
        return asset

    @router.post("/batch", status_code=201)
    def batch_create(req: BatchCreateRequest):
        assets, err = service.batch_create(req.assets)
        if err:
            raise HTTPException(status_code=400, detail=err)
        return {"created": len(assets), "ids": [a.id for a in assets]}

    @router.get("/stats")
    def get_stats():
        return service.get_stats()

    @router.get("/count")
    def count_assets(
        type: Optional[str] = Query(default=None),
        status: Optional[str] = Query(default=None),
    ):
        return service.count_by_filter(type, status)

    @router.get("/search")
    def search_assets(q: str = Query(..., description="Search query")):
        results = service.search(q)
        return results

    @router.delete("/batch")
    def batch_delete(ids: str = Query(..., description="Comma-separated asset IDs")):
        id_list = [i.strip() for i in ids.split(",") if i.strip()]
        if not id_list:
            raise HTTPException(status_code=400, detail="ids parameter required")
        deleted, not_found = service.batch_delete(id_list)
        return {"deleted": deleted, "not_found": not_found}

    @router.get("")
    def list_assets(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, ge=1, le=100),
        type: Optional[str] = Query(default=None),
        status: Optional[str] = Query(default=None),
    ):
        return service.list_paginated(page, limit, type, status)

    @router.get("/{asset_id}")
    def get_asset(asset_id: str):
        asset = service.get(asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="asset not found")
        return asset

    @router.put("/{asset_id}")
    def update_asset(asset_id: str, req: CreateAssetRequest):
        asset, err = service.update(asset_id, req)
        if err == "not found":
            raise HTTPException(status_code=404, detail="asset not found")
        if err:
            raise HTTPException(status_code=400, detail=err)
        return asset

    @router.delete("/{asset_id}")
    def delete_asset(asset_id: str):
        if not service.delete(asset_id):
            raise HTTPException(status_code=404, detail="asset not found")
        return {"deleted": True}

    return router
