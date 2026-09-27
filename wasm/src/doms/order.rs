//! Choosing the order in which the frontier DP sweeps the chord candidates.
//! A good order keeps the frontier (live components + active factors) narrow.

use super::model::Model;

/// (max total width, max graph width, max factor width, estimated work)
pub type WidthEstimate = (i32, i32, i32, u64);

pub fn estimated_cut_work(width: i32) -> u64 {
    1u64 << width.clamp(0, 60)
}

/// Sweep by rows or columns, optionally in bands of several lines.
fn order_indices(model: &Model, by_columns: bool, band_size: usize) -> Vec<usize> {
    let mut order: Vec<usize> = (0..model.candidates.len()).collect();
    order.sort_by_key(|&i| {
        let row = model.candidates[i] / model.width;
        let col = model.candidates[i] % model.width;
        if by_columns {
            (col / band_size, row, col % band_size)
        } else {
            (row / band_size, col, row % band_size)
        }
    });
    order
}

/// Counts the intervals covering each cut `0..cuts`.
fn coverage(intervals: &[(usize, usize)], cuts: usize) -> Vec<i32> {
    let mut diff = vec![0i32; cuts + 1];
    for &(lo, hi) in intervals {
        diff[lo] += 1;
        diff[hi + 1] -= 1;
    }
    let mut running = 0;
    diff.truncate(cuts);
    for value in diff.iter_mut() {
        running += *value;
        *value = running;
    }
    diff
}

pub fn width_estimate(model: &Model, order: &[usize]) -> WidthEstimate {
    let q = order.len();
    let mut inverse = vec![0usize; q];
    for (i, &old) in order.iter().enumerate() {
        inverse[old] = i;
    }

    let span = |scope: &Vec<usize>| -> Option<(usize, usize)> {
        let first = scope.iter().map(|&item| inverse[item]).min()?;
        let last = scope.iter().map(|&item| inverse[item]).max()?;
        if first < last {
            Some((first, last - 1))
        } else {
            None
        }
    };

    let mut graph_intervals = Vec::new();
    for &old in order {
        let position = inverse[old];
        let last = model.graph[old]
            .iter()
            .map(|&other| inverse[other])
            .filter(|&other| other > position)
            .max()
            .unwrap_or(position);
        if last > position {
            graph_intervals.push((position, last - 1));
        }
    }
    graph_intervals.extend(model.zero_scopes.iter().filter_map(|scope| span(scope)));

    let factor_intervals: Vec<(usize, usize)> = model
        .mine_scopes
        .iter()
        .chain(model.base_scopes.iter())
        .filter_map(|scope| span(scope))
        .collect();

    let cuts = q.saturating_sub(1);
    let graph = coverage(&graph_intervals, cuts);
    let factors = coverage(&factor_intervals, cuts);

    let (mut max_graph, mut max_factors, mut max_total, mut work) = (0, 0, 0, 0u64);
    for cut in 0..cuts {
        max_graph = max_graph.max(graph[cut]);
        max_factors = max_factors.max(factors[cut]);
        max_total = max_total.max(graph[cut] + factors[cut]);
        work = work.saturating_add(estimated_cut_work(graph[cut] + factors[cut]));
    }
    (max_total, max_graph, max_factors, work)
}

/// Subset-sum (zeta) transform: `counts[mask]` becomes the sum over all submasks.
fn zeta(counts: &mut [i32], p: usize) {
    for bit in 0..p {
        let b = 1usize << bit;
        for mask in 0..counts.len() {
            if mask & b != 0 {
                counts[mask] += counts[mask ^ b];
            }
        }
    }
}

/// For every subset `mask` of the current line's candidates (already processed),
/// count how many scopes would be split by the cut.
fn crossing_counts<'a, F: Fn(usize) -> usize>(
    scopes: impl Iterator<Item = &'a Vec<usize>>,
    primary: &F,
    line_number: usize,
    local_bit: &[i32],
    p: usize,
) -> Vec<i32> {
    let state_count = 1usize << p;
    let all = state_count - 1;
    let mut before_only = vec![0i32; state_count];
    let mut after_only = vec![0i32; state_count];
    let mut current_only = vec![0i32; state_count];
    let (mut always, mut before_total, mut after_total, mut current_total) = (0, 0, 0, 0);

    for scope in scopes {
        if scope.is_empty() {
            continue;
        }
        let (mut before, mut after, mut mask) = (false, false, 0usize);
        for &candidate in scope {
            let candidate_line = primary(candidate);
            if candidate_line < line_number {
                before = true;
            } else if candidate_line > line_number {
                after = true;
            } else {
                mask |= 1 << local_bit[candidate];
            }
        }
        if before && after {
            always += 1;
        } else if before {
            before_only[mask] += 1;
            before_total += 1;
        } else if after {
            after_only[mask] += 1;
            after_total += 1;
        } else if mask != 0 {
            current_only[mask] += 1;
            current_total += 1;
        }
    }
    zeta(&mut before_only, p);
    zeta(&mut after_only, p);
    zeta(&mut current_only, p);

    (0..state_count)
        .map(|mask| {
            always
                + before_total - before_only[mask]
                + after_total - after_only[all ^ mask]
                + current_total - current_only[mask] - current_only[all ^ mask]
        })
        .collect()
}

/// Keep the global strip sweep, but choose the best order inside each row/column
/// with an exact subset DP over the partial-line cuts.
fn smart_line_order_indices(model: &Model, by_columns: bool) -> Vec<usize> {
    let q = model.candidates.len();
    let width = model.width;
    let line_count = if by_columns { model.width } else { model.height };
    let primary = |candidate: usize| {
        let cell = model.candidates[candidate];
        if by_columns { cell % width } else { cell / width }
    };
    let secondary = |candidate: usize| {
        let cell = model.candidates[candidate];
        if by_columns { cell / width } else { cell % width }
    };

    let mut lines: Vec<Vec<usize>> = vec![Vec::new(); line_count];
    for candidate in 0..q {
        lines[primary(candidate)].push(candidate);
    }
    for line in lines.iter_mut() {
        line.sort_by_key(|&candidate| secondary(candidate));
    }

    let mut result = Vec::with_capacity(q);
    let mut local_bit = vec![-1i32; q];
    for (line_number, line) in lines.iter().enumerate() {
        let p = line.len();
        // 2^p is impractical on wide lines
        if p <= 1 || p > 20 {
            result.extend_from_slice(line);
            continue;
        }

        let state_count = 1usize << p;
        let all = state_count - 1;
        for (bit, &candidate) in line.iter().enumerate() {
            local_bit[candidate] = bit as i32;
        }

        let mut graph_cost = crossing_counts(model.zero_scopes.iter(), &primary, line_number, &local_bit, p);
        let factor_cost = crossing_counts(
            model.mine_scopes.iter().chain(model.base_scopes.iter()),
            &primary,
            line_number,
            &local_bit,
            p,
        );

        // Connectivity vertices are live while processed but with an unprocessed graph neighbour.
        let mut old_masks = vec![0i32; state_count];
        let (mut old_total, mut old_always) = (0, 0);
        for candidate in 0..q {
            if primary(candidate) >= line_number {
                continue;
            }
            let (mut later, mut mask) = (false, 0usize);
            for &neighbour in &model.graph[candidate] {
                let neighbour_line = primary(neighbour);
                if neighbour_line > line_number {
                    later = true;
                } else if neighbour_line == line_number {
                    mask |= 1 << local_bit[neighbour];
                }
            }
            if later {
                old_always += 1;
            } else if mask != 0 {
                old_masks[mask] += 1;
                old_total += 1;
            }
        }
        zeta(&mut old_masks, p);

        let mut same_line_neighbours = vec![0usize; p];
        let mut has_later_neighbour = vec![false; p];
        for bit in 0..p {
            for &neighbour in &model.graph[line[bit]] {
                let neighbour_line = primary(neighbour);
                if neighbour_line > line_number {
                    has_later_neighbour[bit] = true;
                } else if neighbour_line == line_number {
                    same_line_neighbours[bit] |= 1 << local_bit[neighbour];
                }
            }
        }
        for mask in 0..state_count {
            graph_cost[mask] += old_always + old_total - old_masks[mask];
            let mut selected = mask;
            while selected != 0 {
                let bit = selected.trailing_zeros() as usize;
                selected &= selected - 1;
                if has_later_neighbour[bit] || (same_line_neighbours[bit] & !mask & all) != 0 {
                    graph_cost[mask] += 1;
                }
            }
        }

        // Best path from the empty subset to the full line, scored by the worst cut.
        let mut best: Vec<WidthEstimate> = vec![(i32::MAX, i32::MAX, i32::MAX, u64::MAX); state_count];
        let mut predecessor = vec![-1i8; state_count];
        let total0 = graph_cost[0] + factor_cost[0];
        best[0] = (total0, graph_cost[0], factor_cost[0], estimated_cut_work(total0));
        for mask in 1..state_count {
            let total = graph_cost[mask] + factor_cost[mask];
            let mut choices = mask;
            while choices != 0 {
                let bit = choices.trailing_zeros() as usize;
                choices &= choices - 1;
                let previous = best[mask ^ (1 << bit)];
                let score = (
                    previous.0.max(total),
                    previous.1.max(graph_cost[mask]),
                    previous.2.max(factor_cost[mask]),
                    previous.3.saturating_add(estimated_cut_work(total)),
                );
                if predecessor[mask] < 0 || score < best[mask] {
                    best[mask] = score;
                    predecessor[mask] = bit as i8;
                }
            }
        }
        let mut reversed = Vec::with_capacity(p);
        let mut mask = all;
        while mask != 0 {
            let bit = predecessor[mask] as usize;
            reversed.push(line[bit]);
            mask ^= 1 << bit;
        }
        reversed.reverse();
        result.extend(reversed);
    }
    result
}

fn candidate_band_sizes(size: usize) -> Vec<usize> {
    let mut values = vec![1, size];
    let mut value = 2;
    while value < size {
        values.push(value);
        value *= 2;
    }
    values.sort_unstable();
    values.dedup();
    values
}

/// Evaluate row, column, smart and banded orders and pick the narrowest frontier.
pub fn choose_order(model: &Model) -> (Model, String) {
    let mut choices: Vec<(WidthEstimate, String, Vec<usize>)> = Vec::new();
    let mut standard_best = i32::MAX;
    let mut standard_estimates = Vec::new();
    for &(name, by_columns) in &[("columns", true), ("rows", false)] {
        let order = order_indices(model, by_columns, 1);
        let estimate = width_estimate(model, &order);
        standard_best = standard_best.min(estimate.0);
        choices.push((estimate, name.to_string(), order));
        standard_estimates.push((name, by_columns, estimate));
    }
    for &(name, by_columns, estimate) in &standard_estimates {
        let physical_line_size = if by_columns { model.height } else { model.width };
        // Skip the 2^p preprocessing on long lines or clearly inferior orientations.
        if physical_line_size > 20 || estimate.0 > standard_best.saturating_add(2) {
            continue;
        }
        let smart_order = smart_line_order_indices(model, by_columns);
        let smart_estimate = width_estimate(model, &smart_order);
        choices.push((smart_estimate, format!("{}-smart", name), smart_order));
    }

    let mut banded: Vec<(&str, bool, usize)> = Vec::new();
    for &size in candidate_band_sizes(model.height).iter().skip(1) {
        banded.push(("rows", false, size));
    }
    for &size in candidate_band_sizes(model.width).iter().skip(1) {
        banded.push(("columns", true, size));
    }
    for (name, by_columns, size) in banded {
        let order = order_indices(model, by_columns, size);
        let estimate = width_estimate(model, &order);
        if estimate.0 <= standard_best.saturating_sub(2) {
            choices.push((estimate, format!("{}-band-{}", name, size), order));
        }
    }

    let (_, name, order) = choices
        .into_iter()
        .min_by(|a, b| (a.0, &a.1).cmp(&(b.0, &b.1)))
        .expect("row and column orders are always present");
    (model.reordered(&order), name)
}
