import asyncio
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from app.services.connection_manager import manager

router = APIRouter()

async def event_generator(request: Request):
    """
    SSE generator complying with 03-python-patterns.
    Streams telemetry and alert events to frontend dashboards.
    Sends keep-alive comments every 15 seconds to prevent connection drops.
    """
    queue = manager.subscribe_sse()
    try:
        # Initial greeting event
        yield "data: {\"event\": \"CONNECTED\", \"msg\": \"Subscribed to real-time telemetry stream\"}\n\n"
        while True:
            if await request.is_disconnected():
                break

            try:
                # Wait for next event or timeout for keep-alive
                msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {msg}\n\n"
            except asyncio.TimeoutError:
                # Heartbeat keep-alive comment
                yield ": keep-alive\n\n"
    finally:
        manager.unsubscribe_sse(queue)

@router.get("/events")
async def sse_events(request: Request):
    """Server-Sent Events endpoint for real-time telemetry streaming"""
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.websocket("/ws")
async def websocket_telemetry(websocket: WebSocket):
    """WebSocket endpoint for bidirectional real-time dashboards"""
    await manager.connect_ws(websocket)
    try:
        while True:
            # Keep receiving client pings / messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_ws(websocket)
