# Continuidade para a próxima IA

## 1. Objetivo e limites

O TESTE-SALA contém o código do **QG do Zero**, painel pessoal de missões/agentes para a operação AeroPartz.
Esta etapa foi redefinida pelo arquivo remoto `LEIA ME` como **somente documentação e planejamento**.

Não implementar, instalar, migrar, publicar, criar agenda, consumir API paga, enviar mensagem externa ou usar recursos
do ZERO/VPS até autorização explícita do operador. O ZERO operacional é separado e permanece pausado.

## 2. Base e fontes

- Workspace examinado: `/app`.
- Repositório: `https://github.com/aeropartzz-eng/TESTE-SALA`.
- Branch local: `main`.
- HEAD local durante a análise: `65ec012858e959fd3ffd65410a998e6ae260f296`.
- Instrução remota: commit `c3018d3d945a3cd0841dedb8c4cf3e12324e1149`, arquivo `LEIA ME`.
- Divergência: o `LEIA ME` remoto não estava presente no checkout local.
- Alteração não rastreada observada no início: `.emergent/cron/`; preservar.
- Data documentada na instrução: 11/11/2026.

Classificações usadas: `VERIFICADO NO CODIGO`, `VERIFICADO EM EXECUCAO ISOLADA`, `DOCUMENTADO`, `HIPOTESE`,
`DECISAO PENDENTE`.

## 3. Resumo arquitetural

- Frontend React 19 + TypeScript/Vite/Tailwind/shadcn; rotas em `frontend/src/App.tsx`.
- FastAPI assíncrono; todos os recursos sob `/api`; routers em `backend/routers/`.
- MongoDB via handle único em `backend/lib/db.py`; IDs públicos string, não ObjectId.
- TanStack Query e typed fetch relativo em `frontend/src/lib/api.ts`.
- LLM opcional por `emergentintegrations`; sem chave usa fallback **SIMULADO**.
- Busca DuckDuckGo tenta dados reais e retorna lista vazia em falha.
- Voz usa Web Speech API do navegador.
- Jobs e scheduler vivem no processo; não são duráveis.
- MCP stateless protegido por `QG_MCP_TOKEN`; estado atual do secret não foi aberto.

Diagrama e detalhes: `ARQUITETURA_E_DEPENDENCIAS.md`.

## 4. Mapa rápido de diretórios

| Área | Caminho |
|---|---|
| bootstrap API | `backend/server.py` |
| contratos | `backend/models/models.py` ↔ `frontend/src/lib/types.ts` |
| domínio HTTP | `backend/routers/` |
| orquestração | `backend/lib/orchestrator.py` |
| Mongo/índices | `backend/lib/db.py` |
| seed | `backend/seed.py` |
| telas | `frontend/src/pages/` |
| shell/nav | `frontend/src/components/AppShell.tsx` |
| API frontend | `frontend/src/lib/api.ts` |
| especificação viva | `memory/SPEC.md` |
| cronograma anterior | `memory/CRONOGRAMA.md` |
| pacote desta análise | `docs/teste-sala-planejamento/` |

## 5. Ambiente e variáveis

Documentar somente nomes:

- obrigatórias backend: `MONGO_URL`, `DB_NAME`;
- configuração: `CORS_ORIGINS`, `APP_TZ`;
- opcionais/integração: `EMERGENT_LLM_KEY`, `QG_MCP_TOKEN`;
- testes: `BACKEND_URL`.

Não abrir nem copiar valores. Em novo destino, confirmar presença pelo gerenciador seguro.

## 6. Estado funcional conhecido

### Verificado em execução isolada antes desta documentação

`test_reports/iteration_2.json`: 15/15 checks verdes, sem falhas/bloqueios. Cobriu acesso aberto, missão, revisão
sequencial, Sala, briefing manual, projetos, loja e canais/busca.

### Implementado, mas com lacunas

- revisão e execução de proposta não são atômicas;
- background/scheduler não sobrevivem com garantia a reinício;
- erros de API podem parecer lista vazia;
- mobile/teclado/acessibilidade não fechados;
- MCP atual não foi revalidado nesta etapa;
- voz real não foi testada com microfone/alto-falante;
- sem backup/restauração e política de retenção.

### Simulado/ausente

- cérebro sem chave: **SIMULADO**;
- loja inicial: quatro itens sintéticos `is_sample=true`;
- WhatsApp, Facebook, Navegador Visual e MCP externo da VPS: placeholders/ausentes;
- Navegador Visual não controla browser nem contas.

## 7. Estado do banco

- Esquema no código: documentado em `MAPA_BANCO_DE_DADOS.md`.
- Preview anterior: seed verificado; produção não examinada.
- Banco vazio: reconstruível por índices + `seed.py`, somente em ambiente confirmado como isolado.
- Dados antigos: recuperação bloqueada; nenhum backup encontrado por metadados.
- Migrations: não existe framework versionado.

## 8. Comandos e estado de verificação

- Comandos de execução/teste estão em `PLANO_TESTES_E_ACEITE.md`.
- Nenhum foi reexecutado nesta etapa documental.
- Não executar `seed.py`, pytest, app ou container antes de confirmar que URLs/banco são isolados.
- O relatório 2 é evidência histórica, não permissão para mutar o ambiente novamente.

## 9. Entregáveis desta etapa

1. `INVENTARIO_PROJETO.md`
2. `ARQUITETURA_E_DEPENDENCIAS.md`
3. `MAPA_BANCO_DE_DADOS.md`
4. `PLANO_RECONSTRUCAO_E_RESTAURACAO_DB.md`
5. `CRONOGRAMA_MICROTAREFAS.md`
6. `microtarefas.json` — fonte estruturada
7. `MATRIZ_RASTREABILIDADE.csv`
8. `PLANO_TESTES_E_ACEITE.md`
9. `CONTINUIDADE_IA.md`
10. `DECISOES_E_BLOQUEIOS.md`

## 10. Como atualizar a continuidade

Após cada entrega futura:

1. atualizar o item em `microtarefas.json`, mantendo o ID;
2. espelhar estado/evidência em `CRONOGRAMA_MICROTAREFAS.md`;
3. atualizar linha(s) da matriz CSV;
4. registrar decisão/bloqueio novo sem apagar o anterior;
5. atualizar `memory/SPEC.md` se comportamento/modelo mudar;
6. registrar comando, ambiente, efeito e saída no plano/relatório de testes;
7. atualizar esta seção com última tarefa concluída e próxima apta.

Resultado incerto deve ficar `EM_VALIDACAO`, nunca `CONCLUIDA`.

## 11. Última tarefa concluída e próxima apta

- Última tarefa efetivamente concluída: `DOC-005`, pacote documental de continuidade.
- Evidência: dez arquivos em `docs/teste-sala-planejamento/` e validação estrutural local.
- Próxima ação: operador resolver `DEC-001` (autorizar ou manter pausa).
- Próxima ação técnica de repositório: `SRC-001`, após escolher estratégia Git.
- Primeira correção recomendada após autorização: `REL-001`.
- Pedido de Navegador Visual simulado está mapeado em `INT-002`, mas **não implementado**.

## 12. Reaproveitamento e faltas

### Pode ser reaproveitado

- stack e estrutura atuais;
- modelos/rotas/telas dos fluxos core;
- seed idempotente de referência;
- testes existentes e checks persistidos;
- fallback simulado;
- índices atuais e typed fetch;
- servidor MCP e busca degradável, sujeitos a revalidação.

### Falta implementar ou provar

- confiabilidade concorrente/reinício;
- agenda durável;
- estados de erro;
- mobile/a11y;
- backup/restore;
- observabilidade;
- integrações reais;
- política de acesso/dados para destino.

### O que impede banco e legado

- reconstrução vazia: apenas confirmação de ambiente/versões;
- recuperação antiga: ausência de backup verificável;
- migração de destino: sem infraestrutura, política e autorização.

## 13. Arquivos em andamento e reservas

Nenhum arquivo de aplicação está reservado nesta etapa. Não tocar em `.emergent/cron/` sem identificar sua origem.
Se outra IA iniciar uma microtarefa, registrar aqui os arquivos reservados para evitar conflito.

## 14. Prompt curto para a próxima IA

> Trabalhe em `/app`, repositório TESTE-SALA. Leia primeiro `README.md`, `TEMPLATE.md`, o `LEIA ME` do commit
> `c3018d3d945a3cd0841dedb8c4cf3e12324e1149` e os dez arquivos de `docs/teste-sala-planejamento/`.
> `microtarefas.json` é a fonte do cronograma. Preserve `.emergent/cron/` e todo trabalho existente. A etapa atual
> proíbe implementação; confirme `DEC-001` antes de alterar código. Não abra segredos nem use ZERO/VPS/produção.
> Após autorização, a primeira correção recomendada é `REL-001`; o Navegador Visual simulado é `INT-002`.
