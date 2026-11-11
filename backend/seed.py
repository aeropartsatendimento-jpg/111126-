"""Seed the squad: 5 agents + 5 channels. Idempotent — safe to re-run.
Run with: cd /app/backend && python seed.py
"""

import asyncio
from datetime import datetime, timezone

from lib.db import db, ensure_indexes

AGENTS = [
    {
        "key": "zero",
        "name": "Zero",
        "role_pt": "Orquestrador Supremo & Cérebro Central",
        "role_en": "Supreme Orchestrator & Central Brain",
        "description_pt": "IA principal. Recebe as missões do Chefe, decompõe em tarefas e delega ao Pro e ao esquadrão.",
        "description_en": "Main AI. Takes the Boss's missions, breaks them into tasks and delegates to Pro and the squad.",
        "provider": "openai",
        "model": "gpt-5.4",
        "brain": "Free LLM Router · Router Eight",
    },
    {
        "key": "pro",
        "name": "Pro",
        "role_pt": "Braço-direito & Supervisão Tática",
        "role_en": "Right Hand & Tactical Oversight",
        "description_pt": "A melhor IA de execução. Distribui sub-tarefas para Jarvis, Aluna e Plus e confere os resultados.",
        "description_en": "The best execution AI. Hands sub-tasks to Jarvis, Aluna and Plus and reviews their results.",
        "provider": "openai",
        "model": "gpt-5.4",
        "brain": "Codex Pro",
    },
    {
        "key": "jarvis",
        "name": "Jarvis",
        "role_pt": "Operador de Tarefas Simples",
        "role_en": "Simple-Task Operator",
        "description_pt": "Cálculos, scripts e tarefas rápidas do dia a dia.",
        "description_en": "Calculations, scripts and quick everyday tasks.",
        "provider": "gemini",
        "model": "gemini-3-flash-preview",
        "brain": "Free LLM",
    },
    {
        "key": "aluna",
        "name": "Luna",
        "role_pt": "Atendimento Comercial & Site da AeroPartz",
        "role_en": "Store Service & AeroPartz Website",
        "description_pt": "Atendimento, catálogo e orçamentos da loja + cuidado do site: conteúdo, publicação e aparência.",
        "description_en": "Store service, catalog and quotes + owns the site: content, publishing and look.",
        "provider": "gemini",
        "model": "gemini-3-flash-preview",
        "brain": "Free LLM",
    },
    {
        "key": "plus",
        "name": "Plus",
        "role_pt": "Executor Analítico (Pro Simples)",
        "role_en": "Analytical Executor (Simpler Pro)",
        "description_pt": "Versão enxuta do Pro para análise e execução intermediária.",
        "description_en": "A leaner Pro for analysis and mid-weight execution.",
        "provider": "gemini",
        "model": "gemini-3-flash-preview",
        "brain": "ChatGPT Plus",
    },
]

CHANNELS = [
    {
        "key": "whatsapp",
        "name": "WhatsApp próprio do Zero",
        "description_pt": "Atendimento da loja e mensagens do Chefe via WhatsApp Web no navegador do Zero na VPS — sem provedor externo.",
        "description_en": "Store's customer service and the Boss's messages via WhatsApp Web in Zero's VPS browser — no external provider.",
        "status": "disconnected",
        "config": {"phone": ""},
    },
    {
        "key": "facebook",
        "name": "Facebook próprio do Zero",
        "description_pt": "Atendimento e publicações da loja gerenciados pelo esquadrão.",
        "description_en": "Store's customer service and posts managed by the squad.",
        "status": "disconnected",
        "config": {"page_url": ""},
    },
    {
        "key": "internet",
        "name": "Internet",
        "description_pt": "Busca real na web (DuckDuckGo) + IA do Google e IAs grátis como fonte de informação.",
        "description_en": "Real web search (DuckDuckGo) + Google AI and free AIs as information sources.",
        "status": "connected",
        "config": {"engine": "duckduckgo"},
    },
    {
        "key": "visual",
        "name": "Navegador Visual (Modo Visual das IAs)",
        "description_pt": "Zero abre a conversa certa nas contas salvas (MCP de contas /index), trabalha na interface das IAs e traz o resultado como se fosse ele.",
        "description_en": "Zero opens the right conversation among saved accounts (accounts MCP), works inside the AIs' interface and brings the result back as its own.",
        "status": "disconnected",
        "config": {"provider": "ChatGPT Pro"},
    },
    {
        "key": "mcp",
        "name": "Servidor MCP · Computador do Zero",
        "description_pt": "Conectar aos MCPs da VPS (zero-mcp, private-room) e ao computador 100% dedicado — informe a URL quando quiser ativar.",
        "description_en": "Connect to the VPS MCPs (zero-mcp, private-room) and the 100% dedicated computer — provide the URL to activate.",
        "status": "disconnected",
        "config": {"vps": ""},
    },
]


async def seed() -> None:
    now = datetime.now(timezone.utc)

    for a in AGENTS:
        await db.agents.update_one(
            {"key": a["key"]},
            {"$set": {**a, "updated_at": now}, "$setOnInsert": {"id": f"seed-{a['key']}", "created_at": now}},
            upsert=True,
        )

    for c in CHANNELS:
        await db.channels.update_one(
            {"key": c["key"]},
            {"$set": {**c, "updated_at": now}, "$setOnInsert": {"id": f"seed-{c['key']}", "created_at": now}},
            upsert=True,
        )

    await ensure_indexes()
    print(f"seed ok: {len(AGENTS)} agents, {len(CHANNELS)} channels")


if __name__ == "__main__":
    asyncio.run(seed())
