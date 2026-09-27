mod utils;
pub mod board_gen_8way;
pub mod doms;
use board_gen_8way::{Board, ClickType};
use js_sys::{Array, Object, Reflect};
use chrono::{Utc, Duration};
use wasm_bindgen::prelude::*;

/// # Eight Way Zini
/// * Entry point for JavaScript
/// * Iterates in search of a board that meets the target efficiency
///
/// **Important note:** Llamasweeper target efficiency is a percentage (i.e, 110 for 110%), which needs to be converted.
#[wasm_bindgen]
pub fn eight_way(width: usize, height: usize, mine_count: usize, first_click_coords: JsValue, target_eff: f32, timeout_seconds: f64, use_small: bool) -> Result<JsValue, JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    utils::set_panic_hook();

    let use_first_click: bool;
    let first_click_row: usize;
    let first_click_col: usize;

    if first_click_coords.is_null() {
        use_first_click = false;
        first_click_row = 0;
        first_click_col = 0;
    } else {
        use_first_click = true;
        first_click_row = js_sys::Reflect::get(&first_click_coords, &"y".into())?.as_f64().ok_or_else(|| "error converting first click")? as usize;
        first_click_col = js_sys::Reflect::get(&first_click_coords, &"x".into())?.as_f64().ok_or_else(|| "error converting first click")? as usize;
    }

    let start = Utc::now();
    let end = start + Duration::milliseconds(timeout_seconds as i64 * 1000);
    let mut iteration_count: u32 = 0;   // 4 billion should be plenty haha
    let iteration_interval: u32 = 50;  // how often to check for timeout

    let mut board = Board::new(width, height, mine_count)?;

    loop {
        board.reset(); //Note that first iteration doesn't need reset, but this is harmless

        let success;
        if use_small {
           success = board.generate_eff_board_small(target_eff / 100.0, use_first_click, first_click_row, first_click_col, true)?;
        } else {
            success = board.generate_eff_board(target_eff / 100.0, use_first_click, first_click_row, first_click_col, true)?;
        }

        if success {
            return Ok(convert_to_js_array(board.to_mines_array()).into());
        }

        iteration_count += 1;
        if iteration_count % iteration_interval == 0 && Utc::now() >= end {
            break;
        }
    }

    Ok(false.into())    // timeout returns false
}

fn convert_to_js_array(grid: Vec<Vec<bool>>) -> Array {
    grid.into_iter()
        .map(|row| {
            let row_values: Vec<JsValue> = row.into_iter()
                .map(JsValue::from)
                .collect();
            row_values.into_iter().collect::<Array>()
        })
        .collect()
}


/// # Eight Way Zini Benchmarking Run
/// * Entry point for JavaScript
/// * Essentially does the same steps as eight_way, but times how long this takes for a set number of iterations
///
/// **Important note:** Llamasweeper target efficiency is a percentage (i.e, 110 for 110%), which needs to be converted.
#[wasm_bindgen]
pub fn eight_way_benchmark(width: usize, height: usize, mine_count: usize, first_click_coords: JsValue, target_eff: f32, iterations: usize, use_small: bool) -> Result<JsValue, JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    utils::set_panic_hook();

    let use_first_click: bool;
    let first_click_row: usize;
    let first_click_col: usize;

    if first_click_coords.is_null() {
        use_first_click = false;
        first_click_row = 0;
        first_click_col = 0;
    } else {
        use_first_click = true;
        first_click_row = js_sys::Reflect::get(&first_click_coords, &"y".into())?.as_f64().ok_or_else(|| "error converting first click")? as usize;
        first_click_col = js_sys::Reflect::get(&first_click_coords, &"x".into())?.as_f64().ok_or_else(|| "error converting first click")? as usize;
    }

    let start = Utc::now();

    let mut board = Board::new(width, height, mine_count)?;

    for _i in 0..iterations {
        board.reset(); //Note that first iteration doesn't need reset, but this is harmless

        if use_small {
            board.generate_eff_board_small(target_eff / 100.0, use_first_click, first_click_row, first_click_col, true)?;
        } else {
            board.generate_eff_board(target_eff / 100.0, use_first_click, first_click_row, first_click_col, true)?;
        }
    }

    let end = Utc::now();

    let total_time = (end - start).as_seconds_f32();

    Ok(total_time.into())    // return the time it took
}

/// # No-guess board generation
/// Thin wrapper around `ms_toollib::laymine_solvable`, replacing the
/// `ms-toollib` npm dependency.
///
/// Returns a JS array `[board, success]` where `board` is a 2D array of i32
/// (mines are `-1`) and `success` is a bool — matching the previous JS shape.
#[wasm_bindgen]
pub fn laymine_solvable(row: usize, column: usize, mine_num: usize, x0: usize, y0: usize, max_times: usize) -> Result<JsValue, JsValue> {
    let result = ms_toollib::laymine_solvable(row, column, mine_num, x0, y0, max_times);
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// # On-board mine probabilities
/// Thin wrapper around `ms_toollib::cal_probability_onboard`, replacing the
/// `ms-toollib` npm dependency.
///
/// Takes a JS 2D array game board and the mine count, and returns a JS array
/// `[probabilities, [min, current, max]]` — matching the previous JS shape.
#[wasm_bindgen]
pub fn cal_probability_onboard(js_board: JsValue, mine_num: f64) -> Result<JsValue, JsValue> {
    let mut board: Vec<Vec<i32>> = serde_wasm_bindgen::from_value(js_board).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let _ = ms_toollib::mark_board(&mut board, true);
    let result = ms_toollib::cal_probability_onboard(&board, mine_num)
        .map_err(|code| JsValue::from_str(&format!("cal_probability_onboard failed: {}", code)))?;
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

fn set_property(target: &Object, key: &str, value: JsValue) -> Result<(), JsValue> {
    Reflect::set(target, &key.into(), &value).map(|_| ())
}

/// # DOMS ZiNi
/// * Entry point for JavaScript
/// * `mines` is row-major (`y * width + x`), non-zero for a mine
/// * `progress_callback(processed, total, states)` is called after each chord candidate is decided
///
/// Returns `{ totalClicks, bbbv, clicks: [{ type, x, y }], stats }`.
/// Errors are `{ kind: "state-limit" | "invalid" | "internal", message }`.
#[wasm_bindgen]
pub fn doms_zini(width: usize, height: usize, mines: &[u8], max_states: u32, progress_callback: Option<js_sys::Function>) -> Result<JsValue, JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    utils::set_panic_hook();

    let mut progress = |processed: usize, total: usize, states: usize| {
        if let Some(callback) = &progress_callback {
            let _ = callback.call3(&JsValue::NULL, &(processed as f64).into(), &(total as f64).into(), &(states as f64).into());
        }
    };

    let result = match doms::solve_mines(width, height, mines, max_states as usize, &mut progress) {
        Ok(result) => result,
        Err(error) => {
            let kind = match error {
                doms::DomsError::StateLimitExceeded { .. } => "state-limit",
                doms::DomsError::Invalid(_) => "invalid",
                doms::DomsError::Internal(_) => "internal",
            };
            let js_error = Object::new();
            set_property(&js_error, "kind", kind.into())?;
            set_property(&js_error, "message", error.to_string().into())?;
            return Err(js_error.into());
        }
    };

    let clicks = Array::new();
    for click in &result.clicks {
        let js_click = Object::new();
        let click_type = match click.c_type {
            ClickType::NF => "left",
            ClickType::Flag => "right",
            ClickType::Chord => "chord",
        };
        set_property(&js_click, "type", click_type.into())?;
        set_property(&js_click, "x", click.square.col.into())?;
        set_property(&js_click, "y", click.square.row.into())?;
        clicks.push(&js_click);
    }

    let stats = &result.stats;
    let js_stats = Object::new();
    for &(key, value) in &[
        ("chordCandidates", stats.chord_candidates),
        ("chordClicks", stats.chord_clicks),
        ("flagClicks", stats.flag_clicks),
        ("seedClicks", stats.seed_clicks),
        ("remainingBbbvClicks", stats.remaining_bbbv_clicks),
        ("peakStates", stats.peak_states),
        ("maxBoundary", stats.max_boundary),
        ("maxActiveFactors", stats.max_active_factors),
    ] {
        set_property(&js_stats, key, (value as f64).into())?;
    }
    set_property(&js_stats, "sweepOrder", stats.sweep_order.as_str().into())?;

    let output = Object::new();
    set_property(&output, "totalClicks", (result.total_clicks as f64).into())?;
    set_property(&output, "bbbv", (stats.bbbv as f64).into())?;
    set_property(&output, "clicks", clicks.into())?;
    set_property(&output, "stats", js_stats.into())?;
    Ok(output.into())
}
