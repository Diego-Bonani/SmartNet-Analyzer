/**
 * algorithms.js — DFS, BFS, Dijkstra e Kruskal sobre a lista de adjacência.
 *
 * Desempate: sempre que houver mais de uma escolha possível (qual vizinho
 * visitar, qual vértice sai do heap, qual aresta de mesmo peso vem primeiro),
 * o algoritmo prefere a ORDEM ALFABÉTICA dos vértices. Assim o resultado não
 * depende da ordem em que as arestas foram digitadas.
 *
 * Cada função devolve um objeto com os dados já prontos para a interface exibir.
 * V = número de vértices, E = número de arestas.
 */

// No navegador, graph.js é carregado antes e suas classes ficam globais.
// No Node (testes), test/test.js as injeta em globalThis antes de carregar este arquivo.

/* ------------------- ordem alfabética (desempate) ------------------- */

/** Índices dos vértices ordenados alfabeticamente (números em ordem natural: 2 < 10). */
function alphaOrder(g) {
  const idx = [];
  for (let i = 0; i < g.size; i++) idx.push(i);
  return mergeSort(idx, (a, b) => compareLabels(g.labels[a], g.labels[b]) || a - b);
}

/** rank[i] = posição alfabética do vértice i (0 = primeiro). */
function alphaRank(order) {
  const rank = new Array(order.length);
  for (let r = 0; r < order.length; r++) rank[order[r]] = r;
  return rank;
}

/** Cópia da lista de adjacência com os vizinhos em ordem alfabética (a original não muda). */
function sortedAdj(g, rank) {
  return g.adj.map((list) => mergeSort(list, (x, y) => rank[x.to] - rank[y.to]));
}

/* ------------------------------ DFS ------------------------------ */
/**
 * Busca em profundidade (iterativa, com pilha explícita para não estourar a
 * recursão em grafos grandes). Começa em `start`, entre os vizinhos escolhe o
 * primeiro em ordem alfabética e, ao terminar, continua nos vértices ainda não
 * visitados (também em ordem alfabética), formando uma floresta DFS.
 * Complexidade: O(V + E) com lista de adjacência.
 */
function dfs(g, start) {
  const n = g.size;
  const s = g.index[start];
  const byAlpha = alphaOrder(g);
  const nbr = sortedAdj(g, alphaRank(byAlpha));
  const discovery = new Array(n).fill(0);
  const finish = new Array(n).fill(0);
  const parent = new Array(n).fill(-1);
  const state = new Array(n).fill(0); // 0 = branco, 1 = cinza, 2 = preto
  const order = [];
  const treeEdges = [];
  const backEdges = []; // arestas que apontam para um ancestral (indicam ciclo)
  const roots = [];
  let time = 0;

  function explore(root) {
    roots.push(root);
    const stack = [root];
    const next = new Array(n).fill(0); // próximo vizinho a examinar de cada vértice
    state[root] = 1;
    discovery[root] = ++time;
    order.push(root);
    while (stack.length > 0) {
      const u = stack[stack.length - 1];
      if (next[u] < nbr[u].length) {
        const e = nbr[u][next[u]++];
        const v = e.to;
        if (state[v] === 0) {
          parent[v] = u;
          state[v] = 1;
          discovery[v] = ++time;
          order.push(v);
          treeEdges.push({ u, v, w: e.weight });
          stack.push(v);
        } else if (state[v] === 1 && v !== parent[u]) {
          backEdges.push({ u, v });
        }
      } else {
        state[u] = 2;
        finish[u] = ++time;
        stack.pop();
      }
    }
  }

  explore(s);
  const reachableFromStart = order.length;
  for (const i of byAlpha) if (state[i] === 0) explore(i);

  // Vértices sem saída ("becos sem saída")
  const deadEnds = [];
  for (const i of byAlpha) {
    const deg = g.adj[i].length;
    if (g.directed ? deg === 0 : deg === 1) deadEnds.push(i);
  }
  // Vértices sem nenhuma aresta (nem entrando, nem saindo)
  const touched = new Array(n).fill(false);
  for (const e of g.edges) touched[e.u] = touched[e.v] = true;
  const isolated = [];
  for (const i of byAlpha) if (!touched[i]) isolated.push(i);

  return {
    start: s,
    order,
    discovery,
    finish,
    parent,
    treeEdges,
    backEdges,
    roots,
    reachableFromStart,
    connectedFromStart: reachableFromStart === n,
    components: roots.length, // nº de árvores da floresta DFS
    deadEnds,
    isolated,
    hasCycle: backEdges.length > 0,
  };
}

/* ------------------------------ BFS ------------------------------ */
/**
 * Busca em largura a partir de `start`. Usa fila FIFO e enfileira os vizinhos
 * em ordem alfabética. Em grafo sem pesos (ou ignorando-os), o nível de cada
 * vértice é o menor número de saltos até ele.
 * Complexidade: O(V + E).
 */
function bfs(g, start) {
  const n = g.size;
  const s = g.index[start];
  const byAlpha = alphaOrder(g);
  const nbr = sortedAdj(g, alphaRank(byAlpha));
  const level = new Array(n).fill(-1);
  const parent = new Array(n).fill(-1);
  const order = [];
  const treeEdges = [];
  const steps = []; // fotografia da fila a cada passo, para exibir
  const q = new Queue();
  level[s] = 0;
  q.enqueue(s);
  while (q.length > 0) {
    const queueBefore = q.snapshot();
    const u = q.dequeue();
    order.push(u);
    const added = [];
    for (const e of nbr[u]) {
      if (level[e.to] === -1) {
        level[e.to] = level[u] + 1;
        parent[e.to] = u;
        treeEdges.push({ u, v: e.to, w: e.weight });
        q.enqueue(e.to);
        added.push(e.to);
      }
    }
    steps.push({ removed: u, queueBefore, added, queueAfter: q.snapshot() });
  }
  const unreachable = [];
  for (const i of byAlpha) if (level[i] === -1) unreachable.push(i);
  return { start: s, order, level, parent, treeEdges, steps, unreachable };
}

/* ---------------------------- Dijkstra ---------------------------- */
/**
 * Caminhos mínimos a partir de `start` com heap mínimo e "lazy deletion".
 * Exige pesos não negativos.
 * Desempates (todos alfabéticos): entre vértices com a mesma distância, o de
 * menor nome é fechado primeiro; entre caminhos de mesmo custo até um vértice,
 * o predecessor é o de menor nome.
 * Complexidade: O((V + E) log V).
 */
function dijkstra(g, start) {
  if (g.hasNegativeWeight()) {
    throw new Error("Dijkstra não funciona com pesos negativos. Corrija os pesos do grafo.");
  }
  const n = g.size;
  const s = g.index[start];
  const rank = alphaRank(alphaOrder(g));
  const nbr = sortedAdj(g, rank);
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  const order = []; // ordem em que cada vértice foi "fechado"
  const heap = new MinHeap();
  dist[s] = 0;
  heap.push({ key: 0, tie: rank[s], v: s });
  while (heap.length > 0) {
    const { key, v: u } = heap.pop();
    if (done[u] || key > dist[u]) continue; // entrada velha do heap
    done[u] = true;
    order.push(u);
    for (const e of nbr[u]) {
      const v = e.to;
      if (done[v]) continue;
      const nd = dist[u] + e.weight;
      if (nd < dist[v]) {
        dist[v] = nd;
        parent[v] = u;
        heap.push({ key: nd, tie: rank[v], v });
      } else if (nd === dist[v] && parent[v] !== -1 && rank[u] < rank[parent[v]]) {
        parent[v] = u; // mesmo custo: prefere o predecessor de menor nome
      }
    }
  }
  const paths = [];
  for (let i = 0; i < n; i++) {
    if (dist[i] === Infinity) {
      paths.push(null);
      continue;
    }
    const p = [];
    for (let x = i; x !== -1; x = parent[x]) p.push(x);
    p.reverse();
    paths.push(p);
  }
  const treeEdges = [];
  for (let i = 0; i < n; i++) if (parent[i] !== -1) treeEdges.push({ u: parent[i], v: i });
  return { start: s, dist, parent, order, paths, treeEdges };
}

/* ----------------------------- Kruskal ----------------------------- */
/**
 * Árvore geradora mínima (ou floresta, se o grafo for desconexo).
 * Ordena as arestas por peso (merge sort) e usa Union-Find para evitar ciclos.
 * Arestas de mesmo peso são ordenadas alfabeticamente pelos seus vértices
 * (primeiro o menor nome da aresta, depois o maior).
 * Em grafo direcionado as arestas são tratadas como não-direcionadas (a fibra
 * ótica liga os dois sentidos).
 * Complexidade: O(E log E) para ordenar + O(E α(V)) para o union-find.
 */
function kruskal(g) {
  const n = g.size;
  const rank = alphaRank(alphaOrder(g));
  const lo = (e) => Math.min(rank[e.u], rank[e.v]);
  const hi = (e) => Math.max(rank[e.u], rank[e.v]);
  const sorted = mergeSort(g.edges, (a, b) => a.w - b.w || lo(a) - lo(b) || hi(a) - hi(b));
  const uf = new UnionFind(n);
  const chosen = [];
  const log = [];
  let total = 0;
  for (const e of sorted) {
    const ok = uf.union(e.u, e.v);
    log.push({ u: e.u, v: e.v, w: e.w, accepted: ok });
    if (ok) {
      chosen.push(e);
      total += e.w;
      if (chosen.length === n - 1) {
        // já temos V-1 arestas; o restante só seria rejeitado
        const idx = log.length;
        for (let k = idx; k < sorted.length; k++) {
          log.push({ u: sorted[k].u, v: sorted[k].v, w: sorted[k].w, accepted: false, skipped: true });
        }
        break;
      }
    }
  }
  let comps = 0;
  for (let i = 0; i < n; i++) if (uf.find(i) === i) comps++;
  return { chosen, log, total, components: comps, spanning: comps <= 1 };
}

if (typeof module !== "undefined") {
  module.exports = { dfs, bfs, dijkstra, kruskal };
}
