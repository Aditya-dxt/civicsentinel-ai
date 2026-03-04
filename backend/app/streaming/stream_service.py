import asyncio
from app.streaming.pipeline import process_event

event_store = []


async def start_stream():

    while True:

        event = process_event()

        event_store.append(event)

        if len(event_store) > 50:
            event_store.pop(0)

        print("New Event:", event)

        await asyncio.sleep(2)