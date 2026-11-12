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
   → mensagem `delegation` na sala → cada task `queued→working→review` com resultado do LLM do agente
   (mensagem `chat`) → `system/summary` fecha. Fallback simulado marcado "(modo simulado)".
2. **Rotina da Manhã**: briefing diário com clima de **busca real** + checklist AeroPartz (caixa,
   estoque crítico, pedidos, cupons), prioridades e lembretes. Cron gerenciado a cada 30 minutos chama
   webhook interno autenticado; `lib/scheduler.py` decide pelo horário configurado em America/Sao_Paulo
   e usa trava diária persistida (padrão 07:00, auto on), sobrevivendo a reinícios sem duplicar.
   Botão "Rodar agora" no Cockpit. Mensagem na sala com kind `briefing`.
3. **Sala**: `POST /room/messages` do Chefe → Zero responde em background.
4. **Linha direta com voz**: `/zero` — microfone via Web Speech API (STT pt-BR, botão mic) e Zero
   fala novas respostas via speechSynthesis (toggle de voz). Fallbacks silenciosos quando a API
   não existe no navegador.
5. **Navegador Visual simulado**: `/navegador` recebe URL + objetivo, persiste uma missão visual,
   exibe quatro etapas, executa um plano selecionável de ações `abrir|ler|clicar|escrever|copiar|colar`
   e publica a entrega na Sala. É sempre rotulado **MODO SIMULADO** e não faz requisição ao site alvo,
   não abre login e não usa cookies/contas.

## Projetos, contas e entregas verificáveis (rodada 3)
- **Projetos** (`/projetos`): ficha de retomada = objetivo atual, última entrega verificada, em andamento,
  bloqueio/decisão, próximo passo. "Continuar de onde paramos" → `POST /projects/{id}/resume` cria missão com
  a ficha + resultados recentes como contexto. Ao fim da missão o Zero atualiza in_progress, next_step e blocker
  (decision_needed do plano). Seed: `seed-project-aeropartz`, `seed-project-luna` (bloqueios vindos da auditoria).
- **Entregas**: tarefas terminam em `review` (resposta de agente ≠ entrega). Chefe aprova/devolve:
  `PATCH /tasks/{id}/review {approve, note}` → `verified`/`rejected` (409 se não está em review). Aprovar grava
  `last_verified` no projeto. A transição é atômica e usa IDs determinísticos para não duplicar memória/mensagem
  sob concorrência. Status: queued|working|review|verified|rejected|failed.
- **Contas salvas**: `GET/POST /accounts`, `PATCH/DELETE /accounts/{id}` — status available|busy|offline|unverified
  (seed: 5 contas, todas "unverified" — disponibilidade nunca verificada).
- **Intenção do Zero** (linha direta): cada resposta é explicando|propondo|executando (JSON do LLM). executando →
  dispara a missão na hora (com project_id se reconhecer o projeto); propondo → botão "Aprovar e executar"
  (`POST /zero/messages/{id}/execute`, 409 se já executada ou não é proposta). A proposta reserva o `mission_id`
  atomicamente antes de criar a missão, impedindo disparos duplicados.
- **Painel AeroPartz** (`/loja`): `GET/POST /store/items`, `PATCH/DELETE /store/items/{id}`; kind stock(critical|ok),
  order(open|done), coupon(active|expired). Seed com 4 itens `is_sample=true` (marcados "Exemplo"). Itens
  críticos/abertos/ativos entram no contexto do plano, da linha direta e do briefing. Conexão direta com a loja: futura.
- **Servidor MCP do QG**: `POST /api/mcp` (JSON-RPC, Streamable HTTP sem estado, respostas JSON) com
  `Authorization: Bearer $QG_MCP_TOKEN`. Sem token configurado → 503; token errado → 401. `GET /api/mcp/info`
  (público): path, token_configured, ferramentas. Ferramentas: list_projects, get_project, create_mission,
  resume_project, get_mission, list_tasks, read_room, post_room_message, list_accounts, store_overview.
- **Voz**: linha direta tem "Modo ligação" (escuta → envia sozinho → Zero fala → volta a escutar; silêncio reabre
  o microfone). Briefing falado: o briefing mais novo é lido uma vez no primeiro toque após abrir o app
  (localStorage `qgzero.spokenBriefing`) + botão "Ouvir" no card. Web Speech API (Chrome).

## Endpoints (todos em api_router, prefixo /api)
- `GET /agents` · `GET /system` (pill: cloud|simulated)
- `POST/GET /missions` · `GET /tasks?agent_key=&status=&mission_id=`
- `GET/POST /room/messages` · `GET /zero/messages` `POST /zero/chat`
- `GET /briefing` · `GET/PATCH /briefing/settings` (auto/hour/city) · `POST /briefing/run`
- `POST /cron/briefing` (interno, Bearer `WEBHOOK_CRON_SECRET`, confirmação rápida e idempotente por execução)
- `GET /channels` `PATCH /channels/{id}` · `POST /channels/internet/search` (**busca real** DuckDuckGo HTML, sem chave, [] em falha)
- `GET/POST /visual/missions` · `GET /visual/missions/{id}` (simulação persistida, sem acesso ao alvo)
- Coleções: agents, missions, tasks, room_messages, zero_messages, channels, briefings, settings (+status_checks) — INDEXES em `lib/db.py`.

## Canais (página /canais) — status atual
- **whatsapp**: WhatsApp Web no navegador do Zero na VPS (SEM provedor externo, decisão do Chefe) — placeholder configurável (phone).
- **facebook**: atendimento/publicações da loja — placeholder (page_url).
- **internet**: conectado, busca real funcionando.
- **visual**: Navegador Visual simulado funcional no QG; a conexão real futura mapeará o MCP de contas
  (/index, zero-private-room). As ações abrir/ler/clicar/escrever/copiar/colar são registradas com alvo e
  resultado sintéticos; nenhuma missão atual abre site ou conta real.
- **mcp**: conectar aos MCPs da VPS (zero-mcp, private-room) — aguarda URL do Chefe — placeholder.
- Painel "Infraestrutura do Chefe" (estático): VPS, MCP, SSH, sala tmux — já existem.

## Frontend
- Rotas: `/` Cockpit, `/sala`, `/projetos`, `/tarefas`, `/zero` (voz/ligação), `/navegador` (simulado), `/loja`, `/canais` (inclui card do Servidor MCP).
- i18n PT/EN (`src/lib/i18n.tsx`, localStorage `qgzero.lang`, default pt); tema claro default + dark (next-themes).
- Fontes: Outfit / Plus Jakarta Sans / JetBrains Mono. Polling react-query 2–10s. `motion` nas mensagens.
- TS mirrors de todos os Pydantic models em `src/lib/types.ts`.
- Consultas exibem estado localizado de carregamento, vazio real, indisponibilidade ou dados antigos. Falhas preservam
  shell, ações estáticas e cache anterior identificado; cada região tem “Tentar novamente” e se recupera sem recarregar a página.
- O padrão cobre Cockpit, Sala, Projetos, Tarefas, Linha Direta, Navegador, Loja, Canais, Universo e Memória;
  falhas de mutação continuam separadas em avisos próprios sem ocultar dados consultáveis.

## Autenticação
Nenhuma (app pessoal aberto, sem tela de login nem bloqueio de API). `EMERGENT_LLM_KEY` gerencia o cérebro em nuvem (backend/.env);
sem chave/serviço fora → modo simulado automático.

## Estabilização atual
- A prévia da Sala mostra as mensagens mais recentes, não as primeiras do histórico.
- Respostas assíncronas da Sala e da Linha Direta ficam referenciadas até terminarem.
- Briefing manual usa a data de `America/Sao_Paulo`, igual à rotina automática.
- Uma consulta indisponível não transforma a rota em página vazia nem apresenta cache antigo como informação atual.

## Para re-semeadar
`cd /app/backend && python seed.py` (upsert por key; não derruba coleções).
