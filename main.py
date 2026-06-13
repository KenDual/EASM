from fastapi import FastAPI
from app.storage.memory_storage import MemoryStorage
from app.services.asset_service import AssetService
from app.handlers import asset_handler, health_handler

app = FastAPI(title="Asset Management API")

storage = MemoryStorage()
service = AssetService(storage)

app.include_router(asset_handler.make_router(service))
app.include_router(health_handler.make_router(service))
