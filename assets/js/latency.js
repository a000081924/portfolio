// Interactive scatter of API response times during one recognition run. The data sits in
// a JSON block in the page (from news-reconstruction/newsrec-integration/probe_timeline.json).
// Hover or tap shows the nearest request; the arrow keys step through them when the chart
// has focus. A table toggle lists every value, and <noscript> keeps the static image.
(() => {
  const root = document.getElementById("latency-chart");
  const source = document.getElementById("latency-data");
  if (!root || !source) return;

  const { probes, stages, idleMedianMs } = JSON.parse(source.textContent);
  const points = probes.map(([t, ms]) => ({ t, ms }));
  const NS = "http://www.w3.org/2000/svg";
  const Y_MIN = 1, Y_MAX = 20000, X_MAX = Math.ceil(Math.max(...points.map((p) => p.t)) / 5) * 5;
  const STALL_MS = 1000;
  const labelled = new Set([...points].sort((a, b) => b.ms - a.ms).slice(0, 2));

  const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(1)} ms`);
  // [stage ends at, name for the table, phrase for the tooltip]
  const PHASES = [
    [stages.preprocessed, "Preprocessing", "while the page was preprocessed"],
    [stages.layout, "Layout detection", "while the layout was detected"],
    [stages.lines, "Text-line recognition", "during text-line recognition"],
    [stages.done, "Parsing and saving", "while the page was parsed and saved"],
    [Infinity, "After saving", "after the page was saved"],
  ];
  const phaseAt = (t) => PHASES.find(([end]) => t < end);

  function el(name, attrs, parent, text) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  tip.setAttribute("aria-hidden", "true");
  const tipValue = tip.appendChild(document.createElement("strong"));
  const tipLabel = tip.appendChild(document.createElement("span"));
  const status = document.createElement("p");
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");

  let svg, focusRing, active = -1, width = 0;

  function render() {
    width = root.clientWidth;
    const narrow = width < 520;
    const m = { left: narrow ? 44 : 56, right: 14, top: 26, bottom: 40 };
    const height = narrow ? 260 : 300;
    const pw = width - m.left - m.right, ph = height - m.top - m.bottom;
    const sx = (t) => m.left + (t / X_MAX) * pw;
    const sy = (ms) => m.top + ph - ((Math.log10(Math.max(ms, Y_MIN)) - Math.log10(Y_MIN)) / (Math.log10(Y_MAX) - Math.log10(Y_MIN))) * ph;

    svg?.remove();
    svg = el("svg", { width, height, class: "lc-svg", "aria-hidden": "true" }, root);
    root.prepend(svg);

    for (const [ms, label] of [[1, "1 ms"], [10, "10 ms"], [100, "100 ms"], [1000, "1 s"], [10000, "10 s"]]) {
      el("line", { x1: m.left, x2: m.left + pw, y1: sy(ms), y2: sy(ms), class: "lc-grid" }, svg);
      el("text", { x: m.left - 8, y: sy(ms) + 4, "text-anchor": "end", class: "lc-tick" }, svg, label);
    }
    for (let t = 0; t <= X_MAX; t += narrow ? 10 : 5) {
      el("text", { x: sx(t), y: m.top + ph + 18, "text-anchor": "middle", class: "lc-tick" }, svg, String(t));
    }
    el("line", { x1: m.left, x2: m.left + pw, y1: m.top + ph, y2: m.top + ph, class: "lc-axis" }, svg);
    el("text", { x: m.left + pw / 2, y: height - 4, "text-anchor": "middle", class: "lc-tick" }, svg, "Seconds after recognition started");

    const markers = [
      [stages.layout, narrow ? "layout" : "layout ready", "start"],
      [stages.lines, narrow ? "lines" : "lines ready", "end"],
      [stages.done, narrow ? "saved" : "page saved", "end"],
    ];
    for (const [t, label, anchor] of markers) {
      el("line", { x1: sx(t), x2: sx(t), y1: m.top - 6, y2: m.top + ph, class: "lc-stage" }, svg);
      el("text", { x: sx(t) + (anchor === "start" ? 4 : -4), y: m.top - 10, "text-anchor": anchor, class: "lc-label" }, svg, label);
    }

    el("line", { x1: m.left, x2: m.left + pw, y1: sy(idleMedianMs), y2: sy(idleMedianMs), class: "lc-median" }, svg);
    // Label it in the stretch from 16 to 26 s, where no fast request sits near the line.
    el("text", { x: sx(21), y: sy(idleMedianMs) - 6, "text-anchor": "middle", class: "lc-label" }, svg,
      `${narrow ? "median" : "idle median"} ${idleMedianMs.toFixed(1)} ms`);

    for (const p of points) {
      p.x = sx(p.t);
      p.y = sy(p.ms);
      el("circle", { cx: p.x, cy: p.y, r: 4, class: p.ms >= STALL_MS ? "lc-dot stall" : "lc-dot" }, svg);
      if (labelled.has(p)) {
        el("text", { x: p.x + 9, y: p.y + 4, class: "lc-value" }, svg, fmt(p.ms));
      }
    }
    focusRing = el("circle", { r: 7, class: "lc-focus", visibility: "hidden" }, svg);
    if (active >= 0) show(active);
  }

  function show(i) {
    active = i;
    const p = points[i];
    focusRing.setAttribute("cx", p.x);
    focusRing.setAttribute("cy", p.y);
    focusRing.setAttribute("visibility", "visible");
    tipValue.textContent = fmt(p.ms);
    tipLabel.textContent = `Sent ${p.t.toFixed(1)} s in, ${phaseAt(p.t)[2]}`;
    tip.hidden = false;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max(p.x, half), width - half)}px`;
    tip.style.top = `${p.y}px`;
  }

  function hide() {
    active = -1;
    tip.hidden = true;
    focusRing?.setAttribute("visibility", "hidden");
  }

  function nearest(e) {
    const box = svg.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    let best = -1, bestD = 32 * 32; // anything within 32 px counts
    points.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { best = i; bestD = d; }
    });
    return best;
  }

  root.addEventListener("pointermove", (e) => {
    const i = nearest(e);
    if (i < 0) hide();
    else if (i !== active) show(i);
  });
  root.addEventListener("pointerleave", () => { if (document.activeElement !== root) hide(); });
  root.addEventListener("focus", () => show(active >= 0 ? active : 0));
  root.addEventListener("blur", hide);
  root.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    let i = active;
    if (step) i = Math.min(Math.max(active + step, 0), points.length - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = points.length - 1;
    else if (e.key === "Escape") return hide();
    else return;
    e.preventDefault();
    show(i);
    status.textContent = `${tipValue.textContent}. ${tipLabel.textContent}.`;
  });

  root.append(tip, status);
  root.tabIndex = 0;
  render();
  new ResizeObserver(() => { if (root.clientWidth !== width) render(); }).observe(root);

  // Table view: every request, so no value depends on hovering.
  const tbody = document.querySelector("#latency-table tbody");
  if (tbody) {
    for (const p of points) {
      const row = tbody.insertRow();
      row.insertCell().textContent = p.t.toFixed(2);
      row.insertCell().textContent = fmt(p.ms);
      row.insertCell().textContent = phaseAt(p.t)[1];
      row.cells[0].className = row.cells[1].className = "num";
    }
    tbody.closest("details")?.removeAttribute("hidden"); // hidden until it has rows
  }
})();
