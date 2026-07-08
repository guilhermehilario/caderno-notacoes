# 🧪 Testes Possíveis — Revisa Aula

## 1. Salvamento silencioso de folha
- Acesse uma folha e escreva texto no editor.
- Verifique que o texto é salvo em background sem reconstruir a tela inteira.
- Confirme que o indicador de status no canto muda para "Salvando..." e depois para "Salvo".

## 2. Salvar título da folha
- Edite o título da folha e espere o debounce.
- Confirme que a alteração persiste no backend e a lista lateral atualiza sem reiniciar a view.

## 3. Geração de resumo
- Clique em gerar resumo.
- Verifique que o painel atualiza apenas o resumo sem causar re-render intenso da tela inteira.

## 4. Revisão de flashcards
- Entre na rota de estudo de um notebook.
- Revele a resposta e selecione uma nota de dificuldade.
- Confirme que o progresso avança e o backend recebe o score.
- Verifique que a tela não reinicia nem volta para o primeiro card.

## 5. Recarregamento e persistência
- Recarregue a página após editar uma folha ou responder um card.
- Confirme que os dados ainda estão persistidos.

## 6. Cenário de erro de rede
- Simule falha na API ao salvar ou submeter score.
- Verifique que a interface exibe erro de forma discreta e não quebra a navegação.

## 7. Overflow horizontal de texto
- No Gerenciar Tags, crie uma tag com nome muito longo (ex: "Esta é uma tag com um nome extremamente longo para testar o overflow").
- Verifique que o nome é truncado com reticências e não estoura o card.
- Confirme que os botões de editar/excluir permanecem visíveis e funcionais.

## 8. Scroll lateral no EditorView
- Acesse o editor de uma folha.
- Verifique que NÃO há barra de scroll horizontal visível, mesmo com conteúdo vazio.
- Digite um parágrafo longo sem espaços (ex: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").
- Confirme que o texto quebra dentro do container e não cria scroll lateral.
- Verifique que o painel de IA (AISidebar) também não tem scroll lateral.

## 9. Espaçamento do editor
- Acesse o editor de uma folha.
- Verifique que o container do editor + IA ocupa pelo menos 750px de altura (mobile) ou 90vh (desktop).
- Verifique que a última linha do texto tem um pequeno espaçamento (pb-1.5) antes da borda inferior.
- Confirme que nenhum texto é cortado na borda inferior do container.

## 10. Toast de erro
- Force um erro na API (ex: pare o backend).
- Realize uma ação que dispare erro no auto-save do editor.
- Verifique que um toast vermelho aparece no canto inferior direito com a mensagem de erro.
- Confirme que o toast desaparece após ~4 segundos.
- Clique no X do toast para fechar manualmente.

## 11. Toast em ações de gerenciamento
- No Gerenciar Tags, tente criar uma tag com nome vazio.
- Verifique que o toast de erro aparece.
- Na Lixeira, tente restaurar/excluir item (com backend offline).
- Verifique o toast de erro.
- No Dashboard, tente criar caderno com backend offline.
- Verifique o toast de erro.

## 12. Auto-save sem erro 400
- Abra uma folha existente.
- Espere o sync inicial completar.
- Verifique que NENHUM request 400 aparece no console.
- Edite o conteúdo e confirme que o auto-save funciona normalmente (status "Salvo").
