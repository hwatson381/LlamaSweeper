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

  // ---- Choosing the sweep order (mirrors order.rs) ----

  function adjacentCandidates(board, c) {
    return board.neighbours[board.candidates[c]].filter((cell) => board.candOf[cell] >= 0).map((cell) => board.candOf[cell]);
  }

  // Lines of `bandSize` columns (or rows), each walked along its length, crossing the band at every step.
  function stripOrder(board, byColumns, bandSize) {
    const key = (c) => {
      const { x, y } = board.xy(board.candidates[c]);
      return byColumns ? [Math.floor(x / bandSize), y, x % bandSize] : [Math.floor(y / bandSize), x, y % bandSize];
    };
    return board.candidates.map((_, c) => c).sort((a, b) => compareArrays(key(a), key(b)));
  }

  function widthEstimate(board, order) {
    const { connectivity, factors } = cutWidths(board, order);
    const estimate = { maxTotal: 0, maxConnectivity: 0, maxFactors: 0, work: 0 };
    connectivity.forEach((c, i) => {
      const total = c + factors[i];
      estimate.maxTotal = Math.max(estimate.maxTotal, total);
      estimate.maxConnectivity = Math.max(estimate.maxConnectivity, c);
      estimate.maxFactors = Math.max(estimate.maxFactors, factors[i]);
      estimate.work += 2 ** Math.min(total, 60);
    });
    return estimate;
  }

  function compareEstimates(a, b) {
    return a.maxTotal - b.maxTotal || a.maxConnectivity - b.maxConnectivity || a.maxFactors - b.maxFactors || a.work - b.work;
  }

  function zeta(counts, bits) {
    for (let bit = 0; bit < bits; bit++) {
      const b = 1 << bit;
      for (let mask = 0; mask < counts.length; mask++) if (mask & b) counts[mask] += counts[mask ^ b];
    }
  }

  function lineNumberOf(board, byColumns) {
    return (c) => {
      const { x, y } = board.xy(board.candidates[c]);
      return byColumns ? x : y;
    };
  }

  // Cut width for every subset `mask` of `line` already decided, with earlier lines decided and later lines not.
  function lineWidths(board, byColumns, line) {
    const lineOf = lineNumberOf(board, byColumns);
    const number = lineOf(line[0]);
    const len = line.length;
    const count = 1 << len;
    const full = count - 1;
    const bitOf = new Map(line.map((c, bit) => [c, bit]));

    const crossing = (sets) => {
      const withEarlier = new Int32Array(count);
      const withLater = new Int32Array(count);
      const onlyHere = new Int32Array(count);
      let always = 0;
      let earlierTotal = 0;
      let laterTotal = 0;
      let hereTotal = 0;
      for (const set of sets) {
        let earlier = false;
        let later = false;
        let mask = 0;
        for (const c of set) {
          const l = lineOf(c);
          if (l < number) earlier = true;
          else if (l > number) later = true;
          else mask |= 1 << bitOf.get(c);
        }
        if (earlier && later) always++;
        else if (earlier) (withEarlier[mask]++, earlierTotal++);
        else if (later) (withLater[mask]++, laterTotal++);
        else if (mask) (onlyHere[mask]++, hereTotal++);
      }
      zeta(withEarlier, len);
      zeta(withLater, len);
      zeta(onlyHere, len);
      const out = new Int32Array(count);
      for (let mask = 0; mask < count; mask++) {
        out[mask] = always + earlierTotal - withEarlier[mask] + laterTotal - withLater[full ^ mask] + hereTotal - onlyHere[mask] - onlyHere[full ^ mask];
      }
      return out;
    };

    const connectivity = crossing(board.openings.map((opening) => opening.borders.map((cell) => board.candOf[cell])));
    const factors = crossing([...board.mineSolvers, ...board.unitSolvers]);

    // A decided candidate stays on the frontier while it has an undecided adjacent candidate.
    const finishedBy = new Int32Array(count);
    let waiting = 0;
    let alwaysWaiting = 0;
    board.candidates.forEach((_, c) => {
      if (lineOf(c) >= number) return;
      let later = false;
      let mask = 0;
      for (const d of adjacentCandidates(board, c)) {
        if (lineOf(d) > number) later = true;
        else if (lineOf(d) === number) mask |= 1 << bitOf.get(d);
      }
      if (later) alwaysWaiting++;
      else if (mask) (finishedBy[mask]++, waiting++);
    });
    zeta(finishedBy, len);
    const sameLine = line.map((c) => adjacentCandidates(board, c).reduce((mask, d) => (bitOf.has(d) ? mask | (1 << bitOf.get(d)) : mask), 0));
    const hasLater = line.map((c) => adjacentCandidates(board, c).some((d) => lineOf(d) > number));
    for (let mask = 0; mask < count; mask++) {
      connectivity[mask] += alwaysWaiting + waiting - finishedBy[mask];
      for (let bit = 0; bit < len; bit++) {
        if ((mask >> bit) & 1 && (hasLater[bit] || sameLine[bit] & ~mask & full)) connectivity[mask]++;
      }
    }
    return { connectivity, factors };
  }

  // Order of `line` whose widest cut is smallest: a DP over which subset of the line is decided so far.
  function bestLineOrder(board, byColumns, line) {
    const { connectivity, factors } = lineWidths(board, byColumns, line);
    const count = 1 << line.length;
    const total = connectivity.map((c, mask) => c + factors[mask]);
    const bestTotal = new Int32Array(count);
    const bestConnectivity = new Int32Array(count);
    const bestFactors = new Int32Array(count);
    const bestWork = new Float64Array(count);
    const lastAdded = new Int8Array(count).fill(-1);
    bestTotal[0] = total[0];
    bestConnectivity[0] = connectivity[0];
    bestFactors[0] = factors[0];
    bestWork[0] = 2 ** Math.min(total[0], 60);
    for (let mask = 1; mask < count; mask++) {
      const work = 2 ** Math.min(total[mask], 60);
      let chosen = -1;
      let t, c, f, w;
      for (let rest = mask; rest; rest &= rest - 1) {
        const bit = 31 - Math.clz32(rest & -rest);
        const prev = mask ^ (1 << bit);
        const nt = Math.max(bestTotal[prev], total[mask]);
        const nc = Math.max(bestConnectivity[prev], connectivity[mask]);
        const nf = Math.max(bestFactors[prev], factors[mask]);
        const nw = bestWork[prev] + work;
        if (chosen < 0 || nt < t || (nt === t && (nc < c || (nc === c && (nf < f || (nf === f && nw < w)))))) {
          [chosen, t, c, f, w] = [bit, nt, nc, nf, nw];
        }
      }
      [lastAdded[mask], bestTotal[mask], bestConnectivity[mask], bestFactors[mask], bestWork[mask]] = [chosen, t, c, f, w];
    }
    const reversed = [];
    for (let mask = count - 1; mask; mask ^= 1 << lastAdded[mask]) reversed.push(line[lastAdded[mask]]);
    return reversed.reverse();
  }

  // Candidates grouped by row/column, sorted along the line.
  function sweepLines(board, byColumns) {
    const lineOf = lineNumberOf(board, byColumns);
    const along = (c) => (byColumns ? board.xy(board.candidates[c]).y : board.xy(board.candidates[c]).x);
    const lines = Array.from({ length: byColumns ? board.w : board.h }, () => []);
    board.candidates.forEach((_, c) => lines[lineOf(c)].push(c));
    return lines.map((line) => line.sort((a, b) => along(a) - along(b)));
  }

  function smartStripOrder(board, byColumns) {
    return sweepLines(board, byColumns).flatMap((line) => (line.length <= 1 || line.length > 20 ? line : bestLineOrder(board, byColumns, line)));
  }

  // 1, the powers of two below `size`, and `size`.
  function bandSizes(size) {
    const values = [1, size];
    for (let value = 2; value < size; value *= 2) values.push(value);
    return [...new Set(values)].sort(byNumber);
  }

  // Every order order.rs considers. Status is "chosen", "kept", "rejected" (band not narrow enough) or "skipped".
  function chooseSweepOrder(board) {
    const tried = [];
    const add = (name, order) => {
      const entry = { name, order, estimate: widthEstimate(board, order), status: "kept" };
      tried.push(entry);
      return entry;
    };
    const plain = [
      ["columns", true],
      ["rows", false],
    ].map(([name, byColumns]) => [add(name, stripOrder(board, byColumns, 1)), byColumns]);
    const standardBest = Math.min(...plain.map(([entry]) => entry.estimate.maxTotal));
    for (const [entry, byColumns] of plain) {
      const lineSize = byColumns ? board.h : board.w;
      const name = entry.name + "-smart";
      if (lineSize > 20) tried.push({ name, status: "skipped", reason: `lines are ${lineSize} cells long (limit 20)` });
      else if (entry.estimate.maxTotal > standardBest + 2) tried.push({ name, status: "skipped", reason: "plain sweep is more than 2 wider than the best" });
      else add(name, smartStripOrder(board, byColumns));
    }
    const bands = [...bandSizes(board.h).slice(1).map((size) => ["rows", false, size]), ...bandSizes(board.w).slice(1).map((size) => ["columns", true, size])];
    for (const [name, byColumns, size] of bands) {
      const entry = add(`${name}-band-${size}`, stripOrder(board, byColumns, size));
      if (entry.estimate.maxTotal > standardBest - 2) {
        entry.status = "rejected";
        entry.reason = "not at least 2 narrower than the best plain sweep";
      }
    }
    const kept = tried.filter((entry) => entry.status === "kept");
    kept.sort((a, b) => compareEstimates(a.estimate, b.estimate) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    kept[0].status = "chosen";
    return { chosen: kept[0], tried };
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

  // ---- Static candidate elimination ----

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

  function mineSolvers(board, mine) {
    const index = board.mineCells.indexOf(mine);
    return index < 0 ? [] : board.mineSolvers[index];
  }

  function privateMineCount(board, c, kept) {
    return board.M[c].filter((mine) => mineSolvers(board, mine).every((other) => other === c || !kept.has(other))).length;
  }

  function leftClickEquivalentRule(board, c, kept, includePrivate = true) {
    const neighbours = revealsWithin(board, c, kept);
    const privateMines = includePrivate ? privateMineCount(board, c, kept) : 0;
    const budget = 2 + privateMines;
    const units = new Set(board.B[c]);
    let failingSet = null;

    if (units.size > budget) return { valid: false, budget, privateMines, failingSet: [] };

    const covers = neighbours.map((neighbour) => new Set(board.B[neighbour]));
    const chosen = [];
    const search = (start, uncovered) => {
      for (let i = start; i < neighbours.length; i++) {
        const neighbour = neighbours[i];
        if (chosen.some((other) => board.N[other].includes(neighbour))) continue;
        const nextUncovered = new Set([...uncovered].filter((unit) => !covers[i].has(unit)));
        chosen.push(neighbour);
        if (chosen.length + nextUncovered.size > budget) {
          failingSet = [...chosen];
          chosen.pop();
          return false;
        }
        if (!search(i + 1, nextUncovered)) {
          chosen.pop();
          return false;
        }
        chosen.pop();
      }
      return true;
    };

    const valid = search(0, units);
    return { valid, budget, privateMines, failingSet };
  }

  const popcount = (value) => {
    let count = 0;
    for (let v = value; v; v &= v - 1) count++;
    return count;
  };

  // Largest (mines covered - units solved) over subsets of `items` ({ mines, units } bitmasks), stopping early
  // once `stopAt` is reached. `tick()` returns false when the node budget is spent.
  function bestGain(items, stopAt, tick) {
    let best = 0;
    let bestPick = [];
    let limited = false;
    const go = (index, covered, units, picked) => {
      const net = popcount(covered) - popcount(units);
      if (net > best) {
        best = net;
        bestPick = picked;
      }
      if (best >= stopAt || index >= items.length || limited) return;
      let optimistic = covered;
      for (let i = index; i < items.length; i++) optimistic |= items[i].mines;
      if (popcount(optimistic) - popcount(units) <= best) return;
      if (!tick()) {
        limited = true;
        return;
      }
      go(index + 1, covered | items[index].mines, units | items[index].units, [...picked, items[index]]);
      go(index + 1, covered, units, picked);
    };
    go(0, 0, 0, []);
    return { gain: best, picked: bestPick, limited };
  }

  // Drops witnesses that another one matches or beats (more mines, no more units).
  function dropDominated(items) {
    const unique = [];
    for (const item of items) if (!unique.some((other) => other.mines === item.mines && other.units === item.units)) unique.push(item);
    return unique.filter((item) => !unique.some((other) => other !== item && (item.mines & ~other.mines) === 0 && (other.units & ~item.units) === 0));
  }

  // Rule C with witnesses. For every independent set I of c's kept revealers (one chord per piece c's chain
  // splits into), the other kept chords that need c's mines ("witnesses") can only be used if they can coexist
  // with I. The rule holds when |I| + (units of c left unsolved) - (mines of c left unflagged) <= 2 for the
  // worst usable set of witnesses. options.ignore may contain "units", "neighbours" or "joins" to switch off one
  // constraint (the page uses this to show what each one buys); options.exhaustive keeps going after a failure;
  // options.only (candidate indexes) checks that single set I instead of every independent set.
  function witnessCheck(board, c, kept, options) {
    const opts = Object.assign({ exhaustive: false, ignore: [], nodeLimit: 20000 }, options);
    const neighbours = revealsWithin(board, c, kept);
    const mines = board.M[c];
    const units = board.B[c];
    const maskOf = (list, within) => list.reduce((mask, item, bit) => (within.includes(item) ? mask | (1 << bit) : mask), 0);
    const allMines = (1 << mines.length) - 1;
    const allUnits = (1 << units.length) - 1;
    const witnesses = [];
    for (const mine of mines) {
      for (const d of mineSolvers(board, mine)) {
        if (d !== c && kept.has(d) && !witnesses.some((w) => w.d === d)) {
          witnesses.push({ d, mines: maskOf(mines, board.M[d]), units: maskOf(units, board.B[d]), isNeighbour: board.N[c].includes(d) });
        }
      }
    }
    witnesses.sort((a, b) => a.d - b.d);
    const neighbourMines = neighbours.map((n) => maskOf(mines, board.M[n]));
    const neighbourUnits = neighbours.map((n) => maskOf(units, board.B[n]));

    let nodes = 0;
    const tick = () => ++nodes <= opts.nodeLimit;
    let limited = false;
    let tightest = null;

    const evaluate = (chosen) => {
      if (!tick()) {
        limited = true;
        return false;
      }
      let unitsDone = 0;
      let minesDone = 0;
      for (const i of chosen) {
        unitsDone |= neighbourUnits[i];
        minesDone |= neighbourMines[i];
      }
      const unitsLeft = allUnits & ~unitsDone;
      const minesLeft = allMines & ~minesDone;
      const members = chosen.map((i) => neighbours[i]);
      const free = [];
      const costly = [];
      const excluded = [];
      let freeMines = 0;
      for (const w of witnesses) {
        const witnessMines = w.mines & minesLeft;
        if (witnessMines === 0 || members.includes(w.d)) continue;
        if (w.isNeighbour && chosen.length === 0 && !opts.ignore.includes("neighbours")) {
          excluded.push({ d: w.d, mines: witnessMines, reason: "neighbour" });
          continue;
        }
        if (!opts.ignore.includes("joins") && members.filter((n) => board.N[n].includes(w.d)).length > 1) {
          excluded.push({ d: w.d, mines: witnessMines, reason: "joins" });
          continue;
        }
        const stolen = opts.ignore.includes("units") ? 0 : w.units & unitsLeft;
        if (stolen === 0) {
          free.push({ d: w.d, mines: witnessMines });
          freeMines |= witnessMines;
        } else {
          costly.push({ d: w.d, mines: witnessMines, units: stolen });
        }
      }
      const base = chosen.length + popcount(unitsLeft) - popcount(minesLeft & ~freeMines);
      const items = dropDominated(costly.map((w) => ({ ...w, mines: w.mines & ~freeMines })).filter((w) => w.mines !== 0));
      const search = base > 2 && !opts.exhaustive ? { gain: 0, picked: [], limited: false } : bestGain(items, opts.exhaustive ? Infinity : 3 - base, tick);
      if (search.limited) {
        limited = true;
        return false;
      }
      const height = base + search.gain;
      if (!tightest || height > tightest.height) {
        tightest = {
          chosen: members,
          height,
          unitsLeft: units.filter((_, bit) => (unitsLeft >> bit) & 1),
          minesLeft: mines.filter((_, bit) => (minesLeft >> bit) & 1),
          free,
          costly,
          excluded,
          worst: search.picked.map((w) => w.d),
          freeMines: mines.filter((_, bit) => (freeMines >> bit) & 1),
        };
      }
      return height <= 2;
    };

    const walk = (chosen, start) => {
      const ok = evaluate(chosen);
      if (limited || (!ok && !opts.exhaustive)) return false;
      for (let i = start; i < neighbours.length; i++) {
        if (chosen.some((j) => board.N[neighbours[j]].includes(neighbours[i]))) continue;
        chosen.push(i);
        const within = walk(chosen, i + 1);
        chosen.pop();
        if (limited || (!within && !opts.exhaustive)) return false;
      }
      return true;
    };
    if (opts.only) evaluate(opts.only.map((n) => neighbours.indexOf(n)));
    else walk([], 0);
    const valid = !limited && tightest.height <= 2;
    return { valid, limited, tightest, failingSet: valid ? null : tightest.chosen };
  }

  function allTrue(checks) {
    return Object.values(checks).every(Boolean);
  }

  // Strong swap. One case of the proof: with R the other chords and I one chord from each piece only c was joining
  // (kept revealers of c that d doesn't reveal, pairwise not revealing each other), swapping costs at most
  // |I| + (bad items R leaves uncovered) - (good items R leaves uncovered). It is safe in this case when that is
  // at most spec.budget for every I and every usable set of witnesses (kept chords other than c and d that cover a
  // good item). A witness can't touch two members of I, and one that d reveals can't touch any.
  // options.exhaustive keeps going after a failure and options.nodeLimit bounds the search (running out fails).
  function swapCaseCheck(board, c, d, kept, spec, options) {
    const opts = Object.assign({ exhaustive: false, nodeLimit: 20000 }, options);
    const good = [...spec.goodMines.map((id) => ({ kind: "mine", id })), ...spec.goodUnits.map((id) => ({ kind: "unit", id }))];
    const bad = [...spec.badMines.map((id) => ({ kind: "mine", id })), ...spec.badUnits.map((id) => ({ kind: "unit", id }))];
    const coverOf = (x, items) =>
      items.reduce((mask, item, bit) => ((item.kind === "mine" ? board.M[x] : board.B[x]).includes(item.id) ? mask | (1 << bit) : mask), 0);
    const pick = (items, mask) => items.filter((_, bit) => (mask >> bit) & 1);
    const neighbours = revealsWithin(board, c, kept).filter((n) => n !== d && !board.N[d].includes(n));
    const witnessIds = new Set();
    for (const item of good) {
      for (const x of item.kind === "mine" ? mineSolvers(board, item.id) : board.unitSolvers[item.id]) {
        if (x !== c && x !== d && kept.has(x)) witnessIds.add(x);
      }
    }
    const witnesses = [...witnessIds].sort(byNumber).map((x) => ({ d: x, good: coverOf(x, good), bad: coverOf(x, bad), touchesPartner: board.N[d].includes(x) }));
    const neighbourGood = neighbours.map((n) => coverOf(n, good));
    const neighbourBad = neighbours.map((n) => coverOf(n, bad));
    const allGood = (1 << good.length) - 1;
    const allBad = (1 << bad.length) - 1;

    let nodes = 0;
    const tick = () => ++nodes <= opts.nodeLimit;
    let limited = false;
    let tightest = null;

    const evaluateSet = (chosen) => {
      if (!tick()) {
        limited = true;
        return false;
      }
      let goodDone = 0;
      let badDone = 0;
      for (const i of chosen) {
        goodDone |= neighbourGood[i];
        badDone |= neighbourBad[i];
      }
      const goodLeft = allGood & ~goodDone;
      const badLeft = allBad & ~badDone;
      const members = chosen.map((i) => neighbours[i]);
      const free = [];
      const costly = [];
      const excluded = [];
      let freeGood = 0;
      for (const w of witnesses) {
        const witnessGood = w.good & goodLeft;
        if (witnessGood === 0 || members.includes(w.d)) continue;
        const touching = members.filter((n) => board.N[n].includes(w.d)).length;
        if (touching > (w.touchesPartner ? 0 : 1)) {
          excluded.push({ d: w.d, good: witnessGood, reason: touching > 1 ? "joins" : "partner" });
          continue;
        }
        const covered = w.bad & badLeft;
        if (covered === 0) {
          free.push({ d: w.d, good: witnessGood });
          freeGood |= witnessGood;
        } else {
          costly.push({ d: w.d, good: witnessGood, bad: covered });
        }
      }
      const base = chosen.length + popcount(badLeft) - popcount(goodLeft & ~freeGood);
      const items = dropDominated(costly.map((w) => ({ d: w.d, mines: w.good & ~freeGood, units: w.bad })).filter((w) => w.mines !== 0));
      const search = base > spec.budget && !opts.exhaustive ? { gain: 0, picked: [], limited: false } : bestGain(items, opts.exhaustive ? Infinity : spec.budget + 1 - base, tick);
      if (search.limited) {
        limited = true;
        return false;
      }
      const height = base + search.gain;
      if (!tightest || height > tightest.height) {
        tightest = {
          chosen: members,
          height,
          goodLeft: pick(good, goodLeft),
          badLeft: pick(bad, badLeft),
          free,
          costly,
          excluded,
          worst: search.picked.map((w) => w.d),
          freeGood: pick(good, freeGood),
        };
      }
      return height <= spec.budget;
    };

    const walk = (chosen, start) => {
      const ok = evaluateSet(chosen);
      if (limited || (!ok && !opts.exhaustive)) return false;
      for (let i = start; i < neighbours.length; i++) {
        if (chosen.some((j) => board.N[neighbours[j]].includes(neighbours[i]))) continue;
        chosen.push(i);
        const within = walk(chosen, i + 1);
        chosen.pop();
        if (limited || (!within && !opts.exhaustive)) return false;
      }
      return true;
    };
    walk([], 0);
    return { valid: !limited && tightest.height <= spec.budget, limited, tightest, neighbours, good, bad, budget: spec.budget };
  }

  // Replacing c by d never costs clicks: if d isn't chorded, swap it in; if it already is, just drop c.
  function strongSwapCheck(board, c, d, kept, options) {
    const diff = (a, b) => a.filter((x) => !b.includes(x));
    const minesOnlyC = diff(board.M[c], board.M[d]);
    const minesOnlyD = diff(board.M[d], board.M[c]);
    const unitsOnlyC = diff(board.B[c], board.B[d]);
    const unitsOnlyD = diff(board.B[d], board.B[c]);
    const alreadyChorded = swapCaseCheck(board, c, d, kept, { goodMines: minesOnlyC, goodUnits: [], badMines: [], badUnits: unitsOnlyC, budget: 1 }, options);
    const swappedIn = swapCaseCheck(board, c, d, kept, { goodMines: minesOnlyC, goodUnits: unitsOnlyD, badMines: minesOnlyD, badUnits: unitsOnlyC, budget: 0 }, options);
    return { valid: alreadyChorded.valid && swappedIn.valid, minesOnlyC, minesOnlyD, unitsOnlyC, unitsOnlyD, alreadyChorded, swappedIn };
  }

  // The first kept d (among chords sharing a mine or unit with c, or revealed by it) that c can be swapped for.
  function findStrongSwap(board, c, kept) {
    const pool = new Set(revealsWithin(board, c, kept));
    for (const mine of board.M[c]) for (const x of mineSolvers(board, mine)) pool.add(x);
    for (const unit of board.B[c]) for (const x of board.unitSolvers[unit]) pool.add(x);
    for (const d of [...pool].sort(byNumber)) {
      if (d === c || !kept.has(d)) continue;
      // Count-only necessary conditions (empty I, no witnesses), as in the Rust solver.
      const only = (a, b) => a.filter((x) => !b.includes(x)).length;
      const savings = only(board.M[c], board.M[d]) + only(board.B[d], board.B[c]);
      const costs = only(board.M[d], board.M[c]) + only(board.B[c], board.B[d]);
      if (costs > savings || only(board.B[c], board.B[d]) > 1 + only(board.M[c], board.M[d])) continue;
      const check = strongSwapCheck(board, c, d, kept);
      if (check.valid) return { d, check };
    }
    return null;
  }

  function findSwap(board, c, kept) {
    for (const mine of board.M[c]) {
      for (const d of mineSolvers(board, mine)) {
        if (d !== c && kept.has(d) && allTrue(swapRule(board, c, d, kept))) return d;
      }
    }
    return -1;
  }

  function removalReason(board, c, kept, options) {
    const opts = Object.assign({ swap: true, leftClickEquivalent: true, privateMineCredit: true, witness: false, strongSwap: false }, options);
    if (opts.leftClickEquivalent) {
      const checks = leftClickEquivalentRule(board, c, kept, opts.privateMineCredit);
      if (checks.valid) return { rule: "C", privateMines: checks.privateMines, budget: checks.budget };
    }
    if (opts.swap) {
      const d = findSwap(board, c, kept);
      if (d >= 0) return { rule: "A", by: d };
    }
    if (opts.witness && witnessCheck(board, c, kept).valid) return { rule: "W" };
    if (opts.strongSwap) {
      const found = findStrongSwap(board, c, kept);
      if (found) return { rule: "S", by: found.d };
    }
    return null;
  }

  // options.witness adds Rule C with witnesses and options.strongSwap the strong swap. Like the Rust solver, the cheaper
  // rules run to a fixpoint first, and the strong swap only runs after the witness rule has settled.
  function reduceCandidates(board, keptInput, options) {
    const kept = new Set(keptInput || board.candidates.map((_, c) => c));
    const removed = new Map();
    const fixpoint = (witness, strongSwap) => {
      let any = false;
      let changed = true;
      while (changed) {
        changed = false;
        for (let c = 0; c < board.candidates.length; c++) {
          if (!kept.has(c)) continue;
          const reason = removalReason(board, c, kept, { witness, strongSwap });
          if (reason) {
            kept.delete(c);
            removed.set(c, reason);
            changed = true;
            any = true;
          }
        }
      }
      return any;
    };
    fixpoint(false, false);
    if (options && (options.witness || options.strongSwap)) fixpoint(true, false);
    if (options && options.strongSwap) {
      while (fixpoint(false, true)) fixpoint(true, false);
    }
    return { kept: [...kept].sort(byNumber), removed };
  }

  // Evaluate a complete pass against the same kept set, then remove the whole batch together.
  function staticRulePass(board, keptInput, rule) {
    const snapshot = new Set(keptInput || board.candidates.map((_, c) => c));
    const proposed = new Map();
    for (const c of [...snapshot].sort(byNumber)) {
      let reason = null;
      if (rule === "swap") {
        const d = findSwap(board, c, snapshot);
        if (d >= 0) reason = { rule: "A", by: d };
      } else if (rule === "left-click-equivalent") {
        const checks = leftClickEquivalentRule(board, c, snapshot, true);
        if (checks.valid) reason = { rule: "C", privateMines: checks.privateMines, budget: checks.budget };
      } else if (rule === "witness") {
        const checks = leftClickEquivalentRule(board, c, snapshot, true);
        if (checks.valid) reason = { rule: "C", privateMines: checks.privateMines, budget: checks.budget };
        else if (witnessCheck(board, c, snapshot).valid) reason = { rule: "W" };
      } else if (rule === "strong-swap") {
        const found = findStrongSwap(board, c, snapshot);
        if (found) reason = { rule: "S", by: found.d };
      } else {
        throw new Error("Unknown static-rule pass: " + rule);
      }
      if (reason) proposed.set(c, reason);
    }

    const removed = new Map();
    const protectedWitnesses = new Set();
    for (const c of [...proposed.keys()].sort(byNumber)) {
      const reason = proposed.get(c);
      if (reason.rule === "A" || reason.rule === "S") {
        if (removed.has(reason.by) || protectedWitnesses.has(c)) continue;
        protectedWitnesses.add(reason.by);
      }
      removed.set(c, reason);
    }
    const kept = new Set([...snapshot].filter((c) => !removed.has(c)));
    return { kept, removed };
  }

  function parsePttacg(input) {
    const text = String(input || "").trim().toLowerCase();
    const match = text.match(/[?&]b=([0-9]+)&m=([0-9a-v]+)/i);
    if (!match) throw new Error("Expected a PTTACG query or URL containing ?b=...&m=...");
    const sizeCode = match[1];
    let w;
    let h;
    if (sizeCode === "1") [w, h] = [9, 9];
    else if (sizeCode === "2") [w, h] = [16, 16];
    else if (sizeCode === "3") [w, h] = [30, 16];
    else {
      if (sizeCode.length % 2 || sizeCode.length > 6) throw new Error("Custom PTTACG board size must contain an even number of digits");
      const midpoint = sizeCode.length / 2;
      w = Number(sizeCode.slice(0, midpoint));
      h = Number(sizeCode.slice(midpoint));
      if (!w || !h || w > 256 || h > 256) throw new Error("PTTACG board dimensions are out of range");
    }
    const expected = Math.ceil((w * h) / 5);
    const encoded = match[2];
    if (encoded.length !== expected) throw new Error(`PTTACG mine data has ${encoded.length} digits; expected ${expected}`);
    const bits = [];
    for (const digit of encoded) {
      const value = parseInt(digit, 32);
      if (!Number.isInteger(value) || value > 31) throw new Error(`Invalid PTTACG digit: ${digit}`);
      for (let bit = 4; bit >= 0; bit--) bits.push(Boolean(value & (1 << bit)));
    }
    const rows = [];
    for (let y = 0; y < h; y++) {
      let row = "";
      for (let x = 0; x < w; x++) row += bits[y * w + x] ? "*" : ".";
      rows.push(row);
    }
    return rows;
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
      const witnessReduced = reduceCandidates(board, null, { witness: true });
      const witnessResult = bruteForce(board, witnessReduced.kept);
      if (witnessResult.total !== best.total) fail("witness reduction", [witnessResult.total, best.total]);
      if (!witnessReduced.kept.every((c) => kept.includes(c))) fail("witness reduction keeps more than the plain rules");
      const strongReduced = reduceCandidates(board, null, { witness: true, strongSwap: true });
      const strongResult = bruteForce(board, strongReduced.kept);
      if (strongResult.total !== best.total) fail("strong swap reduction", [strongResult.total, best.total]);
      if (!strongReduced.kept.every((c) => witnessReduced.kept.includes(c))) fail("strong swap reduction keeps more than the witness rules");
      // Every accepted swap must not cost clicks for any chord set (checked on a kept set small enough to enumerate).
      const small = new Set(board.candidates.map((_, i) => i).slice(0, 9));
      small.forEach((c) => {
        const found = findStrongSwap(board, c, small);
        if (!found) return;
        const others = [...small].filter((x) => x !== c);
        for (let subset = 0; subset < 1 << others.length; subset++) {
          const rest = others.filter((_, bit) => (subset >> bit) & 1);
          const after = rest.includes(found.d) ? rest : [...rest, found.d];
          if (evaluate(board, after).total > evaluate(board, [...rest, c]).total) {
            fail("strong swap costs clicks", [c, found.d, rest]);
            break;
          }
        }
      });
      board.candidates.forEach((_, c) => {
        const everything = new Set(board.candidates.map((_, i) => i));
        const legacy = leftClickEquivalentRule(board, c, everything, true).valid;
        const early = witnessCheck(board, c, everything);
        const full = witnessCheck(board, c, everything, { exhaustive: true });
        if (legacy && !early.valid) fail("witness rule is weaker than Rule C", c);
        if (early.valid !== full.valid) fail("witness early exit disagrees with exhaustive", c);
      });
      for (const rule of ["swap", "left-click-equivalent", "witness", "strong-swap"]) {
        const pass = staticRulePass(board, new Set(board.candidates.map((_, c) => c)), rule);
        const passResult = bruteForce(board, [...pass.kept]);
        if (passResult.total !== best.total) fail("snapshot " + rule, [passResult.total, best.total]);
        for (const [c, reason] of pass.removed) {
          if ((reason.rule === "A" || reason.rule === "S") && pass.removed.has(reason.by)) fail("snapshot swap witness removed", [c, reason.by]);
        }
      }
      const reducedDp = solveDP(board, columnOrder(board, kept), { prune: "cancel", absorb: true });
      if (reducedDp.total !== best.total) fail("reduced dp", [reducedDp.total, best.total]);
      const { chosen } = chooseSweepOrder(board);
      if (solveDP(board, chosen.order, { prune: "basic" }).total !== best.total) fail("dp in order " + chosen.name);
      // The per-subset widths behind smart orders must match the generic cut widths.
      for (const byColumns of [true, false]) {
        const smart = smartStripOrder(board, byColumns);
        const widths = cutWidths(board, smart);
        let start = 0;
        for (const line of sweepLines(board, byColumns)) {
          if (line.length) {
            const { connectivity, factors } = lineWidths(board, byColumns, line);
            const bitOf = new Map(line.map((c, bit) => [c, bit]));
            let mask = 0;
            smart.slice(start, start + line.length).forEach((c, i) => {
              mask |= 1 << bitOf.get(c);
              const cut = start + i;
              if (cut < widths.connectivity.length && (widths.connectivity[cut] !== connectivity[mask] || widths.factors[cut] !== factors[mask])) fail("line widths");
            });
          }
          start += line.length;
        }
      }
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
    adjacentCandidates,
    stripOrder,
    widthEstimate,
    compareEstimates,
    lineWidths,
    sweepLines,
    smartStripOrder,
    chooseSweepOrder,
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
    leftClickEquivalentRule,
    witnessCheck,
    strongSwapCheck,
    findStrongSwap,
    staticRulePass,
    reduceCandidates,
    parsePttacg,
    randomRows,
    mulberry32,
    selfCheck,
    isSubset,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DomsModel = api;
})(typeof window !== "undefined" ? window : this);
