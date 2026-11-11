# Decisões e bloqueios

## 1. Decisões vigentes

| ID | Decisão | Estado/fonte | Consequência |
|---|---|---|---|
| D-001 | Esta etapa é apenas análise e documentação | DOCUMENTADO no `LEIA ME` remoto | nenhuma funcionalidade, migration, deploy ou serviço deve ser iniciado |
| D-002 | Código, dados, configurações e alterações existentes devem ser preservados | DOCUMENTADO no `LEIA ME` | não reverter nem sobrescrever trabalho local |
| D-003 | ZERO e demais projetos da VPS são separados; ZERO permanece pausado | DOCUMENTADO no `LEIA ME` | não usar base, conta, porta ou ambiente da VPS |
| D-004 | Segredos não podem ser abertos/reproduzidos | DOCUMENTADO no `LEIA ME` | documentar apenas nomes/finalidade |
| D-005 | Estado atual do painel é aberto, sem login | DOCUMENTADO em `memory/SPEC.md` e VERIFICADO NO CODIGO | qualquer pessoa com acesso à origem pode usar REST/UI |
| D-006 | Modo simulado pode continuar | decisão do operador nesta conversa; DOCUMENTADO | ausência de LLM real não bloqueia planejamento do produto |
| D-007 | WhatsApp pretendido é WhatsApp Web próprio, sem provedor externo | DOCUMENTADO em SPEC/seed histórico | não propor Twilio/outro provedor sem nova decisão |
| D-008 | Preferência anterior para Navegador Visual: missão completa simulada | decisão anterior ao `LEIA ME` | permanece backlog; D-001 impede implementação agora |
| D-009 | `microtarefas.json` é fonte estruturada do cronograma | DOCUMENTADO no `LEIA ME` | alterações futuras começam no JSON |

## 2. Decisões pendentes

| ID | Pergunta objetiva | Tarefas bloqueadas | Condição de desbloqueio |
|---|---|---|---|
| P-001 | Os dez entregáveis estão aceitos e a etapa de implementação pode começar? | DEC-001 e todo código | autorização explícita com primeira tarefa |
| P-002 | Como incorporar o commit remoto `c3018d3...` ao HEAD local `65ec012...`? | SRC-001 | escolha de merge/rebase/pull pelo mantenedor |
| P-003 | O acesso aberto continua aceitável no destino público? | DEP-001, política de segurança | decisão aberta versus autenticação e escopo de acesso |
| P-004 | Em reinício, missão em andamento retoma automaticamente ou exige comando do Chefe? | REL-003 | semântica escolhida por estado |
| P-005 | Qual RPO/RTO, retenção e destino de backup? | DB-005, DEP-001 | valores e responsável definidos |
| P-006 | Existe backup antigo? Onde, de quando, em qual formato e com qual checksum? | recuperação de legado | metadados verificáveis fornecidos |
| P-007 | Quais modelos continuam em GPT/Gemini e há autorização de consumo? | INT-001 | modelos e chave segura aprovados |
| P-008 | O Navegador Visual simulado pode ser implementado após esta documentação? | INT-002 | reconfirmação explícita que revoga apenas o gate de implementação |
| P-009 | Qual URL/autenticação/contas do MCP/navegador da VPS podem ser usadas? | INT-003 | acesso autorizado; ZERO despausado para esse escopo |
| P-010 | Qual plataforma da AeroPartz e quais operações leitura/escrita são permitidas? | INT-004 | documentação/API/credenciais seguras |
| P-011 | Quais políticas de consentimento, retenção e encerramento valem para atendimento? | INT-005 | política aprovada pelo operador |
| P-012 | Qual destino de logs e prazo de retenção? | OBS-001 | política e infraestrutura definidas |
| P-013 | Qual volume/crescimento esperado? | paginação, capacidade e backup | estimativa operacional ou medição autorizada |

## 3. Bloqueios verificáveis

| Bloqueio | Evidência | Impacto | Próxima ação segura |
|---|---|---|---|
| `LEIA ME` remoto não está no checkout local | busca local + hashes Git | continuidade pode perder instrução | SRC-001 após decisão Git |
| nenhuma implementação autorizada | linha 13/202 do `LEIA ME` | INT/REL/SCH/ERR/ACC bloqueadas | operador revisar documentação |
| nenhum backup localizado | busca de metadados | dados antigos não recuperáveis hoje | solicitar apenas metadados do backup |
| produção/destino não examinados | escopo do `LEIA ME` | sem alegação de readiness/deploy | manter DEP-001 bloqueada |
| Navegador Visual é placeholder | Channels/seed; sem router/coleção | Zero não navega em site | escolher INT-002 ou INT-003 após autorização |
| canais sociais e loja real ausentes | código somente local/config | sem mensagens/sync reais | decisões P-010/P-011 |
| operações concorrentes não protegidas | read-then-write em tasks/zero | duplicidade potencial | REL-001/REL-002 |
| background não é durável | set de tasks em memória | perda em reinício | P-004 e REL-003 |
| scheduler vive no processo | scheduler.py | execução perdida/duplicada em restart | SCH-001 |
| políticas de dados ausentes | nenhum documento encontrado | privacidade/retention indefinidas | P-005/P-011/P-012 |

## 4. O que não deve ser assumido

- Um canal marcado `connected` não prova conexão externa.
- Uma conta marcada `available` não prova login válido.
- Uma resposta de agente não é fato verificado até aprovação.
- Um seed não é backup.
- Um commit descrevendo token ligado não permite concluir que o secret existe no destino atual.
- Um preview verde não comprova produção, persistência, backup, SSL ou domínio.
- O nome QG do Zero no código não autoriza usar o projeto ZERO da VPS.
- O pedido de modo simulado não revoga automaticamente a etapa documental do `LEIA ME`.

## 5. Condições de interrupção futuras

Interromper imediatamente se:

1. conexão aponta para banco/URL de produção sem autorização;
2. segredo aparece em comando, log, diff ou documento;
3. restauração tem checksum ou contagem divergente;
4. retry pode duplicar mensagem, pedido, missão ou decisão sem reconciliação;
5. integração externa produzir efeito não confirmado;
6. merge Git ameaçar sobrescrever alterações locais;
7. migração exigir perda/rename sem backup aceito;
8. teste depender de dado pessoal/privado real.

## 6. Primeira decisão e primeira microtarefa

- Primeira ação humana: revisar este pacote e resolver `DEC-001`.
- Primeira ação técnica independente do produto: `SRC-001`, somente após definir a estratégia Git.
- Primeira correção de código recomendada depois da autorização: `REL-001` (revisão atômica).
- Navegador Visual simulado: `INT-002`, propositalmente atrás do gate documental e de estados de erro.
