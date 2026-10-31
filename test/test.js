// Testes automáticos: rode com `node test/test.js`
const assert = require("assert");
const structures = require("../js/graph.js");
Object.assign(globalThis, structures); // algorithms.js usa Queue, MinHeap etc. como globais (como no navegador)
const { Graph } = structures;
const { dfs, bfs, dijkstra, kruskal } = require("../js/algorithms.js");
const fs = require("fs");
const path = require("path");

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log("  ok -", name);
}

const txt = fs.readFileSync(path.join(__dirname, "../exemplos/enunciado.txt"), "utf8");
const { graph: g, errors } = Graph.parse(txt, false, true);
const L = (arr) => arr.map((i) => g.labels[i]);

console.log("Grafo do enunciado (não-direcionado, ponderado)");
ok("parse sem erros, 8 vértices, 14 arestas", () => {
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(g.size, 8);
  assert.strictEqual(g.edges.length, 14);
});
ok("lista de adjacência simétrica (28 entradas)", () => {
  assert.strictEqual(g.adj.reduce((s, l) => s + l.length, 0), 28);
});
ok("Dijkstra a partir de O", () => {
  const r = dijkstra(g, "O");
  const d = {};
  g.labels.forEach((l, i) => (d[l] = r.dist[i]));
  assert.deepStrictEqual(d, { O: 0, A: 2, B: 4, C: 4, D: 8, E: 7, F: 14, T: 13 });
  assert.deepStrictEqual(L(r.paths[g.index.T]), ["O", "A", "B", "D", "T"]);
});
ok("Kruskal: custo 20 com 7 arestas", () => {
  const r = kruskal(g);
  assert.strictEqual(r.total, 20);
  assert.strictEqual(r.chosen.length, 7);
  assert.ok(r.spanning);
});
ok("BFS a partir de O: níveis corretos", () => {
  const r = bfs(g, "O");
  const lv = {};
  g.labels.forEach((l, i) => (lv[l] = r.level[i]));
  assert.deepStrictEqual(lv, { O: 0, A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, T: 3 });
  assert.strictEqual(r.order.length, 8);
});
ok("DFS a partir de O visita todos e conta 1 componente", () => {
  const r = dfs(g, "O");
  assert.strictEqual(r.order.length, 8);
  assert.strictEqual(r.components, 1);
  assert.ok(r.connectedFromStart);
  assert.ok(r.hasCycle);
});

console.log("Grafo direcionado");
const dg = Graph.parse("A B 1\nB C 2\nA C 5\nC D 1\nE", true, true).graph;
ok("Dijkstra respeita direção", () => {
  const r = dijkstra(dg, "A");
  assert.strictEqual(r.dist[dg.index.C], 3);
  assert.strictEqual(r.dist[dg.index.D], 4);
  assert.strictEqual(r.dist[dg.index.E], Infinity);
});
ok("DFS direcionado: D é beco sem saída, E isolado", () => {
  const r = dfs(dg, "A");
  assert.deepStrictEqual(r.deadEnds.map((i) => dg.labels[i]).sort(), ["D", "E"]);
  assert.deepStrictEqual(r.isolated.map((i) => dg.labels[i]), ["E"]);
  assert.ok(!r.connectedFromStart);
});

console.log("Casos de borda");
ok("Dijkstra recusa peso negativo", () => {
  const ng = Graph.parse("A B -1", false, true).graph;
  assert.throws(() => dijkstra(ng, "A"));
});
ok("Kruskal em grafo desconexo devolve floresta", () => {
  const dc = Graph.parse("A B 1\nC D 2", false, true).graph;
  const r = kruskal(dc);
  assert.strictEqual(r.components, 2);
  assert.ok(!r.spanning);
  assert.strictEqual(r.total, 3);
});
ok("Grafo sem pesos usa peso 1", () => {
  const ug = Graph.parse("A B\nB C\nC D", false, false).graph;
  assert.strictEqual(dijkstra(ug, "A").dist[ug.index.D], 3);
});
ok("parse reporta erros por linha", () => {
  const r = Graph.parse("A B 3\nA A 1\nB C x\nA B 9", false, true);
  assert.strictEqual(r.errors.length, 3);
});

console.log("Desempate em ordem alfabética (independe da ordem de digitação)");
const lab = (g, arr) => arr.map((i) => g.labels[i]);
ok("DFS escolhe o vizinho de menor nome", () => {
  const a = Graph.parse("A C\nA B\nB D\nC D", false, false).graph;
  assert.deepStrictEqual(lab(a, dfs(a, "A").order), ["A", "B", "D", "C"]);
});
ok("DFS recomeça nas raízes restantes em ordem alfabética", () => {
  const a = Graph.parse("Z Y\nB A", false, false).graph;
  assert.deepStrictEqual(lab(a, dfs(a, "Z").order), ["Z", "Y", "A", "B"]);
});
ok("números em ordem natural (2 antes de 10)", () => {
  const a = Graph.parse("S 10\nS 2", false, false).graph;
  assert.deepStrictEqual(lab(a, dfs(a, "S").order), ["S", "2", "10"]);
  assert.deepStrictEqual(lab(a, bfs(a, "S").order), ["S", "2", "10"]);
});
ok("BFS enfileira vizinhos em ordem alfabética", () => {
  const a = Graph.parse("S C\nS B\nS A", false, false).graph;
  assert.deepStrictEqual(lab(a, bfs(a, "S").order), ["S", "A", "B", "C"]);
});
ok("Dijkstra fecha primeiro o vértice de menor nome em empate de distância", () => {
  const a = Graph.parse("S Y 1\nS X 1\nX T 1\nY T 1", false, true).graph;
  const r = dijkstra(a, "S");
  assert.deepStrictEqual(lab(a, r.order), ["S", "X", "Y", "T"]);
  assert.deepStrictEqual(lab(a, r.paths[a.index.T]), ["S", "X", "T"]);
});
ok("Dijkstra prefere predecessor de menor nome em caminhos de mesmo custo", () => {
  const a = Graph.parse("S Z 1\nS A 2\nZ T 3\nA T 2", false, true).graph;
  const r = dijkstra(a, "S");
  assert.strictEqual(r.dist[a.index.T], 4);
  assert.deepStrictEqual(lab(a, r.paths[a.index.T]), ["S", "A", "T"]);
});
ok("Kruskal ordena arestas de mesmo peso alfabeticamente", () => {
  const a = Graph.parse("C D 1\nA B 1\nB C 1\nA C 1", false, true).graph;
  const r = kruskal(a);
  const ordem = r.log.map((s) => [a.labels[s.u], a.labels[s.v]].sort().join("-"));
  assert.deepStrictEqual(ordem, ["A-B", "A-C", "B-C", "C-D"]);
  assert.deepStrictEqual(r.log.map((s) => s.accepted), [true, true, false, true]);
  assert.strictEqual(r.total, 3);
});

console.log(`\n${passed} testes passaram.`);
