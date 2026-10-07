"""Manage active WebSocket clients and fleet event broadcasts."""

import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        """Send a JSON event to each client and remove clients that failed."""
        broken_connections: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                logger.info("Removing a disconnected fleet WebSocket client")
                broken_connections.append(connection)

        for connection in broken_connections:
            self.disconnect(connection)


manager = ConnectionManager()
