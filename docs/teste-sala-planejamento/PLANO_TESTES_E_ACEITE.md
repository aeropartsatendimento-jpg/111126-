# Plano de testes e aceite

## 1. Princípios

1. Testar somente ambiente isolado explicitamente apontado; nunca presumir que `BACKEND_URL` ou Mongo são de teste.
2. Usar dados sintéticos com prefixo identificável e limpeza pela própria suíte.
3. Não acionar API paga, mensagem externa, navegador real ou produção sem autorização específica.
4. Reusar checks existentes; adicionar teste somente para requisito/risco novo.
5. Um comando documentado não conta como executado. Evidência exige saída e ambiente registrados.
6. Falha parcial ou resultado incerto interrompe repetição até reconciliar banco e efeitos externos.

## 2. Evidência já disponível

| Evidência | Ambiente | Resultado | Classificação |
|---|---|---|---|
| `test_reports/iteration_2.json` | preview/local isolado da rodada anterior | 15 passed, 0 failed, 0 blocked, 0 test_error | VERIFICADO EM EXECUCAO ISOLADA |
| Smoke de APIs principais | localhost anterior | system, agents, store, room e 404 de projeto passaram | VERIFICADO EM EXECUCAO ISOLADA |
| `yarn typecheck` | frontend anterior | passou | VERIFICADO EM EXECUCAO ISOLADA |
| Jornada Cockpit → missão → Sala | navegador desktop anterior | HTTP 200, sem console error/HTTP inesperado | VERIFICADO EM EXECUCAO ISOLADA |
| Canais após seed | navegador/API anterior | 5 canais e busca/fallback acessíveis | VERIFICADO EM EXECUCAO ISOLADA |

Essas evidências são anteriores ao `LEIA ME`. Nesta etapa documental nenhum teste de aplicação foi reexecutado.

## 3. Pirâmide e responsabilidades

### Contratos/API

- Pydantic: limites, estados, campos obrigatórios e 422.
- Regras de negócio: 404/409, estados permitidos, relação projeto/missão.
- Mongo: índices, atomicidade, duplicidade e ordenação.

### Integração/backend vivo

- API contra Mongo isolado.
- Background: polling até estado terminal com timeout objetivo.
- Scheduler/webhook: assinatura, timezone, repetição e reinício.
- MCP: autenticação, protocolo e ferramentas.

### Navegador

- Jornadas observáveis, sem chamar `fetch` manual para substituir interação do usuário.
- Console errors e respostas HTTP >= 400 inesperadas capturadas.
- Desktop e mobile separados.
- Teclado/foco/nome acessível nas ações essenciais.

### Externos

- Contrato/sandbox antes de conta real.
- Falha, timeout, revogação e resposta ambígua.
- Efeitos reais somente após confirmação explícita.

## 4. Matriz de risco para testes futuros

| Risco | Requisito | Caso mínimo | Critério de aceite | Microtarefa |
|---|---|---|---|---|
| dupla aprovação | RQ-003/RQ-012 | duas PATCH simultâneas na mesma task review | uma 200, uma 409, uma memória e uma mensagem | REL-001 |
| missão duplicada por proposta | RQ-004/RQ-012 | duas execuções simultâneas | exatamente uma mission e claim recuperável | REL-002 |
| reinício durante missão | RQ-002/RQ-012 | parar processo em planning/working | retoma ou marca falha explicitamente, sem duplicar | REL-003 |
| briefing duplicado | RQ-005/RQ-012 | duas chamadas cron no mesmo dia | uma execução automática | SCH-001 |
| vazio confundido com offline | RQ-001/RQ-012 | API 500 após dado cacheado | região informa offline e não mostra stale como live | ERR-001 |
| layout móvel quebrado | RQ-013 | missão/revisão/loja em viewport móvel | sem overflow impeditivo | ACC-001 |
| navegação por teclado | RQ-013 | Tab até quantidade/status/ação | foco visível e ação alcançável | ACC-001 |
| segredo em log | RQ-010/RQ-012 | token inválido/erro LLM | valor não aparece em log/resposta | OBS-001 |
| restore incompatível | RQ-011 | backup com campo/índice legado | relatório de incompatibilidade, sem alterar ativo | DB-005 |
| fallback da nuvem | RQ-014 | chave ausente/timeout | fluxo termina marcado SIMULADO | INT-001 |
| simulação confundida com evidência | RQ-008/RQ-014 | missão visual simulada | todos os resultados exibem SIMULADO e nenhum site é acessado | INT-002 |
| ação externa duplicada | RQ-014 | retry após timeout de canal/loja | idempotency key/reconciliação impedem repetição silenciosa | INT-003..005 |

## 5. Aceite por requisito

| Requisito | Entrada | Saída exigida |
|---|---|---|
| RQ-001 | política de acesso definida | rota abre/nega conforme decisão; nenhuma tela em branco |
| RQ-002 | missão válida e projeto opcional | mission persistida, tarefas e Sala rastreáveis |
| RQ-003 | tarefa em review | uma única decisão e efeitos correspondentes |
| RQ-004 | mensagem/proposta | resposta persistida; proposta cria no máximo uma missão |
| RQ-005 | settings e disparo | data correta, sem duplicidade automática, Sala atualizada |
| RQ-006 | projeto/conta | edição persiste; retomada mantém project_id; estados inválidos 422 |
| RQ-007 | item de cada kind | CRUD válido; combinação inválida 422; amostra identificada |
| RQ-008 | canal/busca | status não promete integração inexistente; falha externa é clara |
| RQ-009 | memória e substituição | fonte/data presentes; registro antigo preservado e marcado |
| RQ-010 | token ausente/incorreto/correto | 503/401/sucesso protocolar sem vazar token |
| RQ-011 | banco vazio ou backup | reconstrução verde; restauração só com artefato aceito |
| RQ-012 | concorrência/reinício/falha | nenhuma duplicidade/perda silenciosa |
| RQ-013 | desktop/mobile/teclado | jornadas essenciais completas e foco observável |
| RQ-014 | acesso externo autorizado | origem, efeito, idempotência e fallback comprovados |
| RQ-015 | novo agente sem conversa | retoma pela documentação e identifica primeira tarefa correta |

## 6. Comandos e efeitos

### Gate de aplicação — somente após autorização e confirmação de isolamento

| Comando | Diretório | Pré-requisito | Efeito | Resultado esperado | Executado nesta etapa? |
|---|---|---|---|---|---:|
| `python -c 'import server'` | `/app/backend` | env sem produção | importa aplicação | exit 0 | não |
| `pytest` | `/app/backend` | backend/Mongo de teste | cria/muta fixtures sintéticas | suíte verde | não |
| `yarn typecheck` | `/app/frontend` | dependências presentes | leitura/compilação TS | exit 0 | não |
| checks persistidos | `/app` | frontend/backend isolados | navegação e mutações sintéticas | critérios observáveis verdes | não |
| `python seed.py` | `/app/backend` | banco vazio/isolado confirmado | upserts e inserts de referência | 5 agentes/canais, 2 projetos, amostras | não |

### Verificação documental desta etapa

| Comando | Efeito | Resultado esperado |
|---|---|---|
| parse de `microtarefas.json` | somente leitura | JSON válido, IDs únicos e dependências existentes |
| parse de `MATRIZ_RASTREABILIDADE.csv` | somente leitura | 15 requisitos rastreados |
| contagem dos entregáveis | somente metadados | 10 arquivos exigidos |
| busca de padrões de segredo nos docs | somente leitura | nenhum valor de token/chave/cookie/senha |

## 7. Dados sintéticos

- Prefixos sugeridos: `tscheck-`, `fixture-`, `restore-test-`.
- Nunca usar e-mail, telefone, pedido, cupom ou credencial real em fixtures.
- `backend/seed.py` é referência funcional, não backup.
- Em concorrência, registrar IDs criados e confirmar contagem final antes de limpar.

## 8. MCP

Casos obrigatórios após ambiente isolado e token de teste:

1. `GET /api/mcp` → 405.
2. `POST /api/mcp` sem configuração → 503.
3. token errado → 401 e `WWW-Authenticate`.
4. `initialize`, `ping`, `tools/list` válidos.
5. ferramenta desconhecida → erro JSON-RPC.
6. argumento ausente → resultado `isError=true` sem 500.
7. uma ferramenta de leitura e uma de escrita com dados sintéticos.
8. confirmação de que token não aparece em resposta/log.

## 9. Reinício e recuperação

- Iniciar missão, registrar estado/IDs, reiniciar somente o backend isolado, reconciliar.
- Repetir para resposta de Sala, Linha Direta e briefing.
- Estado esperado deve ser definido antes do teste: retomar ou falhar explicitamente.
- “Ficou parado” ou “executou duas vezes” é falha.

## 10. Build, implantação e pós-publicação

Somente quando `DEP-001` for autorizada:

1. readiness estático do código;
2. pipeline/build;
3. secrets e binding Mongo por presença/nome, sem imprimir valor;
4. rota frontend e `/api/system`;
5. uma leitura e uma escrita sintética reversível;
6. logs/erro/CDN/SSL;
7. contagens de referência;
8. rollback se qualquer gate falhar.

## 11. Critério final da rodada futura

- zero `failed`, `blocked` e `test_error` no escopo autorizado;
- toda integração não testada marcada como não verificada/simulada;
- SPEC, JSON, cronograma, matriz e continuidade atualizados;
- nenhum teste contra produção sem autorização e nenhum efeito externo inesperado.
