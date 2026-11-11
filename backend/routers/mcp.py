"""QG MCP server — the same Zero, operable by an authorized MCP client
(e.g. Zero on the VPS). Streamable-HTTP transport, stateless, JSON responses.

POST /api/mcp with `Authorization: Bearer <QG_MCP_TOKEN>`.
Without the token configured the endpoint refuses everything (503).
"""

import json
import os
import secrets
from datetime import datetime

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from lib.db import db
from lib.orchestrator import projects_context, resume_text, start_mission, store_context
from models.models import McpInfo, McpRequest

router = APIRouter()

PROTOCOL_VERSION = "2025-06-18"

TOOLS = [
    {"name": "list_projects", "description": "Lista os projetos com a ficha de retomada.", "inputSchema": {"type": "object", "properties": {}}},
    {"name": "get_project", "description": "Ficha de um projeto + tarefas recentes.", "inputSchema": {"type": "object", "properties": {"project_id": {"type": "string"}}, "required": ["project_id"]}},
    {"name": "create_mission", "description": "Envia uma missão ao Zero (opcionalmente dentro de um projeto).", "inputSchema": {"type": "object", "properties": {"text": {"type": "string"}, "project_id": {"type": "string"}}, "required": ["text"]}},
    {"name": "resume_project", "description": "Pede ao Zero para continuar um projeto de onde parou.", "inputSchema": {"type": "object", "properties": {"project_id": {"type": "string"}}, "required": ["project_id"]}},
    {"name": "get_mission", "description": "Estado de uma missão e suas tarefas/resultados.", "inputSchema": {"type": "object", "properties": {"mission_id": {"type": "string"}}, "required": ["mission_id"]}},
    {"name": "list_tasks", "description": "Lista tarefas, filtrando por status (queued|working|review|verified|rejected|failed) e/ou projeto.", "inputSchema": {"type": "object", "properties": {"status": {"type": "string"}, "project_id": {"type": "string"}}}},
    {"name": "read_room", "description": "Últimas mensagens da sala compartilhada.", "inputSchema": {"type": "object", "properties": {"limit": {"type": "integer", "minimum": 1, "maximum": 100}}}},
    {"name": "post_room_message", "description": "Publica uma mensagem do Chefe na sala (o Zero responde).", "inputSchema": {"type": "object", "properties": {"content": {"type": "string"}}, "required": ["content"]}},
    {"name": "list_accounts", "description": "Contas salvas e disponibilidade.", "inputSchema": {"type": "object", "properties": {}}},
    {"name": "store_overview", "description": "Painel AeroPartz: estoque crítico, pedidos em aberto, cupons ativos.", "inputSchema": {"type": "object", "properties": {}}},
]


def _clean(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in doc.items() if k != "_id"}


async def _call(name: str, args: dict) -> object:
    if name == "list_projects":
        return [_clean(d) for d in await db.projects.find().sort("updated_at", -1).to_list(100)]
    if name == "get_project":
        p = await db.projects.find_one({"id": args.get("project_id")})
        if not p:
            raise ValueError("projeto não encontrado")
        tasks = await db.tasks.find({"project_id": p["id"]}).sort("updated_at", -1).to_list(10)
        return {"project": _clean(p), "recent_tasks": [_clean(t) for t in tasks]}
    if name == "create_mission":
        text = str(args.get("text") or "").strip()
        if len(text) < 3:
            raise ValueError("text precisa de ao menos 3 caracteres")
        return _clean(await start_mission(text[:2000], args.get("project_id")))
    if name == "resume_project":
        p = await db.projects.find_one({"id": args.get("project_id")})
        if not p:
            raise ValueError("projeto não encontrado")
        return _clean(await start_mission(resume_text(p), p["id"]))
    if name == "get_mission":
        m = await db.missions.find_one({"id": args.get("mission_id")})
        if not m:
            raise ValueError("missão não encontrada")
        tasks = await db.tasks.find({"mission_id": m["id"]}).sort("created_at", 1).to_list(20)
        return {"mission": _clean(m), "tasks": [_clean(t) for t in tasks]}
    if name == "list_tasks":
        q = {k: args[k] for k in ("status", "project_id") if args.get(k)}
        return [_clean(t) for t in await db.tasks.find(q).sort("created_at", -1).to_list(50)]
    if name == "read_room":
        limit = max(1, min(int(args.get("limit") or 20), 100))
        docs = await db.room_messages.find().sort("created_at", -1).to_list(limit)
        return [_clean(d) for d in reversed(docs)]
    if name == "post_room_message":
        from lib.orchestrator import _post_room, spawn, zero_reply_in_room

        content = str(args.get("content") or "").strip()
        if not content:
            raise ValueError("content vazio")
        await _post_room("user", "chat", content[:4000])
        spawn(zero_reply_in_room())
        return {"ok": True}
    if name == "list_accounts":
        return [_clean(d) for d in await db.accounts.find().to_list(100)]
    if name == "store_overview":
        return {"store": await store_context(), "projects": await projects_context()}
    raise KeyError(name)


def _token() -> str:
    return os.environ.get("QG_MCP_TOKEN", "").strip()


def _rpc_error(rid, code: int, message: str) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": rid, "error": {"code": code, "message": message}})


@router.get("/mcp/info", response_model=McpInfo)
async def mcp_info():
    return McpInfo(path="/api/mcp", token_configured=bool(_token()), tools=[t["name"] for t in TOOLS])


@router.get("/mcp")
async def mcp_get():
    # Stateless server: no server-initiated SSE stream.
    return Response(status_code=405, headers={"Allow": "POST"})


@router.post("/mcp")
async def mcp_post(rpc: McpRequest, request: Request):
    expected = _token()
    if not expected:
        return JSONResponse({"detail": "QG_MCP_TOKEN não configurado — servidor MCP desligado"}, status_code=503)
    auth = request.headers.get("authorization", "")
    given = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    if not given or not secrets.compare_digest(given, expected):
        return JSONResponse({"detail": "token inválido"}, status_code=401, headers={"WWW-Authenticate": "Bearer"})

    if rpc.id is None:  # notification (e.g. notifications/initialized)
        return Response(status_code=202)

    if rpc.method == "initialize":
        return JSONResponse({"jsonrpc": "2.0", "id": rpc.id, "result": {
            "protocolVersion": rpc.params.get("protocolVersion") or PROTOCOL_VERSION,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "qg-do-zero", "version": "1.0.0"},
        }})
    if rpc.method == "ping":
        return JSONResponse({"jsonrpc": "2.0", "id": rpc.id, "result": {}})
    if rpc.method == "tools/list":
        return JSONResponse({"jsonrpc": "2.0", "id": rpc.id, "result": {"tools": TOOLS}})
    if rpc.method == "tools/call":
        name = rpc.params.get("name")
        args = rpc.params.get("arguments") or {}
        if not isinstance(name, str) or not isinstance(args, dict):
            return _rpc_error(rpc.id, -32602, "params inválidos")
        try:
            data = await _call(name, args)
        except KeyError:
            return _rpc_error(rpc.id, -32602, f"ferramenta desconhecida: {name}")
        except ValueError as exc:
            return JSONResponse({"jsonrpc": "2.0", "id": rpc.id, "result": {"content": [{"type": "text", "text": str(exc)}], "isError": True}})
        text = json.dumps(data, ensure_ascii=False, default=str)
        return JSONResponse({"jsonrpc": "2.0", "id": rpc.id, "result": {"content": [{"type": "text", "text": text}], "isError": False}})
    return _rpc_error(rpc.id, -32601, f"método não suportado: {rpc.method}")
