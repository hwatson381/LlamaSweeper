//! Offline statistics on the DOMS frontier states, layer by layer.
//!
//! From `wasm/`:
//! `cargo run --release --features analysis --example doms_analysis > /tmp/doms_analysis.log 2>&1`
//! Set `DOMS_BOARD` to analyse another board, `DOMS_DETAIL_FRACTION` (default 0.8) to choose which
//! layers get the detailed report (those with at least that fraction of the peak state count).
//! Reports are also written to `wasm/analysis/`.

use llamasweeper_rust::board_gen_8way::Board;
use llamasweeper_rust::doms::analysis::{self, LayerView};
use llamasweeper_rust::doms::model::ChordModel;
use llamasweeper_rust::doms::{self, DomsResult};
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt::Write as _;
use std::hash::Hash;
use std::rc::Rc;
use std::time::Instant;

const EVIL_199: &str = "?b=3020&m=84819191d005024402p010ki1104i0a85204000g10090h8080kj092916g324h0ka00ci0o880002cs0106294ad2244408i8p968hh020304ia0g000gi0";

macro_rules! w {
    ($out:expr, $($arg:tt)*) => { writeln!($out, $($arg)*).unwrap() };
}

struct Rows {
    sig: Vec<u32>,
    cost: Vec<i32>,
    hits: Vec<Vec<u64>>,
}

fn collect(view: &LayerView) -> Rows {
    let table = view.table;
    let mut rows = Rows { sig: Vec::new(), cost: Vec::new(), hits: Vec::new() };
    for entry in 0..table.entry_count() {
        if table.is_alive(entry) {
            rows.sig.push(table.connectivity_id(entry));
            rows.cost.push(table.cost(entry));
            rows.hits.push(table.factor_hits(entry).to_vec());
        }
    }
    rows
}

fn bit(bits: &[u64], index: usize) -> bool {
    (bits[index / 64] >> (index % 64)) & 1 == 1
}

fn popcount(bits: &[u64]) -> usize {
    bits.iter().map(|word| word.count_ones() as usize).sum()
}

fn masked(bits: &[u64], mask: &[u64]) -> Vec<u64> {
    bits.iter().zip(mask).map(|(a, b)| a & b).collect()
}

fn entropy<K: Hash + Eq>(keys: impl Iterator<Item = K>) -> f64 {
    let mut counts: HashMap<K, usize> = HashMap::new();
    let mut total = 0usize;
    for key in keys {
        *counts.entry(key).or_insert(0) += 1;
        total += 1;
    }
    if total == 0 {
        return 0.0;
    }
    let total = total as f64;
    counts.values().map(|&count| {
        let p = count as f64 / total;
        -p * p.log2()
    }).sum()
}

fn mutual_information(both: usize, a: usize, b: usize, n: usize) -> f64 {
    let (n_f, both, a, b) = (n as f64, both as f64, a as f64, b as f64);
    let counts = [[n_f - a - b + both, b - both], [a - both, both]];
    let marginal_a = [n_f - a, a];
    let marginal_b = [n_f - b, b];
    let mut total = 0.0;
    for x in 0..2 {
        for y in 0..2 {
            let count = counts[x][y];
            if count > 0.0 {
                total += count / n_f * (count * n_f / (marginal_a[x] * marginal_b[y])).log2();
            }
        }
    }
    total.max(0.0)
}

fn bucket(value: usize) -> usize {
    if value <= 1 {
        0
    } else {
        (usize::BITS - (value - 1).leading_zeros()) as usize
    }
}

fn bucket_label(bucket: usize) -> String {
    if bucket == 0 {
        "1".to_string()
    } else {
        format!("{}-{}", (1usize << (bucket - 1)) + 1, 1usize << bucket)
    }
}

fn factor_labels(model: &ChordModel) -> Vec<String> {
    let width = model.width;
    let mut labels = Vec::new();
    for (index, solvers) in model.flag_needed_by.iter().enumerate() {
        if !solvers.is_empty() {
            let cell = model.mine_cells[index];
            labels.push(format!("M({},{})", cell % width, cell / width));
        }
    }
    for (index, solvers) in model.bbbv_solved_by.iter().enumerate() {
        if !solvers.is_empty() {
            let cell = model.bbbv_click_cells[index];
            let kind = if index < model.opening_borders.len() { 'O' } else { 'I' };
            labels.push(format!("{}({},{})", kind, cell % width, cell / width));
        }
    }
    labels
}

struct Summary {
    layer: usize,
    cell: (usize, usize),
    before: usize,
    after: usize,
    sigs: usize,
    patterns: usize,
    active_mines: usize,
    active_units: usize,
    max_chains: usize,
    cost_range: i32,
}

fn summarise(view: &LayerView, rows: &Rows) -> Summary {
    let cell = view.model.candidate_cells[view.layer];
    let sigs: HashSet<u32> = rows.sig.iter().copied().collect();
    let patterns: HashSet<&Vec<u64>> = rows.hits.iter().collect();
    let max_chains = sigs.iter().map(|&id| view.pool.get(id).len() / view.candidate_words).max().unwrap_or(0);
    let (min_cost, max_cost) = (rows.cost.iter().min().copied().unwrap_or(0), rows.cost.iter().max().copied().unwrap_or(0));
    Summary {
        layer: view.layer,
        cell: (cell % view.model.width, cell / view.model.width),
        before: view.states_before_pruning,
        after: rows.sig.len(),
        sigs: sigs.len(),
        patterns: patterns.len(),
        active_mines: popcount(&masked(view.active_factors, view.mine_factor_mask)),
        active_units: popcount(&masked(view.active_factors, view.bbbv_factor_mask)),
        max_chains,
        cost_range: max_cost - min_cost,
    }
}

fn detail(view: &LayerView, rows: &Rows, labels: &[String], out: &mut String) {
    let n = rows.sig.len();
    let n_f = n as f64;
    let words = view.candidate_words;
    let cell = view.model.candidate_cells[view.layer];
    w!(
        out,
        "\n=== layer {}/{} (candidate cell {},{}): {} states after pruning, {} before ===",
        view.layer + 1,
        view.layers,
        cell % view.model.width,
        cell / view.model.width,
        n,
        view.states_before_pruning
    );

    let mut by_sig: HashMap<u32, Vec<usize>> = HashMap::new();
    for (index, &sig) in rows.sig.iter().enumerate() {
        by_sig.entry(sig).or_default().push(index);
    }
    let mut by_pattern: HashMap<&Vec<u64>, usize> = HashMap::new();
    for pattern in &rows.hits {
        *by_pattern.entry(pattern).or_insert(0) += 1;
    }
    let mine_patterns: HashSet<Vec<u64>> = rows.hits.iter().map(|h| masked(h, view.mine_factor_mask)).collect();
    let unit_patterns: HashSet<Vec<u64>> = rows.hits.iter().map(|h| masked(h, view.bbbv_factor_mask)).collect();
    let active: Vec<usize> = (0..view.active_factors.len() * 64).filter(|&f| bit(view.active_factors, f)).collect();
    let active_mines = popcount(&masked(view.active_factors, view.mine_factor_mask));
    let active_units = popcount(&masked(view.active_factors, view.bbbv_factor_mask));

    w!(out, "\n-- where the states come from --");
    w!(out, "signatures {}, distinct bit patterns {} (mine part {}, unit part {})", by_sig.len(), by_pattern.len(), mine_patterns.len(), unit_patterns.len());
    w!(
        out,
        "active factors {} ({} mines, {} units): log2(2^active) = {}, log2(patterns) = {:.1}",
        active.len(), active_mines, active_units, active.len(), (by_pattern.len() as f64).log2()
    );
    w!(
        out,
        "fill of the signature x pattern grid: {:.4} ({} states / {} cells)",
        n_f / (by_sig.len() as f64 * by_pattern.len() as f64),
        n,
        by_sig.len() as u64 * by_pattern.len() as u64
    );

    let h_sig = entropy(rows.sig.iter());
    let h_bits = entropy(rows.hits.iter());
    let h_mines = entropy(rows.hits.iter().map(|h| masked(h, view.mine_factor_mask)));
    let h_units = entropy(rows.hits.iter().map(|h| masked(h, view.bbbv_factor_mask)));

    // Column bitsets over states, one per active factor.
    let state_words = (n + 63) / 64;
    let columns: Vec<Vec<u64>> = active
        .iter()
        .map(|&factor| {
            let mut column = vec![0u64; state_words];
            for (index, hits) in rows.hits.iter().enumerate() {
                if bit(hits, factor) {
                    column[index / 64] |= 1u64 << (index % 64);
                }
            }
            column
        })
        .collect();
    let ones: Vec<usize> = columns.iter().map(|column| popcount(column)).collect();
    let marginal_entropy = |count: usize| {
        let p = count as f64 / n_f;
        if p <= 0.0 || p >= 1.0 { 0.0 } else { -p * p.log2() - (1.0 - p) * (1.0 - p).log2() }
    };
    let sum_marginals: f64 = ones.iter().map(|&count| marginal_entropy(count)).sum();

    w!(out, "\n-- information (bits; states weighted equally) --");
    w!(out, "log2(states) = {:.2}", n_f.log2());
    w!(out, "H(signature) = {:.2}, H(bit pattern) = {:.2}, I(signature; bits) = {:.2}  (0 means states are a full product of signatures and bit patterns)", h_sig, h_bits, h_sig + h_bits - n_f.log2());
    w!(out, "H(mine bits) = {:.2}, H(unit bits) = {:.2}, I(mine bits; unit bits) = {:.2}", h_mines, h_units, h_mines + h_units - h_bits);
    w!(out, "sum of per-factor entropies = {:.2} vs H(bit pattern) = {:.2}: total correlation {:.2}", sum_marginals, h_bits, sum_marginals - h_bits);

    w!(out, "\n-- states per signature --");
    let mut histogram: BTreeMap<usize, (usize, usize)> = BTreeMap::new();
    for members in by_sig.values() {
        let entry = histogram.entry(bucket(members.len())).or_default();
        entry.0 += 1;
        entry.1 += members.len();
    }
    w!(out, "{:>12} {:>8} {:>8}", "states/sig", "sigs", "states");
    for (key, (sigs, states)) in &histogram {
        w!(out, "{:>12} {:>8} {:>8}", bucket_label(*key), sigs, states);
    }
    let mut largest: Vec<(&u32, &Vec<usize>)> = by_sig.iter().collect();
    largest.sort_by_key(|(id, members)| (std::cmp::Reverse(members.len()), **id));
    w!(out, "largest signatures: states, chains, chain reach sizes, cost range");
    for (&id, members) in largest.iter().take(10) {
        let signature = view.pool.get(id);
        let reaches: Vec<usize> = signature.chunks(words).map(popcount).collect();
        let (low, high) = members.iter().fold((i32::MAX, i32::MIN), |(l, h), &m| (l.min(rows.cost[m]), h.max(rows.cost[m])));
        w!(out, "  {:>6} states, {} chains {:?}, cost {}..{}", members.len(), reaches.len(), reaches, low, high);
    }

    w!(out, "\n-- chains --");
    let mut by_chains: BTreeMap<usize, (usize, usize)> = BTreeMap::new();
    for (&id, members) in &by_sig {
        let entry = by_chains.entry(view.pool.get(id).len() / words).or_default();
        entry.0 += 1;
        entry.1 += members.len();
    }
    w!(out, "{:>8} {:>8} {:>8}", "chains", "sigs", "states");
    for (chains, (sigs, states)) in &by_chains {
        w!(out, "{:>8} {:>8} {:>8}", chains, sigs, states);
    }

    w!(out, "\n-- signatures per bit pattern --");
    // A state is unique per (signature, pattern), so a pattern's state count is its signature count.
    let mut histogram: BTreeMap<usize, (usize, usize)> = BTreeMap::new();
    for &count in by_pattern.values() {
        let entry = histogram.entry(bucket(count)).or_default();
        entry.0 += 1;
        entry.1 += count;
    }
    w!(out, "{:>12} {:>8} {:>8}", "sigs/pattern", "patterns", "states");
    for (key, (patterns, states)) in &histogram {
        w!(out, "{:>12} {:>8} {:>8}", bucket_label(*key), patterns, states);
    }

    w!(out, "\n-- cost --");
    let min_cost = rows.cost.iter().copied().min().unwrap_or(0);
    let mut by_cost: BTreeMap<i32, usize> = BTreeMap::new();
    for &cost in &rows.cost {
        *by_cost.entry(cost - min_cost).or_default() += 1;
    }
    w!(out, "states by cost above the layer minimum ({}): {:?}", min_cost, by_cost);
    let mut spread: BTreeMap<i32, usize> = BTreeMap::new();
    for members in by_sig.values() {
        let low = members.iter().map(|&m| rows.cost[m]).min().unwrap();
        let high = members.iter().map(|&m| rows.cost[m]).max().unwrap();
        *spread.entry(high - low).or_default() += 1;
    }
    w!(out, "signatures by cost spread inside the signature: {:?}", spread);

    w!(out, "\n-- factors --");
    let near_constant = ones.iter().filter(|&&count| (count as f64) < 0.02 * n_f || (count as f64) > 0.98 * n_f).count();
    w!(out, "factors set in under 2% or over 98% of states: {} of {}", near_constant, active.len());
    let mut pairs: Vec<(f64, usize, usize)> = Vec::new();
    for i in 0..active.len() {
        for j in i + 1..active.len() {
            let both: usize = columns[i].iter().zip(&columns[j]).map(|(a, b)| (a & b).count_ones() as usize).sum();
            pairs.push((mutual_information(both, ones[i], ones[j], n), i, j));
        }
    }
    pairs.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
    w!(out, "strongest factor pairs by mutual information (bits):");
    for &(mi, i, j) in pairs.iter().take(12) {
        w!(out, "  {:.3}  {} ({:.0}% set) with {} ({:.0}% set)", mi, labels[active[i]], 100.0 * ones[i] as f64 / n_f, labels[active[j]], 100.0 * ones[j] as f64 / n_f);
    }
    for threshold in [0.01, 0.1] {
        let mut parent: Vec<usize> = (0..active.len()).collect();
        fn root(parent: &mut Vec<usize>, mut x: usize) -> usize {
            while parent[x] != x {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            x
        }
        for &(mi, i, j) in &pairs {
            if mi > threshold {
                let (a, b) = (root(&mut parent, i), root(&mut parent, j));
                parent[a] = b;
            }
        }
        let mut sizes: HashMap<usize, usize> = HashMap::new();
        for i in 0..active.len() {
            let r = root(&mut parent, i);
            *sizes.entry(r).or_default() += 1;
        }
        let mut sizes: Vec<usize> = sizes.values().copied().collect();
        sizes.sort_unstable_by(|a, b| b.cmp(a));
        w!(out, "factor dependency components at MI > {}: {:?}", threshold, sizes);
    }
}

fn run(board: &Board, hook: impl FnMut(&LayerView) + 'static) -> DomsResult {
    analysis::set_layer_hook(hook);
    let result = doms::solve_board(board, 20_000_000, &mut |_| {}).expect("DOMS solves the board");
    analysis::clear_layer_hook();
    result
}

fn main() {
    let (name, pttacg) = match std::env::var("DOMS_BOARD") {
        Ok(board) if !board.trim().is_empty() => ("custom", board),
        _ => ("evil199", EVIL_199.to_string()),
    };
    let mut board = Board::load_board_pttacg(pttacg).expect("valid PTTACG string");
    board.initialize_all().expect("board initialises");
    let directory = concat!(env!("CARGO_MANIFEST_DIR"), "/analysis");
    std::fs::create_dir_all(directory).unwrap();

    // Pass 1: one row per layer.
    let summaries: Rc<RefCell<Vec<(Summary, f64)>>> = Rc::new(RefCell::new(Vec::new()));
    let sink = summaries.clone();
    let mut last = Instant::now();
    let started = Instant::now();
    let result = run(&board, move |view| {
        let layer_seconds = last.elapsed().as_secs_f64();
        let rows = collect(view);
        sink.borrow_mut().push((summarise(view, &rows), layer_seconds));
        last = Instant::now();
    });
    let total_seconds = started.elapsed().as_secs_f64();

    let mut report = String::new();
    w!(report, "board {}x{}, {} clicks, peak states {}, total states {}", board.width, board.height, result.total_clicks, result.stats.peak_states, result.stats.total_states);
    w!(report, "sweep order {}, solve with analysis overhead {:.2}s", result.stats.sweep_order, total_seconds);
    w!(report, "{:>5} {:>8} {:>8} {:>8} {:>7} {:>8} {:>7} {:>7} {:>6} {:>8}", "layer", "cell", "before", "after", "sigs", "patterns", "mines", "units", "chains", "ms");
    let summaries = summaries.borrow();
    for (summary, seconds) in summaries.iter() {
        w!(
            report,
            "{:>5} {:>8} {:>8} {:>8} {:>7} {:>8} {:>7} {:>7} {:>6} {:>8.1}  cost range {}",
            summary.layer + 1,
            format!("{},{}", summary.cell.0, summary.cell.1),
            summary.before,
            summary.after,
            summary.sigs,
            summary.patterns,
            summary.active_mines,
            summary.active_units,
            summary.max_chains,
            seconds * 1000.0,
            summary.cost_range
        );
    }
    let peak = summaries.iter().map(|(summary, _)| summary.after).max().unwrap_or(0);

    // Pass 2: detail for the layers near the peak.
    let fraction: f64 = std::env::var("DOMS_DETAIL_FRACTION").ok().and_then(|v| v.parse().ok()).unwrap_or(0.8);
    let threshold = (peak as f64 * fraction) as usize;
    let details = Rc::new(RefCell::new(String::new()));
    let sink = details.clone();
    let mut labels: Option<Vec<String>> = None;
    run(&board, move |view| {
        if view.table.len() >= threshold && view.table.len() > 0 {
            let labels = labels.get_or_insert_with(|| factor_labels(view.model));
            let rows = collect(view);
            detail(view, &rows, labels, &mut sink.borrow_mut());
        }
    });

    report.push_str(&details.borrow());
    std::fs::write(format!("{}/{}_report.txt", directory, name), &report).unwrap();
    print!("{}", report);
}
