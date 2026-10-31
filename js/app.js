/**
 * app.js — Interface do SmartNet Analyzer.
 * Liga a tela (HTML) à estrutura Graph e aos algoritmos.
 */

const $ = (id) => document.getElementById(id);
let graph = null; // grafo atual (null = nenhum carregado)

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (x) => (x === Infinity ? "∞" : Number.isInteger(x) ? String(x) : String(Math.round(x * 1000) / 1000));
const name = (i) => graph.labels[i];
const pills = (arr, cls = "") => arr.map((i) => `<span class="pill ${cls}">${esc(name(i))}</span>`).join("") || '<span class="null">(vazio)</span>';

/* ----------------------------- mensagens ----------------------------- */
function showMsg(text, kind = "ok", list = []) {
  const el = $("msg");
  el.className = "msg " + kind;
  el.innerHTML = esc(text) + (list.length ? "<ul>" + list.map((l) => `<li>${esc(l)}</li>`).join("") + "</ul>" : "");
}

/* ------------------------------ entrada ------------------------------ */
function loadFromText() {
  const directed = $("opt-directed").checked;
  const weighted = $("opt-weighted").checked;
  const { graph: g, errors } = Graph.parse($("edges-text").value, directed, weighted);
  if (errors.length > 0) {
    showMsg("Não foi possível carregar o grafo. Corrija:", "err", errors);
    return;
  }
  if (g.size === 0) {
    showMsg("O grafo está vazio. Informe ao menos uma aresta ou vértice.", "err");
    return;
  }
  graph = g;
  showMsg(
    `Grafo carregado: ${g.size} vértices, ${g.edges.length} arestas (${directed ? "direcionado" : "não-direcionado"}, ${weighted ? "ponderado" : "sem peso"}).`,
    "ok"
  );
  refreshAll();
  $("result").innerHTML = '<p class="hint">Grafo carregado. Escolha um algoritmo.</p>';
}

function clearGraph() {
  graph = null;
  $("edges-text").value = "";
  showMsg("Grafo apagado. Insira um novo grafo.", "ok");
  refreshAll();
  $("result").innerHTML = '<p class="hint">Carregue um grafo e escolha um algoritmo.</p>';
}

function addManualEdge() {
  const a = $("m-from").value.trim();
  const b = $("m-to").value.trim();
  const wText = $("m-w").value.trim().replace(",", ".");
  if (!a || !b) return showMsg("Informe origem e destino.", "err");
  const weighted = graph ? graph.weighted : $("opt-weighted").checked;
  const directed = graph ? graph.directed : $("opt-directed").checked;
  if (weighted && wText === "") return showMsg("Informe o peso da aresta.", "err");
  if (!graph) graph = new Graph(directed, weighted);
  try {
    graph.addEdge(a, b, weighted ? Number(wText) : 1);
  } catch (e) {
    return showMsg(e.message, "err");
  }
  $("edges-text").value = graph.toText();
  $("m-from").value = $("m-to").value = $("m-w").value = "";
  showMsg(`Aresta ${a}–${b} adicionada.`, "ok");
  refreshAll();
}

/* ---------------------- memória (lista de adjacência) ---------------------- */
function renderMemory() {
  const box = $("memory");
  if (!graph) {
    box.innerHTML = '<p class="empty">Nenhum grafo carregado.</p>';
    return;
  }
  let html = '<table class="mem-table">';
  for (let i = 0; i < graph.size; i++) {
    const cells = graph.adj[i]
      .map((e) => `<span class="cell">(${esc(name(e.to))}${graph.weighted ? ", " + fmt(e.weight) : ""})</span>`)
      .join('<span class="arrow">→</span>');
    html += `<tr><td class="v">${esc(name(i))}</td><td><div class="chain"><span class="arrow">[${i}] →</span> ${
      cells ? cells + '<span class="arrow">→</span>' : ""
    }<span class="null">null</span></div></td></tr>`;
  }
  html += "</table>";
  box.innerHTML = html;
}

/* ------------------------------ desenho ------------------------------ */
const W = 640;
const H = 440;
const R_NODE = 20;
const LABEL_H = 16;
// Posições ao longo da aresta onde o peso pode ser colocado (0 = origem, 1 = destino).
const LABEL_T = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82];
let hiddenWeights = 0; // pesos que não couberam no desenho (só aparecem com o mouse sobre a aresta)

function edgeKey(u, v) {
  return graph.directed ? `${u}>${v}` : `${Math.min(u, v)}-${Math.max(u, v)}`;
}

/** O segmento (ax,ay)-(bx,by) toca o retângulo de centro (cx,cy), meia-largura hw e meia-altura hh? (Liang–Barsky) */
function segHitsRect(ax, ay, bx, by, cx, cy, hw, hh) {
  const dx = bx - ax;
  const dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - (cx - hw), cx + hw - ax, ay - (cy - hh), cy + hh - ay];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

/**
 * Escolhe onde escrever o peso de cada aresta, sobre a própria linha, em uma
 * posição que não encosta em outro peso, em um vértice nem em outra aresta.
 * Se nenhuma posição servir, o peso fica sem rótulo fixo (s.label = null) e só
 * aparece ao passar o mouse sobre a aresta. Devolve quantos pesos ficaram ocultos.
 */
function placeLabels(segs, pos) {
  const placed = [];
  let hidden = 0;
  for (const s of segs) {
    s.label = null;
    const txt = fmt(s.e.w);
    const w = Math.max(18, txt.length * 7.5 + 8);
    const hw = w / 2;
    const hh = LABEL_H / 2;
    for (const t of LABEL_T) {
      const cx = s.x1 + (s.x2 - s.x1) * t;
      const cy = s.y1 + (s.y2 - s.y1) * t;
      if (cx - hw < 2 || cx + hw > W - 2 || cy - hh < 2 || cy + hh > H - 2) continue;
      let ok = true;
      for (const p of placed) {
        if (Math.abs(cx - p.cx) < hw + p.hw + 2 && Math.abs(cy - p.cy) < hh + p.hh + 2) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (const nd of pos) {
        const dx = Math.max(Math.abs(nd.x - cx) - hw, 0);
        const dy = Math.max(Math.abs(nd.y - cy) - hh, 0);
        if (dx * dx + dy * dy < (R_NODE + 3) * (R_NODE + 3)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (const o of segs) {
        if (o !== s && segHitsRect(o.x1, o.y1, o.x2, o.y2, cx, cy, hw, hh)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      s.label = { x: cx, y: cy };
      placed.push({ cx, cy, hw, hh });
      break;
    }
    if (!s.label) hidden++;
  }
  return hidden;
}

/** hl: { edges: Set<chave>, edges2?: Set, start?: índice, reach?: Set<índice>, dim?: Set<índice> } */
function renderGraph(hl = {}) {
  const wrap = $("graph-wrap");
  hiddenWeights = 0;
  if (!graph) {
    wrap.innerHTML = '<p class="empty">Nenhum grafo carregado.</p>';
    $("graph-info").textContent = "";
    return;
  }
  $("graph-info").textContent = `${graph.size} vértices · ${graph.edges.length} arestas`;
  const n = graph.size;
  const pos = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    pos.push(n === 1 ? { x: W / 2, y: H / 2 } : { x: W / 2 + (W / 2 - 60) * Math.cos(a), y: H / 2 + (H / 2 - 50) * Math.sin(a) });
  }
  const edgesHl = hl.edges || new Set();
  const edgesHl2 = hl.edges2 || new Set();

  // 1) geometria de cada aresta
  const segs = [];
  for (const e of graph.edges) {
    let { x: x1, y: y1 } = pos[e.u];
    let { x: x2, y: y2 } = pos[e.v];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // desloca levemente se existir aresta oposta (para não sobrepor)
    let off = 0;
    if (graph.directed && graph.hasEdge(e.v, e.u)) off = 8;
    const ox = -uy * off;
    const oy = ux * off;
    x1 += ux * R_NODE + ox;
    y1 += uy * R_NODE + oy;
    x2 -= ux * (R_NODE + (graph.directed ? 2 : 0)) - ox;
    y2 -= uy * (R_NODE + (graph.directed ? 2 : 0)) - oy;
    const key = edgeKey(e.u, e.v);
    const cls = edgesHl.has(key) ? "hl" : edgesHl2.has(key) ? "hl2" : "";
    segs.push({ e, x1, y1, x2, y2, key, cls, label: null });
  }

  // 2) posição dos pesos (os que não couberem só aparecem com o mouse)
  if (graph.weighted) hiddenWeights = placeLabels(segs, pos);

  // 3) desenho
  let svg = `<svg id="graph-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Desenho do grafo">`;
  svg += `<defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8795ad"/></marker>
    <marker id="arr-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0f9d6b"/></marker>
  </defs>`;
  for (const s of segs) {
    const e = s.e;
    const marker = graph.directed ? ` marker-end="url(#${s.cls === "hl" ? "arr-hl" : "arr"})"` : "";
    const tip = graph.weighted ? `${name(e.u)} ${graph.directed ? "→" : "—"} ${name(e.v)} · peso ${fmt(e.w)}` : "";
    const hidden = graph.weighted && !s.label ? ' data-hidden="1"' : "";
    svg += `<g class="edge-g" data-tip="${esc(tip)}" data-mx="${Math.round((s.x1 + s.x2) / 2)}" data-my="${Math.round((s.y1 + s.y2) / 2)}"${hidden}>`;
    svg += `<line class="edge ${s.cls}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"${marker}/>`;
    svg += `<line class="edge-hit" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"/>`;
    svg += "</g>";
  }
  svg += '<g class="labels">';
  for (const s of segs) {
    if (s.label) svg += `<text class="edge-w" x="${s.label.x}" y="${s.label.y}" text-anchor="middle" dominant-baseline="central">${fmt(s.e.w)}</text>`;
  }
  svg += "</g>";
  for (let i = 0; i < n; i++) {
    let cls = "node";
    if (hl.start === i) cls += " start";
    else if (hl.reach && hl.reach.has(i)) cls += " reach";
    else if (hl.dim && hl.dim.has(i)) cls += " dim";
    svg += `<g class="${cls}"><circle cx="${pos[i].x}" cy="${pos[i].y}" r="${R_NODE}"/><text x="${pos[i].x}" y="${pos[i].y}">${esc(name(i).length > 4 ? name(i).slice(0, 4) + "…" : name(i))}</text><title>${esc(name(i))}</title></g>`;
  }
  svg += `<g id="edge-tip" class="edge-tip" visibility="hidden"><rect id="edge-tip-rect" rx="5" x="0" y="0" width="10" height="22"/><text id="edge-tip-text" x="0" y="0"></text></g>`;
  svg += "</svg>";
  wrap.innerHTML = svg;
}

function setLegend(text) {
  let t = text || "";
  if (hiddenWeights > 0) {
    const nota = `${hiddenWeights} peso(s) não coube(ram) no desenho: passe o mouse sobre a aresta para ver.`;
    t = t ? `${t} · ${nota}` : nota;
  }
  $("legend").textContent = t;
}

/* ----------------- dica (tooltip) ao passar o mouse na aresta ----------------- */
function hideTip() {
  const tip = $("edge-tip");
  if (tip) tip.setAttribute("visibility", "hidden");
}

function showTip(g, ev) {
  const tip = $("edge-tip");
  const txt = g.getAttribute("data-tip");
  if (!tip || !txt) return;
  // posição padrão: meio da aresta; se der, acompanha o cursor
  let x = Number(g.getAttribute("data-mx"));
  let y = Number(g.getAttribute("data-my")) - 12;
  const svg = tip.ownerSVGElement;
  if (svg && svg.createSVGPoint && svg.getScreenCTM && ev && ev.clientX) {
    const m = svg.getScreenCTM();
    if (m) {
      const p = svg.createSVGPoint();
      p.x = ev.clientX;
      p.y = ev.clientY;
      const q = p.matrixTransform(m.inverse());
      x = q.x;
      y = q.y - 16;
    }
  }
  const w = Math.max(40, txt.length * 6.8 + 16);
  const h = 22;
  const tx = Math.min(Math.max(x - w / 2, 2), W - w - 2);
  const ty = Math.min(Math.max(y - h, 2), H - h - 2);
  const rect = $("edge-tip-rect");
  const label = $("edge-tip-text");
  rect.setAttribute("x", tx);
  rect.setAttribute("y", ty);
  rect.setAttribute("width", w);
  rect.setAttribute("height", h);
  label.setAttribute("x", tx + w / 2);
  label.setAttribute("y", ty + h / 2 + 0.5);
  label.textContent = txt;
  tip.setAttribute("visibility", "visible");
}

const graphWrap = $("graph-wrap");
const overEdge = (ev) => (ev.target && ev.target.closest ? ev.target.closest(".edge-g") : null);
graphWrap.addEventListener("mouseover", (ev) => {
  const g = overEdge(ev);
  if (g) showTip(g, ev);
});
graphWrap.addEventListener("mousemove", (ev) => {
  const g = overEdge(ev);
  if (g) showTip(g, ev);
});
graphWrap.addEventListener("mouseout", (ev) => {
  if (overEdge(ev)) hideTip();
});

/* --------------------------- seletor de origem --------------------------- */
function renderStartSelect() {
  const sel = $("start-vertex");
  const prev = sel.value;
  sel.innerHTML = "";
  if (!graph) return;
  for (let i = 0; i < graph.size; i++) {
    const o = document.createElement("option");
    o.value = name(i);
    o.textContent = name(i);
    sel.appendChild(o);
  }
  if (prev && graph.hasVertex(prev)) sel.value = prev;
}

function refreshAll() {
  renderMemory();
  renderGraph();
  renderStartSelect();
  setLegend("");
  document.querySelectorAll(".algo").forEach((b) => b.classList.remove("active"));
}

/* ---------------------------- resultados ---------------------------- */
function treeText(parent, roots, order) {
  // monta texto de árvore: filhos de cada vértice na ordem de descoberta
  const children = graph.labels.map(() => []);
  for (const v of order) if (parent[v] !== -1) children[parent[v]].push(v);
  const lines = [];
  function walk(u, prefix, isLast, isRoot) {
    lines.push(isRoot ? name(u) : prefix + (isLast ? "└── " : "├── ") + name(u));
    const nextPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    children[u].forEach((c, k) => walk(c, nextPrefix, k === children[u].length - 1, false));
  }
  roots.forEach((r) => walk(r, "", true, true));
  return lines.join("\n");
}

function pathText(path) {
  return path ? path.map(name).join(" → ") : "—";
}

function runDFS(start) {
  const r = dfs(graph, start);
  const hlEdges = new Set(r.treeEdges.map((e) => edgeKey(e.u, e.v)));
  const reach = new Set(r.order.slice(0, r.reachableFromStart));
  renderGraph({ edges: hlEdges, start: r.start, reach, edges2: new Set(r.backEdges.map((e) => edgeKey(e.u, e.v))) });
  setLegend("Verde: arestas da árvore DFS · Laranja: arestas de retorno (ciclos).");

  let html = "<h3>Busca em Profundidade (DFS)</h3>";
  html += `<div class="summary ${r.connectedFromStart ? "" : "warn"}">`;
  if (graph.directed) {
    html += r.connectedFromStart
      ? `A partir de <b>${esc(start)}</b> todos os ${graph.size} vértices são alcançáveis.`
      : `A partir de <b>${esc(start)}</b> só são alcançáveis ${r.reachableFromStart} de ${graph.size} vértices: ${pills(graph.labels.map((_, i) => i).filter((i) => !reach.has(i)))} ficam fora do alcance.`;
  } else {
    html += r.connectedFromStart
      ? `Rede <b>conexa</b>: todos os ${graph.size} vértices são alcançáveis a partir de <b>${esc(start)}</b>.`
      : `Rede <b>desconexa</b>: ${r.components} componentes. De <b>${esc(start)}</b> alcançam-se apenas ${r.reachableFromStart} de ${graph.size} vértices.`;
  }
  html += "</div>";
  html += `<h3>Ordem de visita</h3><div>${r.order.map((i, k) => `<span class="pill">${k + 1}. ${esc(name(i))}</span>`).join("")}</div>`;
  html += `<h3>Árvore DFS${r.roots.length > 1 ? " (floresta)" : ""}</h3><pre class="tree">${esc(treeText(r.parent, r.roots, r.order))}</pre>`;
  html += "<h3>Tempos de descoberta e término</h3><table><tr><th>Vértice</th><th>Descoberta</th><th>Término</th><th>Pai</th></tr>";
  for (const i of r.order) {
    html += `<tr><td>${esc(name(i))}</td><td>${r.discovery[i]}</td><td>${r.finish[i]}</td><td>${r.parent[i] === -1 ? "— (raiz)" : esc(name(r.parent[i]))}</td></tr>`;
  }
  html += "</table>";
  html += `<h3>Auditoria de rotas</h3><p><b>Becos sem saída</b> ${graph.directed ? "(nenhuma via de saída)" : "(só uma via)"}: ${pills(r.deadEnds)}</p>`;
  html += `<p><b>Vértices isolados</b>: ${pills(r.isolated)}</p>`;
  html += `<p><b>Ciclos (rotas alternativas)</b>: ${r.hasCycle ? `sim, ${r.backEdges.length} aresta(s) de retorno encontrada(s)` : "não há ciclos"}</p>`;
  html += '<p class="complex">Complexidade: O(V + E) com lista de adjacência.</p>';
  return html;
}

function runBFS(start) {
  const r = bfs(graph, start);
  renderGraph({
    edges: new Set(r.treeEdges.map((e) => edgeKey(e.u, e.v))),
    start: r.start,
    reach: new Set(r.order),
    dim: new Set(r.unreachable),
  });
  setLegend("Verde: caminhos de propagação (árvore BFS) · Cinza: não alcançados.");
  let html = "<h3>Busca em Largura (BFS) — propagação de alertas</h3>";
  html += `<div class="summary">Origem: <b>${esc(start)}</b>. O alerta atinge ${r.order.length} de ${graph.size} bairros em ${Math.max(...r.level)} salto(s).</div>`;
  html += `<h3>Fila de execução (ordem de visita)</h3><div>${r.order.map((i, k) => `<span class="pill">${k + 1}. ${esc(name(i))}</span>`).join("")}</div>`;
  html += "<h3>Passo a passo da fila</h3><table><tr><th>Passo</th><th>Sai da fila</th><th>Entram</th><th>Fila depois</th></tr>";
  r.steps.forEach((s, k) => {
    html += `<tr><td>${k + 1}</td><td>${esc(name(s.removed))}</td><td>${s.added.map(name).map(esc).join(", ") || "—"}</td><td>${s.queueAfter.map((x) => `<span class="pill q">${esc(name(x))}</span>`).join("") || "(vazia)"}</td></tr>`;
  });
  html += "</table>";
  html += "<h3>Menor caminho em número de saltos</h3><table><tr><th>Destino</th><th>Saltos</th><th>Caminho</th></tr>";
  for (let i = 0; i < graph.size; i++) {
    if (r.level[i] === -1) {
      html += `<tr><td>${esc(name(i))}</td><td>∞</td><td>inalcançável</td></tr>`;
      continue;
    }
    const p = [];
    for (let x = i; x !== -1; x = r.parent[x]) p.push(x);
    p.reverse();
    html += `<tr><td>${esc(name(i))}</td><td>${r.level[i]}</td><td>${esc(pathText(p))}</td></tr>`;
  }
  html += "</table>";
  html += '<p class="complex">O BFS conta saltos e ignora os pesos (para o menor custo ponderado, use Dijkstra). Complexidade: O(V + E).</p>';
  return html;
}

function runDijkstra(start) {
  const r = dijkstra(graph, start);
  renderGraph({
    edges: new Set(r.treeEdges.map((e) => edgeKey(e.u, e.v))),
    start: r.start,
    reach: new Set(r.order),
    dim: new Set(graph.labels.map((_, i) => i).filter((i) => r.dist[i] === Infinity)),
  });
  setLegend("Verde: árvore de rotas mais curtas a partir da origem.");
  let html = "<h3>Dijkstra — rota de emergência</h3>";
  html += `<div class="summary">Origem: <b>${esc(start)}</b>. ${r.order.length} de ${graph.size} bairros alcançáveis.</div>`;
  html += "<h3>Distâncias a partir da origem</h3><table><tr><th>Destino</th><th>Distância mínima</th><th>Predecessor</th><th>Rota</th></tr>";
  for (let i = 0; i < graph.size; i++) {
    html += `<tr><td>${esc(name(i))}</td><td>${fmt(r.dist[i])}</td><td>${r.parent[i] === -1 ? "—" : esc(name(r.parent[i]))}</td><td>${r.paths[i] ? esc(pathText(r.paths[i])) : "inalcançável"}</td></tr>`;
  }
  html += "</table>";
  html += `<h3>Ordem em que os vértices foram fechados</h3><div>${r.order.map((i, k) => `<span class="pill">${k + 1}. ${esc(name(i))} (${fmt(r.dist[i])})</span>`).join("")}</div>`;
  html += '<p class="complex">Complexidade: O((V + E) log V) com heap mínimo. Exige pesos não negativos.</p>';
  return html;
}

function runKruskal() {
  const r = kruskal(graph);
  const set = new Set();
  for (const e of r.chosen) {
    set.add(edgeKey(e.u, e.v));
    if (graph.directed) set.add(edgeKey(e.v, e.u));
  }
  renderGraph({ edges: set });
  setLegend("Verde: trechos de fibra ótica escolhidos (árvore geradora mínima).");
  let html = "<h3>Kruskal — rede de fibra ótica de menor custo</h3>";
  html += `<div class="summary ${r.spanning ? "" : "warn"}">Custo total: <b>${fmt(r.total)}</b> com ${r.chosen.length} trecho(s). ${
    r.spanning
      ? "A fibra interliga todos os bairros sem redundância."
      : `A rede é desconexa: o resultado é uma floresta geradora mínima com ${r.components} componentes (não há como ligar todos os bairros).`
  }</div>`;
  if (graph.directed) html += '<p class="hint">Grafo direcionado: para a fibra ótica, as arestas foram tratadas como bidirecionais.</p>';
  html += "<h3>Arestas selecionadas</h3><table><tr><th>#</th><th>Trecho</th><th>Custo</th></tr>";
  r.chosen.forEach((e, k) => {
    html += `<tr><td>${k + 1}</td><td>${esc(name(e.u))} — ${esc(name(e.v))}</td><td>${fmt(e.w)}</td></tr>`;
  });
  html += `<tr><th colspan="2">Total</th><th>${fmt(r.total)}</th></tr></table>`;
  html += "<h3>Passo a passo (arestas em ordem crescente de custo)</h3><table><tr><th>Aresta</th><th>Custo</th><th>Decisão</th></tr>";
  for (const s of r.log) {
    html += `<tr class="${s.accepted ? "acc" : "rej"}"><td>${esc(name(s.u))} — ${esc(name(s.v))}</td><td>${fmt(s.w)}</td><td>${
      s.accepted ? "aceita" : s.skipped ? "descartada (árvore já completa)" : "rejeitada (formaria ciclo)"
    }</td></tr>`;
  }
  html += "</table>";
  html += '<p class="complex">Complexidade: O(E log E) para ordenar as arestas + O(E·α(V)) com Union-Find.</p>';
  return html;
}

function runAlgorithm(which) {
  if (!graph) return showMsg("Carregue um grafo antes de executar um algoritmo.", "err");
  const start = $("start-vertex").value;
  try {
    let html;
    if (which === "dfs") html = runDFS(start);
    else if (which === "bfs") html = runBFS(start);
    else if (which === "dijkstra") html = runDijkstra(start);
    else html = runKruskal();
    $("result").innerHTML = html;
  } catch (e) {
    $("result").innerHTML = `<div class="summary warn">${esc(e.message)}</div>`;
    renderGraph();
    setLegend("");
  }
  document.querySelectorAll(".algo").forEach((b) => b.classList.toggle("active", b.dataset.algo === which));
}

/* ------------------------------ eventos ------------------------------ */
$("btn-load").addEventListener("click", loadFromText);
$("btn-clear").addEventListener("click", clearGraph);
$("btn-add").addEventListener("click", addManualEdge);
document.querySelectorAll(".algo").forEach((b) => b.addEventListener("click", () => runAlgorithm(b.dataset.algo)));

$("file-input").addEventListener("change", (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    $("edges-text").value = String(reader.result);
    showMsg(`Arquivo "${f.name}" lido. Confira as opções e clique em "Carregar grafo".`, "ok");
  };
  reader.readAsText(f);
  ev.target.value = "";
});

$("examples").addEventListener("change", (ev) => {
  const ex = EXAMPLES[ev.target.value];
  if (!ex) return;
  $("opt-directed").checked = ex.directed;
  $("opt-weighted").checked = ex.weighted;
  $("edges-text").value = ex.text;
  loadFromText();
  ev.target.value = "";
});

$("btn-finish").addEventListener("click", () => {
  if (!confirm("Finalizar a aplicação? O grafo atual será descartado.")) return;
  graph = null;
  $("finished").hidden = false;
  window.close(); // só funciona se a aba foi aberta por script; senão fica a tela de encerramento
});
$("btn-restart").addEventListener("click", () => {
  $("finished").hidden = true;
  clearGraph();
});

refreshAll();
