# SmartNet Analyzer

Ferramenta web para mapear a infraestrutura de uma cidade inteligente como um grafo e executar análises de conectividade e roteamento (DFS, BFS, Dijkstra e Kruskal).

## Identificação

| Item | Informação |
|---|---|
| Curso | Engenharia de Computação/Software — Ibmec |
| Disciplina | Análise e Complexidade de Algoritmos (IBM3121) — 6º período |
| Professor | Cassius Figueiredo |
| Semestre | 2026.2 |

**Integrantes do grupo**

| Nome | Matrícula |
|---|---|
| _(preencher)_ | _(preencher)_ |
| _(preencher)_ | _(preencher)_ |
| _(preencher)_ | _(preencher)_ |

## Como executar

Não há nada para instalar: a aplicação é HTML + JavaScript puro, sem bibliotecas externas e sem internet.

1. Baixe ou clone o repositório.
2. Dê dois cliques em `index.html` (ou abra o arquivo no Chrome, Edge ou Firefox).
3. Pronto. A interface abre na hora.

Para rodar os testes automáticos dos algoritmos (opcional, precisa de Node.js 18+):

```bash
node test/test.js
```

## Como usar

1. **Mapeamento da cidade.** Marque se o grafo é *Direcionado* e/ou *Ponderado*. Digite as arestas na caixa de texto, uma por linha, e clique em **Carregar grafo**.
   - `O A 2` → aresta entre O e A com peso 2
   - `E` → vértice isolado (sem arestas)
   - Linhas começando com `#` são comentários
   - Em grafo sem peso, use apenas `A B`
   - Também é possível **abrir um arquivo .txt** no mesmo formato, adicionar arestas pelo formulário manual ou escolher um dos **exemplos prontos** (o primeiro é o grafo do enunciado).
2. **Mapa da cidade.** O grafo é desenhado ao lado. Ao executar um algoritmo, as arestas do resultado ficam destacadas. Os pesos são posicionados sobre as arestas de forma a não se sobrepor; em grafos densos, os que não couberem aparecem só ao **passar o mouse sobre a aresta** (uma dica mostra "origem — destino · peso") e a legenda avisa quantos ficaram assim.
3. **Estrutura na memória.** O painel mostra a lista de adjacência exatamente como está armazenada (`vértice → (destino, peso) → ... → null`).
4. **Módulo de inteligência.** Escolha o vértice de origem e clique em **DFS**, **BFS**, **Dijkstra** ou **Kruskal**. Os resultados aparecem em texto e tabelas.
5. Pode apagar o grafo, inserir outro e executar quantos algoritmos quiser. O botão **Finalizar aplicação** (canto superior direito) encerra a sessão.

## O que cada algoritmo mostra

| Algoritmo | Uso na cidade | Resultado exibido |
|---|---|---|
| DFS | Auditoria de rotas e conectividade | Ordem de visita, árvore DFS em texto, tempos de descoberta/término, conectividade, becos sem saída, vértices isolados e ciclos |
| BFS | Propagação de alertas | Fila de execução, passo a passo da fila, níveis e menor caminho em número de saltos |
| Dijkstra | Rota de veículos de emergência | Tabela de distâncias mínimas a partir da origem, predecessores e rota completa até cada bairro |
| Kruskal | Rede de fibra ótica de menor custo | Arestas escolhidas, custo total e passo a passo (aceita / rejeitada por ciclo) |

## Decisões de projeto

- **Estrutura de dados:** lista de adjacência, implementada do zero em `js/graph.js` (`adj[i]` = lista de `{to, weight}`).
- **Estruturas auxiliares também feitas à mão:** fila (BFS), heap mínimo (Dijkstra), Union-Find (Kruskal) e merge sort (ordenação das arestas no Kruskal). Nenhuma biblioteca de grafos é usada.
- **Desempate em ordem alfabética:** quando há mais de uma escolha possível, os algoritmos preferem o vértice de menor nome (números em ordem natural: 2 antes de 10; maiúsculas e minúsculas são tratadas igual). Assim o resultado não depende da ordem em que as arestas foram digitadas.
  - **DFS:** entre os vizinhos, visita primeiro o de menor nome; ao terminar, recomeça nos vértices não visitados também em ordem alfabética.
  - **BFS:** enfileira os vizinhos em ordem alfabética.
  - **Dijkstra:** entre vértices com a mesma distância, fecha primeiro o de menor nome; entre caminhos de mesmo custo até um vértice, escolhe o predecessor de menor nome.
  - **Kruskal:** arestas de mesmo peso são consideradas em ordem alfabética (primeiro pelo menor nome da aresta, depois pelo maior).
  - A lista de adjacência exibida na tela continua na ordem digitada; só a ordem de visita dos algoritmos é alfabética.
- **Grafo não-direcionado:** cada aresta é gravada nas duas listas de adjacência.
- **Grafo sem peso:** todas as arestas valem 1.
- **BFS:** conta saltos e ignora pesos (o menor custo ponderado é papel do Dijkstra).
- **Dijkstra:** recusa pesos negativos, com mensagem clara.
- **Kruskal:** em grafo direcionado, trata as arestas como bidirecionais (a fibra liga os dois sentidos). Em grafo desconexo, devolve a floresta geradora mínima e avisa.
- **Validação:** a entrada acusa linha e motivo do erro (peso faltando, laço, aresta duplicada, peso não numérico).

## Resultado esperado no grafo do enunciado (origem O)

- **Dijkstra:** O=0, A=2, B=4, C=4, E=7, D=8, T=13, F=14. Rota até T: O → A → B → D → T.
- **Kruskal:** custo total **20**, com as arestas B–C (1), A–B (2), O–A (2), B–E (3), F–T (3), B–D (4) e D–T (5).

## Estrutura do repositório

```
index.html          interface
style.css           estilos
js/graph.js         lista de adjacência + fila, heap, union-find, merge sort
js/algorithms.js    DFS, BFS, Dijkstra, Kruskal
js/app.js           ligação da interface com os algoritmos
js/examples.js      grafos de exemplo embutidos
exemplos/           os mesmos exemplos em .txt (para o botão "Abrir arquivo")
test/test.js        testes automáticos (node test/test.js)
APRESENTACAO.md     roteiro e perguntas sobre complexidade
```
