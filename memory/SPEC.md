# QG do Zero — SPEC

## O que é
Centro de comando do esquadrão de agentes IA do Chefe (operação AeroPartz). O Zero (IA principal)
recebe missões, decompõe em tarefas com LLM em nuvem e delega: Pro (braço direito) supervisiona,
Jarvis / Luna / Plus executam. Tudo é narrado na Sala Compartilhada; tarefas têm fila, status e
resultado. Tem Rotina da Manhã automática e linha direta com voz.

## Hierarquia (seed em backend/seed.py, idempotente por `key`)
| Agente | Papel | Cérebro emprestado (display) | Provider/model usado nas chamadas |
|---|---|---|---|
| zero | Orquestrador Supremo | Free LLM Router · Router Eight | openai / gpt-5.4 |
| pro | Braço-direito & Supervisão | Codex Pro | openai / gpt-5.4 |
| jarvis | Tarefas simples | Free LLM | gemini / gemini-3-flash-preview |
| aluna | **Luna** — Atendimento Comercial & Site da AeroPartz | Free LLM | gemini / gemini-3-flash-preview |
| plus | Pro simples, análise | ChatGPT Plus | gemini / gemini-3-flash-preview |

Nota: `gemini-2.5-flash-lite` é rejeitado pelo gateway — não usar. `GET /api/agents` computa
`status` (working se há task working) e `open_tasks`.

## Fluxos
1. **Missão**: `POST /api/missions` → `run_mission` (background): Zero planeja (JSON estrito, ≤4 tasks)
   → mensagem `delegation` na sala → cada task `queued→working→done` com resultado do LLM do agente
   (mensagem `chat`) → `system/summary` fecha. Fallback simulado marcado "(modo simulado)".
2. **Rotina da Manhã**: briefing diário com clima de **busca real** + checklist AeroPartz (caixa,
   estoque crítico, pedidos, cupons), prioridades e lembretes. Scheduler em `lib/scheduler.py`
   (loop 30 min; roda 1x/dia após a hora configurada, tz America/Sao_Paulo; padrão 07:00, auto on).
   Botão "Rodar agora" no Cockpit. Mensagem na sala com kind `briefing`.
3. **Sala**: `POST /room/messages` do Chefe → Zero responde em background.
4. **Linha direta com voz**: `/zero` — microfone via Web Speech API (STT pt-BR, botão mic) e Zero
   fala novas respostas via speechSynthesis (toggle de voz). Fallbacks silenciosos quando a API
   não existe no navegador.

## Endpoints (todos em api_router, prefixo /api)
- `GET /agents` · `GET /system` (pill: cloud|simulated)
- `POST/GET /missions` · `GET /tasks?agent_key=&status=&mission_id=`
- `GET/POST /room/messages` · `GET /zero/messages` `POST /zero/chat`
- `GET /briefing` · `GET/PATCH /briefing/settings` (auto/hour/city) · `POST /briefing/run`
- `GET /channels` `PATCH /channels/{id}` · `POST /channels/internet/search` (**busca real** DuckDuckGo HTML, sem chave, [] em falha)
- Coleções: agents, missions, tasks, room_messages, zero_messages, channels, briefings, settings (+status_checks) — INDEXES em `lib/db.py`.

## Canais (página /canais) — status atual
- **whatsapp**: WhatsApp Web no navegador do Zero na VPS (SEM provedor externo, decisão do Chefe) — placeholder configurável (phone).
- **facebook**: atendimento/publicações da loja — placeholder (page_url).
- **internet**: conectado, busca real funcionando.
- **visual**: Navegador Visual — mapeia para o MCP de contas (/index, zero-private-room): Zero abre a
  conversa certa nas contas salvas e traz o resultado — placeholder.
- **mcp**: conectar aos MCPs da VPS (zero-mcp, private-room) — aguarda URL do Chefe — placeholder.
- Painel "Infraestrutura do Chefe" (estático): VPS, MCP, SSH, sala tmux — já existem.

## Frontend
- Rotas: `/` Cockpit (hierarquia + missões + briefing + prévias), `/sala`, `/tarefas`, `/zero` (voz), `/canais`.
- i18n PT/EN (`src/lib/i18n.tsx`, localStorage `qgzero.lang`, default pt); tema claro default + dark (next-themes).
- Fontes: Outfit / Plus Jakarta Sans / JetBrains Mono. Polling react-query 2–10s. `motion` nas mensagens.
- TS mirrors de todos os Pydantic models em `src/lib/types.ts`.

## Autenticação
Nenhuma (app pessoal aberto). `EMERGENT_LLM_KEY` gerencia o cérebro em nuvem (backend/.env);
sem chave/serviço fora → modo simulado automático.

## Para re-semeadar
`cd /app/backend && python seed.py` (upsert por key; não derruba coleções).
