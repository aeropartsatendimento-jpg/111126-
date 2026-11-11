# Plano de reconstrução e restauração do banco

## 1. Distinção obrigatória

- **Reconstrução:** criar um banco vazio compatível e inserir apenas dados de referência sintéticos.
- **Restauração:** recuperar registros antigos a partir de backup íntegro e autorizado.
- Código e seed permitem reconstrução; não comprovam recuperação de dados antigos. **VERIFICADO NO CODIGO**.
- Nenhum backup/dump/exportação foi localizado por metadados no workspace. **VERIFICADO NO CODIGO**.

Nenhum procedimento abaixo foi executado nesta etapa documental.

## 2. Caminho A — banco vazio funcional

### Pré-requisitos

1. MongoDB compatível com o driver instalado; versão exata do destino deve ser confirmada.
2. Backend Python e dependências conforme documentação canônica do repositório.
3. Variáveis `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`; opcionais `EMERGENT_LLM_KEY`, `QG_MCP_TOKEN`, `APP_TZ`.
4. Banco isolado sem apontar para produção.
5. Egress externo somente se busca/LLM forem testados e houver autorização.

### Ordem segura

| Ordem | Comando/ação | Diretório | Efeito | Estado |
|---:|---|---|---|---|
| 1 | revisar variáveis por nome e destino | `backend/` | evita conectar em banco errado | PLANEJADO |
| 2 | importar backend (`python -c 'import server'`) | `backend/` | carrega app; pode inicializar cliente lazy, sem seed | PLANEJADO |
| 3 | iniciar backend isolado | `backend/` | startup chama `ensure_indexes()` | PLANEJADO |
| 4 | executar `python seed.py` | `backend/` | upsert de agentes/canais/projetos; insere contas/store somente se vazios | PLANEJADO |
| 5 | consultar endpoints de referência | qualquer | valida contratos e contagens | PLANEJADO |
| 6 | executar testes contra o banco isolado | raiz/backend/frontend | cria dados sintéticos temporários | PLANEJADO |

### Dados de referência indispensáveis

- 5 agentes com `key` estável.
- 5 canais com `key` estável.
- 2 projetos seed identificáveis.
- 5 contas `unverified`, somente quando a coleção estiver vazia.
- 4 itens `is_sample=true`, somente quando a coleção estiver vazia.

O seed é repetível para agentes/canais, mas projetos usam “find then insert” e contas/loja usam contagem global.
Não deve rodar concorrentemente. **VERIFICADO NO CODIGO**.

### Primeiro administrador

**NÃO APLICÁVEL** ao estado atual: não existe autenticação nem papel de administrador. Se autenticação for reintroduzida,
o bootstrap deverá usar fluxo gerenciado e nunca senha fixa/publicada.

### Validação mínima do banco vazio

1. Chaves de agente e canal exatamente conforme seed.
2. Índices de `backend/lib/db.py` presentes e sem erro de conflito.
3. Missão válida cria tarefas e mensagens; missão curta retorna 422.
4. Revisão válida muda estado; segunda revisão retorna 409.
5. CRUD de loja respeita combinações kind/status.
6. Briefing manual persiste `day` em America/Sao_Paulo.
7. Busca externa pode retornar `[]`, mas não derruba a API.

## 3. Caminho B — recuperação de dados antigos

### Bloqueio atual

Não há evidência de backup no repositório, nem origem/data/checksum/versão informados. Portanto a recuperação é
**BLOQUEADA**. A condição de desbloqueio é o operador indicar um artefato sob custódia, sem enviá-lo para documentação pública.

### Metadados necessários antes de abrir qualquer backup

- origem e responsável;
- data/hora e timezone;
- MongoDB/FCV de origem;
- formato (`mongodump`, snapshot de volume ou exportação);
- tamanho, checksum e criptografia;
- banco/coleções incluídos;
- presença de anexos externos (nenhum sistema de arquivos foi identificado no app atual);
- janela de dados e alterações posteriores ao backup.

### Ensaio isolado de restauração

1. Criar instância Mongo separada e rede restrita.
2. Validar checksum antes da restauração.
3. Restaurar sem `--drop` até compreender conflitos; nunca apontar primeiro para o banco ativo.
4. Listar coleções, contagens e índices; não exportar documentos pessoais para logs.
5. Comparar amostra sintética/estatística com modelos atuais.
6. Normalizar datas e detectar `_id`/ObjectId exposto versus `id` string esperado.
7. Identificar documentos sem campos obrigatórios e estados desconhecidos.
8. Aplicar transformações em cópia, com script repetível e relatório de rejeitados.
9. Executar jornadas essenciais contra a cópia.
10. Produzir parecer: aceitar, corrigir progressivamente ou rejeitar o backup.

### Reconciliação

- Definir cutoff do backup e fonte de verdade para dados posteriores.
- Fazer merge por identificadores estáveis; não usar título/nome como chave sem prova.
- Reaplicar índices somente depois de detectar duplicidades.
- Registrar contagens antes/depois por coleção e exceções, sem conteúdo sensível.

## 4. Evolução de esquema

1. Preferir campos aditivos com default.
2. Implantar leitores compatíveis antes de preencher dados antigos.
3. Transformar em lotes pequenos, idempotentes e reiniciáveis.
4. Guardar checkpoint fora do documento de negócio ou em coleção de migrations.
5. Só tornar índice único após relatório de duplicidades igual a zero.
6. Não desfazer transformação que descarte informação; restaurar backup ou aplicar correção progressiva.

O projeto não possui framework de migrations. Criá-lo é microtarefa futura apenas quando houver primeira mudança real
de schema ou restauração. **VERIFICADO NO CODIGO / PROPOSTO**.

## 5. Backup operacional proposto

Ainda depende de destino, volume, RPO e RTO. Cenário mínimo a decidir:

- snapshot/dump automatizado em armazenamento separado;
- criptografia em trânsito e repouso;
- retenção por gerações;
- checksum e catálogo sem conteúdo sensível;
- teste periódico de restauração em ambiente isolado;
- alerta de falha e responsável definido;
- exclusão segura conforme política.

Nenhuma agenda ou serviço foi ativado por este documento.

## 6. Corte e reversão, quando autorizados

### Entrada

- backup aprovado;
- teste isolado verde;
- janela e responsável definidos;
- critérios de contagem/aceite assinados pelo operador;
- plano de indisponibilidade e DNS/serviço confirmado.

### Corte

1. congelar escritas ou registrar delta;
2. gerar backup final/checksum;
3. aplicar transformação/restauração;
4. validar índices e smoke de leitura antes de liberar escrita;
5. liberar gradualmente e observar erros.

### Reversão

- antes de novas escritas: retornar ao banco anterior;
- após novas escritas: interromper e reconciliar delta; não sobrescrever silenciosamente;
- qualquer diferença de contagem, falha de integridade ou segredo em log é condição de interrupção.

## 7. O que impede cada objetivo

| Objetivo | Situação | Bloqueio |
|---|---|---|
| Reconstruir banco vazio | possível | confirmar versões/destino; executar apenas isolado |
| Recuperar dados antigos | não comprovado | backup inexistente/não informado |
| Garantir continuidade | não atendido | política, rotina e ensaio de restauração ausentes |
| Migrar para destino | não autorizado | infraestrutura, secrets e publicação não definidos |
