//! Turning a chosen chord set into an ordered, validated click sequence.

use super::model::Model;
use super::DomsError;
use crate::board_gen_8way::ClickType;
use std::collections::VecDeque;

pub struct Evaluation {
    pub clicks: usize,
    pub flags: Vec<usize>,
    pub components: Vec<Vec<usize>>,
    pub uncovered: Vec<usize>,
}

pub struct Solution {
    pub clicks: usize,
    pub selected: Vec<usize>,
    pub flags: Vec<usize>,
    pub components: Vec<Vec<usize>>,
    pub uncovered_units: Vec<usize>,
    /// (click type, cell)
    pub actions: Vec<(ClickType, usize)>,
}

fn zero_memberships(model: &Model) -> Vec<Vec<usize>> {
    let mut memberships = vec![Vec::new(); model.candidates.len()];
    for (z, scope) in model.zero_scopes.iter().enumerate() {
        for &candidate in scope {
            memberships[candidate].push(z);
        }
    }
    memberships
}

/// Click cost of chording exactly `selected_indexes` (candidate indexes).
pub fn evaluate_set(model: &Model, selected_indexes: &[usize]) -> Evaluation {
    let q = model.candidates.len();
    let mut selected = vec![false; q];
    for &candidate in selected_indexes {
        selected[candidate] = true;
    }
    let hit = |scope: &Vec<usize>| scope.iter().any(|&candidate| selected[candidate]);

    let flags: Vec<usize> = model
        .mine_scopes
        .iter()
        .zip(&model.mine_cells)
        .filter(|(scope, _)| hit(scope))
        .map(|(_, &mine)| mine)
        .collect();

    let memberships = zero_memberships(model);
    let mut unseen = selected.clone();
    let mut unused_zero = vec![true; model.zero_scopes.len()];
    let mut components = Vec::new();
    for start in 0..q {
        if !unseen[start] {
            continue;
        }
        unseen[start] = false;
        let mut component = Vec::new();
        let mut stack = vec![start];
        while let Some(candidate) = stack.pop() {
            component.push(candidate);
            for &other in &model.graph[candidate] {
                if unseen[other] {
                    unseen[other] = false;
                    stack.push(other);
                }
            }
            for &z in &memberships[candidate] {
                if !unused_zero[z] {
                    continue;
                }
                unused_zero[z] = false;
                for &other in &model.zero_scopes[z] {
                    if unseen[other] {
                        unseen[other] = false;
                        stack.push(other);
                    }
                }
            }
        }
        component.sort_unstable();
        components.push(component);
    }
    components.sort_by_key(|component: &Vec<usize>| model.candidates[component[0]]);

    let uncovered: Vec<usize> = (0..model.base_scopes.len())
        .filter(|&unit| !hit(&model.base_scopes[unit]))
        .collect();

    Evaluation {
        clicks: selected_indexes.len() + flags.len() + components.len() + uncovered.len(),
        flags,
        components,
        uncovered,
    }
}

/// BFS order for chording a component, starting from its top-left candidate so every
/// chord is already revealed when it is played.
fn component_chord_order(model: &Model, component: &[usize]) -> Result<Vec<usize>, DomsError> {
    let q = model.candidates.len();
    let mut allowed = vec![false; q];
    for &candidate in component {
        allowed[candidate] = true;
    }
    let seed = *component
        .iter()
        .min_by_key(|&&candidate| model.candidates[candidate])
        .ok_or_else(|| DomsError::Internal("empty chord component".into()))?;
    let memberships = zero_memberships(model);
    let mut unused_zero = vec![true; model.zero_scopes.len()];
    let mut seen = vec![false; q];
    let mut queue = VecDeque::new();
    queue.push_back(seed);
    seen[seed] = true;
    let mut order = Vec::with_capacity(component.len());
    while let Some(candidate) = queue.pop_front() {
        order.push(candidate);
        let mut adjacent = model.graph[candidate].clone();
        adjacent.sort_by_key(|&other| model.candidates[other]);
        for other in adjacent {
            if allowed[other] && !seen[other] {
                seen[other] = true;
                queue.push_back(other);
            }
        }
        for &z in &memberships[candidate] {
            if !unused_zero[z] {
                continue;
            }
            unused_zero[z] = false;
            let mut scope = model.zero_scopes[z].clone();
            scope.sort_by_key(|&other| model.candidates[other]);
            for other in scope {
                if allowed[other] && !seen[other] {
                    seen[other] = true;
                    queue.push_back(other);
                }
            }
        }
    }
    if order.len() != component.len() {
        return Err(DomsError::Internal("reported chord component is disconnected".into()));
    }
    Ok(order)
}

/// Replay the actions on a plain board to prove they clear it.
fn validate_actions(model: &Model, actions: &[(ClickType, usize)]) -> Result<(), DomsError> {
    let cells = model.height * model.width;
    let mut opened = vec![false; cells];
    let mut flagged = vec![false; cells];
    let mut zero_by_cell = vec![usize::MAX; cells];
    for (z, zero) in model.zeros.iter().enumerate() {
        for &cell in zero {
            zero_by_cell[cell] = z;
        }
    }
    let invalid = |message: &str| -> Result<(), DomsError> {
        Err(DomsError::Internal(format!("invalid action sequence: {}", message)))
    };

    let reveal = |start: usize, opened: &mut Vec<bool>, flagged: &Vec<bool>| -> Result<(), DomsError> {
        if model.mines[start] || flagged[start] {
            return invalid("attempted to reveal a mine or flag");
        }
        if opened[start] {
            return Ok(());
        }
        opened[start] = true;
        if model.numbers[start] == 0 {
            for &zero in &model.zeros[zero_by_cell[start]] {
                opened[zero] = true;
                for &other in &model.neighbours[zero] {
                    if !model.mines[other] {
                        opened[other] = true;
                    }
                }
            }
        }
        Ok(())
    };

    for &(click_type, cell) in actions {
        match click_type {
            ClickType::Flag => {
                if !model.mines[cell] || opened[cell] {
                    return invalid("illegal flag");
                }
                flagged[cell] = true;
            }
            ClickType::NF => reveal(cell, &mut opened, &flagged)?,
            ClickType::Chord => {
                if !opened[cell] || model.mines[cell] || model.numbers[cell] == 0 {
                    return invalid("illegal chord centre");
                }
                let flag_count = model.neighbours[cell].iter().filter(|&&other| flagged[other]).count();
                if flag_count != model.numbers[cell] as usize {
                    return invalid("wrong adjacent flag count for chord");
                }
                for &other in &model.neighbours[cell] {
                    if !flagged[other] && !model.mines[other] {
                        reveal(other, &mut opened, &flagged)?;
                    }
                }
            }
        }
    }
    let missing = (0..cells).filter(|&cell| !model.mines[cell] && !opened[cell]).count();
    if missing != 0 {
        return invalid(&format!("{} safe cells left covered", missing));
    }
    Ok(())
}

pub fn construct_solution(
    model: &Model,
    selected: &[usize],
    expected_clicks: Option<i32>,
) -> Result<Solution, DomsError> {
    let evaluation = evaluate_set(model, selected);
    if let Some(expected) = expected_clicks {
        if evaluation.clicks as i32 != expected {
            return Err(DomsError::Internal(format!(
                "DP cost {} disagrees with evaluated cost {}",
                expected, evaluation.clicks
            )));
        }
    }

    let mut actions: Vec<(ClickType, usize)> = evaluation.flags.iter().map(|&mine| (ClickType::Flag, mine)).collect();
    for component in &evaluation.components {
        let order = component_chord_order(model, component)?;
        actions.push((ClickType::NF, model.candidates[order[0]]));
        actions.extend(order.iter().map(|&candidate| (ClickType::Chord, model.candidates[candidate])));
    }
    actions.extend(
        evaluation
            .uncovered
            .iter()
            .map(|&unit| (ClickType::NF, model.base_representatives[unit])),
    );
    if actions.len() != evaluation.clicks {
        return Err(DomsError::Internal("constructed action count disagrees with objective".into()));
    }
    validate_actions(model, &actions)?;

    Ok(Solution {
        clicks: evaluation.clicks,
        selected: selected.to_vec(),
        flags: evaluation.flags,
        components: evaluation.components,
        uncovered_units: evaluation.uncovered,
        actions,
    })
}

/// Exhaustive search over every chord set. Only practical for tiny boards (used by tests).
pub fn solve_bruteforce(model: &Model, max_candidates: usize) -> Result<Solution, DomsError> {
    let q = model.candidates.len();
    if q > max_candidates {
        return Err(DomsError::Invalid(format!(
            "brute force is limited to {} candidates; board has {}",
            max_candidates, q
        )));
    }
    let mut best_cost = usize::MAX;
    let mut best = Vec::new();
    for mask in 0u64..(1u64 << q) {
        let selected: Vec<usize> = (0..q).filter(|&i| (mask >> i) & 1 == 1).collect();
        let cost = evaluate_set(model, &selected).clicks;
        if cost < best_cost {
            best_cost = cost;
            best = selected;
        }
    }
    construct_solution(model, &best, Some(best_cost as i32))
}
