# Roadmap

Este documento descreve as funcionalidades implementadas no projeto Game Logs Analyzer e como elas atendem aos requisitos das histórias de usuário definidas.

## História 1

**Descrição:** Eu como administrador do jogo, quero ter a estatística por jogo, do total de mortes, de mortes por causa e de mortes causadas pelo `<world>` para entender a dificuldade dos jogadores.

**Endpoint Atendido:** `/logs/game-statistics`

## História 2

**Descrição:** Eu como player, quero ver o ranking de cada partida para saber o vencedor e meu desempenho.

**Critérios de Aceite:**
- Os jogadores começam com zero pontos
- A cada kill o jogador ganha um ponto
- A cada morte pelo mundo o jogador perde um ponto
- É permitido pontuação negativa
- O `<world>` não deve entrar no ranking de jogadores
- Os jogadores podem mudar de nome no meio da partida, mas só o último nome deve ser considerado no ranking

**Endpoint Atendido:** `/logs/ranking/{gameId}`

## História 3

**Descrição:** Eu como administrador do jogo, quero poder consultar as estatísticas de um jogo específico ou de todos os jogos de maneira estruturada por uma API para montar uma visualização para os jogadores.

**Endpoint Atendido:** `/logs/game-statistics/{gameId}`


## Considerações

Para atender as tarefas implementei o seguinte cenario :

- Buscar as informações do [`dados fornecidos`](https://github.com/rubcube/hiring-exercises/blob/master/backend/games.log)
- Salva-las em um arquivo local
- realizar as requisições e iterações no arquivo

Também foi necessario analisar o arquivo para identificar a partida, quando começa e quando termina, depois disso foi preciso mapear as ações realizadas durante a partida e montar os endpoints. 


# O que eu faria se tivesse mais tempo?

- Bom para pensar que a interação é nos logs de uma aplicação, criaria uma estrutura de jobs para usar consumers e publishers, assim conseguiria deixar rodando em segundo plano de tempos em tempos para atualizar o arquivo.
Poderiamos incluir ai o uso de um sqs, sns ...

- Uma outra abordagem seria ler o arquivo e mandar ele para o redis, já que são partidas de um jogo que estão constantemente acontecendo, o arquivo tenderia a crescer, o que ja não faria tanto sentido o uso da abordagem dos jobs
para ter a certeza de que as informações estariam corretas utilizaria uma persistencia nos dados, poderiamos usar algo como noSQL e gravar somente o que nos interessa, como placar, dados da partida e/ou tipo das mortes...

- Na real esse eu deveria fazer junto com a aplicação que é a inclusão de testes unitarios, acredito que para a verificação de existencia do log, seria algo crucial. 

- Aplicaria SOLID mais profundamente, não gosto de deixar muitas funcionalidades a cargo de um service, fica ruim para implementar testes e a manutenção se torna mais "cansativa".
