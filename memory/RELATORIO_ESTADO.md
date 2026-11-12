# QG do Zero — Relatório de estado atual

## Resumo

O núcleo do QG está funcional e validado em modo simulado. A rodada mais recente concluiu estados localizados
de carregamento, vazio, indisponibilidade e dados antigos nas dez áreas principais, com recuperação sem recarregar.

## Pronto e testado

- Acesso aberto ao QG, sem autenticação.
- Cockpit, missões, decomposição simulada, delegação e tarefas.
- Sala Compartilhada e Linha Direta.
- Revisão de entregas com aprovação/devolução.
- Proteção atômica contra duas revisões simultâneas.
- Proteção atômica contra duas execuções da mesma proposta.
- Memórias e mensagens de revisão idempotentes.
- Projetos, retomada, contas salvas e Memória com Origem.
- Briefing manual e configuração da rotina da manhã.
- Painel AeroPartz com estoque, pedidos e cupons locais.
- Canais cadastrados e busca DuckDuckGo com fallback seguro.
- Servidor MCP do QG implementado e protegido por token quando configurado.
- Navegador Visual simulado com URL, objetivo, histórico, quatro etapas e publicação na Sala.
- Seleção das ações simuladas: **abrir, ler, clicar, escrever, copiar e colar**.
- Persistência de tipo, alvo, status e saída de cada ação.
- Compatibilidade com missões visuais antigas sem o campo `actions`.
- Rotina automática resistente a reinícios, respeitando `auto`, horário configurável e `America/Sao_Paulo`.
- Entregas repetidas do cron e retomadas após falha não duplicam briefing nem mensagem na Sala.
- Cockpit, Sala, Projetos, Tarefas, Linha Direta, Navegador, Loja, Canais, Universo e Memória preservam o shell em falhas.
- Cada consulta indisponível oferece nova tentativa; cache anterior permanece visível e explicitamente marcado como antigo.

## Garantias do Navegador Visual atual

- Toda a interface e entrega mostram **MODO SIMULADO**.
- Nenhuma requisição é enviada ao host informado.
- Nenhum DOM, tela, login, cookie ou conta real é lido.
- Nenhum clique, escrita, cópia ou colagem acontece em site real.
- A API rejeita ação desconhecida, lista vazia e tipos duplicados com 422.
- O relatório da Sala inclui somente as ações escolhidas.

## Evidências mais recentes

- `test_reports/iteration_8.json`: **8/8 critérios de interface aprovados**, sem falhas ou bloqueios.
- Recuperação sem reload, regiões independentes, vazio versus falha, cache antigo, PT/EN e teclado foram validados.
- `test_reports/iteration_7.json`: **7/7 critérios aprovados**; suíte backend completa **36/36**.
- Gate local: autenticação/validação/duplicata do webhook, TypeScript e jornada Cockpit → Sala aprovados.
- `test_reports/iteration_5.json`: **6/6 critérios aprovados**, sem falhas ou bloqueios.
- `test_reports/iteration_4.json`: concorrência de revisão/proposta aprovada.
- `test_reports/iteration_3.json`: fluxo original do Navegador Visual aprovado.
- TypeScript e gate de navegador passaram sem erros de console ou HTTP inesperados.

## Simulado ou ainda não conectado

- Cérebro dos agentes: usa fallback **SIMULADO** quando a chave de IA não está ativa.
- Navegador Visual: ações são sintéticas; não existe controle real de navegador.
- WhatsApp, Facebook e conexão com MCP/navegador da VPS: ainda não operam canais reais.
- Itens iniciais do painel AeroPartz: exemplos marcados `is_sample=true`.
- Loja AeroPartz real: sem sincronização externa.

## Próximos passos de maior valor

1. Tornar missões/jobs recuperáveis após reinício do backend.
2. Validar mobile, teclado e acessibilidade das jornadas essenciais.
3. Detalhar e depois conectar o navegador real da VPS, começando em modo somente leitura.

## Registro de continuidade — 11/11/2026

- Tarefa: P1.2 concluída.
- Arquivos principais: `.emergent/crons.yml`, `backend/routers/cron.py`, `backend/lib/scheduler.py`,
  `backend/lib/orchestrator.py`, `backend/server.py`, contratos e índices.
- Testes: gate local aprovado; Testing Agent 7/7; suíte backend 36/36; navegador aprovado.
- Ambiente: seed idempotente reaplicado; agentes, canais, projetos e exemplos restaurados sem apagar dados existentes.
- Próximo passo exato: iniciar P1.3, estados de erro e recuperação visíveis.

## Registro de continuidade — 12/11/2026

- Tarefa: P1.3 concluída (Fase 1 de erros e recuperação).
- Arquivos principais: `frontend/src/components/DataRegionState.tsx`, páginas do QG e `frontend/src/lib/i18n.tsx`.
- Testes: gate proporcional aprovado; Testing Agent 8/8; regressão backend 36/36.
- Próximo passo exato: iniciar P1.4, cobertura móvel e acessibilidade.

## Referências

- Especificação viva: `memory/SPEC.md`
- Cronograma: `memory/CRONOGRAMA.md`
- Relatório de teste atual: `test_reports/iteration_5.json`