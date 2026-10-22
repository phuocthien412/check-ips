import asyncio
import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("uvicorn.error")

class ConnectionManager:
    """Manages active WebSockets and SSE queues for broadcasting events to dashboards"""
    def __init__(self):
        self.active_websockets: List[WebSocket] = []
        self.sse_subscribers: List[asyncio.Queue] = []

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.append(websocket)
        logger.info(f"WebSocket client connected. Total WS clients: {len(self.active_websockets)}")

    def disconnect_ws(self, websocket: WebSocket):
        if websocket in self.active_websockets:
            self.active_websockets.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining WS: {len(self.active_websockets)}")

    def subscribe_sse(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.sse_subscribers.append(q)
        logger.info(f"SSE subscriber added. Total SSE subscribers: {len(self.sse_subscribers)}")
        return q

    def unsubscribe_sse(self, q: asyncio.Queue):
        if q in self.sse_subscribers:
            self.sse_subscribers.remove(q)
            logger.info(f"SSE subscriber removed. Remaining SSE: {len(self.sse_subscribers)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        message = {
            "event": event_type,
            "data": data
        }
        json_str = json.dumps(message, default=str)

        # Broadcast to WebSockets
        disconnected_ws = []
        for ws in self.active_websockets:
            try:
                await ws.send_text(json_str)
            except Exception:
                disconnected_ws.append(ws)
        for ws in disconnected_ws:
            self.disconnect_ws(ws)

        # Broadcast to SSE queues
        for q in self.sse_subscribers:
            try:
                await q.put(json_str)
            except Exception as e:
                logger.error(f"Error putting to SSE queue: {e}")

manager = ConnectionManager()
