// Toy re-implementation of the DOMS model for the exposition page. Runs in the browser and in node.
// Cells are row-major indexes (y * w + x). Candidates are indexes into `board.candidates`.
(function (root) {
  "use strict";

  const OFFSETS = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) OFFSETS.push([dx, dy]);
    }
  }

  const byNumber = (a, b) => a - b;

  function compareArrays(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  }

  function sameArray(a, b) {
    return a.length === b.length && a.every((value, i) => value === b[i]);
  }

  function isSubset(small, big) {
    const set = new Set(big);
    return small.every((value) => set.has(value));
  }

  // `rows` is an array of strings, `*` for a mine and anything else for a safe cell.
  function analyse(rows) {
    const h = rows.length;
    const w = rows[0].length;
    const n = w * h;
    const mine = new Array(n);
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error("ragged board");
      for (let x = 0; x < w; x++) mine[y * w + x] = rows[y][x] === "*";
    }
    const neighbours = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const list = [];
        for (const [dx, dy] of OFFSETS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) list.push(ny * w + nx);
        }
        neighbours.push(list);
      }
    }
    const num = neighbours.map((list, i) => (mine[i] ? -1 : list.filter((j) => mine[j]).length));

    const zeroOpening = new Array(n).fill(-1);
    const openings = [];
    for (let i = 0; i < n; i++) {
      if (mine[i] || num[i] !== 0 || zeroOpening[i] >= 0) continue;
      const id = openings.length;
      const zeros = [];
      const borders = new Set();
      const stack = [i];
      zeroOpening[i] = id;
      while (stack.length) {
        const z = stack.pop();
        zeros.push(z);
        for (const j of neighbours[z]) {
          if (num[j] === 0 && zeroOpening[j] < 0) {
            zeroOpening[j] = id;
            stack.push(j);
          } else if (num[j] > 0) {
            borders.add(j);
          }
        }
      }
      openings.push({ zeros: zeros.sort(byNumber), borders: [...borders].sort(byNumber) });
    }
    const openingsOfCell = Array.from({ length: n }, () => []);
    openings.forEach((opening, id) => opening.borders.forEach((cell) => openingsOfCell[cell].push(id)));
    const isIsland = num.map((value, i) => value > 0 && openingsOfCell[i].length === 0);

    // 3BV units: openings first, then islands, matching the Rust model.
    const units = openings.map((opening, id) => ({
      kind: "opening",
      opening: id,
      cells: [...opening.zeros, ...opening.borders],
      click: opening.zeros[0],
    }));
    const unitOfIsland = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (!isIsland[i]) continue;
      unitOfIsland[i] = units.length;
      units.push({ kind: "island", cell: i, cells: [i], click: i });
    }

    const candidates = [];
    const candOf = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (num[i] > 0) {
        candOf[i] = candidates.length;
        candidates.push(i);
      }
    }
    const M = candidates.map((cell) => neighbours[cell].filter((j) => mine[j]));
    const B = candidates.map((cell) => {
      const set = new Set(openingsOfCell[cell]);
      if (isIsland[cell]) set.add(unitOfIsland[cell]);
      for (const j of neighbours[cell]) if (isIsland[j]) set.add(unitOfIsland[j]);
      return [...set].sort(byNumber);
    });
    const N = candidates.map((cell, c) => {
      const set = new Set();
      for (const j of neighbours[cell]) if (candOf[j] >= 0) set.add(candOf[j]);
      for (const o of openingsOfCell[cell]) for (const border of openings[o].borders) set.add(candOf[border]);
      set.delete(c);
      return [...set].sort(byNumber);
    });
    const mineCells = [];
    for (let i = 0; i < n; i++) if (mine[i]) mineCells.push(i);
    const mineSolvers = mineCells.map((m) =>
      neighbours[m]
        .filter((j) => candOf[j] >= 0)
        .map((j) => candOf[j])
        .sort(byNumber)
    );
    const unitSolvers = units.map((unit) => {
      if (unit.kind === "opening") return openings[unit.opening].borders.map((cell) => candOf[cell]);
      const set = new Set([candOf[unit.cell]]);
      for (const j of neighbours[unit.cell]) if (candOf[j] >= 0) set.add(candOf[j]);
      return [...set].sort(byNumber);
    });

    return {
      rows,
      w,
      h,
      n,
      mine,
      num,
      neighbours,
      zeroOpening,
      openings,
      openingsOfCell,
      isIsland,
      units,
      unitOfIsland,
      bbbv: units.length,
      candidates,
      candOf,
      M,
      B,
      N,
      mineCells,
      mineSolvers,
      unitSolvers,
      xy: (cell) => ({ x: cell % w, y: Math.floor(cell / w) }),
      cellAt: (x, y) => y * w + x,
    };
  }

  function cellName(board, cell) {
    const { x, y } = board.xy(cell);
    return `(${x},${y})`;
  }

  // Click cost of chording exactly `chords` (candidate indexes).
  function evaluate(board, chords) {
    const S = new Set(chords);
    const flags = board.mineCells.filter((m, k) => board.mineSolvers[k].some((c) => S.has(c)));
    const unsolved = [];
    board.unitSolvers.forEach((solvers, u) => {
      if (!solvers.some((c) => S.has(c))) unsolved.push(u);
    });
    const chains = [];
    const seen = new Set();
    for (const start of [...S].sort(byNumber)) {
      if (seen.has(start)) continue;
      seen.add(start);
      const chain = [];
      const stack = [start];
      while (stack.length) {
        const c = stack.pop();
        chain.push(c);
        for (const d of board.N[c]) {
          if (S.has(d) && !seen.has(d)) {
            seen.add(d);
            stack.push(d);
          }
        }
      }
      chains.push(chain.sort(byNumber));
    }
    return {
      chords: [...S].sort(byNumber),
      flags,
      chains,
      unsolved,
      total: S.size + flags.length + chains.length + unsolved.length,
    };
  }

  // Flags first, then each chain (seed left click, chords in BFS order), then leftover 3BV clicks.
  function clickSequence(board, evaluation) {
    const clicks = evaluation.flags.map((cell) => ({ type: "flag", cell }));
    evaluation.chains.forEach((chain, chainIndex) => {
      const inChain = new Set(chain);
      const seed = chain[0];
      const queue = [seed];
      const queued = new Set([seed]);
      const order = [];
      while (queue.length) {
        const c = queue.shift();
        order.push(c);
        for (const d of board.N[c]) {
          if (inChain.has(d) && !queued.has(d)) {
            queued.add(d);
            queue.push(d);
          }
        }
      }
      clicks.push({ type: "left", cell: board.candidates[seed], chain: chainIndex, seed: true });
      for (const c of order) clicks.push({ type: "chord", cell: board.candidates[c], chain: chainIndex });
    });
    for (const u of evaluation.unsolved) clicks.push({ type: "left", cell: board.units[u].click, unit: u });
    return clicks;
  }

  // Plays clicks on a fresh board. Returns what is revealed/flagged after `upto` clicks.
  function simulate(board, clicks, upto) {
    const limit = upto === undefined ? clicks.length : upto;
    const revealed = new Array(board.n).fill(false);
    const flagged = new Array(board.n).fill(false);
    let error = null;
    const reveal = (start) => {
      if (board.mine[start] || flagged[start]) {
        error = error || `revealed a mine or flag at ${cellName(board, start)}`;
        return;
      }
      const stack = [start];
      while (stack.length) {
        const i = stack.pop();
        if (revealed[i]) continue;
        revealed[i] = true;
        if (board.num[i] !== 0) continue;
        for (const j of board.neighbours[i]) if (!revealed[j] && !board.mine[j] && !flagged[j]) stack.push(j);
      }
    };
    for (let k = 0; k < limit && !error; k++) {
      const { type, cell } = clicks[k];
      if (type === "flag") {
        if (!board.mine[cell] || revealed[cell]) error = `illegal flag at ${cellName(board, cell)}`;
        flagged[cell] = true;
      } else if (type === "left") {
        reveal(cell);
      } else {
        const flags = board.neighbours[cell].filter((j) => flagged[j]).length;
        if (!revealed[cell] || board.num[cell] <= 0 || flags !== board.num[cell]) {
          error = `illegal chord at ${cellName(board, cell)}`;
        } else {
          for (const j of board.neighbours[cell]) if (!flagged[j]) reveal(j);
        }
      }
    }
    const complete = revealed.every((value, i) => value || board.mine[i]);
    return { revealed, flagged, error, complete };
  }

  function bruteForce(board, allowed) {
    const list = allowed || board.candidates.map((_, c) => c);
    if (list.length > 20) throw new Error("too many candidates for brute force");
    let best = null;
    for (let mask = 0; mask < 1 << list.length; mask++) {
      const chords = [];
      for (let i = 0; i < list.length; i++) if ((mask >> i) & 1) chords.push(list[i]);
      const evaluation = evaluate(board, chords);
      if (!best || evaluation.total < best.total) best = evaluation;
    }
    return best;
  }

  // ---- Sweep orders and frontier widths ----

  function rowOrder(board, allowed) {
    const list = allowed || board.candidates.map((_, c) => c);
    return [...list].sort(byNumber);
  }

  function columnOrder(board, allowed) {
    const list = allowed || board.candidates.map((_, c) => c);
    return [...list].sort((a, b) => {
      const pa = board.xy(board.candidates[a]);
      const pb = board.xy(board.candidates[b]);
      return pa.x - pb.x || pa.y - pb.y;
    });
  }

  function coverage(intervals, cuts) {
    const diff = new Array(cuts + 1).fill(0);
    for (const [lo, hi] of intervals) {
      diff[lo] += 1;
      diff[hi + 1] -= 1;
    }
    let running = 0;
    return diff.slice(0, cuts).map((value) => (running += value));
  }

  // Width of the cut after each decision, split like the Rust estimator into connectivity and factors.
  function cutWidths(board, order) {
    const prep = prepare(board, order);
    const count = order.length;
    const connectivity = [];
    order.forEach((c, p) => {
      const later = board.neighbours[board.candidates[c]]
        .filter((cell) => board.candOf[cell] >= 0)
        .map((cell) => prep.posOf[board.candOf[cell]])
        .filter((q) => q > p);
      if (later.length) connectivity.push([p, Math.max(...later) - 1]);
    });
    board.openings.forEach((opening) => {
      const ps = opening.borders
        .map((cell) => prep.posOf[board.candOf[cell]])
        .filter((q) => q >= 0)
        .sort(byNumber);
      if (ps.length > 1 && ps[0] < ps[ps.length - 1]) connectivity.push([ps[0], ps[ps.length - 1] - 1]);
    });
    const factors = prep.factors.filter((f) => f.first < f.last).map((f) => [f.first, f.last - 1]);
    const cuts = Math.max(count - 1, 0);
    return { connectivity: coverage(connectivity, cuts), factors: coverage(factors, cuts) };
  }

  // ---- Frontier DP ----

  function prepare(board, order) {
    const posOf = new Array(board.candidates.length).fill(-1);
    order.forEach((c, p) => (posOf[c] = p));
    const reveals = order.map((c, p) =>
      board.N[c]
        .map((d) => posOf[d])
        .filter((q) => q > p)
        .sort(byNumber)
    );
    const factors = [];
    board.mineCells.forEach((cell, k) => {
      const positions = board.mineSolvers[k]
        .map((c) => posOf[c])
        .filter((p) => p >= 0)
        .sort(byNumber);
      if (positions.length) factors.push({ kind: "mine", cell, positions, first: positions[0], last: positions[positions.length - 1] });
    });
    board.units.forEach((unit, u) => {
      const positions = board.unitSolvers[u]
        .map((c) => posOf[c])
        .filter((p) => p >= 0)
        .sort(byNumber);
      if (positions.length) {
        factors.push({
          kind: "unit",
          unit: u,
          isOpening: unit.kind === "opening",
          cell: unit.click,
          positions,
          first: positions[0],
          last: positions[positions.length - 1],
        });
      }
    });
    const factorsAt = order.map(() => []);
    factors.forEach((factor, fi) => factor.positions.forEach((p) => factorsAt[p].push(fi)));
    return { board, order, posOf, reveals, factors, factorsAt, count: order.length };
  }

  // A factor is remembered while some but not all of its candidates are decided.
  function isActive(factor, decided) {
    return factor.first < decided && factor.last >= decided;
  }

  function stateKey(state) {
    return state.chains.map((reach) => reach.join(",")).join(";") + "|" + state.hits.join(",");
  }

  function signatureKey(state) {
    return state.chains.map((reach) => reach.join(",")).join(";");
  }

  function initialState(prep) {
    return { chains: [], hits: [], cost: prep.board.bbbv, chords: [] };
  }

  // Decide candidate at position `k`. Mirrors frontier.rs, plus the optional opening absorption.
  function step(prep, state, k, chord, options) {
    let finished = 0;
    const chains = [];
    let merged = null;
    if (!chord) {
      for (const reach of state.chains) {
        const rest = reach.filter((q) => q !== k);
        if (rest.length) chains.push(rest);
        else finished++;
      }
    } else {
      const set = new Set(prep.reveals[k]);
      for (const reach of state.chains) {
        if (reach.includes(k)) reach.forEach((q) => set.add(q));
        else chains.push(reach);
      }
      set.delete(k);
      if (set.size) {
        merged = [...set].sort(byNumber);
        chains.push(merged);
      } else {
        finished++;
      }
    }
    const hits = new Set(state.hits);
    const newMines = [];
    const newUnits = [];
    if (chord) {
      for (const fi of prep.factorsAt[k]) {
        if (hits.has(fi)) continue;
        hits.add(fi);
        (prep.factors[fi].kind === "mine" ? newMines : newUnits).push(fi);
      }
    }
    let activeHits = [...hits].filter((fi) => isActive(prep.factors[fi], k + 1)).sort(byNumber);
    let cost = state.cost + (chord ? 1 : 0) + finished + newMines.length - newUnits.length;
    const absorbed = [];
    if (options && options.absorb) {
      for (const fi of [...activeHits]) {
        const factor = prep.factors[fi];
        if (factor.kind !== "unit" || !factor.isOpening) continue;
        const remaining = factor.positions.filter((q) => q > k);
        const index = chains.findIndex((reach) => sameArray(reach, remaining));
        if (index < 0) continue;
        chains.splice(index, 1);
        activeHits = activeHits.filter((other) => other !== fi);
        cost += 1;
        absorbed.push(fi);
      }
    }
    chains.sort(compareArrays);
    return {
      state: { chains, hits: activeHits, cost, chords: chord ? [...state.chords, prep.order[k]] : state.chords },
      finished,
      newMines,
      newUnits,
      absorbed,
      merged,
    };
  }

  // State after the first `decided` candidates of the order, given which of them were chorded.
  function stateAfter(prep, decided, chordedCandidates, options) {
    const chorded = new Set(chordedCandidates);
    let state = initialState(prep);
    for (let k = 0; k < decided; k++) state = step(prep, state, k, chorded.has(prep.order[k]), options).state;
    return state;
  }

  // Worst-case future disadvantage of `dominator` relative to `target` from factor hits.
  function factorPenalty(prep, dominator, target, decided, cancel) {
    const dominatorHits = new Set(dominator.hits);
    const targetHits = new Set(target.hits);
    const penalty = [];
    const bonus = [];
    for (const fi of target.hits) {
      if (dominatorHits.has(fi)) continue;
      (prep.factors[fi].kind === "mine" ? penalty : bonus).push(fi);
    }
    for (const fi of dominator.hits) {
      if (targetHits.has(fi)) continue;
      (prep.factors[fi].kind === "mine" ? bonus : penalty).push(fi);
    }
    const matches = [];
    if (cancel) {
      const used = new Set();
      const remaining = (fi) => prep.factors[fi].positions.filter((q) => q >= decided);
      for (const p of penalty) {
        const needed = remaining(p);
        const q = bonus.find((candidate) => !used.has(candidate) && isSubset(needed, remaining(candidate)));
        if (q !== undefined) {
          used.add(q);
          matches.push([p, q]);
        }
      }
    }
    return { penalty, bonus, matches, value: penalty.length - matches.length };
  }

  function dominates(prep, dominator, target, decided, cancel) {
    const allowance = target.cost - dominator.cost;
    if (allowance < 0) return false;
    return factorPenalty(prep, dominator, target, decided, cancel).value <= allowance;
  }

  // Pass 1 only (same signature). The Rust solver also has pass 2 (coarser signatures).
  function pruneLayer(prep, table, decided, cancel) {
    const groups = new Map();
    for (const [key, state] of table) {
      const signature = signatureKey(state);
      if (!groups.has(signature)) groups.set(signature, []);
      groups.get(signature).push([key, state]);
    }
    const unitHits = (state) => state.hits.filter((fi) => prep.factors[fi].kind === "unit").length;
    for (const group of groups.values()) {
      group.sort(([, a], [, b]) => a.cost + unitHits(a) - (b.cost + unitHits(b)) || a.cost - b.cost || b.hits.length - a.hits.length);
      const survivors = [];
      for (const [key, state] of group) {
        if (survivors.some((prior) => dominates(prep, prior, state, decided, cancel))) table.delete(key);
        else survivors.push(state);
      }
    }
  }

  // options: { prune: "none" | "basic" | "cancel", absorb: bool, onRaw(k, table, prep), onLayer(k, table) }
  function solveDP(board, order, options) {
    const opts = options || {};
    const prep = prepare(board, order);
    let table = new Map([["|", initialState(prep)]]);
    const counts = [];
    const rawCounts = [];
    for (let k = 0; k < prep.count; k++) {
      const next = new Map();
      for (const state of table.values()) {
        for (const chord of [false, true]) {
          const result = step(prep, state, k, chord, opts).state;
          const key = stateKey(result);
          const existing = next.get(key);
          if (!existing || result.cost < existing.cost) next.set(key, result);
        }
      }
      rawCounts.push(next.size);
      if (opts.onRaw) opts.onRaw(k, next, prep);
      if (opts.prune && opts.prune !== "none") pruneLayer(prep, next, k + 1, opts.prune === "cancel");
      counts.push(next.size);
      if (opts.onLayer) opts.onLayer(k, next);
      table = next;
    }
    const final = table.get("|");
    return { total: final.cost, chords: [...final.chords].sort(byNumber), counts, rawCounts, prep };
  }

  // ---- Static candidate elimination (not in the Rust solver) ----

  function alphaAtMostTwo(board, list) {
    const set = list.map((c) => new Set(board.N[c]));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (set[i].has(list[j])) continue;
        for (let k = j + 1; k < list.length; k++) {
          if (!set[i].has(list[k]) && !set[j].has(list[k])) return false;
        }
      }
    }
    return true;
  }

  function revealsWithin(board, c, kept) {
    return board.N[c].filter((d) => kept.has(d));
  }

  // Rule A: chording d instead of c is never worse.
  function swapRule(board, c, d, kept) {
    const nd = new Set(revealsWithin(board, d, kept));
    return {
      mines: isSubset(board.M[d], board.M[c]),
      bbbv: isSubset(board.B[c], board.B[d]),
      reveals: revealsWithin(board, c, kept).every((e) => e === d || nd.has(e)),
    };
  }

  // Rule B: chording c never adds anything its revealers don't already give.
  function nothingNewRule(board, c, kept) {
    const reveals = revealsWithin(board, c, kept);
    return {
      small: board.B[c].length <= 2,
      covered: reveals.every((e) => isSubset(board.B[c], board.B[e])),
      splitsAtMostTwo: alphaAtMostTwo(board, reveals),
    };
  }

  const allTrue = (checks) => Object.values(checks).every(Boolean);

  function findSwap(board, c, kept) {
    const { x, y } = board.xy(board.candidates[c]);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= board.w || ny >= board.h) continue;
        const d = board.candOf[board.cellAt(nx, ny)];
        if (d >= 0 && kept.has(d) && allTrue(swapRule(board, c, d, kept))) return d;
      }
    }
    return -1;
  }

  function reduceCandidates(board) {
    const kept = new Set(board.candidates.map((_, c) => c));
    const removed = new Map();
    let changed = true;
    while (changed) {
      changed = false;
      for (let c = 0; c < board.candidates.length; c++) {
        if (!kept.has(c)) continue;
        let reason = null;
        if (allTrue(nothingNewRule(board, c, kept))) {
          reason = { rule: "B" };
        } else {
          const d = findSwap(board, c, kept);
          if (d >= 0) reason = { rule: "A", by: d };
        }
        if (reason) {
          kept.delete(c);
          removed.set(c, reason);
          changed = true;
        }
      }
    }
    return { kept: [...kept].sort(byNumber), removed };
  }

  // ---- Random boards ----

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomRows(w, h, mines, seed) {
    const random = mulberry32(seed);
    const cells = new Array(w * h).fill(false);
    for (let i = 0; i < mines; i++) cells[i] = true;
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const rows = [];
    for (let y = 0; y < h; y++) rows.push(cells.slice(y * w, (y + 1) * w).map((m) => (m ? "*" : ".")).join(""));
    return rows;
  }

  // Cross-checks every claim the page relies on against brute force on random small boards.
  function selfCheck(options) {
    const opts = Object.assign({ boards: 120, seed: 1, maxCandidates: 13 }, options);
    const random = mulberry32(opts.seed);
    const failures = [];
    let checked = 0;
    let attempts = 0;
    while (checked < opts.boards && attempts < opts.boards * 50) {
      attempts++;
      const w = 3 + Math.floor(random() * 4);
      const h = 3 + Math.floor(random() * 4);
      const mines = 1 + Math.floor(random() * Math.floor((w * h) / 3));
      const rows = randomRows(w, h, mines, Math.floor(random() * 1e9));
      const board = analyse(rows);
      if (board.candidates.length > opts.maxCandidates || board.candidates.length === 0) continue;
      checked++;
      const fail = (what, extra) => failures.push({ rows, what, extra });
      const best = bruteForce(board);
      const clicks = clickSequence(board, best);
      const played = simulate(board, clicks);
      if (played.error || !played.complete || clicks.length !== best.total) fail("click sequence", played.error);
      const order = columnOrder(board);
      for (const variant of [
        { prune: "none" },
        { prune: "basic" },
        { prune: "cancel" },
        { prune: "basic", absorb: true },
        { prune: "cancel", absorb: true },
      ]) {
        const dp = solveDP(board, order, variant);
        if (dp.total !== best.total) fail("dp " + JSON.stringify(variant), [dp.total, best.total]);
        if (evaluate(board, dp.chords).total !== dp.total) fail("dp chords " + JSON.stringify(variant));
      }
      const { kept } = reduceCandidates(board);
      const reduced = bruteForce(board, kept);
      if (reduced.total !== best.total) fail("static reduction", [reduced.total, best.total]);
      const reducedDp = solveDP(board, columnOrder(board, kept), { prune: "cancel", absorb: true });
      if (reducedDp.total !== best.total) fail("reduced dp", [reducedDp.total, best.total]);
    }
    return { checked, failures };
  }

  const api = {
    analyse,
    cellName,
    evaluate,
    clickSequence,
    simulate,
    bruteForce,
    rowOrder,
    columnOrder,
    cutWidths,
    prepare,
    isActive,
    step,
    stateAfter,
    stateKey,
    signatureKey,
    initialState,
    factorPenalty,
    dominates,
    solveDP,
    swapRule,
    nothingNewRule,
    reduceCandidates,
    randomRows,
    mulberry32,
    selfCheck,
    isSubset,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DomsModel = api;
})(typeof window !== "undefined" ? window : this);
