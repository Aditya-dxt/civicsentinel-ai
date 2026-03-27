import asyncio
import json
import os

# ── Persistent event store — survives server restarts ──────────────
# Render free tier wipes RAM on spin-down. Write to disk instead.
_STORE_PATH = "/tmp/civicsentinel_events.json"

def _load():
    try:
        with open(_STORE_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return []

def _save(store):
    try:
        with open(_STORE_PATH, "w") as f:
            json.dump(store[-200:], f)   # keep last 200
    except Exception:
        pass

event_store = _load()   # loads from disk on startup
connected_clients = []


async def broadcast_event(event):
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_json(event)
        except Exception:
            disconnected.append(client)
    for d in disconnected:
        connected_clients.remove(d)
    _save(event_store)   # persist to disk after every new event