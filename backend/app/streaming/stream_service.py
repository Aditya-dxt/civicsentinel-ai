import asyncio

event_store = []
connected_clients = []


async def broadcast_event(event):

    disconnected = []

    for client in connected_clients:
        try:
            await client.send_json(event)
        except:
            disconnected.append(client)

    for d in disconnected:
        connected_clients.remove(d)