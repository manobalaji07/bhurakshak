import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import telemetry, nodes, alerts, notifications, analytics, auth, sms
from app.websocket.manager import ws_manager
from app.services.node_health_service import node_health_service
from app.db.mongo_user_store import mongo_user_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bhurakshak.main")

background_task_running = True

async def periodic_node_health_checker():
    """Background task checking for node timeouts every 2 seconds."""
    while background_task_running:
        try:
            updated_nodes = node_health_service.check_all_nodes_timeout()
            for node in updated_nodes:
                await ws_manager.broadcast({
                    "event": "node_status_change",
                    "node_id": node["node_id"],
                    "node_state": node
                })
        except Exception as e:
            logger.error(f"Error in periodic health checker: {e}")
        await asyncio.sleep(2.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting BhuRakshak Mine Safety Monitoring Backend Server...")

    # Connect MongoDB user store (auth) — non-blocking; falls back if unavailable
    await mongo_user_store.connect()

    # Start background node heartbeat checker
    health_task = asyncio.create_task(periodic_node_health_checker())

    yield

    # Shutdown
    global background_task_running
    background_task_running = False
    health_task.cancel()
    await mongo_user_store.disconnect()
    logger.info("Shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Underground Coal-Mine Surface Mesh Monitoring, HTTP REST Telemetry Gateway & AI Decision-Support Backend API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(telemetry.router)
app.include_router(nodes.router)
app.include_router(alerts.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(sms.router, prefix="/api/v1/sms", tags=["sms"])

from app.ml.inference import ml_engine

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "ONLINE",
        "transport": "HTTP/REST Telemetry Ingestion (No MQTT)",
        "nodes_monitored": ["NODE_01", "NODE_02", "NODE_03"],
        "ml_models_status": ml_engine.get_status(),
        "docs_url": "/docs"
    }

@app.get("/api/v1/ml/status")
async def get_ml_status():
    """Returns exact status of loaded machine learning models."""
    return ml_engine.get_status()


# WebSocket Endpoint
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop reading client messages if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Static file serving — built React frontend (for single-server deployment)
# Run `npm run build` in the frontend folder first.
# The dist/ folder is served at the root, with SPA fallback to index.html.
# ---------------------------------------------------------------------------
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../frontend/dist")
)

if os.path.isdir(_FRONTEND_DIST):
    # Serve static assets (JS, CSS, images) under /assets
    _assets_dir = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """
        SPA catch-all route — serves index.html for every non-API path.
        React Router handles client-side navigation.
        """
        # Serve specific static files if they exist (favicon, manifest, etc.)
        requested_file = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(requested_file):
            return FileResponse(requested_file)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))

    logger.info(f"✅ Serving built frontend from: {_FRONTEND_DIST}")
else:
    logger.info(
        "Frontend dist/ not found — serving API only. "
        "Run `npm run build` in the frontend folder to enable single-server mode."
    )
