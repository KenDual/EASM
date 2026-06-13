import threading
from typing import Optional
from app.models.asset import Asset


class MemoryStorage:
    def __init__(self):
        self._store: dict[str, Asset] = {}
        self._lock = threading.Lock()

    def create(self, asset: Asset) -> Asset:
        with self._lock:
            self._store[asset.id] = asset
        return asset

    def batch_create(self, assets: list[Asset]) -> list[Asset]:
        with self._lock:
            for asset in assets:
                self._store[asset.id] = asset
        return assets

    def get(self, asset_id: str) -> Optional[Asset]:
        with self._lock:
            return self._store.get(asset_id)

    def list_all(self) -> list[Asset]:
        with self._lock:
            return list(self._store.values())

    def update(self, asset: Asset) -> Asset:
        with self._lock:
            self._store[asset.id] = asset
        return asset

    def delete(self, asset_id: str) -> bool:
        with self._lock:
            if asset_id in self._store:
                del self._store[asset_id]
                return True
            return False

    def batch_delete(self, ids: list[str]) -> tuple[int, int]:
        deleted = 0
        not_found = 0
        with self._lock:
            for asset_id in ids:
                if asset_id in self._store:
                    del self._store[asset_id]
                    deleted += 1
                else:
                    not_found += 1
        return deleted, not_found

    def count(self) -> int:
        with self._lock:
            return len(self._store)
