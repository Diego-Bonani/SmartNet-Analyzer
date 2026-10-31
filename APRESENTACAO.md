# Roteiro de apresentação (15 minutos) e preparação para complexidade

Notação: **V** = número de vértices (bairros), **E** = número de arestas (vias).

## Roteiro sugerido

| Tempo | O que mostrar | Quem fala |
|---|---|---|
| 0:00–1:00 | Problema (cidade como grafo) e visão geral da interface | |
| 1:00–3:00 | Entrada de dados: carregar o grafo do enunciado, mostrar direcionado/ponderado, mostrar um erro de entrada | |
| 3:00–4:30 | Estrutura na memória: mostrar o painel da lista de adjacência e explicar o código de `graph.js` | |
| 4:30–6:00 | DFS e BFS no grafo do enunciado | |
| 6:00–8:00 | Dijkstra (origem O, rota até T = 13) | |
| 8:00–9:30 | Kruskal (custo 20) | |
| 9:30–12:00 | **Complexidade** e por que lista de adjacência | |
| 12:00–13:30 | Grafo inédito do professor: apagar, digitar o novo e rodar os quatro | |
| 13:30–14:30 | Casos de borda (peso negativo, grafo desconexo, direcionado) e encerramento | |

Dica: pratique a digitação rápida do grafo inédito. Use a caixa de texto (uma aresta por linha) em vez do formulário manual.

## Por que lista de adjacência para este cenário

Uma cidade real tem **muitos bairros e poucas vias por bairro**: cada ponto se liga a poucos vizinhos. É um grafo **esparso** (E muito menor que V²).

| | Lista de adjacência | Matriz de adjacência |
|---|---|---|
| Memória | O(V + E) | O(V²) |
| Percorrer vizinhos de um vértice | O(grau) | O(V) |
| Verificar se existe aresta u–v | O(grau de u) | O(1) |
| Varrer todas as arestas | O(V + E) | O(V²) |

Os quatro algoritmos passam o tempo inteiro "olhando os vizinhos de um vértice", que é exatamente a operação em que a lista ganha. Com matriz, DFS e BFS custariam O(V²) mesmo em uma cidade com poucas vias. A única vantagem da matriz (testar uma aresta em O(1)) não é usada por nenhum dos algoritmos. Para 10 mil bairros, a matriz precisaria de 100 milhões de células, contra algumas dezenas de milhares de entradas na lista.

## Complexidade de cada algoritmo (com lista de adjacência)

**DFS: O(V + E).** Cada vértice entra na pilha uma vez e cada aresta é examinada uma vez (duas, no não-direcionado). Memória extra O(V). Implementação iterativa, para não estourar a recursão em grafos grandes.

**BFS: O(V + E).** Cada vértice entra e sai da fila uma única vez (operações O(1) na fila feita à mão) e cada lista de adjacência é percorrida uma vez. Memória extra O(V).

**Dijkstra: O((V + E) log V).** Com heap mínimo binário, cada relaxamento que melhora uma distância faz um `push` de O(log V); no pior caso há E inserções. Usamos "lazy deletion": entradas antigas no heap são ignoradas ao sair. Com matriz e busca linear do mínimo seria O(V²), que só compensa em grafos densos. Exige pesos não negativos: com peso negativo, um vértice "fechado" poderia ter distância melhor depois, e a garantia gulosa se perde.

**Kruskal: O(E log E).** Ordenar as E arestas (merge sort) custa O(E log E). Depois, cada aresta faz até duas operações `find` e uma `union` no Union-Find com compressão de caminho e união por tamanho, que custam O(α(V)) amortizado (α é a inversa de Ackermann, praticamente constante). Como E ≤ V², log E = O(log V), então também vale O(E log V). O algoritmo para ao conseguir V − 1 arestas.

## Perguntas que o professor pode fazer

1. **Qual a diferença entre DFS e BFS na prática?** DFS usa pilha e aprofunda; serve para conectividade, ciclos e becos sem saída. BFS usa fila e avança por níveis; dá o menor número de saltos em grafo sem peso.
2. **Por que o BFS não resolve o caminho mais curto com pesos?** Ele minimiza o número de arestas, não a soma dos pesos. Um caminho com 3 arestas leves pode ser melhor que um de 1 aresta pesada.
3. **Por que Dijkstra não aceita peso negativo?** Ele assume que, ao fechar um vértice, sua distância é definitiva. Com peso negativo, um caminho mais longo ainda poderia reduzir a distância.
4. **O que é o Union-Find e por que o Kruskal precisa dele?** Ele responde em quase O(1) se dois vértices já estão na mesma componente. Sem ele, detectar ciclo a cada aresta custaria O(V).
5. **Kruskal ou Prim?** Kruskal é natural quando as arestas já estão em lista e o grafo é esparso. Prim com heap tem a mesma ordem O(E log V). Escolhemos Kruskal pela clareza do passo a passo.
6. **A AGM é única?** Só se os pesos forem todos distintos. Com empates (como os vários pesos 4 do enunciado), pode haver mais de uma árvore, todas com o mesmo custo total. No nosso programa os empates são resolvidos em ordem alfabética dos vértices, então o resultado é sempre o mesmo, qualquer que seja a ordem de digitação.
7. **E se o grafo for desconexo?** DFS/BFS alcançam só a componente da origem (o DFS continua em outras raízes para contá-las); Dijkstra devolve ∞ para o que não alcança; Kruskal devolve uma floresta.
8. **Como o sistema trata grafo direcionado?** A lista guarda a aresta só em `adj[u]`. DFS, BFS e Dijkstra respeitam a direção; o Kruskal trata como bidirecional, porque fibra ótica não tem sentido.

## Conferência rápida do grafo do enunciado

- Dijkstra (origem O): O=0, A=2, B=4, C=4, E=7, D=8, T=13, F=14.
- Kruskal: custo 20, 7 arestas (B–C, A–B, O–A, B–E, F–T, B–D, D–T).
- DFS (origem O, vizinhos em ordem alfabética): O, A, B, C, E, D, T, F.
- BFS (origem O, vizinhos na ordem digitada): O, A, B, C, D, F, E, T. Níveis: A, B, C = 1; D, E, F = 2; T = 3.
