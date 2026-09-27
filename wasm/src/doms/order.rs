//! Choosing the order in which the frontier DP sweeps the chord candidates.
//!
//! After `k` candidates have been decided, the DP state has to remember everything that links
//! the decided candidates to the undecided ones (the "cut" between them):
//! * connectivity: chains that could still grow into undecided candidates, and
//! * factors: mines / 3BV units touched by candidates on both sides of the cut.
//!
//! State counts grow exponentially with that width, so the sweep order matters a lot. Rows,
//! columns, "smart" per-line orders and multi-line bands are all estimated and the narrowest wins.

use super::model::ChordModel;

/// Frontier width of an order. Derived `Ord` compares fields in declaration order.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct WidthEstimate {
    pub max_total: i32,
    pub max_connectivity: i32,
    pub max_factors: i32,
    /// Sum of `2^width` over all cuts, a rough proxy for DP work.
    pub work: u64,
}

impl WidthEstimate {
    const WORST: WidthEstimate = WidthEstimate {
        max_total: i32::MAX,
        max_connectivity: i32::MAX,
        max_factors: i32::MAX,
        work: u64::MAX,
    };
}

pub fn estimated_cut_work(width: i32) -> u64 {
    1u64 << width.clamp(0, 60)
}

/// Sweep by rows or columns, in bands of `band_size` lines (zig-zagging inside each band).
fn strip_order(model: &ChordModel, by_columns: bool, band_size: usize) -> Vec<usize> {
    let mut order: Vec<usize> = (0..model.candidate_cells.len()).collect();
    order.sort_by_key(|&candidate| {
        let row = model.candidate_cells[candidate] / model.width;
        let col = model.candidate_cells[candidate] % model.width;
        if by_columns {
            (col / band_size, row, col % band_size)
        } else {
            (row / band_size, col, row % band_size)
        }
    });
    order
}

/// Number of `(first_cut, last_cut)` intervals covering each cut in `0..cuts`.
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

/// Cut `k` sits between positions `k` and `k + 1` of the order.
pub fn width_estimate(model: &ChordModel, order: &[usize]) -> WidthEstimate {
    let candidate_count = order.len();
    let mut position = vec![0usize; candidate_count];
    for (i, &candidate) in order.iter().enumerate() {
        position[candidate] = i;
    }

    // A set of candidates stays on the frontier from its first position until its last.
    let span = |candidates: &Vec<usize>| -> Option<(usize, usize)> {
        let first = candidates.iter().map(|&candidate| position[candidate]).min()?;
        let last = candidates.iter().map(|&candidate| position[candidate]).max()?;
        if first < last {
            Some((first, last - 1))
        } else {
            None
        }
    };

    let mut connectivity_intervals = Vec::new();
    for &candidate in order {
        let here = position[candidate];
        let last_adjacent = model.adjacent_candidates[candidate]
            .iter()
            .map(|&other| position[other])
            .filter(|&other| other > here)
            .max()
            .unwrap_or(here);
        if last_adjacent > here {
            connectivity_intervals.push((here, last_adjacent - 1));
        }
    }
    connectivity_intervals.extend(model.opening_borders.iter().filter_map(|border| span(border)));

    let factor_intervals: Vec<(usize, usize)> = model
        .flag_needed_by
        .iter()
        .chain(model.bbbv_solved_by.iter())
        .filter_map(|candidates| span(candidates))
        .collect();

    let cuts = candidate_count.saturating_sub(1);
    let connectivity = coverage(&connectivity_intervals, cuts);
    let factors = coverage(&factor_intervals, cuts);

    let mut estimate = WidthEstimate { max_total: 0, max_connectivity: 0, max_factors: 0, work: 0 };
    for cut in 0..cuts {
        estimate.max_connectivity = estimate.max_connectivity.max(connectivity[cut]);
        estimate.max_factors = estimate.max_factors.max(factors[cut]);
        estimate.max_total = estimate.max_total.max(connectivity[cut] + factors[cut]);
        estimate.work = estimate.work.saturating_add(estimated_cut_work(connectivity[cut] + factors[cut]));
    }
    estimate
}

/// Subset-sum (zeta) transform: `counts[mask]` becomes the sum of `counts` over all submasks.
fn zeta(counts: &mut [i32], line_len: usize) {
    for bit in 0..line_len {
        let b = 1usize << bit;
        for mask in 0..counts.len() {
            if mask & b != 0 {
                counts[mask] += counts[mask ^ b];
            }
        }
    }
}

/// For every subset `mask` of the current line (the part already swept), count how many of the
/// candidate sets would have members on both sides of the cut.
fn crossing_counts<'a, F: Fn(usize) -> usize>(
    candidate_sets: impl Iterator<Item = &'a Vec<usize>>,
    line_of: &F,
    line_number: usize,
    bit_in_line: &[i32],
    line_len: usize,
) -> Vec<i32> {
    let subset_count = 1usize << line_len;
    let full_line = subset_count - 1;
    // Sets are bucketed by which other lines they touch, keyed by their members on this line.
    let mut with_earlier = vec![0i32; subset_count];
    let mut with_later = vec![0i32; subset_count];
    let mut only_this_line = vec![0i32; subset_count];
    let (mut always, mut earlier_total, mut later_total, mut this_line_total) = (0, 0, 0, 0);

    for set in candidate_sets {
        if set.is_empty() {
            continue;
        }
        let (mut earlier, mut later, mut mask) = (false, false, 0usize);
        for &candidate in set {
            let candidate_line = line_of(candidate);
            if candidate_line < line_number {
                earlier = true;
            } else if candidate_line > line_number {
                later = true;
            } else {
                mask |= 1 << bit_in_line[candidate];
            }
        }
        if earlier && later {
            always += 1;
        } else if earlier {
            with_earlier[mask] += 1;
            earlier_total += 1;
        } else if later {
            with_later[mask] += 1;
            later_total += 1;
        } else if mask != 0 {
            only_this_line[mask] += 1;
            this_line_total += 1;
        }
    }
    zeta(&mut with_earlier, line_len);
    zeta(&mut with_later, line_len);
    zeta(&mut only_this_line, line_len);

    (0..subset_count)
        .map(|mask| {
            always
                + earlier_total - with_earlier[mask]
                + later_total - with_later[full_line ^ mask]
                + this_line_total - only_this_line[mask] - only_this_line[full_line ^ mask]
        })
        .collect()
}

/// Keep the line-by-line sweep, but pick the best order inside each row/column with an exact
/// DP over subsets of the line (only for lines of at most 20 candidates).
fn smart_strip_order(model: &ChordModel, by_columns: bool) -> Vec<usize> {
    let candidate_count = model.candidate_cells.len();
    let width = model.width;
    let line_count = if by_columns { model.width } else { model.height };
    let line_of = |candidate: usize| {
        let cell = model.candidate_cells[candidate];
        if by_columns { cell % width } else { cell / width }
    };
    let position_in_line = |candidate: usize| {
        let cell = model.candidate_cells[candidate];
        if by_columns { cell / width } else { cell % width }
    };

    let mut lines: Vec<Vec<usize>> = vec![Vec::new(); line_count];
    for candidate in 0..candidate_count {
        lines[line_of(candidate)].push(candidate);
    }
    for line in lines.iter_mut() {
        line.sort_by_key(|&candidate| position_in_line(candidate));
    }

    let mut result = Vec::with_capacity(candidate_count);
    let mut bit_in_line = vec![-1i32; candidate_count];
    for (line_number, line) in lines.iter().enumerate() {
        let line_len = line.len();
        if line_len <= 1 || line_len > 20 {
            result.extend_from_slice(line);
            continue;
        }

        let subset_count = 1usize << line_len;
        let full_line = subset_count - 1;
        for (bit, &candidate) in line.iter().enumerate() {
            bit_in_line[candidate] = bit as i32;
        }

        let mut connectivity_width =
            crossing_counts(model.opening_borders.iter(), &line_of, line_number, &bit_in_line, line_len);
        let factor_width = crossing_counts(
            model.flag_needed_by.iter().chain(model.bbbv_solved_by.iter()),
            &line_of,
            line_number,
            &bit_in_line,
            line_len,
        );

        // A swept candidate stays on the frontier while it has an unswept adjacent candidate.
        let mut earlier_finished_by = vec![0i32; subset_count];
        let (mut earlier_waiting, mut earlier_always) = (0, 0);
        for candidate in 0..candidate_count {
            if line_of(candidate) >= line_number {
                continue;
            }
            let (mut later, mut mask) = (false, 0usize);
            for &adjacent in &model.adjacent_candidates[candidate] {
                let adjacent_line = line_of(adjacent);
                if adjacent_line > line_number {
                    later = true;
                } else if adjacent_line == line_number {
                    mask |= 1 << bit_in_line[adjacent];
                }
            }
            if later {
                earlier_always += 1;
            } else if mask != 0 {
                earlier_finished_by[mask] += 1;
                earlier_waiting += 1;
            }
        }
        zeta(&mut earlier_finished_by, line_len);

        let mut same_line_adjacent = vec![0usize; line_len];
        let mut has_later_adjacent = vec![false; line_len];
        for bit in 0..line_len {
            for &adjacent in &model.adjacent_candidates[line[bit]] {
                let adjacent_line = line_of(adjacent);
                if adjacent_line > line_number {
                    has_later_adjacent[bit] = true;
                } else if adjacent_line == line_number {
                    same_line_adjacent[bit] |= 1 << bit_in_line[adjacent];
                }
            }
        }
        for mask in 0..subset_count {
            connectivity_width[mask] += earlier_always + earlier_waiting - earlier_finished_by[mask];
            let mut swept = mask;
            while swept != 0 {
                let bit = swept.trailing_zeros() as usize;
                swept &= swept - 1;
                if has_later_adjacent[bit] || (same_line_adjacent[bit] & !mask & full_line) != 0 {
                    connectivity_width[mask] += 1;
                }
            }
        }

        // Cheapest path from the empty subset to the full line, adding one candidate at a time,
        // scored by its widest cut.
        let mut best = vec![WidthEstimate::WORST; subset_count];
        let mut last_added = vec![-1i8; subset_count];
        let empty_total = connectivity_width[0] + factor_width[0];
        best[0] = WidthEstimate {
            max_total: empty_total,
            max_connectivity: connectivity_width[0],
            max_factors: factor_width[0],
            work: estimated_cut_work(empty_total),
        };
        for mask in 1..subset_count {
            let total = connectivity_width[mask] + factor_width[mask];
            let mut choices = mask;
            while choices != 0 {
                let bit = choices.trailing_zeros() as usize;
                choices &= choices - 1;
                let previous = best[mask ^ (1 << bit)];
                let score = WidthEstimate {
                    max_total: previous.max_total.max(total),
                    max_connectivity: previous.max_connectivity.max(connectivity_width[mask]),
                    max_factors: previous.max_factors.max(factor_width[mask]),
                    work: previous.work.saturating_add(estimated_cut_work(total)),
                };
                if last_added[mask] < 0 || score < best[mask] {
                    best[mask] = score;
                    last_added[mask] = bit as i8;
                }
            }
        }
        let mut reversed = Vec::with_capacity(line_len);
        let mut mask = full_line;
        while mask != 0 {
            let bit = last_added[mask] as usize;
            reversed.push(line[bit]);
            mask ^= 1 << bit;
        }
        reversed.reverse();
        result.extend(reversed);
    }
    result
}

/// 1, powers of two below `size`, and `size`.
fn band_sizes(size: usize) -> Vec<usize> {
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

/// Returns the reordered model and the name of the chosen sweep order.
pub fn choose_sweep_order(model: &ChordModel) -> (ChordModel, String) {
    let mut choices: Vec<(WidthEstimate, String, Vec<usize>)> = Vec::new();
    let mut standard_best = i32::MAX;
    let mut standard_estimates = Vec::new();
    for &(name, by_columns) in &[("columns", true), ("rows", false)] {
        let order = strip_order(model, by_columns, 1);
        let estimate = width_estimate(model, &order);
        standard_best = standard_best.min(estimate.max_total);
        choices.push((estimate, name.to_string(), order));
        standard_estimates.push((name, by_columns, estimate));
    }
    for &(name, by_columns, estimate) in &standard_estimates {
        let line_size = if by_columns { model.height } else { model.width };
        // Skip the 2^line_len preprocessing on long lines or clearly worse orientations.
        if line_size > 20 || estimate.max_total > standard_best.saturating_add(2) {
            continue;
        }
        let smart_order = smart_strip_order(model, by_columns);
        let smart_estimate = width_estimate(model, &smart_order);
        choices.push((smart_estimate, format!("{}-smart", name), smart_order));
    }

    let mut banded: Vec<(&str, bool, usize)> = Vec::new();
    for &size in band_sizes(model.height).iter().skip(1) {
        banded.push(("rows", false, size));
    }
    for &size in band_sizes(model.width).iter().skip(1) {
        banded.push(("columns", true, size));
    }
    for (name, by_columns, size) in banded {
        let order = strip_order(model, by_columns, size);
        let estimate = width_estimate(model, &order);
        // Bands are only worth it when clearly narrower than a plain sweep.
        if estimate.max_total <= standard_best.saturating_sub(2) {
            choices.push((estimate, format!("{}-band-{}", name, size), order));
        }
    }

    let (_, name, order) = choices
        .into_iter()
        .min_by(|a, b| (a.0, &a.1).cmp(&(b.0, &b.1)))
        .expect("row and column orders are always present");
    (model.reordered(&order), name)
}
