"""The squad engine — runs missions end-to-end in the background.

Flow: the Chefe dispatches a mission → Zero (cloud LLM) decomposes it into
tasks and delegates → each agent executes its task (cloud LLM, its own
provider/model) → every step is narrated into the shared room, tasks get
results, and the mission closes with a summary.

Every LLM call degrades to simulated content on failure, so the orchestration
flow always completes and the room always tells the story.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from lib.brain import llm_json, llm_text
from lib.db import db
from lib.search import web_search

logger = logging.getLogger(__name__)

DELEGATABLE = ("pro", "jarvis", "aluna", "plus")

PLAN_SYSTEM = (
    "Você é o Zero, a IA principal do esquadrão do Chefe. Seu braço direito é o Pro, que supervisiona "
    "os agentes operacionais: Jarvis (tarefas simples, cálculos, scripts), Aluna (site, web e publicações) "
    "e Plus (executor analítico, versão enxuta do Pro). O Chefe manda a missão e VOCÊ a decompõe e delega.\n"
    "Responda SOMENTE com um JSON válido, sem markdown e sem texto fora do JSON, no formato:\n"
    '{"intro": "mensagem curta (1-2 frases) anunciando o plano em pt-BR", '
    '"tasks": [{"agent_key": "pro|jarvis|aluna|plus", "title": "título curto", "detail": "o que exatamente fazer"}]}\n'
    "Regras: no máximo 4 tarefas; use 'pro' para supervisão/consolidação em missões complexas; "
    "'aluna' para qualquer coisa de site/web/publicação; 'jarvis' para tarefas rápidas/simples; "
    "'plus' para análise e backup do Pro. Escreva tudo em português do Brasil."
)

EXEC_SYSTEM = (
    "Você é {name}, {role} do esquadrão coordenado pelo Zero (IA principal) e pelo Pro. "
    "Você acabou de receber uma tarefa delegada. Execute-a com o seu conhecimento e raciocínio "
    "(você opera na nuvem, sem precisar de máquina pesada), responda em português do Brasil, "
    "direto ao ponto, em no máximo 90 palavras. Traga resultado, decisão ou próximos passos "
    "concretos — nunca desculpas nem promessas vagas."
)

ROOM_REPLY_SYSTEM = (
    "Você é o Zero, a IA principal do esquadrão (braço direito: Pro; operacionais: Jarvis, Aluna, Plus). "
    "O Chefe acabou de falar na sala compartilhada dos agentes. Responda em português do Brasil, "
    "em no máximo 80 palavras, reconhecendo o pedido e dizendo como o esquadrão vai agir "
    "(se fizer sentido, ofereça transformar o pedido em missão formal para delegar)."
)

DIRECT_SYSTEM = (
    "Você é o Zero, agente pessoal do Chefe — linha direta 1-a-1, estilo conversa de celular. "
    "Fale em português do Brasil, tom parceiro e direto, no máximo 100 palavras. Você opera na nuvem "
    "(GPT/OpenAI e Gemini), pode pesquisar na internet e delegar execuções ao Pro, Jarvis, Aluna e Plus. "
    "Quando o pedido exigir ação, diga o que você mesmo fará e o que delegará."
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return uuid.uuid4().hex


async def _post_room(sender_key: str, kind: str, content: str, mission_id: str | None = None) -> None:
    await db.room_messages.insert_one(
        {
            "id": _new_id(),
            "sender_key": sender_key,
            "kind": kind,
            "content": content,
            "mission_id": mission_id,
            "created_at": _now(),
        }
    )


async def _agent(key: str) -> dict | None:
    return await db.agents.find_one({"key": key})


def _sim_plan(text: str) -> dict:
    short = text.strip().replace("\n", " ")[:90]
    return {
        "intro": f"Missão recebida, Chefe. Assumo a coordenação de \"{short}\" e aciono o esquadrão agora.",
        "tasks": [
            {"agent_key": "pro", "title": "Supervisionar execução", "detail": f"Dividir em etapas e acompanhar: {short}"},
            {"agent_key": "jarvis", "title": "Executar tarefa operacional", "detail": f"Rodar as verificações e cálculos simples de: {short}"},
            {"agent_key": "aluna", "title": "Cuidar da parte do site", "detail": f"Preparar/publicar o conteúdo relacionado a: {short}"},
            {"agent_key": "plus", "title": "Analisar resultados", "detail": f"Consolidar os resultados de: {short} e apontar riscos"},
        ],
    }


def _sim_result(title: str, detail: str) -> str:
    return (
        f"[modo simulado] \"{title}\" concluída — levantei os pontos principais de "
        f"\"{detail[:80]}\" e registrei o resultado à disposição do Pro e do Chefe."
    )


async def _execute_task(task: dict, mission_text: str, agent: dict | None) -> None:
    """Run one task to done/failed, narrating the result into the room."""
    title, detail = task["title"], task["detail"]

    await db.tasks.update_one({"id": task["id"]}, {"$set": {"status": "working", "updated_at": _now()}})
    await asyncio.sleep(1.0)  # give the UI a beat to see 'working' in the stream

    reply: str | None = None
    if agent:
        prompt = (
            f"Missão do Chefe: {mission_text}\n\n"
            f"Sua tarefa delegada: {title}\n"
            f"Detalhes: {detail or '(sem detalhes adicionais)'}\n\n"
            f"Responda com a execução/conclusão."
        )
        reply = await llm_text(
            EXEC_SYSTEM.format(name=agent["name"], role=agent.get("role_pt", "agente operacional")),
            prompt,
            session_id=f"task-{task['id']}",
            provider=agent.get("provider", "openai"),
            model=agent.get("model", "gpt-5.4"),
        )

    simulated = reply is None
    if simulated:
        reply = _sim_result(title, detail)

    await db.tasks.update_one(
        {"id": task["id"]},
        {"$set": {"status": "done", "result": reply, "updated_at": _now()}},
    )
    content = f"Tarefa concluída: {title}\n\n{reply}" + ("\n\n(modo simulado — IA em nuvem indisponível agora)" if simulated else "")
    await _post_room(task["agent_key"], "chat", content, task["mission_id"])


async def run_mission(mission_id: str) -> None:
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        return
    text = mission["text"]

    await _post_room("system", "system", "Missão recebida pelo Zero. Analisando o pedido e montando o plano de delegação...", mission_id)

    zero = await _agent("zero") or {}
    plan_raw = await llm_text(
        PLAN_SYSTEM,
        f"Missão do Chefe: {text}",
        session_id=f"plan-{mission_id}",
        provider=zero.get("provider", "openai"),
        model=zero.get("model", "gpt-5.4"),
    )
    plan = llm_json(plan_raw)
    simulated_plan = plan is None or not isinstance(plan.get("tasks"), list) or not plan["tasks"]
    if simulated_plan:
        plan = _sim_plan(text)

    intro = str(plan.get("intro") or "").strip() or "Plano montado. Delegando ao esquadrão."
    raw_tasks = [t for t in plan.get("tasks", []) if isinstance(t, dict)][:4]

    task_docs: list[dict] = []
    for t in raw_tasks:
        key = t.get("agent_key")
        if key not in DELEGATABLE:
            key = "pro"
        task_docs.append(
            {
                "id": _new_id(),
                "mission_id": mission_id,
                "mission_text": text,
                "agent_key": key,
                "title": str(t.get("title") or "Tarefa").strip()[:140] or "Tarefa",
                "detail": str(t.get("detail") or "").strip()[:800],
                "status": "queued",
                "result": None,
                "created_at": _now(),
                "updated_at": _now(),
            }
        )
    if not task_docs:
        task_docs.append(
            {
                "id": _new_id(),
                "mission_id": mission_id,
                "mission_text": text,
                "agent_key": "pro",
                "title": "Supervisionar execução",
                "detail": text[:300],
                "status": "queued",
                "result": None,
                "created_at": _now(),
                "updated_at": _now(),
            }
        )

    for doc in task_docs:
        await db.tasks.insert_one(doc)

    lines = [intro, ""]
    lines += [f"→ {t['agent_key'].capitalize()}: {t['title']}" for t in task_docs]
    if simulated_plan:
        lines += ["", "(plano simulado — IA em nuvem indisponível agora)"]
    await _post_room("zero", "delegation", "\n".join(lines), mission_id)
    await db.missions.update_one({"id": mission_id}, {"$set": {"status": "delegating", "plan_intro": intro}})

    await asyncio.sleep(1.5)  # let the plan land in the room before executions start

    failed = 0
    for doc in task_docs:
        try:
            await _execute_task(doc, text, await _agent(doc["agent_key"]))
        except Exception as exc:  # a single task must never sink the mission
            logger.exception("task %s failed", doc["id"])
            failed += 1
            await db.tasks.update_one(
                {"id": doc["id"]},
                {"$set": {"status": "failed", "result": f"Erro na execução: {exc}", "updated_at": _now()}},
            )
            await _post_room("system", "system", f"Falha na tarefa \"{doc['title']}\" — registrada como failed.", mission_id)

    done = len(task_docs) - failed
    summary = f"Resumo do Zero: missão concluída com {done} tarefa(s) executada(s)"
    summary += f" e {failed} falha(s)." if failed else "."
    await _post_room("system", "summary", summary, mission_id)
    await db.missions.update_one(
        {"id": mission_id},
        {"$set": {"status": "failed" if done == 0 else "completed"}},
    )


async def zero_reply_in_room() -> None:
    """Zero answers the Chefe's message in the shared room."""
    recent = await db.room_messages.find().sort("created_at", -1).to_list(12)
    transcript = "\n".join(
        f"{m.get('sender_key', '?')}: {m.get('content', '')[:300]}" for m in reversed(recent)
    )
    zero = await _agent("zero") or {}
    reply = await llm_text(
        ROOM_REPLY_SYSTEM,
        f"Últimas mensagens da sala:\n{transcript}\n\nResponda ao Chefe.",
        session_id=f"room-{_new_id()}",
        provider=zero.get("provider", "openai"),
        model=zero.get("model", "gpt-5.4"),
    )
    if reply is None:
        reply = (
            "[modo simulado] Entendido, Chefe. Anotado aqui na sala — se quiser, transforme isso em uma missão "
            "formal no Cockpit que eu decompõe e delego ao esquadrão agora mesmo."
        )
    await _post_room("zero", "chat", reply)


async def zero_direct_reply() -> None:
    """Zero answers on the direct 1-a-1 line."""
    recent = await db.zero_messages.find().sort("created_at", -1).to_list(10)
    transcript = "\n".join(
        f"{'Chefe' if m.get('role') == 'user' else 'Zero'}: {m.get('content', '')[:400]}" for m in reversed(recent)
    )
    zero = await _agent("zero") or {}
    reply = await llm_text(
        DIRECT_SYSTEM,
        f"Conversa até agora:\n{transcript}\n\nResponda ao Chefe.",
        session_id=f"direct-{_new_id()}",
        provider=zero.get("provider", "openai"),
        model=zero.get("model", "gpt-5.4"),
    )
    if reply is None:
        reply = (
            "[modo simulado] Estou online, Chefe. Pode mandar a próxima — pesquiso na internet, "
            "delego ao Pro e aciono Jarvis, Aluna e Plus pra executar tudo pelo celular."
        )
    await db.zero_messages.insert_one({"id": _new_id(), "role": "zero", "content": reply, "created_at": _now()})


BRIEFING_SYSTEM = (
    "Você é o Zero, agente pessoal do Chefe (loja AeroPartz). Monte o briefing da manhã em português do Brasil, "
    "objetivo, em no máximo 140 palavras, com seções curtas: Clima (com base nos resultados da busca), "
    "Loja AeroPartz (checklist de abertura: caixa, estoque crítico, pedidos em aberto, cupons ativos), "
    "Prioridades de hoje e Lembretes (e-mails e câmeras). Use os dados de busca apenas para o clima; "
    "para o resto, diga o que você mesmo vai verificar. Não invente números."
)


async def run_briefing(settings: dict, day: str | None = None) -> dict:
    """Morning routine: real weather search + Zero's briefing, posted to the room."""
    now = datetime.now(timezone.utc)
    city = settings.get("city", "São Paulo")
    hits = await web_search(f"previsão do tempo hoje {city}")
    search_block = "\n".join(f"- {h.title}: {h.snippet[:140]}" for h in hits[:5]) or "(busca indisponível agora)"

    zero = await _agent("zero") or {}
    reply = await llm_text(
        BRIEFING_SYSTEM,
        f"Clima — resultados da busca real para {city}:\n{search_block}\n\nMonte o briefing da manhã.",
        session_id=f"briefing-{_new_id()}",
        provider=zero.get("provider", "openai"),
        model=zero.get("model", "gpt-5.4"),
    )
    if reply is None:
        reply = (
            "[modo simulado] Bom dia, Chefe. Sem nuvem agora: verifique caixa, estoque crítico, pedidos em aberto "
            "e cupons ativos da AeroPartz; confira e-mails e as câmeras."
        )

    doc = {
        "id": _new_id(),
        "day": day or now.strftime("%Y-%m-%d"),
        "city": city,
        "content": reply,
        "created_at": _now(),
    }
    await db.briefings.insert_one(doc)
    await _post_room("zero", "briefing", f"🌅 Briefing da manhã ({doc['day']} — {city}):\n\n{reply}")
    return doc
