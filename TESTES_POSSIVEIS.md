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
