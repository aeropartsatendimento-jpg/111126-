# QG do Zero — Relatório de estado atual

## Resumo

O núcleo do QG está funcional e validado em modo simulado. A rodada mais recente ampliou o Navegador Visual
com ações selecionáveis do Zero e manteve a garantia de que nenhum site alvo é acessado.

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

## Garantias do Navegador Visual atual

- Toda a interface e entrega mostram **MODO SIMULADO**.
- Nenhuma requisição é enviada ao host informado.
- Nenhum DOM, tela, login, cookie ou conta real é lido.
- Nenhum clique, escrita, cópia ou colagem acontece em site real.
- A API rejeita ação desconhecida, lista vazia e tipos duplicados com 422.
- O relatório da Sala inclui somente as ações escolhidas.

## Evidências mais recentes

- `test_reports/iteration_5.json`: **6/6 critérios aprovados**, sem falhas ou bloqueios.
- Suíte backend completa: **26/26 aprovada**.
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
2. Migrar a rotina da manhã para agendamento gerenciado e idempotente.
3. Diferenciar dados vazios, backend indisponível e cache antigo em cada painel.
4. Detalhar e depois conectar o navegador real da VPS, começando em modo somente leitura.
5. Validar mobile, teclado e acessibilidade das jornadas essenciais.

## Referências

- Especificação viva: `memory/SPEC.md`
- Cronograma: `memory/CRONOGRAMA.md`
- Relatório de teste atual: `test_reports/iteration_5.json`