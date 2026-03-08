from fastapi import WebSocket
from app.streaming.stream_service import connected_clients


async def event_stream(websocket: WebSocket):

    await websocket.accept()

    connected_clients.append(websocket)

    try:
        while True:
            # keep connection alive
            await websocket.receive_text()

    except:
        connected_clients.remove(websocket)