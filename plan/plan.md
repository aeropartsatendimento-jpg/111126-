# Estados de erro e recuperação do QG do Zero

O QG continuará utilizável quando o servidor ou uma consulta estiver indisponível, sem transformar uma falha parcial em página vazia.
Cada área deixará claro se está carregando, realmente vazia, temporariamente offline ou exibindo informação antiga.

## Para quem é

- Para o Chefe, que precisa entender rapidamente se o QG está sem dados ou apenas sem conexão.
- Para o uso cotidiano da operação AeroPartz, onde projetos, tarefas, loja, canais e mensagens não podem parecer atualizados quando não estão.

## Recursos principais e experiência

- Manter menu, títulos, ações estáticas e estrutura de cada página visíveis mesmo sem resposta do servidor.
- Mostrar carregamento somente na região que depende de dados.
- Diferenciar claramente quatro estados: carregando, vazio de verdade, indisponível e informação antiga.
- Exibir uma ação “Tentar novamente” em cada região com falha.
- Indicar quando a tela conserva dados anteriores após uma tentativa de atualização malsucedida.
- Remover o aviso automaticamente quando a conexão voltar e os dados forem atualizados.
- Preservar mensagens de erro curtas, localizadas e disponíveis em português e inglês.
- Manter falhas de salvamento separadas das falhas de leitura, sem esconder o conteúdo que ainda pode ser consultado.

## Fluxo do usuário

1. O Chefe abre qualquer área do QG e vê imediatamente a estrutura normal da página.
2. Enquanto os dados chegam, apenas o painel correspondente apresenta um estado de carregamento.
3. Se a consulta funcionar sem registros, o painel informa que ainda não há conteúdo.
4. Se o servidor falhar, o painel informa indisponibilidade e oferece “Tentar novamente”.
5. Se já houver dados na tela e uma atualização falhar, eles permanecem visíveis com indicação explícita de que podem estar antigos.
6. Ao tentar novamente ou quando a atualização automática funcionar, o painel retorna ao estado normal sem recarregar a página inteira.

## Sensação visual e de uso

- Aparência coerente com o QG atual, sem redesenho geral.
- Avisos compactos dentro de cada cartão ou área afetada, sem telas de erro dominantes.
- Cores e ícones distinguem atenção, indisponibilidade e recuperação sem depender somente de cor.
- Botões de nova tentativa claros, acessíveis por teclado e sem bloquear outras áreas disponíveis.
- Transições discretas entre carregamento, falha e recuperação.

## Fases de implementação

### Fase 1 — MVP, construída agora

- Aplicar os quatro estados nas áreas principais do Cockpit e nas páginas Sala, Projetos, Tarefas, Linha Direta, Navegador, Loja, Canais, Universo e Memória.
- Adicionar nova tentativa localizada e recuperação sem recarregar a aplicação.
- Marcar dados preservados como antigos quando uma atualização falhar.
- Manter navegação e conteúdo estático utilizáveis durante indisponibilidade.

### Fase 2 — Recuperação de ações

- Padronizar mensagens e opções de recuperação para criação, edição, aprovação e envio.
- Preservar entradas digitadas quando uma ação falhar.
- Orientar o usuário quando repetir uma ação puder gerar duplicidade.

### Fase 3 — Diagnóstico operacional

- Exibir um resumo simples da saúde das áreas essenciais do QG.
- Registrar horário da última atualização bem-sucedida por área.
- Oferecer histórico curto de indisponibilidades relevantes sem expor detalhes técnicos.

## Premissas

- A fase 1 será “Erros e recuperação”, seguindo a próxima prioridade registrada no cronograma.
- O acesso continuará aberto, sem tela de login.
- Nenhuma integração externa será ativada nesta fase.
- O visual, a navegação, os idiomas português/inglês e os temas claro/escuro atuais serão preservados.
- Dados antigos poderão continuar visíveis, mas sempre identificados como potencialmente desatualizados.
- Uma falha em um painel não bloqueará painéis independentes na mesma página.
- A fase 1 não adicionará um painel técnico de monitoramento; isso fica reservado para a fase 3.
- A fase 1 não alterará as regras de missões, briefing, revisões, canais ou Navegador Visual.