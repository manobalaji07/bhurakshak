from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from datetime import datetime, timezone

from app.schemas.telemetry import TelemetryPayload, TelemetryResponse
from app.services.telemetry_service import telemetry_service
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry Ingestion"])

@router.post("", response_model=TelemetryResponse, status_code=status.HTTP_200_OK)
async def receive_telemetry(payload: TelemetryPayload, background_tasks: BackgroundTasks):
    """
    Central Gateway Ingestion Point.
    Receives live ESP32 node telemetry over HTTP REST POST.
    Buffers data into 30-sample windows, computes ML features, updates health, and broadcasts live state.
    Gracefully rejects payloads from disconnected nodes (node_id == '--').
    """
    try:
        telemetry_dict = payload.model_dump()
        received_at = datetime.now(timezone.utc).isoformat()
        if not telemetry_dict.get("timestamp"):
            telemetry_dict["timestamp"] = received_at

        # Process telemetry & update node state
        result = telemetry_service.process_telemetry(telemetry_dict)
        effective_node_id = result.get("node_id", payload.node_id or "NODE_01")

        # Broadcast real-time update over WebSocket
        background_tasks.add_task(
            ws_manager.broadcast,
            {
                "event": "telemetry_update",
                "node_id": effective_node_id,
                "timestamp": telemetry_dict["timestamp"],
                "node_state": result["node_state"],
                "ml_results": result["ml_results"],
                "raw_reading": telemetry_dict
            }
        )

        return TelemetryResponse(
            success=True,
            node_id=effective_node_id,
            received_at=received_at,
            buffered=True,
            subsidence_detected=result.get("subsidence_detected", False),
            speaker_alert=result.get("speaker_alert", False),
            risk_level=result.get("risk_level", "NORMAL"),
            alert_mode=result.get("alert_mode", "NONE"),
            kinematic_projection=result.get("kinematic_projection")
        )

    except ValueError as ve:
        # Disconnected node rejection — return 200 skip so the gateway doesn't retry
        logger.info(f"Skipped telemetry: {ve}")
        return TelemetryResponse(
            success=False,
            node_id=str(payload.node_id or "--"),
            received_at=datetime.now(timezone.utc).isoformat(),
            buffered=False,
            risk_level="NORMAL",
            alert_mode="NONE"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid telemetry payload: {str(e)}"
        )

