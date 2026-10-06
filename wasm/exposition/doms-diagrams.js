// Builds every diagram on doms.html from the toy model in doms-model.js.
// All numbers, openings, optimal solutions and example states are computed, never typed in.
(function () {
  "use strict";
  const M = window.DomsModel;

  const BOARDS = {
    // 9 x 7, 12 mines (19%). The running example.
    running: [".*.......", ".......*.", "...**....", "...*.....", ".......**", "*..**...*", "........*"],
    // 8 x 6, 9 mines. Has an island wedged between two openings.
    between: ["....*...", "........", "*...**..", ".*....*.", ".*.*....", "......*."],
    // 10 x 6, 11 mines. Has an opening spanning seven columns.
    wide: ["..........", ".*........", ".**..*.*..", "..*.*.....", "....*.....", "..*...*.*."],
    // 3 x 3. The centre 6 has three mines that no other candidate needs.
    private6: ["..*", "*.*", "***"],
  };

  const CHAIN_COLOURS = ["#8e24aa", "#ef6c00", "#d81b60", "#6d4c41", "#7cb342", "#c9a000", "#3949ab"];
  const FLAG_BADGE = "#c62828";
  const LEFT_BADGE = "#2e7d32";
  const CHORD_BADGE = "#6a1b9a";
  const SOLVED_TINT = "rgba(46, 160, 67, 0.3)";
  const REMOVED_A = "#c62828";
  const REMOVED_C = "#6a1b9a";

  // ---------- small DOM helpers ----------

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null || value === false) continue;
        if (key === "class") el.className = value;
        else if (key === "style") for (const [prop, v] of Object.entries(value)) el.style.setProperty(prop, v);
        else if (key === "html") el.innerHTML = value;
        else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value);
      }
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  const row = (...children) => h("div", { class: "row" }, ...children);
  const rowCenter = (...children) => h("div", { class: "row center" }, ...children);
  const arrow = (text) => h("div", { class: "arrow" }, text || "→");

  function figure(caption, ...children) {
    return h("figure", { class: "diagram" }, ...children, caption ? h("figcaption", { html: caption }) : null);
  }

  const byNumber = (a, b) => a - b;
  const uniqueSorted = (list) => [...new Set(list)].sort(byNumber);

  function cn(board, cell) {
    return M.cellName(board, cell);
  }

  function candName(board, c) {
    return cn(board, board.candidates[c]);
  }

  function candAt(board, x, y) {
    return board.candOf[board.cellAt(x, y)];
  }

  // ---------- boards ----------

  function overlays(d) {
    if (!d) return [];
    const out = [];
    if (d.tint) out.push(h("div", { class: "overlay", style: { background: d.tint } }));
    for (const ring of d.rings || (d.ring ? [{ colour: d.ring, dashed: d.dashed, thin: d.thin }] : [])) {
      out.push(
        h("div", {
          class: "ring" + (ring.dashed ? " dashed" : "") + (ring.thin ? " thin" : ""),
          style: { "--ring-colour": ring.colour },
        })
      );
    }
    if (d.cross) out.push(h("div", { class: "cross", style: { "--cross": d.cross === true ? REMOVED_A : d.cross } }));
    if (d.badge !== undefined && d.badge !== null) {
      out.push(h("div", { class: "badge", style: { "--badge": d.badgeColor || "#333" } }, d.badge));
    }
    if (d.badge2 !== undefined && d.badge2 !== null) {
      out.push(h("div", { class: "badge br", style: { "--badge": d.badge2Color || "#333" } }, d.badge2));
    }
    if (d.label) out.push(h("div", { class: "label" }, d.label));
    return out;
  }

  function mergeDecorations(...list) {
    const out = {};
    for (const d of list) {
      if (!d) continue;
      for (const [key, value] of Object.entries(d)) {
        if (key === "rings") out.rings = [...(out.rings || []), ...value];
        else if (key === "ring") out.rings = [...(out.rings || []), { colour: value, dashed: d.dashed, thin: d.thin }];
        else if (key !== "dashed" && key !== "thin") out[key] = value;
      }
    }
    return out;
  }

  function numberSpan(value) {
    return h("span", { class: "n" + value }, value);
  }

  // opts: cell, revealed (bool[]), flagged (Set of cells), decorate(cell) -> decoration, axes, title
  function renderBoard(board, opts) {
    const o = opts || {};
    const size = o.cell || 28;
    const grid = h("div", {
      class: "board" + (o.axes ? " axes" : ""),
      style: { "--w": board.w, "--cell": size + "px" },
    });
    if (o.axes) {
      grid.append(h("div"));
      for (let x = 0; x < board.w; x++) grid.append(h("div", { class: "axis top" }, x));
    }
    for (let y = 0; y < board.h; y++) {
      if (o.axes) grid.append(h("div", { class: "axis" }, y));
      for (let x = 0; x < board.w; x++) grid.append(renderCell(board, y * board.w + x, o));
    }
    return h("div", { class: "board-wrap" }, o.title ? h("div", { class: "panel-title", html: o.title }) : null, grid);
  }

  function renderCell(board, i, o) {
    const flagged = o.flagged ? o.flagged.has(i) : false;
    const cell = h("div", { class: "cell" });
    const isRevealed = o.revealed ? o.revealed[i] : !board.mine[i];
    if (!isRevealed) cell.classList.add("hidden");
    if (flagged) cell.append(h("span", { class: "flag" }, "⚑"));
    else if (board.mine[i] && !o.revealed) cell.append(h("div", { class: "mine-dot" }));
    else if (isRevealed && board.num[i] > 0) cell.append(numberSpan(board.num[i]));
    const d = o.decorate ? o.decorate(i) : null;
    if (d && d.passHighlight) cell.classList.add("pass-highlight");
    if (d && d.title) cell.title = d.title;
    cell.append(...overlays(d));
    return cell;
  }

  function legend(items) {
    return h(
      "div",
      { class: "legend" },
      items.map(([decoration, text, content]) =>
        h("span", { class: "item" }, h("span", { class: "swatch" }, content || null, ...overlays(decoration)), text)
      )
    );
  }

  // ---------- tables, chips, charts ----------

  function table(headers, rows) {
    return h(
      "table",
      { class: "facts" },
      h("tr", {}, headers.map((text) => h("th", { html: text }))),
      rows.map((cells) => h("tr", {}, cells.map((cell) => (cell instanceof Node ? h("td", {}, cell) : h("td", { html: String(cell) })))))
    );
  }

  const tick = (ok) => h("span", { class: ok ? "ok" : "fail" }, ok ? "✓" : "✗");

  function chips(list, cls) {
    if (!list.length) return h("span", { class: "small" }, "none");
    return h("span", {}, list.map((text) => h("span", { class: "chip" + (cls ? " " + cls : "") }, text)));
  }

  function chart(title, values, opts) {
    const o = opts || {};
    const max = o.max || Math.max(1, ...values);
    const scale = (v) => (o.log ? Math.log(v + 1) / Math.log(max + 1) : v / max);
    return h(
      "div",
      { class: "chart", style: { "--chart-h": (o.height || 80) + "px" } },
      h("div", { class: "chart-title", html: title }),
      h(
        "div",
        { class: "bars" },
        values.map((v, i) =>
          h("div", {
            class: "bar" + (o.mark === i ? " mark" : ""),
            title: `${o.xLabel || "after decision"} ${i + 1}: ${v}`,
            style: { height: Math.max(0, scale(v) * 100) + "%", "--bar": o.colour || "#6b8cff" },
          })
        )
      ),
      h("div", { class: "axis-note" }, h("span", {}, o.left || "first candidate"), h("span", {}, o.right || `max ${max}${o.log ? " (log scale)" : ""}`))
    );
  }

  const sum = (values) => values.reduce((a, b) => a + b, 0);

  // ---------- model helpers used by several diagrams ----------

  const cache = {};
  function running() {
    if (!cache.running) {
      const board = M.analyse(BOARDS.running);
      const order = M.columnOrder(board);
      const prep = M.prepare(board, order);
      const optimum = M.solveDP(board, order, { prune: "basic" });
      const evaluation = M.evaluate(board, optimum.chords);
      cache.running = { board, order, prep, optimum, evaluation, clicks: M.clickSequence(board, evaluation) };
    }
    return cache.running;
  }

  function factorLabel(board, factor) {
    if (factor.kind === "mine") return "⚑ " + cn(board, factor.cell);
    const unit = board.units[factor.unit];
    return unit.kind === "island" ? "island " + cn(board, unit.cell) : "opening at " + cn(board, unit.click);
  }

  // Unfinished chains (members + reach) after `decided` candidates, coloured like the state card.
  function frontierView(board, prep, decided, chords) {
    const chorded = chords.filter((c) => prep.posOf[c] >= 0 && prep.posOf[c] < decided);
    const state = M.stateAfter(prep, decided, chorded);
    const components = M.evaluate(board, chorded).chains.map((members) => ({
      members,
      reach: uniqueSorted(members.flatMap((c) => prep.reveals[prep.posOf[c]]).filter((q) => q >= decided)),
    }));
    const colourOfKey = new Map(state.chains.map((reach, index) => [reach.join(","), CHAIN_COLOURS[index % CHAIN_COLOURS.length]]));
    components.forEach((component) => {
      component.colour = component.reach.length ? colourOfKey.get(component.reach.join(",")) : "#666";
    });
    return { state, components, chorded, decided };
  }

  function frontierDecorate(board, prep, view, extra) {
    const memberColour = new Map();
    const reachColour = new Map();
    for (const component of view.components) {
      component.members.forEach((c) => memberColour.set(board.candidates[c], component.colour));
      component.reach.forEach((q) => {
        const cell = board.candidates[prep.order[q]];
        if (!reachColour.has(cell)) reachColour.set(cell, component.colour);
      });
    }
    const hits = new Set(view.state.hits);
    const activeMine = new Map();
    const activeUnitCells = new Map();
    prep.factors.forEach((factor, fi) => {
      if (!M.isActive(factor, view.decided)) return;
      if (factor.kind === "mine") activeMine.set(factor.cell, hits.has(fi));
      else board.units[factor.unit].cells.forEach((cell) => activeUnitCells.set(cell, hits.has(fi)));
    });
    return (cell) => {
      const c = board.candOf[cell];
      const d = {};
      if (c >= 0 && prep.posOf[c] >= 0 && prep.posOf[c] < view.decided) d.tint = "var(--decided)";
      if (activeUnitCells.has(cell)) d.tint = activeUnitCells.get(cell) ? SOLVED_TINT : "rgba(240, 140, 0, 0.25)";
      const rings = [];
      if (memberColour.has(cell)) rings.push({ colour: memberColour.get(cell) });
      if (reachColour.has(cell)) rings.push({ colour: reachColour.get(cell), dashed: true });
      if (activeMine.has(cell) && !activeMine.get(cell)) rings.push({ colour: "#c62828", thin: true, dashed: true });
      if (rings.length) d.rings = rings;
      if (c >= 0 && prep.posOf[c] === view.decided) d.label = "next";
      return extra ? mergeDecorations(d, extra(cell)) : d;
    };
  }

  function frontierFlags(prep, view) {
    const hits = new Set(view.state.hits);
    const flags = new Set();
    prep.factors.forEach((factor, fi) => {
      if (factor.kind === "mine" && hits.has(fi)) flags.add(factor.cell);
    });
    return flags;
  }

  const frontierLegend = () =>
    legend([
      [{ tint: "var(--decided)" }, "decided candidate"],
      [{ ring: CHAIN_COLOURS[0] }, "chorded (colour = chain)"],
      [{ ring: CHAIN_COLOURS[0], dashed: true }, "undecided cell the chain can still reveal"],
      [{}, "active mine already flagged", h("span", { class: "flag", style: { "font-size": "14px" } }, "⚑")],
      [{ ring: "#c62828", thin: true, dashed: true }, "active mine not flagged yet"],
      [{ tint: SOLVED_TINT }, "active 3BV unit already solved"],
      [{ tint: "rgba(240, 140, 0, 0.25)" }, "active 3BV unit not solved yet"],
    ]);

  // opts: title, highlight (fi -> "pen" | "bon"), deltas (array of strings), dead, strong
  function stateCard(board, prep, state, decided, opts) {
    const o = opts || {};
    const hits = new Set(state.hits);
    const active = prep.factors.map((factor, fi) => [factor, fi]).filter(([factor]) => M.isActive(factor, decided));
    return h(
      "div",
      { class: "card" + (o.dead ? " dead" : "") + (o.strong ? " highlight" : "") },
      o.title ? h("h4", { html: o.title }) : null,
      h("div", {}, "cost so far: ", h("span", { class: "cost" }, state.cost)),
      o.deltas && o.deltas.length ? h("div", { class: "section small" }, o.deltas.map((text) => h("div", { html: text }))) : null,
      h(
        "div",
        { class: "section" },
        h("div", { class: "section-title" }, "unfinished chains → cells they can still reveal"),
        state.chains.length
          ? state.chains.map((reach, index) =>
              h(
                "div",
                {},
                h("span", { class: "dot", style: { background: CHAIN_COLOURS[index % CHAIN_COLOURS.length] } }),
                chips(reach.map((q) => candName(board, prep.order[q])))
              )
            )
          : h("div", { class: "small" }, "none")
      ),
      h(
        "div",
        { class: "section" },
        h("div", { class: "section-title" }, "active factors (✓ = already flagged / solved)"),
        active.length
          ? active.map(([factor, fi]) => {
              const extra = o.highlight && o.highlight.get(fi);
              const cls = extra || (hits.has(fi) ? "yes" : "no");
              return h("span", { class: "chip " + cls }, factorLabel(board, factor) + (hits.has(fi) ? " ✓" : " ✗"));
            })
          : h("div", { class: "small" }, "none")
      )
    );
  }

  function stepDeltas(board, prep, k, chord, result) {
    const lines = [];
    if (chord) lines.push("+1 chord click");
    if (result.newMines.length) {
      lines.push(`+${result.newMines.length} new flag${result.newMines.length > 1 ? "s" : ""}: ${result.newMines.map((fi) => cn(board, prep.factors[fi].cell)).join(" ")}`);
    }
    if (result.newUnits.length) {
      lines.push(`−${result.newUnits.length} 3BV click${result.newUnits.length > 1 ? "s" : ""} saved: ${result.newUnits.map((fi) => factorLabel(board, prep.factors[fi])).join(", ")}`);
    }
    if (result.finished) lines.push(`+${result.finished} seed click${result.finished > 1 ? "s" : ""} (chain can no longer grow)`);
    if (result.absorbed && result.absorbed.length) lines.push("+1 opening absorption");
    if (!lines.length) lines.push("no change in cost");
    return lines;
  }

  // Replays a DP layer by layer, calling `visit(k, table, prep)` on the merged (unpruned) table.
  function scanLayers(board, order, prune, visit) {
    let stop = false;
    M.solveDP(board, order, {
      prune,
      onRaw: (k, table, prep) => {
        if (!stop && visit(k, table, prep) === true) stop = true;
      },
    });
  }

  const registry = {};
  const register = (name, build) => (registry[name] = build);

  // =====================================================================
  // Section 1: walkthrough
  // =====================================================================

  function unitDecorate(board) {
    return (cell) => {
      if (board.mine[cell]) return null;
      if (board.zeroOpening[cell] >= 0 || board.openingsOfCell[cell].length) return { tint: "var(--opening)" };
      if (board.isIsland[cell]) return { ring: "var(--island)", thin: true };
      return null;
    };
  }

  register("problem", () => {
    const { board } = running();
    const islands = board.units.length - board.openings.length;
    const mines = board.mineCells.length;
    return figure(
      `The running example: ${board.w}×${board.h} with ${mines} mines (${Math.round((100 * mines) / (board.w * board.h))}% density). ` +
        `Its 3BV is ${board.openings.length} openings + ${islands} islands = <b>${board.bbbv}</b>, ` +
        `so without chording it takes ${board.bbbv} left clicks.`,
      row(
        renderBoard(board, { decorate: unitDecorate(board), axes: true }),
        h(
          "div",
          {},
          table(
            ["", "count"],
            [
              ["openings (one 3BV each)", board.openings.length],
              ["islands (one 3BV each)", islands],
              ["3BV", board.bbbv],
              ["numbered safe cells = chord candidates", board.candidates.length],
            ]
          ),
          legend([
            [{ tint: "var(--opening)" }, "opening (zeros + its border numbers)"],
            [{ ring: "var(--island)", thin: true }, "island (number not touching a zero)"],
          ])
        )
      )
    );
  });

  register("chord", () => {
    const { board } = running();
    const c = candAt(board, 6, 1);
    const cell = board.candidates[c];
    const mines = board.M[c];
    const clicks = [{ type: "left", cell }, ...mines.map((m) => ({ type: "flag", cell: m })), { type: "chord", cell }];
    const frames = [1, 1 + mines.length, clicks.length].map((upto, index) => {
      const sim = M.simulate(board, clicks, upto);
      const flagged = new Set();
      sim.flagged.forEach((f, i) => f && flagged.add(i));
      const titles = ["1. left click c", `2. flag ${mines.map((m) => cn(board, m)).join(" ")}`, "3. chord c"];
      return renderBoard(board, {
        cell: 22,
        revealed: sim.revealed,
        flagged,
        title: titles[index],
        decorate: (i) => (i === cell ? { label: "c", ring: "#000", thin: true } : null),
      });
    });
    const unitNames = board.B[c].map((u) => (board.units[u].kind === "opening" ? "opening at " + cn(board, board.units[u].click) : "island " + cn(board, board.units[u].cell)));
    const nSet = new Set(board.N[c].map((d) => board.candidates[d]));
    const adjacent = new Set(board.neighbours[cell]);
    const summary = renderBoard(board, {
      cell: 22,
      title: "what DOMS records about c",
      decorate: (i) => {
        if (i === cell) return { label: "c", ring: "#000" };
        if (mines.includes(i)) return { ring: "#c62828" };
        if (nSet.has(i)) return { ring: CHAIN_COLOURS[0], dashed: !adjacent.has(i) };
        return null;
      },
    });
    return figure(
      `Chording c = ${cn(board, cell)} needs ${mines.length} flag${mines.length > 1 ? "s" : ""} (<b>M(c)</b>). ` +
        `One of its neighbours is a zero, so the whole opening floods. That solves <b>B(c)</b> = {${unitNames.join(", ")}} and reveals ` +
        `the ${board.N[c].length} candidates in <b>N(c)</b>: solid rings are c's own neighbours, dashed rings are the opening's other border cells.`,
      h("div", { class: "row" }, ...frames, summary),
      legend([
        [{ ring: "#c62828" }, "M(c): mines that must be flagged"],
        [{ ring: CHAIN_COLOURS[0] }, "N(c): adjacent candidate"],
        [{ ring: CHAIN_COLOURS[0], dashed: true }, "N(c): revealed through the opening"],
      ])
    );
  });

  function solutionDecorate(board, evaluation, clicks) {
    const leftNumbers = new Map();
    const chordNumbers = new Map();
    clicks.forEach((click, index) => {
      const target = click.type === "chord" ? chordNumbers : leftNumbers;
      target.set(click.cell, [...(target.get(click.cell) || []), index + 1]);
    });
    const chainColour = new Map();
    evaluation.chains.forEach((chain, index) => chain.forEach((c) => chainColour.set(board.candidates[c], CHAIN_COLOURS[index % CHAIN_COLOURS.length])));
    return (cell) => {
      const d = {};
      if (chainColour.has(cell)) d.ring = chainColour.get(cell);
      if (leftNumbers.has(cell)) {
        d.badge = leftNumbers.get(cell).join(",");
        d.badgeColor = board.mine[cell] ? FLAG_BADGE : LEFT_BADGE;
      }
      if (chordNumbers.has(cell)) {
        d.badge2 = chordNumbers.get(cell).join(",");
        d.badge2Color = CHORD_BADGE;
      }
      return d;
    };
  }

  function clickLegend() {
    return legend([
      [{ badge: "3", badgeColor: FLAG_BADGE }, "flag, with click number"],
      [{ badge: "3", badgeColor: LEFT_BADGE }, "left click"],
      [{ badge2: "3", badge2Color: CHORD_BADGE }, "chord"],
      [{ ring: CHAIN_COLOURS[0] }, "chorded cell (colour = chain)"],
    ]);
  }

  register("solution", () => {
    const { board, evaluation, clicks } = running();
    const leftovers = evaluation.unsolved.map((u) => board.units[u]);
    const list = h(
      "ol",
      { class: "small", style: { "column-count": "2", margin: "0" } },
      clicks.map((click) => {
        const kind = click.type === "flag" ? "flag" : click.type === "chord" ? "chord" : click.seed ? "left (seed)" : "left (3BV)";
        return h("li", {}, `${kind} ${cn(board, click.cell)}`);
      })
    );
    return figure(
      `An optimal solution for the running example (found by the toy DP on this page): <b>${evaluation.total}</b> clicks instead of ${board.bbbv}. ` +
        `Leftover 3BV clicks: ${leftovers.map((u) => (u.kind === "opening" ? "opening" : "island") + " " + cn(board, u.click)).join(", ") || "none"}.`,
      row(
        renderBoard(board, { decorate: solutionDecorate(board, evaluation, clicks), flagged: new Set(evaluation.flags), axes: true }),
        h(
          "div",
          {},
          table(
            ["term", "clicks"],
            [
              ["chords |S|", evaluation.chords.length],
              ["flags (distinct mines next to S)", evaluation.flags.length],
              ["seed left clicks (one per chain)", evaluation.chains.length],
              ["3BV units no chain solves", evaluation.unsolved.length],
              ["<b>total</b>", `<b>${evaluation.total}</b>`],
            ]
          ),
          list
        )
      ),
      clickLegend()
    );
  });

  register("replay", () => {
    const { board, clicks } = running();
    const frames = clicks.map((click, index) => {
      const sim = M.simulate(board, clicks, index + 1);
      const flagged = new Set();
      sim.flagged.forEach((f, i) => f && flagged.add(i));
      return h(
        "div",
        { class: "frame" },
        renderBoard(board, {
          cell: 13,
          revealed: sim.revealed,
          flagged,
          decorate: (i) => (i === click.cell ? { ring: click.type === "chord" ? CHORD_BADGE : click.type === "flag" ? FLAG_BADGE : LEFT_BADGE } : null),
        }),
        h("div", {}, `${index + 1}. ${click.type} ${cn(board, click.cell)}`)
      );
    });
    const final = M.simulate(board, clicks);
    return figure(
      `Replaying the ${clicks.length} clicks on a real board. The replay ${final.complete && !final.error ? "reveals every safe cell" : "FAILED: " + final.error}. ` +
        "The page checks the model this way; solution.rs does the same in <code>validate_clicks</code>.",
      h("div", { class: "filmstrip" }, frames)
    );
  });

  register("sweep", () => {
    const { board, order } = running();
    const rowsOrder = M.rowOrder(board);
    const panel = (title, list) => {
      const position = new Map(list.map((c, p) => [board.candidates[c], p + 1]));
      return renderBoard(board, {
        title,
        decorate: (cell) => (position.has(cell) ? { badge: position.get(cell), badgeColor: "#3559c7" } : null),
      });
    };
    return figure(
      `The ${board.candidates.length} candidates numbered in two sweep orders. Deciding "chord or not" for every candidate is ` +
        `2<sup>${board.candidates.length}</sup> ≈ ${(2 ** board.candidates.length).toExponential(1)} combinations, so the DP decides them one at a time in a fixed order.`,
      row(panel("column sweep (x, then y)", order), panel("row sweep (y, then x)", rowsOrder))
    );
  });

  function frontierExample() {
    const { board, order, prep, optimum } = running();
    const decided = Math.floor(order.length * 0.45);
    return { board, prep, decided, view: frontierView(board, prep, decided, optimum.chords) };
  }

  register("frontier", () => {
    const { board, prep, decided, view } = frontierExample();
    return figure(
      `The DP after ${decided} of ${prep.count} decisions, following the optimal solution. Everything to the left of the sweep is forgotten ` +
        "except what the card on the right records: the chains that can still grow and the mine/3BV factors that still have undecided candidates. " +
        "Every history that produces the same card is interchangeable from here on.",
      row(
        renderBoard(board, { decorate: frontierDecorate(board, prep, view), flagged: frontierFlags(prep, view), axes: true }),
        stateCard(board, prep, view.state, decided, { title: `state after ${decided} decisions` })
      ),
      frontierLegend()
    );
  });

  register("step", () => {
    const { board, prep, decided, view } = frontierExample();
    const { optimum } = running();
    const next = prep.order[decided];
    const skip = M.step(prep, view.state, decided, false);
    const take = M.step(prep, view.state, decided, true);
    const optimalChords = optimum.chords.includes(next);
    return figure(
      `Deciding candidate ${candName(board, next)} (marked "next" above) turns one state into two. ` +
        `The optimal solution ${optimalChords ? "chords it" : "does not chord it"}. ` +
        "A chain is only charged its seed click once it can no longer reveal anything undecided.",
      rowCenter(
        stateCard(board, prep, view.state, decided, { title: "parent" }),
        arrow("⇉"),
        h(
          "div",
          { class: "row" },
          stateCard(board, prep, skip.state, decided + 1, {
            title: `skip ${candName(board, next)}`,
            deltas: stepDeltas(board, prep, decided, false, skip),
            strong: !optimalChords,
          }),
          stateCard(board, prep, take.state, decided + 1, {
            title: `chord ${candName(board, next)}`,
            deltas: stepDeltas(board, prep, decided, true, take),
            strong: optimalChords,
          })
        )
      )
    );
  });

  function historyBoard(board, prep, decided, chords, title) {
    const view = frontierView(board, prep, decided, chords);
    return renderBoard(board, {
      cell: 20,
      title,
      decorate: frontierDecorate(board, prep, view),
      flagged: frontierFlags(prep, view),
    });
  }

  register("merge", () => {
    const { board, order } = running();
    let best = null;
    // Built by hand rather than with solveDP so both colliding histories are visible.
    const prep = M.prepare(board, order);
    let table = new Map([["|", M.initialState(prep)]]);
    for (let k = 0; k < prep.count; k++) {
      const next = new Map();
      for (const state of table.values()) {
        for (const chord of [false, true]) {
          const result = M.step(prep, state, k, chord).state;
          const key = M.stateKey(result);
          const existing = next.get(key);
          if (existing && existing.chords.join() !== result.chords.join()) {
            const diff = existing.chords.filter((c) => !result.chords.includes(c)).length + result.chords.filter((c) => !existing.chords.includes(c)).length;
            const score = diff * 100 + Math.abs(k - prep.count / 2) + (existing.cost === result.cost ? 50 : 0);
            if (existing.chords.length && result.chords.length && (!best || score < best.score)) best = { k, a: existing, b: result, score };
          }
          if (!existing || result.cost < existing.cost) next.set(key, result);
        }
      }
      table = next;
    }
    if (!best) return figure("No collision found on this board.");
    const decided = best.k + 1;
    const [cheap, dear] = best.a.cost <= best.b.cost ? [best.a, best.b] : [best.b, best.a];
    const only = (x, y) => x.chords.filter((c) => !y.chords.includes(c)).map((c) => candName(board, c));
    const extraA = only(cheap, dear);
    const extraB = only(dear, cheap);
    const difference = extraA.length
      ? `History A chords ${extraA.join(", ")} where history B chords ${extraB.join(", ") || "nothing"}.`
      : `History B additionally chords ${extraB.join(", ")}. By now every effect of that chord is either settled or also produced by other chords.`;
    return figure(
      `Two different histories after ${decided} decisions. ${difference} Their cards are identical, so every future costs the same extra for both ` +
        `and the table keeps only the cheaper (cost ${cheap.cost} vs ${dear.cost}).`,
      rowCenter(
        historyBoard(board, prep, decided, cheap.chords, `history A (cost ${cheap.cost}) — kept`),
        historyBoard(board, prep, decided, dear.chords, `history B (cost ${dear.cost}) — merged away`),
        arrow("⇒"),
        stateCard(board, prep, cheap, decided, { title: "shared state" })
      ),
      frontierLegend()
    );
  });

  function findDominance(board, order, predicate) {
    let found = null;
    scanLayers(board, order, "basic", (k, table, prep) => {
      const decided = k + 1;
      const groups = new Map();
      for (const state of table.values()) {
        const key = M.signatureKey(state);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(state);
      }
      for (const group of groups.values()) {
        for (const a of group) {
          for (const b of group) {
            if (a === b) continue;
            const result = predicate(prep, a, b, decided);
            if (result && (!found || result.score < found.score)) found = Object.assign({ prep, a, b, decided }, result);
          }
        }
      }
      return false;
    });
    return found;
  }

  function penaltyTable(board, prep, dominator, target, penalty) {
    const aHits = new Set(dominator.hits);
    const bHits = new Set(target.hits);
    const matched = new Map();
    penalty.matches.forEach(([p, q]) => {
      matched.set(p, q);
      matched.set(q, p);
    });
    const rows = [...penalty.penalty, ...penalty.bonus].map((fi) => {
      const factor = prep.factors[fi];
      const isPenalty = penalty.penalty.includes(fi);
      let why;
      if (factor.kind === "mine") {
        why = aHits.has(fi) ? "A already flagged it: B may pay 1 later that A won't" : "B already flagged it: A may pay 1 later that B won't";
      } else {
        why = aHits.has(fi) ? "A already solved it: B may save 1 later that A can't" : "B already solved it: A may save 1 later that B can't";
      }
      const remaining = factor.positions.filter((q) => q >= prep.decided).map((q) => candName(board, prep.order[q]));
      return [
        factorLabel(board, factor),
        aHits.has(fi) ? "✓" : "✗",
        bHits.has(fi) ? "✓" : "✗",
        (isPenalty ? '<span class="fail">counts against A</span>' : '<span class="ok">only helps A (ignored)</span>') + "<br>" + why,
        remaining.join(" ") + (matched.has(fi) ? `<br><b>cancels with ${factorLabel(board, prep.factors[matched.get(fi)])}</b>` : ""),
      ];
    });
    return table(["factor", "A", "B", "effect on “A is never worse than B”", "undecided candidates that can still hit it"], rows);
  }

  register("dominance", () => {
    const { board, order } = running();
    const found = findDominance(board, order, (prep, a, b, decided) => {
      const penalty = M.factorPenalty(prep, a, b, decided, false);
      const allowance = b.cost - a.cost;
      if (allowance < 0 || penalty.value > allowance || !penalty.penalty.length) return null;
      return { penalty, score: Math.abs(penalty.penalty.length - 1) * 10 + penalty.bonus.length + (b.cost - a.cost) };
    });
    if (!found) return figure("No example found.");
    const { prep, a, b, decided, penalty } = found;
    prep.decided = decided;
    const allowance = b.cost - a.cost;
    return figure(
      `Pass 1 of <code>prune_dominated</code> on a real pair from layer ${decided}: same chains, different factor hits. ` +
        `A is ${allowance} cheaper, and at worst the future can recover ${penalty.value} of that for B (the red rows). ` +
        `${penalty.value} ≤ ${allowance}, so B can never beat A and is deleted.`,
      rowCenter(
        historyBoard(board, prep, decided, a.chords, `A (cost ${a.cost})`),
        historyBoard(board, prep, decided, b.chords, `B (cost ${b.cost})`)
      ),
      penaltyTable(board, prep, a, b, penalty)
    );
  });

  register("coarsen", () => {
    const box = (name, colour, cells) => h("div", { class: "setbox", style: { "--c": colour } }, h("div", { class: "name" }, name), cells.join("  "));
    return figure(
      "Pass 2 compares states whose chains differ. Left: chains {p,q} and {r} will need two seed clicks unless the future joins them. " +
        "Right: one chain can reach all three, so any future that works on the left works at least as well on the right. " +
        "The matching rule rejects a coarse chain that contains none of the fine chains, because nothing on the left would pay for its seed.",
      rowCenter(
        h("div", {}, h("div", { class: "panel-title" }, "finer state"), box("chain 1", CHAIN_COLOURS[0], ["p", "q"]), h("br"), box("chain 2", CHAIN_COLOURS[1], ["r"])),
        arrow("is dominated by"),
        h("div", {}, h("div", { class: "panel-title" }, "coarser state (same total reach)"), box("chain 1", CHAIN_COLOURS[2], ["p", "q", "r"])),
        h("div", { style: { width: "30px" } }),
        h(
          "div",
          {},
          h("div", { class: "panel-title" }, "not a valid coarsening"),
          box("chain 1", CHAIN_COLOURS[2], ["p", "q", "r"]),
          h("br"),
          box("chain 2", CHAIN_COLOURS[3], ["q"]),
          h("div", { class: "small" }, "chain 2 has no fine chain inside it")
        )
      )
    );
  });

  register("pass2-cost", () => {
    const stage = (title, body, colour) =>
      h(
        "div",
        { class: "card", style: { "border-top": `4px solid ${colour}`, "min-width": "210px", "max-width": "260px" } },
        h("h4", {}, title),
        h("div", { class: "small", html: body })
      );
    return figure(
      "Pass 2 narrows the search from all state pairs to a small set of candidates. Each filter is a sound reason to skip a comparison; the matching test is the final exact check.",
      rowCenter(
        stage("1. sort", "Earlier states are the only possible dominators. The key starts with <code>cost + 3BV hits</code>.", "#3559c7"),
        arrow("→"),
        stage("2. cheap bounds", "Reject by quasi-score, bucket, chain count, or sorted reach sizes before touching the chain bitsets.", "#e08a00"),
        arrow("→"),
        stage("3. exact test", "Run the Kuhn matching test: every fine chain must be covered by a distinct coarse chain.", "#2e9e57")
      ),
      table(
        ["filter", "what it proves", "what remains"],
        [
          ["sort key", "a later state cannot be a cheaper dominator", "earlier states"],
          ["quasi-score", "factor costs already exceed the available allowance", "plausible costs"],
          ["total reach", "the two signatures do not reach the same future cells", "same-reach buckets"],
          ["sizes and chain count", "there cannot be a one-to-one coarsening", "possible coarsenings"],
          ["matching", "the coarse chains really cover the fine chains", "states eligible for dominance"],
        ]
      )
    );
  });

  register("layers", () => {
    const { board, order } = running();
    const plain = M.solveDP(board, order, { prune: "none" });
    const pruned = M.solveDP(board, order, { prune: "basic" });
    const widths = M.cutWidths(board, order);
    const total = widths.connectivity.map((c, i) => c + widths.factors[i]);
    const max = Math.max(...plain.counts, ...pruned.counts);
    return figure(
      `States per layer on the running example with the toy DP. Merging alone peaks at ${Math.max(...plain.counts)} states; ` +
        `with pass-1 dominance it peaks at ${Math.max(...pruned.counts)} (${sum(pruned.counts)} states in total vs ${sum(plain.counts)}). ` +
        "The bottom chart is the structural cut width the order estimator uses: state counts grow roughly exponentially in it.",
      chart("merging only", plain.counts, { max, log: true }),
      chart("merging + pass-1 dominance", pruned.counts, { max, log: true, colour: "#2e9e57" }),
      chart("cut width = connectivity + active factors", total, { colour: "#e08a00", height: 60 })
    );
  });

  register("orders", () => {
    const board = M.analyse(M.randomRows(30, 16, 99, 1));
    const width = (order) => {
      const w = M.cutWidths(board, order);
      return w.connectivity.map((c, i) => c + w.factors[i]);
    };
    const columns = width(M.columnOrder(board));
    const rows = width(M.rowOrder(board));
    const max = Math.max(...columns, ...rows);
    return figure(
      `Cut widths of a random expert board (30×16, 99 mines) for the two plain sweeps. Rows are 30 long and columns 16, so the column sweep has ` +
        `a narrower frontier (max ${Math.max(...columns)} vs ${Math.max(...rows)}). order.rs also tries bands and "smart" per-line orders and keeps the narrowest.`,
      chart("column sweep", columns, { max, colour: "#e08a00", height: 70 }),
      chart("row sweep", rows, { max, colour: "#b0607a", height: 70 })
    );
  });

  register("limits", () => {
    const outcome = (title, colour, text) =>
      h(
        "div",
        { class: "card", style: { "border-top": `4px solid ${colour}`, "min-width": "250px", "max-width": "360px" } },
        h("h4", {}, title),
        h("div", { class: "small", html: text })
      );
    return figure(
      "The two limits have different meanings. The comparison budget may reduce pruning; the state limit is an explicit failure rather than an approximate answer.",
      rowCenter(
        outcome("comparison cap: 1,000,000", "#e08a00", "A comparison is either a sound proof that one state can be deleted or it is not attempted. When the budget is exhausted, unchecked states stay alive."),
        arrow("→"),
        outcome("more survivors", "#3559c7", "The next layer may be slower or larger. Nothing has been incorrectly discarded, so an eventual completed answer is still optimal."),
        arrow("or"),
        outcome("state limit: 2,000,000", "#c62828", "If a layer still exceeds the limit after pruning, DOMS stops and reports an error. It never returns the best partial state as a solution.")
      ),
      table(
        ["resource", "checked when", "effect on correctness"],
        [
          ["dominance comparisons", "while pruning each layer", '<span class="ok">may keep extra states; no effect on exactness</span>'],
          ["live states", "after pruning each layer", '<span class="fail">explicitly fails if exceeded</span>'],
        ]
      )
    );
  });

  register("transition-cache", () => {
    const signature = h(
      "div",
      { class: "setbox", style: { "--c": "#3559c7", "min-width": "200px" } },
      h("div", { class: "name" }, "signature id 17"),
      h("div", {}, "chain A → {p, r}"),
      h("div", {}, "chain B → {q}")
    );
    const state = (title, cost, factors) =>
      h(
        "div",
        { class: "card", style: { "min-width": "190px", "max-width": "230px" } },
        h("h4", {}, title),
        h("div", {}, "signature: ", h("b", {}, "17")),
        h("div", {}, "cost: ", h("b", {}, cost)),
        h("div", { class: "section small" }, "factor bits: ", chips(factors))
      );
    const transition = h(
      "div",
      { class: "card highlight", style: { "min-width": "245px", "max-width": "290px" } },
      h("h4", {}, "cached once for signature 17"),
      h("div", { class: "section" }, "skip next candidate → signature 21; finish 0 chains"),
      h("div", { class: "section" }, "chord next candidate → signature 24; finish 0 chains")
    );
    return figure(
      "Three states share the same chain signature, so the layer computes its skip/chord connectivity transition once. Their factor bits and costs still produce separate next states.",
      row(
        h("div", {}, state("state A", 42, ["mine m ✓", "opening o ✗"]), state("state B", 43, ["mine m ✗", "opening o ✗"]), state("state C", 44, ["mine m ✓", "opening o ✓"])),
        arrow("→"),
        h("div", {}, signature, h("div", { class: "small", style: { "margin-top": "8px" } }, "one interned chain description")),
        arrow("→"),
        transition
      ),
      legend([
        [{ tint: "#eef3ff" }, "states differ in cost and factor bits"],
        [{ ring: "#3559c7" }, "one shared connectivity signature"],
        [{ tint: "#e3f4e6" }, "cached chain-only transition"],
      ])
    );
  });

  // =====================================================================
  // Section 2: minesweeper-level ideas already in DOMS
  // =====================================================================

  register("units", () => {
    const { board, evaluation } = running();
    const island = evaluation.chords.find((c) => board.isIsland[board.candidates[c]]);
    const border = candAt(board, 6, 1);
    const panel = (c, title) => {
      const unitCells = new Set(board.B[c].flatMap((u) => board.units[u].cells));
      const cell = board.candidates[c];
      return renderBoard(board, {
        title,
        cell: 24,
        flagged: new Set(board.M[c]),
        decorate: (i) => mergeDecorations(unitCells.has(i) ? { tint: SOLVED_TINT } : null, i === cell ? { label: "c", ring: "#000" } : null),
      });
    };
    const panels = [panel(border, `border c = ${candName(board, border)}`)];
    if (island !== undefined) panels.push(panel(island, `island c = ${candName(board, island)}`));
    return figure(
      "Green = the 3BV units the chord solves (B(c)). An opening counts once however many of its cells the chord touches. " +
        "An island counts itself, because a chorded island is either the chain's seed (so its own click is the seed) or revealed by a neighbouring chord. " +
        panelsText(board, [border, island].filter((c) => c !== undefined)),
      row(...panels)
    );
  });

  function panelsText(board, list) {
    return list
      .map((c) => {
        const net = board.B[c].length - board.M[c].length - 2;
        return `${candName(board, c)} solves ${board.B[c].length} and needs ${board.M[c].length} flag(s); as a chain on its own (seed + chord + flags) it saves ${net} click(s) net.`;
      })
      .join(" ");
  }

  register("hub", () => {
    const { board } = running();
    const c = candAt(board, 6, 1);
    const cell = board.candidates[c];
    const adjacent = new Set(board.neighbours[cell]);
    const nCells = new Set(board.N[c].map((d) => board.candidates[d]));
    const opening = board.openingsOfCell[cell][0];
    const borders = board.openings[opening].borders;
    return figure(
      `Chording any border cell of an opening floods it and reveals every other border cell, so all ${borders.length} border cells of this opening ` +
        "reveal each other. In the model they are all in each other's N(c), and at most one unfinished chain can ever contain one of them.",
      row(
        renderBoard(board, {
          decorate: (i) => {
            if (i === cell) return { label: "c", ring: "#000", tint: "var(--opening)" };
            const d = {};
            if (board.zeroOpening[i] === opening || borders.includes(i)) d.tint = "var(--opening)";
            if (nCells.has(i)) d.ring = CHAIN_COLOURS[0];
            if (nCells.has(i) && !adjacent.has(i)) d.dashed = true;
            return d;
          },
          axes: true,
        })
      ),
      legend([
        [{ ring: CHAIN_COLOURS[0] }, "in N(c) because adjacent"],
        [{ ring: CHAIN_COLOURS[0], dashed: true }, "in N(c) only through the opening"],
      ])
    );
  });

  register("window", () => {
    const { board, prep } = running();
    const candidatesFactors = prep.factors
      .map((factor, fi) => [factor, fi])
      .filter(([factor]) => factor.kind === "mine" && factor.positions.length >= 4)
      .sort((a, b) => b[0].last - b[0].first - (a[0].last - a[0].first));
    const [factor] = candidatesFactors[Math.floor(candidatesFactors.length / 2)] || candidatesFactors[0];
    const position = new Map(factor.positions.map((p) => [board.candidates[prep.order[p]], p + 1]));
    const ticks = [];
    for (let p = 0; p < prep.count; p++) {
      const inWindow = p >= factor.first && p < factor.last;
      ticks.push(h("div", { class: "tick" + (factor.positions.includes(p) ? " hit" : "") + (inWindow ? " active" : ""), title: `after decision ${p + 1}` }, p + 1));
    }
    return figure(
      `The mine at ${cn(board, factor.cell)} can only be flagged by chording one of its ${factor.positions.length} numbered neighbours, which the column sweep ` +
        `decides at positions ${factor.positions.map((p) => p + 1).join(", ")}. DOMS only stores a "flagged yet?" bit for it between the first and the last of those ` +
        `(${factor.last - factor.first} of ${prep.count} cuts). Before, it can't have been flagged; after, its cost is already in the total.`,
      row(
        renderBoard(board, {
          decorate: (i) => {
            if (i === factor.cell) return { ring: "#c62828" };
            if (position.has(i)) return { badge: position.get(i), badgeColor: "#e08a00" };
            return null;
          },
        })
      ),
      h("div", { class: "timeline" }, ticks),
      legend([
        [{ tint: "#ffd08a" }, "a decision that could flag this mine"],
        [{ tint: "#c9d7ff" }, "cuts where the bit is remembered"],
      ])
    );
  });

  register("liability", () => {
    return figure(
      "How pass 1 reasons about factor bits, in minesweeper terms. Only the two red cases can ever make the currently cheaper state lose its lead, " +
        "so the cheaper state wins as soon as its lead covers the red cases.",
      table(
        ["A (cheaper) vs B", "what it means", "can B catch up?"],
        [
          ["B has flagged a mine A hasn't", "if a later chord needs that mine, A pays 1 more right click", '<span class="fail">yes, by 1</span>'],
          ["A has solved a 3BV unit B hasn't", "a later chord may solve it for B, saving B a left click A already spent", '<span class="fail">yes, by 1</span>'],
          ["A has flagged a mine B hasn't", "flag already paid; it can only help A", '<span class="ok">no</span>'],
          ["B has solved a 3BV unit A hasn't", "B's saving is already in B's cost; A might still collect it", '<span class="ok">no</span>'],
        ]
      )
    );
  });

  register("geometry", () => {
    const board = M.analyse(M.randomRows(30, 16, 99, 1));
    const panel = (order, title) => {
      const prep = M.prepare(board, order);
      const decided = Math.floor(order.length * 0.45);
      const frontier = new Set();
      order.forEach((c, p) => {
        if (p >= decided) return;
        if (prep.reveals[p].some((q) => q >= decided)) frontier.add(board.candidates[c]);
      });
      const activeMines = new Set(prep.factors.filter((f) => f.kind === "mine" && M.isActive(f, decided)).map((f) => f.cell));
      return {
        el: renderBoard(board, {
          cell: 14,
          title,
          decorate: (cell) => {
            const c = board.candOf[cell];
            const d = {};
            if (c >= 0 && prep.posOf[c] < decided) d.tint = "var(--decided)";
            if (frontier.has(cell)) d.ring = "#3559c7";
            if (activeMines.has(cell)) d.ring = "#c62828";
            return d;
          },
        }),
        frontier: frontier.size,
        mines: activeMines.size,
      };
    };
    const columns = panel(M.columnOrder(board), "column sweep, 45% decided");
    const rows = panel(M.rowOrder(board), "row sweep, 45% decided");
    return figure(
      `Because a chord only reaches its 8 neighbours, the part of the past that still matters is a band about two cells deep along the sweep line. ` +
        `Here the column sweep has ${columns.frontier} decided candidates that can still reveal something undecided and ${columns.mines} active mines; ` +
        `the row sweep has ${rows.frontier} and ${rows.mines}.`,
      h("div", { class: "row" }, columns.el, rows.el),
      legend([
        [{ tint: "var(--decided)" }, "decided"],
        [{ ring: "#3559c7" }, "decided candidate still touching the undecided side"],
        [{ ring: "#c62828" }, "active mine"],
      ])
    );
  });

  // =====================================================================
  // Section 3: ideas not in DOMS yet
  // =====================================================================

  function footprint(board, c) {
    const cell = board.candidates[c];
    return new Set([cell, ...board.neighbours[cell].filter((i) => !board.mine[i])]);
  }

  function conditionTable(board, c, d, kept) {
    const checks = M.swapRule(board, c, d, kept);
    const list = (cells) => cells.map((i) => cn(board, i)).join(" ") || "∅";
    const units = (us) => us.map((u) => (board.units[u].kind === "opening" ? "opening@" : "island ") + cn(board, board.units[u].click)).join(", ") || "∅";
    const names = (cs) => cs.map((x) => candName(board, x)).join(" ") || "∅";
    return table(
      ["condition", "c", "d", ""],
      [
        ["M(d) ⊆ M(c)<br><span class='small'>d needs no extra flags</span>", list(board.M[c]), list(board.M[d]), tick(checks.mines)],
        ["B(c) ⊆ B(d)<br><span class='small'>d solves everything c does</span>", units(board.B[c]), units(board.B[d]), tick(checks.bbbv)],
        ["N(c) \\ {d} ⊆ N(d)<br><span class='small'>d reveals everything c does</span>", names(board.N[c].filter((x) => x !== d)), names(board.N[d]), tick(checks.reveals)],
      ]
    );
  }

  function swapFigure(board, c, d, caption) {
    const kept = new Set(board.candidates.map((_, i) => i));
    const cCells = footprint(board, c);
    const dCells = footprint(board, d);
    const panel = (x, cells, title, colour) =>
      renderBoard(board, {
        title,
        cell: 24,
        flagged: new Set(board.M[x]),
        decorate: (i) =>
          mergeDecorations(
            cells.has(i) ? { tint: colour } : null,
            board.zeroOpening[i] >= 0 && board.B[x].some((u) => board.units[u].kind === "opening" && board.units[u].cells.includes(i)) ? { tint: colour } : null,
            i === board.candidates[c] ? { label: "c" } : null,
            i === board.candidates[d] ? { label: "d" } : null
          ),
      });
    return figure(
      caption,
      row(
        panel(c, cCells, `chord c = ${candName(board, c)}`, "rgba(239, 108, 0, 0.3)"),
        panel(d, dCells, `chord d = ${candName(board, d)}`, "rgba(53, 89, 199, 0.28)"),
        conditionTable(board, c, d, kept)
      ),
      legend([
        [{ tint: "rgba(239, 108, 0, 0.3)" }, "cells chording c reveals directly"],
        [{ tint: "rgba(53, 89, 199, 0.28)" }, "cells chording d reveals directly"],
        [{}, "flags each chord needs", h("span", { class: "flag", style: { "font-size": "14px" } }, "⚑")],
      ])
    );
  }

  register("blindspot", () => {
    const { board, prep, optimum } = running();
    const c = candAt(board, 2, 6);
    const d = candAt(board, 2, 5);
    const decided = Math.max(prep.posOf[c], prep.posOf[d]) + 1;
    const base = optimum.chords.filter((x) => x !== c && x !== d);
    const withC = [...base, c];
    const withD = [...base, d];
    const viewC = frontierView(board, prep, decided, withC);
    const viewD = frontierView(board, prep, decided, withD);
    const same = M.signatureKey(viewC.state) === M.signatureKey(viewD.state);
    return figure(
      `Two histories that differ only in chording c = ${candName(board, c)} or d = ${candName(board, d)} (everything else as in the optimal solution). ` +
        `Chording d is never worse, but the DP can't see that: the states ${same ? "share" : "have different"} chains ` +
        `and different factor hits, so they are ${same ? "compared by pass 1 only" : "never compared"} and both lines survive until their chains finish.`,
      row(
        h("div", {}, renderBoard(board, { cell: 22, title: `chord c (cost ${viewC.state.cost})`, decorate: frontierDecorate(board, prep, viewC, (i) => (i === board.candidates[c] ? { label: "c" } : i === board.candidates[d] ? { label: "d" } : null)), flagged: frontierFlags(prep, viewC) })),
        stateCard(board, prep, viewC.state, decided, { title: "chord c" }),
        h("div", {}, renderBoard(board, { cell: 22, title: `chord d (cost ${viewD.state.cost})`, decorate: frontierDecorate(board, prep, viewD, (i) => (i === board.candidates[c] ? { label: "c" } : i === board.candidates[d] ? { label: "d" } : null)), flagged: frontierFlags(prep, viewD) })),
        stateCard(board, prep, viewD.state, decided, { title: "chord d" })
      ),
      frontierLegend()
    );
  });

  register("swap-edge", () => {
    const { board } = running();
    const c = candAt(board, 2, 6);
    const d = candAt(board, 2, 5);
    return swapFigure(
      board,
      c,
      d,
      "Board edge. c is on the edge and d is the cell directly inward. d's three far-side neighbours contain no mine, so c and d need exactly the same flags " +
        "and d reveals a superset of what c reveals. Any solution that chords c can chord d instead (or just drop c if it already chords d)."
    );
  });

  register("swap-opening", () => {
    const { board } = running();
    const c = candAt(board, 4, 1);
    const d = candAt(board, 5, 1);
    return swapFigure(
      board,
      c,
      d,
      "Straight opening edge. Both cells border the same opening, so both chords flood it. c's only private outer cell is a mine, while d's private outer cell is safe. " +
        "d needs a subset of c's flags and reveals more."
    );
  });

  function nothingNewFigure(board, c, caption) {
    const kept = new Set(board.candidates.map((_, i) => i));
    const checks = M.leftClickEquivalentRule(board, c, kept, true);
    const cell = board.candidates[c];
    const nCells = new Set(board.N[c].map((x) => board.candidates[x]));
    const units = board.B[c].map((u) => (board.units[u].kind === "opening" ? "opening@" : "island ") + cn(board, board.units[u].click)).join(", ");
    const openingsOfN = uniqueSorted(board.N[c].flatMap((x) => board.openingsOfCell[board.candidates[x]]));
    return h(
      "div",
      {},
      row(
        renderBoard(board, {
          cell: 24,
          title: `c = ${candName(board, c)}`,
          decorate: (i) =>
            mergeDecorations(
              board.zeroOpening[i] >= 0 || board.openingsOfCell[i].length ? { tint: "var(--opening)" } : null,
              nCells.has(i) ? { ring: CHAIN_COLOURS[0], dashed: !board.neighbours[cell].includes(i) } : null,
              i === cell ? { label: "c", ring: "#000" } : null
            ),
        }),
        table(
          ["condition", "here", ""],
          [
            ["|B(c)| ≤ 2 + private credit", `${units}; budget ${checks.budget}`, tick(checks.budget >= board.B[c].length)],
            ["every independent set I obeys |I| + uncovered B(c) ≤ budget", `${board.N[c].length} kept revealers`, tick(checks.valid)],
            ["private mines are credited", `${checks.privateMines} private mine${checks.privateMines === 1 ? "" : "s"}`, tick(checks.privateMines >= 0)],
          ]
        )
      ),
      h("p", { class: "small", html: caption })
    );
  }

  register("nothing-new", () => {
    const { board } = running();
    const between = M.analyse(BOARDS.between);
    const private6 = M.analyse(BOARDS.private6);
    return figure(
      "Three cells the strengthened Rule C can remove. Rings show N(c) (dashed = reached only through an opening).",
      nothingNewFigure(board, candAt(board, 7, 6), "A border cell whose local revealers leave no independent set that exceeds the two-click budget."),
      nothingNewFigure(board, candAt(board, 0, 0), "A corner island whose revealers cover the same local work. Rule C checks all independent subsets rather than only triples."),
      nothingNewFigure(between, candAt(between, 4, 1), "An island wedged between two openings. Private mines, when present, increase the budget because dropping c also saves those flags."),
      nothingNewFigure(private6, candAt(private6, 1, 1), "A 6 in a U-shaped mine pocket at the lower wall. Three mines are private to c, so its replacement budget is 2 + 3 = 5 rather than 2.")
    );
  });

  function reductionDecorate(board, removed, latestPass) {
    const latest = latestPass || new Set();
    return (cell) => {
      const c = board.candOf[cell];
      if (c < 0 || !removed.has(c)) return null;
      const reason = removed.get(c);
      return {
        cross: reason.rule === "A" ? REMOVED_A : REMOVED_C,
        passHighlight: latest.has(c),
        title:
          reason.rule === "A"
            ? "swap rule: " + candName(board, reason.by) + " is never worse"
            : `Rule C: left-click-equivalent${reason.privateMines ? `, ${reason.privateMines} private mine credit` : ""}`,
      };
    };
  }

  register("reduction-running", () => {
    const { board } = running();
    const { removed, kept } = M.reduceCandidates(board);
    const byRule = (rule) => [...removed.values()].filter((r) => r.rule === rule).length;
    const full = M.solveDP(board, M.columnOrder(board), { prune: "basic" });
    const reduced = M.solveDP(board, M.columnOrder(board, kept), { prune: "basic" });
    const max = Math.max(...full.counts, ...reduced.counts);
    return figure(
      `Applying both rules repeatedly to the running example removes ${removed.size} of ${board.candidates.length} candidates ` +
        `(${byRule("A")} by the swap rule, ${byRule("C")} by Rule C). The optimum is unchanged (${full.total} vs ${reduced.total}) while the toy DP ` +
        `handles ${sum(reduced.counts)} states instead of ${sum(full.counts)}. Hover a cross to see why it was removed.`,
      row(renderBoard(board, { decorate: reductionDecorate(board, removed), axes: true }), h("div", { style: { flex: "1", "min-width": "300px" } }, chart("toy DP, all candidates", full.counts, { max, log: true }), chart("toy DP, reduced candidates", reduced.counts, { max, log: true, colour: "#2e9e57" }))),
      legend([
        [{ cross: REMOVED_A }, "removed by the swap rule"],
        [{ cross: REMOVED_C }, "removed by Rule C / left-click equivalent"],
      ])
    );
  });

  register("reduction-live", (container) => {
    const out = h("div");
    const errorOut = h("div", { class: "warn", hidden: true });
    let seed = 1;
    let board = M.analyse(M.randomRows(30, 16, 99, seed));
    let kept = new Set(board.candidates.map((_, c) => c));
    let removed = new Map();
    let latestPass = new Set();
    let source = `random board (seed ${seed})`;

    const draw = () => {
      const byRule = (rule) => [...removed.values()].filter((r) => r.rule === rule).length;
      const edge = [...removed.keys()].filter((c) => {
        const { x, y } = board.xy(board.candidates[c]);
        return x === 0 || y === 0 || x === board.w - 1 || y === board.h - 1;
      }).length;
      const borders = [...removed.keys()].filter((c) => board.openingsOfCell[board.candidates[c]].length).length;
      out.replaceChildren(
        renderBoard(board, { cell: 20, axes: true, decorate: reductionDecorate(board, removed, latestPass) }),
        h(
          "p",
          { class: "small" },
          `${source}: ${removed.size} of ${board.candidates.length} candidates removed (${((100 * removed.size) / board.candidates.length).toFixed(1)}%). ` +
            `Swap rule ${byRule("A")}, Rule C ${byRule("C")}. ${edge} were on the board edge and ${borders} were opening borders.`
          ),
          h("p", { class: "small" }, `The targeted passes use one pass-start snapshot; the fixpoint repeats until stable.`)
      );
    };
    const stats = h("span", { class: "small" });
    const many = () => {
      let removedTotal = 0;
      let candidateTotal = 0;
      for (let s = 1; s <= 50; s++) {
        const board = M.analyse(M.randomRows(30, 16, 99, s));
        removedTotal += M.reduceCandidates(board).removed.size;
        candidateTotal += board.candidates.length;
      }
      stats.textContent = ` Over 50 random expert boards: ${((100 * removedTotal) / candidateTotal).toFixed(1)}% of candidates removed.`;
    };
    const setBoard = (nextBoard, nextSource) => {
      board = nextBoard;
      kept = new Set(board.candidates.map((_, c) => c));
      removed = new Map();
      latestPass = new Set();
      source = nextSource;
      errorOut.hidden = true;
      runFixpoint();
    };
    const runPass = (rule) => {
      const result = M.staticRulePass(board, kept, rule);
      result.removed.forEach((reason, c) => removed.set(c, reason));
      kept = result.kept;
      latestPass = new Set(result.removed.keys());
      draw();
    };
    const runFixpoint = () => {
      const result = M.reduceCandidates(board, kept);
      result.removed.forEach((reason, c) => removed.set(c, reason));
      kept = new Set(result.kept);
      latestPass = new Set();
      draw();
    };
    const load = () => {
      const input = window.prompt("Enter a PTTACG URL or ?b=...&m=... query:");
      if (input === null) return;
      try {
        setBoard(M.analyse(M.parsePttacg(input)), "imported PTTACG board");
      } catch (error) {
        errorOut.textContent = error.message;
        errorOut.hidden = false;
      }
    };
    const clear = () => {
      kept = new Set(board.candidates.map((_, c) => c));
      removed = new Map();
      latestPass = new Set();
      errorOut.hidden = true;
      draw();
    };
    container.append(
      figure(
        "Static-rule explorer. Crosses are candidates removed by the rules. Snapshot buttons evaluate every candidate against the pass-start candidate set, while fixpoint repeats until stable.",
        errorOut,
        h(
          "div",
          { class: "control-row" },
          h("button", { onclick: load }, "load PTTACG"),
          h("button", { onclick: clear }, "clear"),
          h("button", { onclick: () => runPass("swap") }, "swap pass"),
          h("button", { onclick: () => runPass("left-click-equivalent") }, "Rule C + private mines"),
          h("button", { onclick: runFixpoint }, "run fixpoint")
        ),
        h("div", {}, h("button", { onclick: () => ((seed += 1), setBoard(M.analyse(M.randomRows(30, 16, 99, seed)), `random board (seed ${seed})`)) }, "next random board"), " ", h("button", { onclick: many }, "average over 50 boards"), stats),
        out,
        legend([
          [{ cross: REMOVED_A }, "swap rule"],
          [{ cross: REMOVED_C }, "Rule C / left-click equivalent"],
        ])
      )
    );
    setBoard(board, `random board (seed ${seed})`);
    return null;
  });

  function absorptionExample() {
    const board = M.analyse(BOARDS.wide);
    const order = M.columnOrder(board);
    const prep = M.prepare(board, order);
    let best = null;
    board.openings.forEach((opening, id) => {
      const fi = prep.factors.findIndex((f) => f.kind === "unit" && f.isOpening && f.unit === id);
      if (fi < 0) return;
      const factor = prep.factors[fi];
      for (const p of factor.positions) {
        const chord = order[p];
        for (let decided = p + 1; decided <= factor.last; decided++) {
          const state = M.stateAfter(prep, decided, [chord]);
          const remaining = factor.positions.filter((q) => q >= decided);
          const index = state.chains.findIndex((reach) => reach.join() === remaining.join());
          if (index >= 0) {
            const score = -remaining.length;
            if (!best || score < best.score) best = { board, order, prep, fi, chord, decided, state, index, remaining, score };
            break;
          }
        }
      }
    });
    return best;
  }

  register("absorb", () => {
    const ex = absorptionExample();
    if (!ex) return figure("No example found.");
    const { board, prep, fi, chord, decided, state, index } = ex;
    const transformed = {
      chains: state.chains.filter((_, i) => i !== index),
      hits: state.hits.filter((x) => x !== fi),
      cost: state.cost + 1,
      chords: state.chords,
    };
    const viewX = frontierView(board, prep, decided, [chord]);
    const viewY = { state: transformed, components: [], chorded: [], decided };
    const opening = prep.factors[fi];
    return figure(
      `A chord on ${candName(board, chord)} opened the wide opening. After ${decided} decisions the sweep has passed everything near it, and its chain can only ` +
        `grow through the ${ex.remaining.length} undecided border cells of that same opening. That chain is worth exactly "the opening is open", which is worth ` +
        "exactly one click. So the left state is identical to the right state: no chain, opening not solved, cost + 1.",
      rowCenter(
        renderBoard(board, { cell: 22, title: "X: chain + opening solved", decorate: frontierDecorate(board, prep, viewX, (i) => (i === board.candidates[chord] ? { label: "c" } : null)), flagged: frontierFlags(prep, viewX) }),
        stateCard(board, prep, state, decided, { title: `X (cost ${state.cost})` }),
        h("div", { class: "eq" }, "≡"),
        stateCard(board, prep, transformed, decided, { title: `X′ (cost ${transformed.cost})`, highlight: new Map([[fi, "pen"]]) }),
        renderBoard(board, { cell: 22, title: "X′: opening still to click", decorate: frontierDecorate(board, prep, viewY), flagged: frontierFlags(prep, viewY) })
      ),
      table(
        ["the future…", "X pays", "X′ pays", "difference"],
        [
          ["chords no border of " + factorLabel(board, opening), "the chain's seed click: +1", "nothing (the opening stays a 3BV click already counted): 0", "X′ started 1 higher → equal"],
          ["chords some border of it", "0 extra (those chords join the chain through the opening)", "the new chain's seed +1, opening solved −1: 0", "X′ started 1 higher → equal"],
        ]
      )
    );
  });

  register("absorb-chart", () => {
    const boards = [
      ["wide example", M.analyse(BOARDS.wide)],
      ["running example", running().board],
    ];
    return figure(
      "Toy DP states per layer with and without absorption (both with pass-1 dominance). The effect only appears on boards where openings span several sweep lines.",
      boards.map(([name, board]) => {
        const order = M.columnOrder(board);
        const base = M.solveDP(board, order, { prune: "basic" });
        const absorb = M.solveDP(board, order, { prune: "basic", absorb: true });
        const max = Math.max(...base.counts, ...absorb.counts);
        return h(
          "div",
          {},
          h("div", { class: "panel-title" }, `${name}: ${sum(base.counts)} → ${sum(absorb.counts)} states (optimum ${base.total} = ${absorb.total})`),
          chart("pass 1", base.counts, { max, log: true }),
          chart("pass 1 + absorption", absorb.counts, { max, log: true, colour: "#2e9e57" })
        );
      })
    );
  });

  register("cancel", () => {
    const tryBoards = [running().board, M.analyse(BOARDS.wide), M.analyse(BOARDS.between)];
    let found = null;
    for (const board of tryBoards) {
      found = findDominance(board, M.columnOrder(board), (prep, a, b, decided) => {
        const allowance = b.cost - a.cost;
        if (allowance < 0) return null;
        const plain = M.factorPenalty(prep, a, b, decided, false);
        if (plain.value <= allowance) return null;
        const cancel = M.factorPenalty(prep, a, b, decided, true);
        if (cancel.value > allowance) return null;
        return { penalty: cancel, plain, score: plain.penalty.length + plain.bonus.length };
      });
      if (found) {
        found.board = board;
        break;
      }
    }
    if (!found) return figure("No example found on the sample boards.");
    const { board, prep, a, b, decided, penalty, plain } = found;
    prep.decided = decided;
    const [p, q] = penalty.matches[0];
    const cellsOf = (fi) => new Set(prep.factors[fi].positions.filter((x) => x >= decided).map((x) => board.candidates[prep.order[x]]));
    const pCells = cellsOf(p);
    const qCells = cellsOf(q);
    const factorCell = (fi) => (prep.factors[fi].kind === "mine" ? prep.factors[fi].cell : board.units[prep.factors[fi].unit].click);
    const allowance = b.cost - a.cost;
    const lead = allowance === 0 ? "A and B cost the same" : `A is ${allowance} cheaper`;
    return figure(
      `A pair pass 1 keeps today. ${lead}, but the plain count says the future could recover ${plain.value} for B. ` +
        `However, every undecided chord that can hit ${factorLabel(board, prep.factors[p])} (orange) also hits ${factorLabel(board, prep.factors[q])} (blue ⊇ orange), ` +
        `so that cost and that saving always arrive together and cancel. The true worst case is ${penalty.value} ≤ ${allowance}, so B could be deleted.`,
      rowCenter(
        historyBoard(board, prep, decided, a.chords, `A (cost ${a.cost})`),
        historyBoard(board, prep, decided, b.chords, `B (cost ${b.cost})`),
        renderBoard(board, {
          cell: 20,
          title: "undecided candidates that can hit each factor",
          decorate: (i) =>
            mergeDecorations(
              qCells.has(i) ? { tint: "rgba(53, 89, 199, 0.3)" } : null,
              pCells.has(i) ? { ring: "#e08a00" } : null,
              i === factorCell(p) ? { label: "p" } : null,
              i === factorCell(q) ? { label: "q" } : null
            ),
        })
      ),
      penaltyTable(board, prep, a, b, penalty)
    );
  });

  register("cancel-chart", () => {
    const { board, order } = running();
    const wide = M.analyse(BOARDS.wide);
    const rowsOut = [
      ["running example", board, order],
      ["wide example", wide, M.columnOrder(wide)],
    ].map(([name, b, o]) => {
      const base = M.solveDP(b, o, { prune: "basic" });
      const cancel = M.solveDP(b, o, { prune: "cancel" });
      return [name, sum(base.counts), sum(cancel.counts), `${base.total} = ${cancel.total}`];
    });
    return figure(
      "Measured effect of cancellation in the toy DP (pass 1 only). It is exact but, on these boards, small.",
      table(["board", "states, pass 1", "states, pass 1 + cancellation", "optimum"], rowsOut)
    );
  });

  register("superset", () => {
    const { board, prep, optimum } = running();
    let example = null;
    for (let k = 1; k < prep.count && !example; k++) {
      const c = prep.order[k];
      if (!optimum.chords.includes(c)) continue;
      const view = frontierView(board, prep, k, optimum.chords);
      const reachedBy = view.state.chains.filter((reach) => reach.includes(k));
      if (reachedBy.length !== 1) continue;
      const extra = prep.reveals[k].filter((q) => !reachedBy[0].includes(q));
      if (extra.length) example = { k, c, view };
    }
    if (!example) return figure("No example found.");
    const { k, c, view } = example;
    const skip = M.step(prep, view.state, k, false);
    const take = M.step(prep, view.state, k, true);
    const reach = (state) => new Set(state.chains.flat());
    const skipReach = reach(skip.state);
    const takeReach = reach(take.state);
    const panel = (result, title, total) =>
      renderBoard(board, {
        cell: 22,
        title,
        decorate: (i) => {
          const x = board.candOf[i];
          if (x < 0 || prep.posOf[x] < 0) return null;
          const q = prep.posOf[x];
          const d = {};
          if (q <= k) d.tint = "var(--decided)";
          if (total.has(q)) d.ring = CHAIN_COLOURS[0];
          if (total.has(q)) d.dashed = true;
          if (x === c) d.label = "c";
          return d;
        },
      });
    return figure(
      `Chording c = ${candName(board, c)} extends an existing chain, so the "chord" child reaches everything the "skip" child reaches plus more. ` +
        "More reach can never cost a seed click, so the chord child is coarser. But prune.rs only compares signatures with identical total reach, so these two are never compared. " +
        "Allowing a coarser signature with a superset of the reach is still exact.",
      row(
        panel(skip, `skip c: reach ${skipReach.size} cells, cost ${skip.state.cost}`, skipReach),
        panel(take, `chord c: reach ${takeReach.size} cells, cost ${take.state.cost}`, takeReach)
      ),
      legend([[{ ring: CHAIN_COLOURS[0], dashed: true }, "undecided cell a chain can reveal"]])
    );
  });

  function isClique(board, prep, reach) {
    const cands = reach.map((q) => prep.order[q]);
    return cands.every((x, i) => cands.every((y, j) => i === j || board.N[x].includes(y)));
  }

  register("liability-chain", () => {
    const { board, prep, optimum } = running();
    let example = null;
    for (let k = 1; k < prep.count && !example; k++) {
      const view = frontierView(board, prep, k, optimum.chords);
      const index = view.state.chains.findIndex((reach) => reach.length >= 1 && isClique(board, prep, reach));
      if (index >= 0 && view.state.chains.length >= 1) example = { k, view, index };
    }
    if (!example) return figure("No example found.");
    const { k, view, index } = example;
    const reach = view.state.chains[index];
    return figure(
      `After ${k} decisions of the optimal solution, the ${index === 0 ? "first" : "highlighted"} chain can only still reveal ${reach.map((q) => candName(board, prep.order[q])).join(" and ")}` +
        `${reach.length > 1 ? ", which all reveal each other" : ""}. Whatever the future does, that chain can join at most one future component, ` +
        "so it can never save a seed click; it can only cost one. A state without it (otherwise comparable) is never worse, but today's matching " +
        "requires every chain to be covered, so that comparison never happens.",
      row(
        renderBoard(board, { decorate: frontierDecorate(board, prep, view), flagged: frontierFlags(prep, view), axes: true }),
        stateCard(board, prep, view.state, k, { title: `state after ${k} decisions` })
      ),
      frontierLegend()
    );
  });

  register("seed-slack", () => {
    const box = (name, colour, cells) => h("div", { class: "setbox", style: { "--c": colour } }, h("div", { class: "name" }, name), cells.join("  "));
    return figure(
      "A unified form. Compare A (dominator) with B. Match each of A's chains to a distinct chain of B that it contains. " +
        "Charge +1 for each A chain left unmatched (it may need its own seed), and +(α−1) for each B chain no A chain covers, where α is the largest number of " +
        "cells in its reach that don't reveal each other (how many future pieces it could join). A dominates B if its cost lead covers the factor penalty plus these charges.",
      rowCenter(
        h("div", {}, h("div", { class: "panel-title" }, "A"), box("a1", CHAIN_COLOURS[0], ["p", "q", "r"]), h("br"), box("a2 (unmatched)", CHAIN_COLOURS[3], ["s"])),
        arrow("vs"),
        h("div", {}, h("div", { class: "panel-title" }, "B"), box("b1", CHAIN_COLOURS[1], ["p", "q"]), h("br"), box("b2 (not covered, α = 1)", CHAIN_COLOURS[2], ["t"])),
        h("div", { class: "small", style: { "max-width": "260px" } }, "charges: +1 for a2, +0 for b2. A dominates B if cost(B) − cost(A) ≥ factor penalty + 1.")
      )
    );
  });

  register("experiment", (container) => {
    const out = h("div", { class: "small" }, "Not run yet.");
    const seedInput = h("input", { type: "number", value: "1", min: "1", style: { width: "70px" } });
    const run = () => {
      out.textContent = "Running… (this can take a few seconds)";
      setTimeout(() => {
        const seed = Number(seedInput.value) || 1;
        const board = M.analyse(M.randomRows(16, 16, 40, seed));
        const { kept } = M.reduceCandidates(board);
        const variants = [
          ["pass 1 (roughly today's pass 1)", M.columnOrder(board), { prune: "basic" }, "#6b8cff"],
          ["+ Rule A + Rule C (private credit)", M.columnOrder(board, kept), { prune: "basic" }, "#2e9e57"],
          ["+ absorption", M.columnOrder(board), { prune: "basic", absorb: true }, "#e08a00"],
          ["+ cancellation", M.columnOrder(board), { prune: "cancel" }, "#b0607a"],
          ["all three", M.columnOrder(board, kept), { prune: "cancel", absorb: true }, "#333"],
        ];
        const results = variants.map(([name, order, opts, colour]) => {
          const start = performance.now();
          const result = M.solveDP(board, order, opts);
          return { name, colour, result, ms: performance.now() - start };
        });
        const max = Math.max(...results.flatMap((r) => r.result.counts));
        out.replaceChildren(
          table(
            ["variant", "optimum", "total states", "peak states", "time"],
            results.map((r) => [r.name, r.result.total, sum(r.result.counts), Math.max(...r.result.counts), r.ms.toFixed(0) + " ms"])
          ),
          ...results.map((r) => chart(r.name, r.result.counts, { max, log: true, colour: r.colour }))
        );
      }, 20);
    };
    container.append(
      figure(
        "Runs the toy DP on a random intermediate board (16×16, 40 mines). The toy has merging and pass 1 but no pass 2 and no comparison cap, " +
          "so absolute numbers won't match the Rust solver; the relative effect of each idea is what's interesting.",
        h("div", {}, "seed ", seedInput, " ", h("button", { onclick: run }, "run")),
        out
      )
    );
    return null;
  });

  register("selfcheck", (container) => {
    const out = h("div", { class: "small" }, "Not run yet.");
    const run = () => {
      out.textContent = "Running…";
      setTimeout(() => {
        const start = performance.now();
        const result = M.selfCheck({ boards: 150, seed: Math.floor(Math.random() * 1e6) });
        out.innerHTML =
          `${result.checked} random boards checked in ${(performance.now() - start).toFixed(0)} ms: ` +
          (result.failures.length ? `<span class="fail">${result.failures.length} failures</span> (see console)` : '<span class="ok">no failures</span>');
        if (result.failures.length) console.log(result.failures);
      }, 20);
    };
    container.append(
      figure(
        "For random small boards: brute force over every chord set, replay of the resulting clicks on a real board, the toy DP with every combination " +
          "of pruning / absorption / cancellation, and brute force restricted to the candidates the static rules keep. All must agree.",
        h("button", { onclick: run }, "run self-check"),
        out
      )
    );
    return null;
  });

  // =====================================================================
  // Section 4: choosing the sweep order
  // =====================================================================

  const PLAIN_PATH = "#e08a00";
  const SMART_PATH = "#2e9e57";
  const SIZES = { expert: [30, 16, 99], intermediate: [16, 16, 40] };

  function totalWidths(board, order) {
    const widths = M.cutWidths(board, order);
    return widths.connectivity.map((c, i) => c + widths.factors[i]);
  }

  register("cut-anatomy", () => {
    const { board, order, prep } = running();
    const widths = M.cutWidths(board, order);
    const total = widths.connectivity.map((c, i) => c + widths.factors[i]);
    const cut = total.indexOf(Math.max(...total));
    const decided = cut + 1;
    const isDecided = (c) => prep.posOf[c] < decided;
    const boundary = new Set(
      board.candidates
        .map((_, c) => c)
        .filter((c) => isDecided(c) && M.adjacentCandidates(board, c).some((d) => !isDecided(d)))
        .map((c) => board.candidates[c])
    );
    const straddling = board.openings.filter((opening) => {
      const sides = opening.borders.map((cell) => isDecided(board.candOf[cell]));
      return sides.includes(true) && sides.includes(false);
    });
    const straddlingZeros = new Set(straddling.flatMap((opening) => opening.zeros));
    const active = prep.factors.filter((factor) => M.isActive(factor, decided));
    const activeMines = new Set(active.filter((f) => f.kind === "mine").map((f) => f.cell));
    const activeIslands = new Set(active.filter((f) => f.kind === "unit" && !f.isOpening).map((f) => f.cell));
    const activeOpenings = active.filter((f) => f.kind === "unit" && f.isOpening).length;
    const next = board.candidates[order[decided]];
    const merged = M.solveDP(board, order, { prune: "none" }).counts[cut];
    const pruned = M.solveDP(board, order, { prune: "basic" }).counts[cut];
    return figure(
      `The widest cut of the plain column sweep on the running example, after ${decided} of ${order.length} decisions. ` +
        `order.rs counts ${total[cut]} things that link the decided side to the undecided side and treats each as roughly one bit of state, ` +
        `so it expects up to about 2<sup>${total[cut]}</sup> ≈ ${(2 ** total[cut]).toLocaleString()} states. The toy DP actually has ${merged} after merging and ` +
        `${pruned} after pass-1 dominance: the estimate is very loose, but real state counts rise and fall with it (1.11), which is all that's needed to compare orders.`,
      row(
        renderBoard(board, {
          axes: true,
          decorate: (i) => {
            const c = board.candOf[i];
            const d = {};
            if (straddlingZeros.has(i)) d.tint = "var(--opening)";
            if (c >= 0 && isDecided(c)) d.tint = "var(--decided)";
            const rings = [];
            if (boundary.has(i)) rings.push({ colour: "#3559c7" });
            if (activeMines.has(i)) rings.push({ colour: "#c62828" });
            if (activeIslands.has(i)) rings.push({ colour: "var(--island)", thin: true, dashed: true });
            if (rings.length) d.rings = rings;
            if (i === next) d.label = "next";
            return d;
          },
        }),
        table(
          ["", "counted", ""],
          [
            ["connectivity", "decided candidates with an undecided neighbouring candidate (blue)", boundary.size],
            ["", "openings with border candidates on both sides", straddling.length],
            ["factors", "mines with neighbouring candidates on both sides (red)", activeMines.size],
            ["", "islands with solving candidates on both sides (orange)", activeIslands.size],
            ["", "openings with border candidates on both sides, again as 3BV units", activeOpenings],
            ["<b>width</b>", "", `<b>${boundary.size + straddling.length + activeMines.size + activeIslands.size + activeOpenings}</b>`],
          ]
        )
      ),
      legend([
        [{ tint: "var(--decided)" }, "decided candidate"],
        [{ ring: "#3559c7" }, "decided, still touching an undecided candidate"],
        [{ ring: "#c62828" }, "active mine"],
        [{ ring: "var(--island)", thin: true, dashed: true }, "active island"],
        [{ tint: "var(--opening)" }, "zeros of an opening with borders on both sides"],
      ])
    );
  });

  register("smart-lattice", () => {
    const { board } = running();
    const smart = M.smartStripOrder(board, true);
    let best = null;
    for (const line of M.sweepLines(board, true)) {
      if (line.length < 3 || line.length > 5) continue;
      const { connectivity, factors } = M.lineWidths(board, true, line);
      const width = (mask) => connectivity[mask] + factors[mask];
      const inLine = new Set(line);
      const bitOf = new Map(line.map((c, bit) => [c, bit]));
      const prefixes = (list) => {
        let mask = 0;
        return [0, ...list.map((c) => (mask |= 1 << bitOf.get(c)))];
      };
      const plainPath = prefixes(line);
      const smartPath = prefixes(smart.filter((c) => inLine.has(c)));
      const peak = (path) => Math.max(...path.map(width));
      const gain = peak(plainPath) - peak(smartPath);
      if (!best || gain > best.gain) best = { line, width, plainPath, smartPath, peak, gain };
    }
    if (!best) return figure("No example found.");
    const { line, width, plainPath, smartPath, peak } = best;
    const letter = (bit) => "abcde"[bit];
    const name = (mask) => (mask ? line.map((_, bit) => ((mask >> bit) & 1 ? letter(bit) : "")).join("") : "∅");
    const bitCount = (mask) => mask.toString(2).replace(/0/g, "").length;
    const onPlain = new Set(plainPath);
    const onSmart = new Set(smartPath);
    const layers = [];
    for (let size = 0; size <= line.length; size++) {
      const masks = [];
      for (let mask = 0; mask < 1 << line.length; mask++) if (bitCount(mask) === size) masks.push(mask);
      layers.push(
        h(
          "div",
          { class: "lattice-row" },
          masks.map((mask) =>
            h("span", { class: "chip" + (onSmart.has(mask) ? " yes" : ""), style: onPlain.has(mask) ? { outline: `2px dashed ${PLAIN_PATH}` } : null }, `${name(mask)}: ${width(mask)}`)
          )
        )
      );
    }
    const x = board.xy(board.candidates[line[0]]).x;
    const letterOf = new Map(line.map((c, bit) => [board.candidates[c], letter(bit)]));
    const smartLetters = smartPath.slice(1).map((mask, i) => letter(Math.log2(mask ^ smartPath[i])));
    return figure(
      `Column ${x} of the running example has ${line.length} candidates, a–${letter(line.length - 1)} from top to bottom. Each chip is one set of them already decided, ` +
        `with the width of that cut. Columns before ${x} are fully decided and columns after it are untouched, so that set is all the width depends on. ` +
        `Any order of the column is a path from ∅ to ${name((1 << line.length) - 1)} that adds one letter per step. Top to bottom (dashed) peaks at ${peak(plainPath)}. ` +
        `The DP over subsets finds ${smartLetters.join(" → ")} (green), which peaks at ${peak(smartPath)}.`,
      rowCenter(
        renderBoard(board, {
          axes: true,
          cell: 26,
          decorate: (i) => {
            const c = board.candOf[i];
            const d = {};
            if (c >= 0 && board.xy(i).x < x) d.tint = "var(--decided)";
            if (letterOf.has(i)) Object.assign(d, { label: letterOf.get(i), ring: "#3559c7" });
            return d;
          },
        }),
        h("div", {}, layers)
      ),
      legend([
        [{ tint: "var(--decided)" }, "decided before the column starts"],
        [{}, "top-to-bottom path", h("span", { style: { display: "block", width: "100%", height: "100%", outline: `2px dashed ${PLAIN_PATH}` } })],
        [{ tint: "#e3f4e6" }, "path the DP picks"],
      ])
    );
  });

  register("smart-expert", () => {
    const board = M.analyse(M.randomRows(...SIZES.expert, 1));
    const plain = M.stripOrder(board, true, 1);
    const smart = M.smartStripOrder(board, true);
    const lines = M.sweepLines(board, true);
    const rank = new Map();
    let changed = 0;
    let start = 0;
    for (const line of lines) {
      const part = smart.slice(start, start + line.length);
      part.forEach((c, r) => rank.set(board.candidates[c], line.length > 1 ? r / (line.length - 1) : 0));
      if (part.some((c, r) => c !== line[r])) changed++;
      start += line.length;
    }
    const plainWidths = totalWidths(board, plain);
    const smartWidths = totalWidths(board, smart);
    const max = Math.max(...plainWidths, ...smartWidths);
    const ratio = M.widthEstimate(board, plain).work / M.widthEstimate(board, smart).work;
    return figure(
      `The smart column order on a random expert board. Shading shows when each candidate is decided within its own column (light = early, dark = late), ` +
        `so a plain column sweep would be light at the top and dark at the bottom everywhere. ${changed} of ${lines.length} columns use a different order: ` +
        `some run bottom-up, and some start with a group in the middle or at the far end. The widest cut drops from ${Math.max(...plainWidths)} to ` +
        `${Math.max(...smartWidths)}, and the work estimate Σ 2<sup>width</sup> falls by a factor of ${ratio.toFixed(1)}.`,
      renderBoard(board, { cell: 18, decorate: (i) => (rank.has(i) ? { tint: `rgba(53, 89, 199, ${(0.05 + 0.55 * rank.get(i)).toFixed(2)})` } : null) }),
      chart("plain columns", plainWidths, { max, colour: PLAIN_PATH, height: 60 }),
      chart("smart columns", smartWidths, { max, colour: SMART_PATH, height: 60 })
    );
  });

  register("bands", () => {
    const { board } = running();
    const panels = [
      ["columns", true, 1],
      ["columns-band-2", true, 2],
      ["rows-band-4", false, 4],
    ].map(([name, byColumns, size]) => {
      const order = M.stripOrder(board, byColumns, size);
      const position = new Map(order.map((c, p) => [board.candidates[c], p + 1]));
      return renderBoard(board, {
        cell: 26,
        title: `${name}: widest cut ${M.widthEstimate(board, order).maxTotal}`,
        decorate: (i) => (position.has(i) ? { badge: position.get(i), badgeColor: "#3559c7" } : null),
      });
    });
    return figure(
      "Sweep positions for the plain column sweep and two bands. In columns-band-2, columns 0–1 form one band: the sweep walks down it taking both columns " +
        "at each row, then does columns 2–3, and so on. rows-band-4 walks left to right along rows 0–3 taking four cells at each step, then along rows 4–6. " +
        `A band as big as the board is just the other plain sweep: rows-band-${board.h} here is exactly the column sweep.`,
      row(...panels)
    );
  });

  register("orders-live", (container) => {
    let size = "expert";
    const seedInput = h("input", { type: "number", value: "1", min: "1", style: { width: "70px" } });
    const sizeLabel = h("b", {}, size);
    const out = h("div");
    const tallyOut = h("div", { class: "small" });
    const statusText = (entry) => {
      if (entry.status === "chosen") return '<span class="ok">chosen</span>';
      if (entry.status === "kept") return "considered";
      return `${entry.status}: ${entry.reason}`;
    };
    const draw = () => {
      const board = M.analyse(M.randomRows(...SIZES[size], Number(seedInput.value) || 1));
      const { chosen, tried } = M.chooseSweepOrder(board);
      const rows = tried.map((entry) =>
        entry.estimate
          ? [entry.name, entry.estimate.maxTotal, entry.estimate.maxConnectivity, entry.estimate.maxFactors, Math.log2(entry.estimate.work).toFixed(1), statusText(entry)]
          : [entry.name, "", "", "", "", statusText(entry)]
      );
      const shown = tried.filter((entry) => entry === chosen || entry.name === "columns" || entry.name === "rows").map((entry) => [entry.name, totalWidths(board, entry.order)]);
      const max = Math.max(...shown.flatMap(([, widths]) => widths));
      out.replaceChildren(
        table(["order", "widest cut", "widest connectivity", "most active factors", "log₂ work", ""], rows),
        ...shown.map(([name, widths]) => chart(name + (name === chosen.name ? " (chosen)" : ""), widths, { max, height: 50, colour: name === chosen.name ? SMART_PATH : "#6b8cff" }))
      );
    };
    const tally = () => {
      tallyOut.textContent = "Running…";
      setTimeout(() => {
        const count = 40;
        const wins = new Map();
        let narrower = 0;
        let workBits = 0;
        for (let seed = 1; seed <= count; seed++) {
          const { chosen, tried } = M.chooseSweepOrder(M.analyse(M.randomRows(...SIZES[size], seed)));
          const plain = tried.filter((entry) => entry.name === "columns" || entry.name === "rows").sort((a, b) => M.compareEstimates(a.estimate, b.estimate))[0];
          wins.set(chosen.name, (wins.get(chosen.name) || 0) + 1);
          narrower += plain.estimate.maxTotal - chosen.estimate.maxTotal;
          workBits += Math.log2(plain.estimate.work / chosen.estimate.work);
        }
        const list = [...wins].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${name} ×${n}`);
        tallyOut.innerHTML =
          `${size} seeds 1–${count}: chosen ${list.join(", ")}. On average the chosen order's widest cut is ${(narrower / count).toFixed(1)} narrower than the best plain sweep ` +
          `and its work estimate is 2<sup>${(workBits / count).toFixed(1)}</sup> times smaller.`;
      }, 20);
    };
    const setSize = (next) => {
      size = next;
      sizeLabel.textContent = next;
      tallyOut.textContent = "";
      draw();
    };
    seedInput.addEventListener("change", draw);
    draw();
    container.append(
      figure(
        "Every order order.rs tries on a random board, computed by the JavaScript copy of order.rs (which picked the same order as the Rust solver on 63 boards " +
          "checked during development). “log₂ work” is log₂ of Σ 2<sup>width</sup> over all cuts. The charts show the chosen order against the two plain sweeps.",
        h(
          "div",
          {},
          h("button", { onclick: () => setSize("expert") }, "expert"),
          " ",
          h("button", { onclick: () => setSize("intermediate") }, "intermediate"),
          " ",
          sizeLabel,
          ", seed ",
          seedInput,
          " ",
          h("button", { onclick: () => ((seedInput.value = (Number(seedInput.value) || 1) + 1), draw()) }, "next board"),
          " ",
          h("button", { onclick: tally }, "tally 40 boards")
        ),
        tallyOut,
        out
      )
    );
    return null;
  });

  // ---------- boot ----------

  function boot() {
    for (const el of document.querySelectorAll("[data-diagram]")) {
      const build = registry[el.dataset.diagram];
      if (!build) {
        el.textContent = "Unknown diagram " + el.dataset.diagram;
        continue;
      }
      try {
        const result = build(el);
        if (result) el.append(result);
      } catch (error) {
        console.error(error);
        el.append(h("div", { class: "warn" }, "Diagram failed: " + error.message));
      }
    }
    for (const el of document.querySelectorAll("[data-stat]")) {
      const { board, evaluation } = running();
      const stats = { bbbv: board.bbbv, optimum: evaluation.total, candidates: board.candidates.length };
      el.textContent = stats[el.dataset.stat];
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
