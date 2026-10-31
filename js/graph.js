/**
 * graph.js — Estrutura de dados do SmartNet Analyzer.
 *
 * O grafo é armazenado em LISTA DE ADJACÊNCIA, implementada do zero:
 *   adj[i] = lista de arestas { to, weight } que saem do vértice de índice i.
 *
 * Também ficam aqui as estruturas auxiliares usadas pelos algoritmos
 * (fila, heap mínimo, union-find e merge sort), todas escritas à mão.
 */

class Graph {
  constructor(directed = false, weighted = true) {
    this.directed = directed;
    this.weighted = weighted;
    this.labels = []; // índice -> nome do vértice
    this.index = {}; // nome -> índice (só para traduzir texto de entrada)
    this.adj = []; // lista de adjacência: adj[i] = [{to, weight}, ...]
    this.edges = []; // arestas na ordem de inserção: {u, v, w}
  }

  get size() {
    return this.labels.length;
  }

  hasVertex(label) {
    return Object.prototype.hasOwnProperty.call(this.index, label);
  }

  /** Adiciona um vértice (se ainda não existir) e devolve o índice. */
  addVertex(label) {
    if (this.hasVertex(label)) return this.index[label];
    const i = this.labels.length;
    this.labels.push(label);
    this.index[label] = i;
    this.adj.push([]);
    return i;
  }

  hasEdge(u, v) {
    const list = this.adj[u];
    for (let k = 0; k < list.length; k++) if (list[k].to === v) return true;
    return false;
  }

  /** Adiciona aresta u-v. No grafo não-direcionado grava nas duas listas. */
  addEdge(uLabel, vLabel, weight = 1) {
    if (uLabel === vLabel) throw new Error(`Laço (${uLabel}-${vLabel}) não é permitido.`);
    if (!Number.isFinite(weight)) throw new Error(`Peso inválido na aresta ${uLabel}-${vLabel}.`);
    const u = this.addVertex(uLabel);
    const v = this.addVertex(vLabel);
    if (this.hasEdge(u, v) || (!this.directed && this.hasEdge(v, u))) {
      throw new Error(`Aresta ${uLabel}-${vLabel} duplicada.`);
    }
    const w = this.weighted ? weight : 1;
    this.adj[u].push({ to: v, weight: w });
    if (!this.directed) this.adj[v].push({ to: u, weight: w });
    this.edges.push({ u, v, w });
  }

  hasNegativeWeight() {
    for (let i = 0; i < this.edges.length; i++) if (this.edges[i].w < 0) return true;
    return false;
  }

  /**
   * Lê o grafo a partir de texto. Uma linha por item:
   *   "A"          -> vértice isolado
   *   "A B"        -> aresta sem peso (ou peso 1 se o grafo for não ponderado)
   *   "A B 7"      -> aresta com peso 7
   * Linhas vazias e comentários (# ...) são ignorados.
   * Devolve { graph, errors }.
   */
  static parse(text, directed, weighted) {
    const g = new Graph(directed, weighted);
    const errors = [];
    const lines = text.split(/\r?\n/);
    for (let n = 0; n < lines.length; n++) {
      const line = lines[n].split("#")[0].trim();
      if (line === "") continue;
      const t = line.split(/[\s,;]+/).filter((s) => s !== "");
      try {
        if (t.length === 1) {
          g.addVertex(t[0]);
        } else if (t.length === 2) {
          if (weighted) throw new Error("falta o peso (formato: A B 5)");
          g.addEdge(t[0], t[1], 1);
        } else if (t.length === 3) {
          const w = Number(t[2].replace(",", "."));
          if (Number.isNaN(w)) throw new Error(`peso "${t[2]}" não é número`);
          g.addEdge(t[0], t[1], w);
        } else {
          throw new Error("use o formato: ORIGEM DESTINO [PESO]");
        }
      } catch (e) {
        errors.push(`Linha ${n + 1}: ${e.message}`);
      }
    }
    return { graph: g, errors };
  }

  /** Texto equivalente ao grafo (útil para exportar/editar). */
  toText() {
    const out = [];
    const used = new Array(this.size).fill(false);
    for (const e of this.edges) {
      used[e.u] = used[e.v] = true;
      out.push(this.weighted ? `${this.labels[e.u]} ${this.labels[e.v]} ${e.w}` : `${this.labels[e.u]} ${this.labels[e.v]}`);
    }
    for (let i = 0; i < this.size; i++) if (!used[i]) out.push(this.labels[i]);
    return out.join("\n");
  }
}

/**
 * Comparação alfabética de nomes de vértices (sem distinguir maiúsculas de
 * minúsculas; números em ordem natural: "2" vem antes de "10").
 */
function compareLabels(a, b) {
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

/* ---------------- Estruturas auxiliares (feitas do zero) ---------------- */

/** Fila FIFO com índice de cabeça: enqueue/dequeue em O(1). */
class Queue {
  constructor() {
    this.items = [];
    this.head = 0;
  }
  enqueue(x) {
    this.items.push(x);
  }
  dequeue() {
    return this.items[this.head++];
  }
  get length() {
    return this.items.length - this.head;
  }
  snapshot() {
    return this.items.slice(this.head);
  }
}

/** Heap mínimo binário ordenado por (key, tie). push/pop em O(log n). */
class MinHeap {
  constructor() {
    this.a = [];
  }
  get length() {
    return this.a.length;
  }
  _less(i, j) {
    const x = this.a[i];
    const y = this.a[j];
    return x.key < y.key || (x.key === y.key && x.tie < y.tie);
  }
  _swap(i, j) {
    const t = this.a[i];
    this.a[i] = this.a[j];
    this.a[j] = t;
  }
  push(item) {
    this.a.push(item);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this._less(i, p)) break;
      this._swap(i, p);
      i = p;
    }
  }
  pop() {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      const n = this.a.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && this._less(l, m)) m = l;
        if (r < n && this._less(r, m)) m = r;
        if (m === i) break;
        this._swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

/** Union-Find com compressão de caminho e união por tamanho. */
class UnionFind {
  constructor(n) {
    this.parent = [];
    this.size = [];
    for (let i = 0; i < n; i++) {
      this.parent.push(i);
      this.size.push(1);
    }
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // compressão (path halving)
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    return true;
  }
}

/** Merge sort estável, O(n log n). cmp(a,b) < 0 => a vem antes. */
function mergeSort(arr, cmp) {
  if (arr.length <= 1) return arr.slice();
  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid), cmp);
  const right = mergeSort(arr.slice(mid), cmp);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (cmp(right[j], left[i]) < 0) out.push(right[j++]);
    else out.push(left[i++]);
  }
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}

if (typeof module !== "undefined") {
  module.exports = { Graph, Queue, MinHeap, UnionFind, mergeSort, compareLabels };
}
