mod utils;
pub mod board_gen_8way;
use board_gen_8way::Board;
use js_sys::Array;
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