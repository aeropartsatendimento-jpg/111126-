# Inventário verificável do TESTE-SALA

## 1. Base examinada

| Item | Resultado | Classificação | Evidência |
|---|---|---|---|
| Diretório | `/app` | VERIFICADO NO CODIGO | inspeção do workspace |
| Repositório | `aeropartzz-eng/TESTE-SALA` | VERIFICADO NO CODIGO | `git remote -v` |
| Branch local | `main` | VERIFICADO NO CODIGO | `git branch --show-current` |
| Commit local | `65ec012858e959fd3ffd65410a998e6ae260f296` | VERIFICADO NO CODIGO | `git rev-parse HEAD` |
| Instrução do operador | commit remoto `c3018d3d945a3cd0841dedb8c4cf3e12324e1149`, arquivo `LEIA ME` | DOCUMENTADO | URL informada pelo operador e diff público do GitHub |
| Divergência local/remota | o arquivo `LEIA ME` não estava no workspace local durante a análise | VERIFICADO NO CODIGO | busca local por `LEIA ME` e `git status` |
| Alterações locais | somente `.emergent/cron/` não rastreado no início desta etapa documental | VERIFICADO NO CODIGO | `git status --short` |
| Submódulos | nenhum identificado | VERIFICADO NO CODIGO | `git submodule status` sem saída |
| Git LFS | nenhum arquivo identificado | VERIFICADO NO CODIGO | `git lfs ls-files` sem saída |
| Dumps/backups/exportações | nenhum arquivo com extensões usuais encontrado até profundidade 4 | VERIFICADO NO CODIGO | busca apenas por metadados; conteúdo privado não aberto |

## 2. Finalidade observada

O código implementa o **QG do Zero**, um centro de comando pessoal para o operador (“Chefe”): recebe missões,
decompõe em tarefas, distribui entre agentes, registra conversas e exige revisão humana das entregas.
Também mantém projetos, contas de IA, memória com origem, painel operacional da AeroPartz, canais e um servidor MCP.

- **Usuário efetivo:** um operador pessoal chamado Chefe. **VERIFICADO NO CODIGO** em textos, rotas e modelos.
- **Acesso atual:** interface e APIs de negócio sem autenticação. **VERIFICADO NO CODIGO** em `frontend/src/App.tsx`
  e `backend/server.py`; **VERIFICADO EM EXECUCAO ISOLADA** em `test_reports/iteration_2.json`.
- **Projeto ZERO da VPS:** o `LEIA ME` declara que é separado e permanece pausado; nenhum recurso dele foi usado
  nesta etapa. **DOCUMENTADO** pelo operador.
- **Escala, SLA, retenção e destino de implantação:** não definidos. **DECISAO PENDENTE**.

## 3. Arquitetura e tecnologias

| Camada | Implementação | Estado | Evidência |
|---|---|---|---|
| Frontend | React 19, TypeScript estrito, Vite, Tailwind v4, shadcn/ui, TanStack Query | completa para os fluxos atuais | DOCUMENTADO em `README.md`/`TEMPLATE.md`; código em `frontend/src/` |
| Backend | FastAPI assíncrono, Pydantic v2, motor/pymongo | completa para os fluxos atuais | VERIFICADO NO CODIGO em `backend/server.py`, `backend/models/`, `backend/routers/` |
| Banco | MongoDB documental local no ambiente de preview | em uso | VERIFICADO NO CODIGO em `backend/lib/db.py`; execução isolada no relatório 2 |
| Proxy | frontend chama caminhos relativos `/api`; Vite encaminha ao backend | em uso | DOCUMENTADO em `README.md`/`TEMPLATE.md` |
| IA | gateway `emergentintegrations`; fallback determinístico quando indisponível | parcial/simulado no último teste | VERIFICADO NO CODIGO em `backend/lib/brain.py`; DOCUMENTADO/EXECUÇÃO no relatório 2 |
| Busca | DuckDuckGo HTML via `httpx`, falha retorna `[]` | implementada com dependência externa instável | VERIFICADO NO CODIGO em `backend/lib/search.py` |
| Voz | Web Speech API do navegador | implementada, não validada com hardware real | VERIFICADO NO CODIGO em `frontend/src/pages/ZeroDirect.tsx`; DOCUMENTADO em `memory/SPEC.md` |
| Agendamento | loop assíncrono no processo do backend a cada 30 minutos | funcional, vulnerável a reinício | VERIFICADO NO CODIGO em `backend/lib/scheduler.py` |
| MCP | JSON-RPC HTTP sem estado, protegido por bearer token | implementado; configuração atual do token não inspecionada | VERIFICADO NO CODIGO em `backend/routers/mcp.py` |

As versões exatas além das declaradas no template não foram reabertas nesta etapa porque as instruções do ambiente
definem `README.md` e `TEMPLATE.md` como cápsula canônica. **DOCUMENTADO**; confirmar locks antes de migração externa.

## 4. Inventário de módulos e jornadas

| ID | Módulo/tela | Jornada e estados | API/serviço | Dados | Estado observado | Evidência |
|---|---|---|---|---|---|---|
| MOD-01 | Cockpit `/` | visualizar agentes/indicadores; escolher projeto; enviar missão; rodar briefing | `/agents`, `/missions`, `/tasks`, `/briefing*`, `/store/items`, `/channels` | agents, missions, tasks, briefings, settings, store_items, channels | IMPLEMENTADO | código + testes 15/15 |
| MOD-02 | Sala `/sala` | filtrar mensagens; enviar texto; aguardar resposta do Zero | `/room/messages` | room_messages | IMPLEMENTADO | código + `room-message-zero-reply` |
| MOD-03 | Universo `/universo` | visualizar agentes, projetos e memórias; abrir detalhe | `/agents`, `/projects`, `/memories` | agents, projects, memories | IMPLEMENTADO; visualização sem testes específicos | código em `Universe.tsx` |
| MOD-04 | Projetos `/projetos` | criar, selecionar, editar ficha, retomar, revisar tarefas, gerenciar contas | `/projects*`, `/tasks`, `/accounts*` | projects, tasks, accounts, missions | IMPLEMENTADO | código + testes de projeto |
| MOD-05 | Tarefas `/tarefas` | filtrar; ler resultado; aprovar/devolver com nota | `/tasks`, `/tasks/{id}/review` | tasks, projects, memories, room_messages | IMPLEMENTADO; transição não atômica | código + testes de revisão |
| MOD-06 | Zero `/zero` | conversar; receber intenção; aprovar proposta; voz/modo ligação | `/zero/messages`, `/zero/chat`, `/zero/messages/{id}/execute` | zero_messages, missions, memories | IMPLEMENTADO; concorrência de proposta não protegida | código; voz sem teste real |
| MOD-07 | Memória `/memoria` | registrar decisão/fato/proposta/antiga; substituir registro sem apagar histórico | `/memories` | memories | IMPLEMENTADO | código em `MemoryPage.tsx` e router |
| MOD-08 | Loja `/loja` | criar item, alternar status, excluir | `/store/items*` | store_items | IMPLEMENTADO com amostras identificadas | código + testes CRUD |
| MOD-09 | Canais `/canais` | listar/configurar canais; busca web; visualizar MCP/infra | `/channels*`, `/mcp/info` | channels | PARCIAL: busca real; demais canais são configuração/placeholder | código + testes de canais |
| MOD-10 | Briefing | configurar auto/hora/cidade; executar; ouvir | `/briefing*`; scheduler; Web Speech | settings, briefings, room_messages | IMPLEMENTADO; automático não comprovado após reinício | código + teste manual do botão |
| MOD-11 | Servidor MCP | inicializar, listar/chamar 10 ferramentas | `/mcp`, `/mcp/info` | múltiplas coleções | IMPLEMENTADO; depende de `QG_MCP_TOKEN` | código em `mcp.py`; teste atual não reexecutado |
| MOD-12 | Navegador Visual | card de canal e texto de configuração | somente `/channels/{id}` | channels.config | PLACEHOLDER; não abre navegador, não controla conta e não produz evidência | código em `Channels.tsx` e seed |

## 5. Regras de negócio confirmadas

1. Uma missão aceita texto entre 3 e 2.000 caracteres e projeto opcional. **VERIFICADO NO CODIGO**.
2. O plano gera no máximo quatro tarefas e restringe agentes delegáveis a Pro, Jarvis, Luna e Plus. **VERIFICADO NO CODIGO**.
3. Tarefas percorrem `queued → working → review`; aprovação leva a `verified`, devolução a `rejected` e erro a `failed`.
   **VERIFICADO NO CODIGO**.
4. Aprovação atualiza `last_verified` do projeto e grava memória `fato_verificado`. **VERIFICADO NO CODIGO**.
5. Resposta de agente não equivale a entrega verificada; o Chefe decide. **DOCUMENTADO e VERIFICADO NO CODIGO**.
6. Memória nova pode substituir memória antiga por referências `replaces`/`superseded_by`, preservando histórico.
   **VERIFICADO NO CODIGO**.
7. Estoque, pedido e cupom têm conjuntos de estados distintos validados pelo backend. **VERIFICADO NO CODIGO**.
8. Falha do LLM produz conteúdo explicitamente marcado como simulado. **VERIFICADO NO CODIGO**.
9. Falha da busca web produz lista vazia, não erro de aplicação. **VERIFICADO NO CODIGO**.
10. MCP recusa sem token configurado (503) ou com token incorreto (401). **VERIFICADO NO CODIGO**.

## 6. Implementações simuladas, parciais e ausentes

| Item | Classificação | Limite verificável |
|---|---|---|
| Planejamento/execução dos agentes sem chave | SIMULADO | respostas são templates; não há raciocínio do modelo |
| Quatro itens iniciais da loja | DADOS SINTÉTICOS | marcados `is_sample=true` |
| WhatsApp e Facebook | PLACEHOLDER | apenas status/configuração; não enviam mensagens |
| Navegador Visual | AUSENTE/PLACEHOLDER | nenhuma sessão, captura, automação ou coleção específica |
| MCP externo da VPS | AUSENTE | sem URL/autenticação confirmadas; projeto operacional separado |
| Loja real AeroPartz | AUSENTE | sem integração de plataforma |
| Backup/restauração | AUSENTE | nenhum backup localizado e nenhuma rotina no código |
| Autenticação do painel | NÃO APLICÁVEL AO ESTADO ATUAL | app pessoal foi mantido aberto; risco precisa ser reavaliado para destino público |
| Uploads/anexos | NÃO APLICÁVEL | nenhum fluxo ou armazenamento de arquivos identificado |
| Fila durável | AUSENTE | tarefas assíncronas vivem no processo; reinício pode interromper trabalho |

## 7. Validações e cobertura existente

- **VERIFICADO EM EXECUCAO ISOLADA:** `test_reports/iteration_2.json` registra 15/15 checks aprovados,
  incluindo acesso, missão, revisão, Sala, briefing manual, projetos, loja, canais e busca degradável.
- **VERIFICADO NO CODIGO:** testes gerados existem em `backend/tests/test_tscheck_*.py` e checks de navegador em
  `.emergent/scripts/checks/`.
- **LACUNAS:** concorrência, reinício no meio de tarefa, scheduler diário real, MCP autenticado nesta árvore,
  voz/microfone reais, Universo, tema/i18n completos, responsividade móvel, acessibilidade, volume, backup/restauração,
  segurança do acesso aberto e integrações externas.

## 8. Configuração por nome, sem valores

| Variável | Finalidade | Obrigatoriedade observada |
|---|---|---|
| `MONGO_URL` | conexão MongoDB | obrigatória para backend |
| `DB_NAME` | nome do banco | obrigatória para backend |
| `CORS_ORIGINS` | origens permitidas | opcional no código, padrão amplo |
| `EMERGENT_LLM_KEY` | gateway dos modelos | opcional; ausência ativa modo simulado |
| `QG_MCP_TOKEN` | proteção do servidor MCP | obrigatória para usar MCP; ausência o desliga |
| `APP_TZ` | timezone padrão do helper de datas | opcional; briefing fixa America/Sao_Paulo em pontos específicos |
| `BACKEND_URL` | base dos testes | opcional; padrão local documentado |

Nenhum valor secreto foi aberto ou reproduzido.

## 9. Limites desta avaliação

- Estado de produção, domínio definitivo, dados reais, backups externos, contas da VPS e segredos não foram acessados.
- O `LEIA ME` remoto não estava incorporado ao checkout local; foi lido no commit informado.
- Nenhum comando de instalação, migração, publicação, compra ou mensagem externa foi executado nesta etapa.
- O pedido anterior de Navegador Visual simulado foi suspenso pela instrução documental mais recente.
