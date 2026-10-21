//! Times DOMS under different sweep orders and checks they all find the same click count.
//!
//! From `wasm/`:
//! `RUSTFLAGS="-C target-cpu=native" cargo run --release --example doms_bench > /tmp/doms_bench.log 2>&1`
//! * `DOMS_BENCH_SETS`: comma separated, default `evil`. `evil`, `board` (PTTACG in `DOMS_BENCH_BOARD`),
//!   `community:N`, `expert:N`, `intermediate:N`, `beginner:N`.
//! * `DOMS_BENCH_ORDERS`: comma separated sweep orders to compare, default `auto`
//!   (`auto`, `columns`, `rows`, `columns-smart`, `rows-smart`).
//! * `DOMS_BENCH_REPEATS`: default 1; orders are interleaved and timings shown are medians.

use llamasweeper_rust::board_gen_8way::{Board, SquareType};
use llamasweeper_rust::doms::{self, DomsOptions, DomsResult, SweepOrder};
use rand::rngs::StdRng;
use rand::seq::SliceRandom;
use rand::SeedableRng;
use std::time::Instant;

const EVIL_199: (&str, usize) = (
    "?b=3020&m=84819191d005024402p010ki1104i0a85204000g10090h8080kj092916g324h0ka00ci0o880002cs0106294ad2244408i8p968hh020304ia0g000gi0",
    179,
);
const COMMUNITY: &str = include_str!("../tests/data/community_expert_boards.txt");

fn load(pttacg: &str) -> Board {
    let mut board = Board::load_board_pttacg(pttacg.to_string()).expect("valid PTTACG string");
    board.initialize_all().expect("board initialises");
    board
}

fn random_board(rng: &mut StdRng, width: usize, height: usize, mine_count: usize) -> Board {
    let mut mines = vec![0u8; width * height];
    mines[..mine_count].iter_mut().for_each(|mine| *mine = 1);
    mines.shuffle(rng);
    let mut board = Board::new(width, height, mine_count).unwrap();
    for (cell, &mine) in mines.iter().enumerate() {
        if mine == 1 {
            board.squares[cell / width][cell % width].square_type = SquareType::Mine;
            board.mine_locations.insert((cell / width, cell % width));
        }
    }
    board.initialize_all().unwrap();
    board
}

#[derive(Default)]
struct Totals {
    seconds: f64,
    repeat_seconds: Vec<f64>,
    peak: usize,
    total_states: usize,
    mismatches: usize,
    prune: doms::PruneTimes,
    dp: doms::DpTimes,
    names: Vec<String>,
}

fn solve(board: &Board, order: SweepOrder) -> (DomsResult, f64) {
    let options = DomsOptions { sweep_order: order, visualise: None };
    let started = Instant::now();
    let result = doms::solve_board_with_options(board, doms::reduce::DEFAULT_STATIC_RULE, 20_000_000, &options, &mut |_| {})
        .expect("DOMS solves the board");
    (result, started.elapsed().as_secs_f64())
}

fn run_set(label: &str, boards: Vec<(Board, Option<usize>)>, orders: &[(String, SweepOrder)], repeats: usize) {
    let mut totals: Vec<Totals> = orders.iter().map(|_| Totals::default()).collect();
    for _ in 0..repeats {
        let mut round: Vec<Totals> = orders.iter().map(|_| Totals::default()).collect();
        for (board, expected) in &boards {
            let mut reference: Option<usize> = *expected;
            for (index, (_, order)) in orders.iter().enumerate() {
                let (result, seconds) = solve(board, *order);
                let reference = *reference.get_or_insert(result.total_clicks);
                let t = &mut round[index];
                if result.total_clicks != reference {
                    eprintln!("MISMATCH {}: {} vs {} for {}", orders[index].0, result.total_clicks, reference, board.generate_pttacg());
                    t.mismatches += 1;
                }
                t.seconds += seconds;
                t.peak = t.peak.max(result.stats.peak_states);
                t.total_states += result.stats.total_states;
                t.prune.add(&result.stats.prune_times);
                t.dp.add(&result.stats.dp_times);
                t.names.push(result.stats.sweep_order.clone());
            }
        }
        for (index, mut finished) in round.into_iter().enumerate() {
            let mut keep = std::mem::take(&mut totals[index].repeat_seconds);
            keep.push(finished.seconds);
            finished.repeat_seconds = keep;
            totals[index] = finished;
        }
    }
    println!("\n== {} ({} boards, {} repeats; times are medians) ==", label, boards.len(), repeats);
    println!("{:<14} {:>10} {:>10} {:>12} {:>9} {:>9}  chosen order", "order", "mismatches", "peak", "total states", "solve s", "min s");
    for (index, (name, _)) in orders.iter().enumerate() {
        let t = &totals[index];
        let mut sorted = t.repeat_seconds.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let chosen = if t.names.len() <= 3 { t.names.join(", ") } else { format!("{} boards", t.names.len()) };
        println!("{:<14} {:>10} {:>10} {:>12} {:>9.2} {:>9.2}  {}", name, t.mismatches, t.peak, t.total_states, sorted[sorted.len() / 2], sorted[0], chosen);
        println!("               dp: {}; prune: {}", t.dp, t.prune);
    }
}

fn main() {
    let orders: Vec<(String, SweepOrder)> = std::env::var("DOMS_BENCH_ORDERS")
        .unwrap_or_else(|_| "auto".to_string())
        .split(',')
        .map(|name| {
            let name = name.trim();
            (name.to_string(), SweepOrder::parse(name).unwrap_or_else(|| panic!("unknown sweep order {}", name)))
        })
        .collect();
    let repeats = std::env::var("DOMS_BENCH_REPEATS").ok().and_then(|value| value.parse().ok()).unwrap_or(1usize).max(1);
    let spec = std::env::var("DOMS_BENCH_SETS").unwrap_or_else(|_| "evil".to_string());
    for set in spec.split(',').map(str::trim).filter(|set| !set.is_empty()) {
        let (name, count) = match set.split_once(':') {
            Some((name, count)) => (name, count.parse::<usize>().expect("a board count")),
            None => (set, 1),
        };
        let boards: Vec<(Board, Option<usize>)> = match name {
            "evil" => vec![(load(EVIL_199.0), Some(EVIL_199.1))],
            "board" => vec![(load(&std::env::var("DOMS_BENCH_BOARD").expect("DOMS_BENCH_BOARD")), None)],
            "community" => COMMUNITY
                .lines()
                .filter(|line| !line.trim().is_empty())
                .take(count)
                .map(|line| {
                    let fields: Vec<&str> = line.split_whitespace().collect();
                    (load(fields[0]), Some(fields[1].parse().unwrap()))
                })
                .collect(),
            "beginner" | "intermediate" | "expert" => {
                let (width, height, mines, seed) = match name {
                    "beginner" => (9, 9, 10, 20261008),
                    "intermediate" => (16, 16, 40, 20261009),
                    _ => (30, 16, 99, 20261004),
                };
                let mut rng = StdRng::seed_from_u64(seed);
                (0..count).map(|_| (random_board(&mut rng, width, height, mines), None)).collect()
            }
            other => panic!("unknown set {}", other),
        };
        run_set(set, boards, &orders, repeats);
    }
}
