from fastapi import WebSocket
from app.streaming.stream_service import event_store
import asyncio

async def event_stream(websocket: WebSocket):

    await websocket.accept()

    last_count = 0

    while True:

        if len(event_store) > last_count:

            new_event = event_store[-1]

            await websocket.send_json(new_event)

            last_count = len(event_store)

        await asyncio.sleep(2)