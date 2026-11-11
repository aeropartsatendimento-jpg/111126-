"""Simulated Visual Browser missions.

This module never requests the target URL. It persists a clearly labelled
simulation so the product flow can be exercised before a real, authorized VPS
browser/MCP connection exists.
"""

import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.orchestrator import _post_room, spawn
from models.models import VisualMission, VisualMissionCreate, aware

router = APIRouter()
logger = logging.getLogger(__name__)

STEP_BLUEPRINTS = [
    ("validate", "Validando a ordem"),
    ("session", "Preparando sessão isolada"),
    ("journey", "Mapeando a jornada"),
    ("delivery", "Consolidando a entrega"),
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_mission(doc: dict) -> VisualMission:
    return VisualMission(
        **{
            **doc,
            "created_at": aware(doc["created_at"]),
            "updated_at": aware(doc["updated_at"]),
        }
    )


def _detail(step_key: str, mission: dict) -> str:
    host = urlparse(mission["url"]).netloc
    objective = mission["objective"]
    details = {
        "validate": f"Alvo reconhecido: {host}. Objetivo recebido sem abrir o endereço.",
        "session": "Sessão simulada preparada. Nenhum login, cookie ou conta real foi utilizado.",
        "journey": f"Roteiro simulado criado para: {objective}",
        "delivery": "Resumo preparado sem captura, leitura ou alteração do site real.",
    }
    return details[step_key]


async def run_visual_mission(mission_id: str) -> None:
    mission = await db.visual_missions.find_one({"id": mission_id})
    if not mission:
        return

    try:
        mission["status"] = "running"
        mission["updated_at"] = _now()
        await db.visual_missions.update_one(
            {"id": mission_id},
            {"$set": {"status": "running", "updated_at": mission["updated_at"]}},
        )

        steps = mission["steps"]
        for index, step in enumerate(steps):
            await asyncio.sleep(0.7)
            steps[index] = {**step, "status": "completed", "detail": _detail(step["key"], mission)}
            await db.visual_missions.update_one(
                {"id": mission_id},
                {"$set": {"steps": steps, "updated_at": _now()}},
            )

        host = urlparse(mission["url"]).netloc
        result = (
            f"[MODO SIMULADO] Missão visual planejada para {host}. "
            f"Objetivo: {mission['objective']}\n\n"
            "Nenhum site foi aberto e nenhuma conta foi acessada. "
            "Para execução real, conecte e autorize o navegador/MCP da VPS."
        )
        await db.visual_missions.update_one(
            {"id": mission_id},
            {"$set": {"status": "completed", "result": result, "steps": steps, "updated_at": _now()}},
        )
        await _post_room(
            "zero",
            "system",
            f"🖥️ Navegador Visual · MODO SIMULADO\n\n{result}",
        )
    except Exception:
        logger.exception("visual mission %s failed", mission_id)
        await db.visual_missions.update_one(
            {"id": mission_id},
            {
                "$set": {
                    "status": "failed",
                    "result": "[MODO SIMULADO] A simulação foi interrompida antes da entrega.",
                    "updated_at": _now(),
                }
            },
        )


@router.get("/visual/missions", response_model=list[VisualMission])
async def list_visual_missions():
    docs = await db.visual_missions.find().sort("created_at", -1).to_list(50)
    return [_to_mission(doc) for doc in docs]


@router.get("/visual/missions/{mission_id}", response_model=VisualMission)
async def get_visual_mission(mission_id: str):
    doc = await db.visual_missions.find_one({"id": mission_id})
    if not doc:
        raise HTTPException(status_code=404, detail="visual mission not found")
    return _to_mission(doc)


@router.post("/visual/missions", response_model=VisualMission)
async def create_visual_mission(input: VisualMissionCreate):
    mission = VisualMission(
        url=input.url,
        objective=input.objective,
        steps=[{"key": key, "label": label} for key, label in STEP_BLUEPRINTS],
    )
    await db.visual_missions.insert_one(mission.model_dump())
    spawn(run_visual_mission(mission.id))
    return mission