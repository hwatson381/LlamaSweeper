use llamasweeper_rust::board_gen_8way::{Board, ClickType, SquareType};
use llamasweeper_rust::doms::model::ChordModel;
use llamasweeper_rust::doms::reduce;
use llamasweeper_rust::doms::{self, solution, DomsProgress, DomsResult, DEFAULT_MAX_STATES};
use rand::rngs::StdRng;
use rand::seq::SliceRandom;
use rand::SeedableRng;

/// (PTTACG string, optimal clicks, 3BV) from the reference C++ implementation.
const REFERENCE_BOARDS: &[(&str, usize, usize)] = &[
    ("?b=1&m=o020000800142g060", 11, 14),
    ("?b=1&m=1900880040g04008g", 11, 11),
    ("?b=1&m=h100080080004109g", 7, 8),
    ("?b=2010&m=41880gmg008038200g8182g920414s0284400088", 43, 62),
    ("?b=2010&m=0002o0h8602a50080801e81208203gk080i08110", 36, 55),
    ("?b=1020&m=84002000g0i885h0510g80ga2922h00088021g4o", 47, 70),
    ("?b=1020&m=18901080g00c09cg2o13g00o0iah05c08003a0h0", 45, 77),
    ("?b=1207&m=1208mk2420073400e", 28, 35),
    ("?b=2&m=80484108o2h0ig8o050291820410182o04g001210g000g0g0000", 54, 80),
    ("?b=2&m=gg2081042801200898a0320080ho1o001a80020i008000g6001g", 38, 54),
    ("?b=2&m=0400409020000b02k05480600204606b2gok40241003000080g0", 38, 52),
    ("?b=2&m=120g00c0a01800000450010928g08a8000sg5281h0804488c000", 44, 60),
    ("?b=2&m=00840h00k22002c040510g00111e20d3400040g401k0400301g0", 46, 61),
    ("?b=2&m=g00gg0600112g880h0k0580gg00e20802020q0401800095g2040", 53, 73),
    ("?b=2&m=9090800g60880g010g3i020g01290001040g44g1184401642800", 50, 65),
    ("?b=2&m=40005g91c4g28080662108000k840021g600gc1022002000o200", 34, 45),
    ("?b=2&m=ggg10000101288i805200014224025o000682c05000c0450020g", 44, 60),
    ("?b=2&m=01k10g0h200g0h081gc0g44045g81g0000n28000016400c0100g", 37, 48),
    ("?b=2&m=g0022481g08100hg020a080800612040g2e40s84001004102i20", 41, 54),
    ("?b=2&m=a280g00606o24851008ig00g8012000gi00000a250k0001104gg", 44, 66),
    ("?b=3&m=2600026g0001k0201b0m10qi008209p48bg1i40m20l81m200k0308214080008a00o0088106401c46820ccc05ipc0400g", 103, 160),
    ("?b=3&m=ggo08009i000i00h00g40qkg70008gg2990011k26k01kg8q00g08a2g004hg0m190082920013g168i9cgiq220i20050g4", 119, 181),
    ("?b=3&m=90i2081802241m008121g60g0000c000qk8d4hbcgs003k05e80gg0dg41g8ph80011900000g04o100l000g1g20c1gsga4", 103, 162),
    ("?b=3&m=40es114104c2h0e2d30040ih4g00700c800g000500801c481100a2864048453920g1g400o4i080o80378204838ak4014", 105, 152),
    ("?b=3&m=h80c4183l04008d0801g1i4t000a40401gc1gg298040j80020kc015000806j1aq21902504g00051s200988110520kga0", 111, 150),
    ("?b=3&m=0cgh1002800eo2phoc00ij100002800g1004h9pq00l0p138k40g4a0055o50o80i2004014c49204ga214800028408400a", 109, 174),
    ("?b=3&m=101up42101g1g0iog020agh8118kh30g43p08101gg8h2h8ck00c0g004020000012k160084g4h8g8l42g0181004to8080", 103, 163),
    ("?b=3&m=6483008g0000d9891h604e4188g104gg0841b424i00ib0g8c1003g0501000200i5gg4004148l401069888308i24h1462", 122, 187),
    ("?b=3&m=4010eg000c0848o4g610g09364001gg42h42t1pg04882040aga1000s814a000c4g1160s0g2010230140j83og0092oa04", 113, 193),
    ("?b=3&m=c0o40gcg106mg0k022kpke000ag0h090008rh90g840g060464015414201o0g908004k00831g280m1054h060204o2g012", 110, 166),
    ("?b=3&m=4400h32589048000k0k0808200gk14ik80424k22441ag01i82g00bi100g8k5c2g48510c9i020i610048gh004203o8g6g", 111, 164),
    ("?b=3&m=o411i924g0201ca12g8s40200g0123805lg41g08mo081023hk4g0100g0gc804c38821400hi040000l01024gog0kh620h", 114, 173),
];

fn load(pttacg: &str) -> Board {
    let mut board = Board::load_board_pttacg(pttacg.to_string()).expect("valid PTTACG string");
    board.initialize_all().expect("board initialises");
    board
}

fn solve(board: &Board) -> DomsResult {
    doms::solve_board(board, DEFAULT_MAX_STATES, &mut |_| {}).expect("DOMS solves the board")
}

fn assert_consistent(result: &DomsResult) {
    let stats = &result.stats;
    assert_eq!(result.clicks.len(), result.total_clicks);
    assert_eq!(
        result.total_clicks,
        stats.chord_clicks + stats.flag_clicks + stats.seed_clicks + stats.remaining_bbbv_clicks
    );
    let count = |c_type: ClickType| result.clicks.iter().filter(|click| click.c_type == c_type).count();
    assert_eq!(count(ClickType::Chord), stats.chord_clicks);
    assert_eq!(count(ClickType::Flag), stats.flag_clicks);
    assert_eq!(count(ClickType::NF), stats.seed_clicks + stats.remaining_bbbv_clicks);
}

#[test]
fn matches_reference_implementation() {
    for &(pttacg, optimal_clicks, bbbv) in REFERENCE_BOARDS {
        let board = load(pttacg);
        let result = solve(&board);
        assert_eq!(result.stats.bbbv, bbbv, "3BV for {}", pttacg);
        assert_eq!(result.stats.bbbv, board.info.bbbv as usize, "3BV vs Board for {}", pttacg);
        assert_eq!(result.total_clicks, optimal_clicks, "optimal clicks for {}", pttacg);
        assert_consistent(&result);
    }
}

fn random_board(rng: &mut StdRng, width: usize, height: usize, mine_count: usize) -> Board {
    let cells = width * height;
    let mut mines = vec![0u8; cells];
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

#[test]
fn matches_bruteforce_on_small_boards() {
    let mut rng = StdRng::seed_from_u64(20260927);
    let mut checked = 0;
    for attempt in 0..2000usize {
        if checked == 150 {
            break;
        }
        let width = 3 + (attempt % 4);
        let height = 3 + (attempt % 3);
        let mine_count = 1 + attempt % (width * height / 3);
        let board = random_board(&mut rng, width, height, mine_count);

        let brute = match doms::solve_board_bruteforce(&board, 16) {
            Ok(brute) => brute,
            Err(_) => continue,
        };
        let result = solve(&board);
        assert_eq!(result.total_clicks, brute.total_clicks, "{}", board.generate_pttacg());
        assert_consistent(&result);
        checked += 1;
    }
    assert_eq!(checked, 150);
}

/// Brute force over the kept candidates must match brute force over all of them.
#[test]
fn static_reduction_keeps_the_optimum() {
    let mut removed = 0usize;
    let mut rng = StdRng::seed_from_u64(20260930);
    let mut checked = 0;
    for attempt in 0..5000usize {
        if checked == 400 {
            break;
        }
        let width = 3 + (attempt % 5);
        let height = 3 + (attempt % 4);
        // Up to half mines, so mines surrounded by mines (private mines) actually occur.
        let mine_count = 1 + attempt % (width * height / 2);
        let board = random_board(&mut rng, width, height, mine_count);
        let model = ChordModel::from_board(&board);
        let optimum = match solution::solve_bruteforce(&model, 16) {
            Ok(best) => best.total_clicks,
            Err(_) => continue,
        };
        let kept = reduce::kept_candidates(&model);
        removed += model.candidate_cells.len() - kept.len();
        let reduced = solution::solve_bruteforce(&model.reordered(&kept), 16).unwrap();
        assert_eq!(reduced.total_clicks, optimum, "{}", board.generate_pttacg());
        checked += 1;
    }
    assert_eq!(checked, 400);
    assert!(removed > 0, "nothing was removed");
}

#[test]
fn solves_from_row_major_mines() {
    // 4 wide, 2 tall with a mine at (x=3, y=0): one opening plus the island at (x=3, y=1)
    let mines = [0, 0, 0, 1, 0, 0, 0, 0];
    let result = doms::solve_mines(4, 2, &mines, DEFAULT_MAX_STATES, &mut |_| {}).unwrap();
    assert_eq!(result.total_clicks, 2);
    assert!(result.clicks.iter().any(|click| (click.square.col, click.square.row) == (3, 1)));
    assert!(result.clicks.iter().all(|click| (click.square.col, click.square.row) != (3, 0)));
    assert_consistent(&result);
}

#[test]
fn handles_boards_without_mines_or_safe_squares() {
    let empty = doms::solve_mines(3, 3, &[0; 9], DEFAULT_MAX_STATES, &mut |_| {}).unwrap();
    assert_eq!(empty.total_clicks, 1);
    let full = doms::solve_mines(3, 3, &[1; 9], DEFAULT_MAX_STATES, &mut |_| {}).unwrap();
    assert_eq!(full.total_clicks, 0);
}

#[test]
fn solves_when_every_candidate_is_removed() {
    // One corner mine: with the solver's rules all three borders are removed and the DP decides nothing.
    let mut mines = [0u8; 9];
    mines[0] = 1;
    let result = doms::solve_mines(3, 3, &mines, DEFAULT_MAX_STATES, &mut |_| {}).unwrap();
    assert_eq!(result.total_clicks, 1);
    assert_consistent(&result);
}

#[test]
fn reports_state_limit() {
    let board = load(REFERENCE_BOARDS[REFERENCE_BOARDS.len() - 1].0);
    let error = doms::solve_board(&board, 10, &mut |_| {}).err().expect("state limit is hit");
    assert!(matches!(error, doms::DomsError::StateLimitExceeded { .. }));
}

#[test]
fn reports_progress_for_every_candidate() {
    let board = load(REFERENCE_BOARDS[8].0);
    let mut plan_widths = None;
    let mut calls = Vec::new();
    let result = doms::solve_board(&board, DEFAULT_MAX_STATES, &mut |event| match event {
        DomsProgress::Plan { cut_widths } => plan_widths = Some(cut_widths.len()),
        DomsProgress::Layer { processed, total, .. } => calls.push((processed, total)),
    })
    .unwrap();
    let decided = result.stats.chord_candidates - result.stats.static_removed;
    assert_eq!(plan_widths, Some(decided - 1));
    assert_eq!(calls.len(), decided);
    assert_eq!(calls.last().map(|&(processed, total)| processed == total), Some(true));
}

/// Slow board (optimal clicks, 3BV from the reference C++ implementation).
const SLOW_BOARD: (&str, usize, usize) = (
    "?b=3&m=00000094i94i00000000000094i94i00000000000094i94i00000000000094i94i00000000000094i94i94i94i000000",
    158,
    420,
);

fn benchmark(pttacg: &str, optimal_clicks: usize, max_states: usize) -> f64 {
    let board = load(pttacg);
    let start = std::time::Instant::now();
    let result = doms::solve_board(&board, max_states, &mut |_| {}).expect("DOMS solves the board");
    let seconds = start.elapsed().as_secs_f64();
    assert_eq!(result.total_clicks, optimal_clicks, "optimal clicks for {}", pttacg);
    println!("{:>8.3}s {:?}", seconds, result.stats);
    seconds
}

// Run with `cargo test --release --test doms_tests -- --ignored --nocapture`
#[test]
#[ignore]
fn benchmark_reference_boards() {
    let total: f64 = REFERENCE_BOARDS
        .iter()
        .map(|&(pttacg, optimal_clicks, _)| benchmark(pttacg, optimal_clicks, DEFAULT_MAX_STATES))
        .sum();
    println!("reference boards total: {:.3}s", total);
}

#[test]
#[ignore]
fn benchmark_slow_board() {
    benchmark(SLOW_BOARD.0, SLOW_BOARD.1, 20_000_000);
}

#[test]
#[ignore]
fn benchmark_random_expert_boards() {
    const BOARD_COUNT: usize = 100;
    let mut rng = StdRng::seed_from_u64(20261004);
    let mut timings = Vec::with_capacity(BOARD_COUNT);

    for _ in 0..BOARD_COUNT {
        let board = random_board(&mut rng, 30, 16, 99);
        let start = std::time::Instant::now();
        doms::solve_board(&board, DEFAULT_MAX_STATES, &mut |_| {}).expect("DOMS solves the board");
        timings.push(start.elapsed().as_secs_f64());
    }

    timings.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let total: f64 = timings.iter().sum();
    println!(
        "{} random expert boards: total {:.3}s, mean {:.3}s, median {:.3}s, slowest {:.3}s",
        BOARD_COUNT,
        total,
        total / BOARD_COUNT as f64,
        timings[BOARD_COUNT / 2],
        timings[BOARD_COUNT - 1]
    );
}

/// "Evil 199" board (optimal clicks, 3BV).
const EVIL_199_BOARD: (&str, usize, usize) = (
    "?b=3020&m=84819191d005024402p010ki1104i0a85204000g10090h8080kj092916g324h0ka00ci0o880002cs0106294ad2244408i8p968hh020304ia0g000gi0",
    179,
    356,
);

#[test]
#[ignore]
fn benchmark_evil_199_board() {
    let (pttacg, optimal_clicks, bbbv) = EVIL_199_BOARD;
    assert_eq!(load(pttacg).info.bbbv as usize, bbbv, "3BV for {}", pttacg);
    benchmark(pttacg, optimal_clicks, 20_000_000);
}

/// Community-scraped expert boards with very high efficiency potential, one per line:
/// `PTTACG optimal_clicks 3BV`, with answers from the reference C++ implementation.
const COMMUNITY_EXPERT_BOARDS: &str = include_str!("data/community_expert_boards.txt");

#[test]
#[ignore]
fn benchmark_community_expert_boards() {
    let mut timings: Vec<(f64, &str)> = Vec::new();
    for line in COMMUNITY_EXPERT_BOARDS.lines().filter(|line| !line.trim().is_empty()) {
        let fields: Vec<&str> = line.split_whitespace().collect();
        let (pttacg, optimal_clicks, bbbv): (&str, usize, usize) =
            (fields[0], fields[1].parse().unwrap(), fields[2].parse().unwrap());
        let board = load(pttacg);
        assert_eq!(board.info.bbbv as usize, bbbv, "3BV for {}", pttacg);
        let start = std::time::Instant::now();
        let result = doms::solve_board(&board, 20_000_000, &mut |_| {}).expect("DOMS solves the board");
        timings.push((start.elapsed().as_secs_f64(), pttacg));
        assert_eq!(result.total_clicks, optimal_clicks, "optimal clicks for {}", pttacg);
    }

    let total: f64 = timings.iter().map(|&(seconds, _)| seconds).sum();
    timings.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
    let median = timings[timings.len() / 2].0;
    println!(
        "{} community boards: total {:.3}s, mean {:.3}s, median {:.3}s",
        timings.len(),
        total,
        total / timings.len() as f64,
        median
    );
    println!("slowest:");
    for &(seconds, pttacg) in timings.iter().rev().take(5) {
        println!("{:>8.3}s {}", seconds, pttacg);
    }
}
