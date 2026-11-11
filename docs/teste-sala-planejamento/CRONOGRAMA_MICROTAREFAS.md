# Cronograma completo em microtarefas

## 1. Fonte, regra e estados

`microtarefas.json` é a fonte estruturada. Este cronograma é sua visão humana; IDs e estados devem permanecer iguais.

Estados permitidos:

- `NAO_INICIADA`: escopo conhecido, ainda não preparado.
- `PRONTA`: dependências e entradas disponíveis; pode iniciar quando a etapa de implementação for autorizada.
- `EM_EXECUCAO`: há trabalho ativo e arquivos reservados.
- `BLOQUEADA`: falta decisão, acesso ou dependência objetiva.
- `EM_VALIDACAO`: implementação/documento pronto aguardando evidência.
- `CONCLUIDA`: critério de aceite possui evidência.
- `NAO_APLICAVEL`: categoria fora do produto, com motivo.

**Gate global:** o `LEIA ME` ordena somente documentação nesta etapa e mantém o ZERO operacional separado/pausado.
Logo, nenhuma microtarefa de código deve começar antes de `DEC-001` ser explicitamente desbloqueada pelo operador.

## 2. Requisitos estáveis

| ID | Resultado esperado |
|---|---|
| RQ-001 | Chefe acessa o QG conforme política de acesso decidida |
| RQ-002 | Missão é persistida, planejada, delegada e rastreável |
| RQ-003 | Entrega só vira verificada por decisão única do Chefe |
| RQ-004 | Sala e Linha Direta preservam conversa e intenção |
| RQ-005 | Briefing manual/automático respeita configuração, data e não duplica |
| RQ-006 | Projeto pode ser retomado com contexto; contas têm estado verificável |
| RQ-007 | Painel da loja mantém itens válidos e origem clara |
| RQ-008 | Canais e busca informam estado real/degradado sem fingir integração |
| RQ-009 | Memória mantém data, fonte e histórico de substituição |
| RQ-010 | MCP expõe ferramentas somente a cliente autorizado |
| RQ-011 | Banco pode ser reconstruído e, havendo backup, restaurado com evidência |
| RQ-012 | Concorrência, falha parcial e reinício não duplicam nem perdem trabalho silenciosamente |
| RQ-013 | Jornadas essenciais funcionam em desktop, mobile e teclado |
| RQ-014 | Integrações reais só operam com origem, credencial e efeito externo autorizados |
| RQ-015 | Outra IA retoma o projeto apenas pelos arquivos versionados |

## 3. Caminho crítico

```text
DOC-001 → DOC-002 → DOC-003 → DOC-004 → DOC-005
                                         ↓
                                      DEC-001
                  ┌──────────────────────┼───────────────────────┐
                  ↓                      ↓                       ↓
               REL-001               SCH-001                 ERR-001
                  ↓                      ↓                       ↓
               REL-002               REL-003                 ACC-001
                  └──────────────────────┴──────────┬────────────┘
                                                   ↓
                                                TEST-001
                                                   ↓
                                                DEP-001
```

Integrações `INT-*` formam frentes independentes após `DEC-001`, mas cada uma conserva seus próprios bloqueios.

## 4. Visão consolidada

| ID | Estado | Microtarefa | Depende de | Esforço min/prov/máx |
|---|---|---|---|---|
| DOC-001 | CONCLUIDA | Inventariar produto e base | — | 2h/4h/6h |
| DOC-002 | CONCLUIDA | Mapear arquitetura e dependências | DOC-001 | 1h/3h/5h |
| DOC-003 | CONCLUIDA | Mapear MongoDB e integridade | DOC-001 | 2h/4h/7h |
| DOC-004 | CONCLUIDA | Planejar reconstrução/restauração | DOC-003 | 1h/3h/5h |
| DOC-005 | CONCLUIDA | Entregar rastreabilidade, testes e continuidade | DOC-001..004 | 2h/4h/7h |
| SRC-001 | BLOQUEADA | Reconciliar commit remoto do LEIA ME | decisão de integração Git | 0,5h/1h/2h |
| DEC-001 | BLOQUEADA | Autorizar saída da etapa documental | revisão do operador | espera/0,5h/1h |
| REL-001 | BLOQUEADA | Tornar revisão de tarefa atômica | DEC-001 | 1h/2h/4h |
| REL-002 | BLOQUEADA | Tornar execução de proposta atômica | DEC-001 | 1h/2h/4h |
| REL-003 | BLOQUEADA | Persistir/reconciliar jobs interrompidos | DEC-001 + decisão semântica | 3h/6h/12h |
| SCH-001 | BLOQUEADA | Migrar briefing para agenda gerenciada | DEC-001 + secret | 2h/4h/7h |
| ERR-001 | BLOQUEADA | Diferenciar vazio, offline e dado antigo | DEC-001 | 2h/5h/9h |
| ACC-001 | BLOQUEADA | Fechar mobile, teclado e acessibilidade | DEC-001 | 3h/6h/12h |
| OBS-001 | BLOQUEADA | Sanitizar e correlacionar logs | DEC-001 + política | 2h/4h/7h |
| DB-005 | BLOQUEADA | Definir backup, retenção e ensaio | destino + RPO/RTO | 2h/5h/10h |
| INT-001 | BLOQUEADA | Validar cérebro real em nuvem | DEC-001 + modelos/chave | 2h/4h/8h |
| INT-002 | BLOQUEADA | Criar missão de Navegador Visual simulada | DEC-001 + reconfirmação do escopo | 3h/6h/10h |
| INT-003 | BLOQUEADA | Conectar Navegador Visual real da VPS | URL + autenticação + autorização | 4h/10h/20h |
| INT-004 | BLOQUEADA | Conectar loja real AeroPartz | plataforma + escopo + credenciais | 6h/14h/30h |
| INT-005 | BLOQUEADA | Conectar WhatsApp Web/Facebook | política + sessão autorizada | 8h/20h/40h |
| TEST-001 | BLOQUEADA | Regressão de confiabilidade e jornadas | REL/SCH/ERR concluídas | 3h/6h/12h |
| DEP-001 | BLOQUEADA | Preparar e publicar destino | autorização + infraestrutura + testes | 3h/8h/20h |

Estimativas são esforço ativo de uma IA/agente de desenvolvimento com ambiente disponível; não incluem espera por decisão,
credencial, revisão humana, serviço externo ou janela de implantação.

## 5. Ordem sugerida após autorização

### Marco M0 — documentação aceita

Entrada: dez entregáveis presentes e consistentes. Saída: operador resolve `DEC-001` e `SRC-001`.

### Marco M1 — núcleo confiável

1. `REL-001` revisão atômica.
2. `REL-002` proposta atômica (pode ocorrer em paralelo se reservar arquivos distintos; ambos tocam orchestrator).
3. `SCH-001` briefing gerenciado.
4. `REL-003` jobs duráveis, se o operador exigir retomada automática.
5. `ERR-001` estados de erro.
6. `OBS-001` logs sanitizados.

Saída: sem duplicidade conhecida, reinício tratado e indisponibilidade visível.

### Marco M2 — experiência verificável

1. `ACC-001` desktop/mobile/teclado.
2. `TEST-001` regressão completa e casos negativos.
3. `DB-005` ensaio de backup/restauração em destino isolado.

Saída: requisitos internos aceitos sem integração externa real.

### Marco M3 — integrações opcionais

- `INT-001` pode ser ativada sem bloquear o modo simulado.
- `INT-002` só após o operador revogar explicitamente a pausa de implementação; deve rotular tudo como simulado.
- `INT-003`, `INT-004`, `INT-005` exigem acessos e efeitos externos autorizados individualmente.

### Marco M4 — destino

`DEP-001` somente após M1/M2, decisões de segurança, backup e autorização explícita para publicar.

## 6. Paralelismo e conflitos

| Frentes | Podem paralelizar? | Condição/conflito |
|---|---|---|
| REL-001 e REL-002 | parcialmente | ambas podem tocar `backend/lib/orchestrator.py`; reservar trechos/commits separados |
| SCH-001 e ERR-001 | sim | backend scheduler versus componentes frontend |
| ACC-001 e ERR-001 | parcialmente | ambas podem tocar as mesmas páginas; dividir por rota |
| INT-002 e INT-003 | não recomendado | definem o mesmo contrato do Navegador Visual |
| INT-004 e INT-005 | sim | integrações e credenciais distintas |
| TEST-001 e qualquer implementação | não | validar árvore congelada |
| DEP-001 e implementação | não | publicar somente commit aceito |

## 7. Cenários sem datas fictícias

### Cenário A — permanecer simulado

Executar M1 e M2; manter INT-001..005 bloqueadas. Entrega um QG de demonstração/teste confiável sem efeitos externos.

### Cenário B — IA real, canais ainda simulados

Cenário A + INT-001. Exige chave segura e aceite de custo/uso, sem conectar WhatsApp, loja ou navegador.

### Cenário C — operação integrada

Cenário B + integrações autorizadas, política de dados, backup/restauração e DEP-001.
É o cenário de maior incerteza e não tem prazo responsável sem acessos e contratos das plataformas.

### Cenário D — recuperação de legado

Interromper evolução destrutiva, executar DB-005 e o plano de restauração isolado. Sem backup, retornar ao Cenário A/B
com banco vazio funcional; não fabricar dados antigos.

## 8. Regra de replanejamento

1. Nunca reutilizar ID para outro objetivo.
2. Alterar estado e registrar evidência; não apagar histórico.
3. Se escopo mudar, criar novo ID e marcar o anterior `NAO_APLICAVEL` ou `BLOQUEADA` com motivo.
4. Atualizar primeiro `microtarefas.json`, depois este arquivo e a matriz CSV.
5. Se resultado de execução for incerto, marcar `EM_VALIDACAO`, reconciliar banco/efeitos e só então repetir.
