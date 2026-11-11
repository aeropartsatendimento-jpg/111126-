# QG do Zero — SPEC

## O que é
Centro de comando do esquadrão de agentes IA do Chefe. O Zero (IA principal) recebe missões,
decompõe em tarefas com um LLM em nuvem e delega: Pro (braço direito) supervisa, e Jarvis /
Aluna / Plus executam. Tudo é narrado na Sala Compartilhada; tarefas têm fila, status e resultado.

## Hierarquia (seed em backend/seed.py, idempotente por `key`)
| Agente | Papel | Cérebro emprestado (display) | Provider/model usado nas chamadas |
|---|---|---|---|
| zero | Orquestrador Supremo | Free LLM Router · Router Eight | openai / gpt-5.4 |
| pro | Braço-direito & Supervisão | Codex Pro | openai / gpt-5.4 |
| jarvis | Tarefas simples | Free LLM | gemini / gemini-3-flash-preview |
| aluna | Site & web | Free LLM | gemini / gemini-3-flash-preview |
| plus | Pro simples, análise | ChatGPT Plus | gemini / gemini-3-flash-preview |

`GET /api/agents` computa `status` (working se há task working) e `open_tasks`.

## Fluxo principal (missão)
1. Chefe envia missão em `POST /api/missions` → status `planning`, `asyncio.create_task(run_mission)`.
2. Zero planeja via LLM (JSON estrito: intro + até 4 tarefas) → mensagem `delegation` na sala; status `delegating`.
3. Cada task: `queued → working → done` com resultado do LLM do agente; mensagem `chat` na sala.
4. `system/summary` fecha a missão (`completed`/`failed`). Fallback: qualquer falha de LLM cai em conteúdo
   simulado marcado "(modo simulado)" — o fluxo nunca trava.

## Endpoints (todos em api_router, prefixo /api)
- `GET /agents` · `GET /system` (pill de status do cérebro: cloud|simulated)
- `POST /missions` `GET /missions` · `GET /tasks?agent_key=&status=&mission_id=`
- `GET /room/messages` `POST /room/messages` (mensagem do Chefe → Zero responde em background)
- `GET /zero/messages` `POST /zero/chat` (linha direta 1-a-1)
- `GET /channels` `PATCH /channels/{id}` (status/config) `POST /channels/internet/search` (**busca real**, DuckDuckGo HTML sem chave, [] em falha)
- Coleções Mongo: agents, missions, tasks, room_messages, zero_messages, channels (+ status_checks do template) — INDEXES em backend/lib/db.py.

## Canais (página /canais)
whatsapp (atendimento da loja + chamar o Chefe; config phone), facebook (atendimento/publicações; config page_url),
internet (conectado, busca real), visual (Navegador Visual — modo visual das IAs como cérebro), mcp (Servidor MCP/VPS).
Painel "Infraestrutura do Chefe" (estático): VPS, MCP, SSH e sala tmux compartilhada — já existentes na operação.

## Frontend
- Rotas: `/` Cockpit (hierarquia + missões + prévias), `/sala` Sala (stream + filtro por agente), `/tarefas`,
  `/zero` (linha direta), `/canais`. AppShell com sidebar desktop + bottom nav mobile.
- i18n PT/EN: `src/lib/i18n.tsx` (localStorage `qgzero.lang`, default pt). Tema claro default + toggle dark (next-themes).
- Fontes: Outfit (heading), Plus Jakarta Sans (body), JetBrains Mono (mono). Polling react-query 2–5s.
- TS mirrors de todos os Pydantic models em `src/lib/types.ts` — manter em sincronia.

## Autenticação
Nenhuma (app pessoal aberto). Sem credenciais. `EMERGENT_LLM_KEY` gerencia o cérebro em nuvem (backend/.env);
sem chave/serviço fora do ar → modo simulado automático.

## Para re-semeadar
`cd /app/backend && python seed.py` (upsert por key; não derruba coleções).
