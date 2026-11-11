# QG do Zero — Cronograma e mapa de execução

> Documento operacional para continuidade por outra IA. A ordem abaixo é por dependência e prioridade,
> não por data de calendário. Ao concluir uma microtarefa, marque `[x]`, registre a evidência e atualize
> também `memory/SPEC.md` quando o comportamento do produto mudar.

## 1. Como continuar este trabalho

1. Ler, nesta ordem: `/app/README.md`, `/app/TEMPLATE.md`, `memory/SPEC.md` e este arquivo.
2. Não refazer itens marcados `[x]` sem reproduzir um defeito.
3. Resolver primeiro todo item `P0`, depois seguir `P1 → P2 → P3`.
4. Para integrações externas, chamar o playbook de integração antes de implementar e coletar segredos
   somente pelo gerenciador seguro de segredos — nunca pelo chat.
5. Depois de qualquer mudança funcional, atualizar `memory/SPEC.md` no mesmo patch.
6. Verificar a rodada completa com API, `yarn typecheck`, jornada no navegador e Testing Agent.

### Legenda

- `[x]` concluído e verificado
- `[~]` implementado, mas ainda precisa de verificação final
- `[ ]` ainda não iniciado
- `[!]` bloqueado por dado, credencial ou decisão do Chefe

## 2. Estado executivo

| Frente | Estado | Evidência atual |
|---|---:|---|
| Acesso aberto sem login | `[x]` | Cockpit abriu localmente e no preview sem redirecionamento |
| Missões e delegação | `[x]` | POST de missão, criação de tarefas e publicação na Sala testados |
| Revisão de entregas | `[x]` | Aprovação e rejeição/409 validadas pela UI e API |
| Sala Compartilhada | `[x]` | Mensagem do Chefe e resposta assíncrona do Zero validadas |
| Briefing manual e rotina gerenciada | `[x]` | Webhook autenticado, agendamento e botão manual validados |
| Projetos e retomada | `[x]` | Criar, editar e retomar projeto validados |
| Painel AeroPartz | `[x]` | Criar, alternar status e remover item validados |
| Canais | `[x]` | Cinco canais seed e painel Internet verificados na UI e API |
| Busca web | `[x]` | Busca e fallback vazio seguro verificados sem quebra da página |
| Linha Direta/voz | `[~]` | Implementada; voz real depende de navegador compatível e teste manual |
| Navegador Visual simulado | `[x]` | URL, objetivo, quatro etapas e seis ações selecionáveis validados 6/6 |
| Concorrência de decisões | `[x]` | Revisões e propostas atômicas, com efeitos idempotentes, validadas sob corrida |
| Integrações reais | `[!]` | Aguardam URLs, contas, tokens e decisões listadas na seção 6 |

### Última validação registrada

- Gate local: APIs principais passaram; frontend passou em `yarn typecheck`; envio de missão pela UI passou sem erros de console ou respostas HTTP >= 400.
- Testing Agent do Navegador: `6 passed`, `0 failed`, `0 blocked`, `retest_needed=false` em `test_reports/iteration_5.json`.
- Suíte backend completa: **26/26**; seleção, persistência, compatibilidade e ausência de tráfego ao alvo ficaram verdes.
- Testing Agent da rotina gerenciada: **7/7 critérios** e suíte backend **36/36** em `test_reports/iteration_7.json`.
- O fallback de IA está **SIMULADO** quando `EMERGENT_LLM_KEY` não está configurada.

## 3. Concluído — microtarefas já entregues

### C01 — Fundação do QG

- [x] Manter FastAPI sob `/api` e frontend React/TypeScript pelo proxy relativo.
- [x] Criar modelos Pydantic e espelhos TypeScript para agentes, missões, tarefas, mensagens,
  briefing, projetos, contas, loja, canais, MCP e memória.
- [x] Centralizar MongoDB em `backend/lib/db.py` e definir índices das coleções consultadas.
- [x] Criar seed idempotente em `backend/seed.py`.
- [x] Criar navegação desktop/mobile, i18n PT/EN, tema claro/escuro e layout responsivo.

### C02 — Esquadrão, missões e tarefas

- [x] Cadastrar a hierarquia Zero → Pro → Jarvis/Luna/Plus no seed.
- [x] Receber missão pelo Cockpit com projeto opcional.
- [x] Planejar no Zero, limitar a quatro tarefas e usar fallback simulado quando a nuvem falhar.
- [x] Delegar tarefas aos agentes e narrar o processo na Sala.
- [x] Executar estados `queued → working → review` e registrar resultado/falha.
- [x] Permitir ao Chefe aprovar ou devolver entrega com nota.
- [x] Atualizar a última entrega verificada do projeto após aprovação.
- [x] Registrar entrega aprovada como fato verificado na Memória.

### C03 — Comunicação e rotina

- [x] Criar Sala Compartilhada com filtros por participante.
- [x] Permitir mensagem do Chefe e resposta assíncrona do Zero.
- [x] Criar Linha Direta com intenções `explicando`, `propondo` e `executando`.
- [x] Permitir aprovar proposta do Zero e convertê-la em missão.
- [x] Implementar microfone, síntese de voz e modo ligação com fallback silencioso.
- [x] Implementar briefing manual e rotina automática configurável por hora/cidade.
- [x] Ancorar a data do briefing em `America/Sao_Paulo`.

### C04 — Operação AeroPartz

- [x] Criar fichas de projeto com objetivo, andamento, bloqueio, próximo passo e última entrega.
- [x] Criar ação “Continuar de onde paramos” com contexto das tarefas recentes.
- [x] Criar cadastro de contas de IA e estados de disponibilidade.
- [x] Criar painel de estoque, pedidos e cupons com CRUD e validação por tipo/status.
- [x] Incluir itens críticos, pedidos abertos e cupons ativos no contexto do Zero.
- [x] Criar Memória com tipo, fonte, data, projeto e substituição sem apagar histórico.

### C05 — Canais e MCP

- [x] Modelar canais WhatsApp, Facebook, Internet, Navegador Visual e MCP.
- [x] Criar configuração/status dos canais no painel.
- [x] Criar busca web DuckDuckGo com retorno vazio seguro em falha externa.
- [x] Criar servidor MCP JSON-RPC do QG e endpoint público de informações.
- [x] Disponibilizar ferramentas MCP para projetos, missões, tarefas, sala, contas e loja.

### C06 — Estabilização desta rodada

- [x] Remover login e bloqueios de API que contradiziam a SPEC de app pessoal aberto.
- [x] Remover tela, provider, gate, menu e rotas órfãs de autenticação.
- [x] Fazer a prévia da Sala exibir as mensagens mais recentes.
- [x] Manter referência das respostas assíncronas da Sala e da Linha Direta até terminarem.
- [x] Mover busca de canais para mutation do TanStack Query.
- [x] Restaurar `backend/.env` mínimo para MongoDB local e CORS.
- [x] Garantir que `app.include_router(api_router)` seja a última montagem do backend.
- [x] Validar APIs, tipos e jornada de missão no navegador.

### C07 — Navegador Visual simulado

- [x] Criar contratos e coleção `visual_missions` com índices de id, data e status.
- [x] Criar URL `/navegador` com formulário, histórico persistido e timeline de quatro etapas.
- [x] Garantir que nenhuma requisição seja feita ao endereço informado.
- [x] Rotular toda a jornada e o resultado como **MODO SIMULADO**.
- [x] Publicar a entrega simulada na Sala Compartilhada.
- [x] Validar API, erro de URL, persistência, ausência de acesso ao alvo e jornada completa no navegador.
- [x] Adicionar seleção das ações abrir, ler, clicar, escrever, copiar e colar.
- [x] Persistir alvo, estado e saída sintética de cada ação na missão visual.
- [x] Validar ações selecionadas, rejeição de ação inválida e ausência de tráfego para o host alvo.

Evidência: `test_reports/iteration_3.json` — 5/5 critérios do Navegador aprovados; suíte backend 15/15.
Evidência atual: `test_reports/iteration_5.json` — 6/6 critérios das ações aprovados; suíte backend 26/26.

## 4. P0 — desbloqueio concluído

### P0.1 — Aplicar e verificar o seed

**Motivo:** sem seed, o Cockpit perde a hierarquia e a página Canais não consegue renderizar nem a busca.

- [x] Executar `cd /app/backend && python seed.py` uma única vez.
- [x] Confirmar `GET /api/agents` com exatamente as chaves `zero`, `pro`, `jarvis`, `aluna`, `plus`.
- [x] Confirmar `GET /api/channels` com `whatsapp`, `facebook`, `internet`, `visual`, `mcp`.
- [x] Confirmar a existência de `seed-project-aeropartz` e `seed-project-luna` em `GET /api/projects`.
- [x] Confirmar os quatro itens `is_sample=true` em `GET /api/store/items` sem apagar dados reais.
- [x] Abrir `/canais` e confirmar que o card Internet e o painel de busca aparecem.
- [x] Retestar a suíte existente usando `test_reports/iteration_1.json` e os checks já gerados.
- [x] Critério de aceite atingido: `15/15`, zero falhas, zero bloqueios e `retest_needed=false`.

## 5. P1 — confiabilidade e fechamento técnico

### P1.1 — Tornar revisões e propostas idempotentes

- [x] Reproduzir duas aprovações simultâneas da mesma tarefa.
- [x] Trocar a transição de `review` por atualização atômica condicionada no MongoDB.
- [x] Garantir que memória e mensagem de aprovação usem IDs determinísticos e sejam criadas uma única vez.
- [x] Reproduzir dois cliques simultâneos em “Aprovar e executar” na mesma proposta.
- [x] Reservar a proposta atomicamente antes de criar a missão e impedir missão duplicada.
- [x] Adicionar casos de conflito 409 aos testes de backend.
- [x] Critério de aceite: concorrência cria exatamente uma decisão e uma missão.

Evidência: `test_reports/iteration_4.json` — corrida de revisão/proposta aprovada; suíte backend 17/17.

### P1.2 — Tornar a rotina automática resistente a reinícios

- [x] Carregar a skill `scheduled-recurring-tasks` antes de alterar o agendamento.
- [x] Criar webhook interno autenticado para disparar `maybe_run_briefing` rapidamente.
- [x] Adicionar `.emergent/crons.yml`; roda a cada 30 min em UTC e avalia o horário configurável em `America/Sao_Paulo` no backend.
- [x] Validar bearer secret pelo padrão da skill e manter o processamento idempotente por dia.
- [x] Remover o loop em memória somente após o cron gerenciado estar validado.
- [x] Testar `auto=false`, horário futuro, execução do dia e repetição no mesmo dia.
- [x] Critério de aceite: reiniciar o backend não perde nem duplica o briefing diário.

Evidência: `test_reports/iteration_7.json` — 7/7 critérios da rotina e suíte backend 36/36; botão manual aprovado no navegador.

### P1.3 — Estados de erro e recuperação visíveis

- [ ] Mapear páginas que hoje convertem falha de API em lista vazia.
- [ ] Preservar shell, navegação e conteúdo estático quando o backend estiver fora.
- [ ] Exibir erro localizado apenas na região dependente de dados, com botão “Tentar novamente”.
- [ ] Não exibir dado antigo como se estivesse online após refetch falhar.
- [ ] Testar retorno do backend, timeout e recuperação sem recarregar a página.
- [ ] Critério de aceite: nenhuma rota fica em branco e o usuário distingue vazio real de indisponibilidade.

### P1.4 — Cobertura móvel e acessibilidade

- [ ] Rodar as jornadas principais em viewport móvel.
- [ ] Validar navegação inferior, overflow de filtros, formulários e cartões longos.
- [ ] Validar foco visível, uso por teclado, nomes acessíveis e contraste.
- [ ] Repetir o ensaio AeroPartz citado no projeto seed, incluindo a etapa de quantidade via Tab.
- [ ] Registrar o resultado na ficha `seed-project-aeropartz`.
- [ ] Critério de aceite: missão, revisão e loja operam por teclado e em tela móvel sem bloqueio.

## 6. P2 — integrações reais bloqueadas por decisão ou acesso

### P2.1 — Cérebro em nuvem

- [!] Confirmar com o Chefe quais agentes continuam em GPT e quais continuam em Gemini.
- [ ] Chamar o playbook de integração com os modelos exatos definidos na SPEC.
- [ ] Verificar a chave universal existente pelo gerenciador seguro; solicitar somente se ausente.
- [ ] Testar planejamento JSON, execução de tarefa, Linha Direta e briefing com resposta real.
- [ ] Manter fallback **SIMULADO** explícito quando a integração falhar.
- [ ] Critério de aceite: `/api/system` informa `cloud` e uma missão completa sem fallback.

### P2.2 — MCP externo da VPS

- [!] Receber do Chefe a URL do `zero-mcp` e/ou `private-room`.
- [!] Confirmar o método de autenticação desses servidores.
- [ ] Chamar o playbook da integração antes de escrever o conector.
- [ ] Criar teste de saúde, timeout e mensagem de erro sem expor token.
- [ ] Mapear contas salvas para o Navegador Visual.
- [ ] Critério de aceite: Zero consulta uma conta autorizada e devolve evidência rastreável.

### P2.3 — Token do servidor MCP do QG

- [!] Definir/fornecer `QG_MCP_TOKEN` pelo gerenciador seguro de segredos.
- [ ] Confirmar `GET /api/mcp/info` com `token_configured=true`.
- [ ] Validar 401 com token errado e JSON-RPC válido com token correto.
- [ ] Documentar exemplos de chamada sem registrar o valor do token.
- [ ] Critério de aceite: cliente MCP externo lista projetos e cria missão autorizada.

### P2.4 — WhatsApp Web e Facebook

- [!] Confirmar o processo operacional do navegador da VPS e a conta/página que será usada.
- [ ] Não adicionar provedor externo ao WhatsApp: a decisão atual é WhatsApp Web próprio.
- [ ] Implementar sessão, saúde e recuperação sem guardar senha no banco.
- [ ] Definir consentimento, retenção e encerramento do atendimento da Luna.
- [ ] Testar conversa → catálogo → orçamento → tarefa → resultado.
- [ ] Critério de aceite: atendimento real deixa trilha na Sala e respeita as políticas aprovadas.

### P2.5 — Loja real AeroPartz

- [!] Identificar a plataforma/URL da loja e quais dados podem ser lidos ou alterados.
- [!] Definir escopo: estoque, pedidos, cupons ou todos.
- [ ] Chamar o playbook específico da plataforma escolhida.
- [ ] Criar sincronização segura, idempotente e com indicador de última atualização.
- [ ] Separar claramente itens de exemplo de dados reais.
- [ ] Critério de aceite: painel mostra dados reais com origem, horário e falha recuperável.

## 7. P3 — aceite e entrega final

- [ ] Atualizar `memory/SPEC.md` com todas as decisões finais e integrações ativadas.
- [ ] Atualizar este cronograma: nenhuma tarefa concluída pode permanecer `[ ]` ou `[~]`.
- [ ] Rodar smoke das APIs principais com um caso negativo por recurso mutável.
- [ ] Rodar `cd /app/frontend && yarn typecheck`.
- [ ] Rodar uma jornada desktop e uma móvel sem erros de console ou HTTP inesperados.
- [ ] Rodar o Testing Agent e corrigir todos os itens críticos.
- [ ] Fazer revisão de segurança separada somente se o Chefe solicitar explicitamente.
- [ ] Fazer readiness/deploy somente quando o Chefe pedir publicação.
- [ ] Critério de aceite: relatório final sem falhas/bloqueios e SPEC/cronograma sincronizados.

## 8. Decisões que outra IA não deve assumir

1. Não reativar autenticação sem decisão explícita do Chefe; o estado atual aprovado é aberto sem login.
2. Não trocar os modelos definidos na SPEC por versões diferentes sem confirmação.
3. Não adicionar provedor externo ao WhatsApp; a decisão atual é WhatsApp Web na VPS.
4. Não marcar conta, canal ou infraestrutura como disponível sem verificação real.
5. Não apagar itens `is_sample=true` nem dados criados pelo Chefe sem confirmação.
6. Não inventar estoque, preços, pedidos, cupons, credenciais, URLs ou políticas comerciais.
7. Não publicar/deployar nem alterar produção sem pedido explícito.

## 9. Arquivos de referência rápida

- Produto e contratos: `memory/SPEC.md`
- Este mapa: `memory/CRONOGRAMA.md`
- Dados iniciais: `backend/seed.py`
- Motor do esquadrão: `backend/lib/orchestrator.py`
- Agendamento atual: `backend/lib/scheduler.py`
- Modelos backend: `backend/models/models.py`
- Tipos frontend: `frontend/src/lib/types.ts`
- Rotas principais: `backend/server.py`
- Último relatório: `test_reports/iteration_2.json`
- Credenciais de teste: `memory/test_credentials.md` (nenhuma; app aberto)