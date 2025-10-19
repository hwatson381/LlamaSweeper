#[cfg(test)]
mod tests {
    use chrono::Utc;
    use llamasweeper_rust::board_gen_8way::Board;

    #[test]
    fn test_board_creation() {
        let width = 30;
        let height = 16;
        let mines = 99;

        let board = Board::new(width, height, mines);
        assert!(board.is_ok(), "Board creation should succeed");

        let board = board.unwrap();
        assert_eq!(board.width, width);
        assert_eq!(board.height, height);
        assert_eq!(board.mine_count, mines);
    }

    #[test]
    fn test_simple_generation() {
        let width = 9;
        let height = 9;
        let mines = 10;

        let mut board = Board::new(width, height, mines)
            .expect("Failed to create board");

        // Just test that these methods run without panicking
        board.add_mines();
        assert_eq!(board.mine_locations.len(), mines, "Should have correct number of mines");

        board.initialize_all().expect("Error initializing board");
        println!("Board initialized successfully");
    }

    #[test]
    fn test_generate_eff_board_simple() {
        let width = 9;
        let height = 9;
        let mines = 10;
        let threshold = 1.0;

        let mut board = Board::new(width, height, mines)
            .expect("Failed to create board");

        let result = board.generate_eff_board(threshold, false, 0, 0, false);

        match result {
            Ok(meets_threshold) => {
                println!("Board generated! Meets threshold: {}", meets_threshold);
                assert_eq!(board.mine_locations.len(), mines);
            }
            Err(e) => {
                panic!("Error generating board: {}", e);
            }
        }
    }

    #[test]
    fn test_board_creation_invalid_dimensions() {
        // Test width too large
        assert!(Board::new(200, 16, 99).is_err());

        // Test width zero
        assert!(Board::new(0, 16, 99).is_err());

        // Test height zero
        assert!(Board::new(30, 0, 99).is_err());

        // Test too many mines
        assert!(Board::new(30, 16, 480).is_err());

        // Test zero mines
        assert!(Board::new(30, 16, 0).is_err());
    }

    #[test]
    fn test_generate_eff_board_basic() {
        let width = 30;
        let height = 16;
        let mines = 99;
        let threshold = 1.5;

        let mut board = Board::new(width, height, mines)
            .expect("Failed to create board");

        let result = board.generate_eff_board(threshold, false, 0, 0, false);
        assert!(result.is_ok(), "generate_eff_board should not error");

        // Verify mines were placed
        assert_eq!(board.mine_locations.len(), mines);
        println!("3BV: {}", board.info.bbbv);
    }

    #[test]
    fn test_generate_with_threshold_check() {
        let width = 30;
        let height = 16;
        let mines = 99;
        let threshold = 1.7;
        let max_attempts = 1000;

        let mut successful_boards = 0;

        for _ in 0..max_attempts {
            let mut board = Board::new(width, height, mines)
                .expect("Failed to create board");

            match board.generate_eff_board(threshold, false, 0, 0, false) {
                Ok(meets_threshold) => {
                    if meets_threshold {
                        successful_boards += 1;

                        // Verify board properties
                        assert_eq!(board.mine_locations.len(), mines);
                        assert!(board.info.bbbv > 0, "3BV should be calculated");

                        // Optionally verify the threshold is actually met
                        let zini = board.calculate_zini_8way(false).expect("ZINI calculation failed");
                        let score = board.info.bbbv as f32 / zini as f32;
                        println!("Score: {:.3}, 3BV: {}, ZINI: {}, Threshold: {}", score, board.info.bbbv, zini, threshold);
                        break;
                    }
                }
                Err(e) => panic!("Error generating board: {}", e),
            }
        }

        println!("\nGenerated {} boards above threshold {} in {} attempts",
            successful_boards, threshold, max_attempts);
    }

    #[test]
    fn test_generate_eff_board_with_first_click() {
        let width = 30;
        let height = 16;
        let mines = 99;
        let threshold = 1.5;
        let first_click_row = 8;
        let first_click_col = 15;
        let test_squares = vec![
            (first_click_row, first_click_col),
            (first_click_row, first_click_col - 1),
            (first_click_row, first_click_col + 1),
            (first_click_row - 1, first_click_col),
            (first_click_row + 1, first_click_col),
            (first_click_row - 1, first_click_col - 1),
            (first_click_row - 1, first_click_col + 1),
            (first_click_row + 1, first_click_col - 1),
            (first_click_row + 1, first_click_col + 1),
        ];
        let use_openings = true;

        let mut board = Board::new(width, height, mines)
            .expect("Failed to create board");

        let result = board.generate_eff_board(threshold, true, first_click_row, first_click_col, use_openings);
        assert!(result.is_ok(), "generate_eff_board with first click should not error");

        // Verify the first click square is not a mine
        assert!(!board.mine_locations.contains(&(first_click_row, first_click_col)),
            "First click location should not have a mine");

        if use_openings {
            for (r, c) in test_squares {
            assert!(!board.mine_locations.contains(&(r, c)), "Adjacent square ({}, {}) should not have a mine", r, c);
            }
        }

    }

    #[test]
    fn test_pttacg_generation() {
        let width = 30;
        let height = 16;
        let mines = 99;
        let threshold = 1.5;

        let mut board = Board::new(width, height, mines)
            .expect("Failed to create board");

        board.generate_eff_board(threshold, false, 0, 0, false)
            .expect("Failed to generate board");

        let pttacg = board.generate_pttacg();

        // Verify PTTACG string is not empty and has expected format
        assert!(!pttacg.is_empty(), "PTTACG string should not be empty");
        assert!(pttacg.contains("?b="), "PTTACG should contain board parameter");

        println!("Generated PTTACG: https://llamasweeper.com/#/game/zini-explorer{}", pttacg);
    }

    #[test]
    fn test_pttacg_read() {

        // let original_str: String = "?b=2&m=000hi00080000o01i00002ag002d001g908h2ag8g21100g690g0".into();
        let original_str: String = "?b=3&m=a0c00o08886j12h0g0101r44g5003ghf23501g009g9928920c2080480o21020102242814400000904g0140g15g52m11h".into();
        let board = Board::load_board_pttacg(original_str.clone())
            .expect("Failed to create board");

        let pttacg_str = board.generate_pttacg();

        // check match
        assert!(original_str == pttacg_str, "PTTACG should contain board parameter");
        println!("{}", original_str);
        println!("{}", pttacg_str);
    }

    #[test]
    fn test_expert_board_multiple_attempts() {
        // test multiple generations

        let width = 30;
        let height = 16;
        let mines = 99;
        let threshold = 1.7;
        let max_attempts = 10_000;
        let amount_find = 20;

        let mut successful_boards = Vec::new();

        let start = Utc::now();

        for i in 0..max_attempts {
            let mut board = Board::new(width, height, mines)
                .expect("Failed to create board");

            if let Ok(meets_threshold) = board.generate_eff_board(threshold, false, 0, 0, false) {
                if meets_threshold {
                    let pttacg = board.generate_pttacg();
                    successful_boards.push(pttacg);

                    if successful_boards.len() >= amount_find {
                        println!("Found {} boards after {} attempts.", amount_find, i + 1);
                        break;
                    }
                }
            }

            // if (i + 1) % 100 == 0 {
            //     println!("Attempted {} boards, found {} above threshold", i + 1, successful_boards.len());
            // }
        }

        let elapsed = Utc::now() - start;

        println!("\n{} board(s) found above threshold {:.2}%", successful_boards.len(), threshold * 100.0);

        for pttacg_str in &successful_boards {
            println!("https://llamasweeper.com/#/game/zini-explorer{}", pttacg_str);
        }

        println!("\nTime elapsed: {:.2} seconds", elapsed.num_milliseconds() as f64 / 1000.0);

        // We expect at least one board to be found
        assert!(successful_boards.len() > 0, "Should find at least one board above threshold");
    }

    #[test]
    fn test_quick_board_search() {
        println!("\n\n\n\n");
        let w = 30usize;
        let h = 16usize;
        let m = 99usize;
        let threshold = 1.6f32;
        let max_iterations = 500;   // low amount because tests are not as optimized as release build

        let mut successful_boards: Vec<String> = Vec::new();

        for i in 0..max_iterations {
            if i % 100 == 0 {
                print!("\r{:.2}% complete", (i as f32 / max_iterations as f32) * 100.0);
            }

            let mut test_board = Board::new(w, h, m)
                .expect("Error creating fresh board");

            if let Ok(meets_threshold) = test_board.generate_eff_board(threshold, false, 0, 0, false) {
                if meets_threshold {
                    let pttacg = test_board.generate_pttacg();
                    println!("\n\nBoard found:\n{}\n", pttacg);
                    successful_boards.push(pttacg);

                }
            }
        }

        println!("\n\n\n{} board(s) found above threshold {:02}%",
            successful_boards.len(), threshold * 100.0);

        for pttacg_str in successful_boards {
            println!("https://llamasweeper.com/#/game/zini-explorer{}", pttacg_str);
        }
    }

    #[test]
    fn find_bad_board() {
        use std::io::{self, Write};

        println!("\n\n\n\n------------------Start Line------------------\n\n");
        let w = 30usize;
        let h = 16usize;
        let m = 99usize;
        let threshold = 1.2f32;
        let max_iterations = 1_000;   // low amount because tests are not as optimized as release build

        let mut bad_boards: Vec<String> = Vec::new();

        for i in 0..max_iterations {
            if i % 100 == 0 {
                print!("\r{:.2}% complete", (i as f32 / max_iterations as f32) * 100.0);
                io::stdout().flush().unwrap();
            }

            let mut test_board = Board::new(w, h, m)
                .expect("Error creating fresh board");

            if let Ok(meets_threshold) = test_board.generate_eff_board(threshold, false, 0, 0, false) {
                if !meets_threshold {
                    let pttacg = test_board.generate_pttacg();
                    println!("\n\nBoard found:\n{}\n", pttacg);
                    bad_boards.push(pttacg);

                }
            }
        }

        println!("\n\n\n{} board(s) found below threshold {:02}%",
            bad_boards.len(), threshold * 100.0);

        for pttacg_str in bad_boards {
            println!("https://llamasweeper.com/#/game/zini-explorer{}", pttacg_str);
        }
        println!("\n\n------------------End Line------------------\n\n");
    }

    #[test]
    fn test_beginner_board() {
        // Quick test with beginner settings
        let w = 9usize;
        let h = 9usize;
        let m = 10usize;
        let threshold = 1.5f32;

        let mut test_board = Board::new(w, h, m)
            .expect("Error creating fresh board");

        let result = test_board.generate_eff_board(threshold, false, 0, 0, false);
        assert!(result.is_ok());

        if let Ok(meets_threshold) = result {
            println!("\nBeginner board meets threshold {}: {}", threshold, meets_threshold);
            test_board.calculate_zini_8way(false).expect("Error calculating ZINI");
            println!("3BV: {}", test_board.info.bbbv);
            println!("Zini: {}", test_board.info.zini);
            println!("Eff: {:.2}", test_board.info.bbbv as f32 / test_board.info.zini as f32);

            let pttacg = test_board.generate_pttacg();
            println!("PTTACG: {}", pttacg);
            println!("URL: https://llamasweeper.com/#/game/zini-explorer{}", pttacg);
        }
    }

    #[test]
    fn test_intermediate_board() {
        // Quick test with intermediate settings
        let w = 16usize;
        let h = 16usize;
        let m = 40usize;
        let threshold = 1.7f32;

        let mut test_board = Board::new(w, h, m)
            .expect("Error creating fresh board");

        let result = test_board.generate_eff_board(threshold, false, 0, 0, false);
        assert!(result.is_ok());
        let score = test_board.info.bbbv as f32 / test_board.info.zini as f32;

        if let Ok(meets_threshold) = result {
            println!("\nBoard meets threshold? {}: {}", threshold, meets_threshold);
            test_board.info_printer(true, false, false, false);
            println!("Score: {:.2}", score);

            let pttacg = test_board.generate_pttacg();
            println!("URL: https://llamasweeper.com/#/game/zini-explorer{}", pttacg);
        } else {
            println!("\nBoard does not meet threshold {}", threshold);
            test_board.info_printer(true, false, false, false);
            println!("Score: {:.2}", score);

            let pttacg = test_board.generate_pttacg();
            println!("URL: https://llamasweeper.com/#/game/zini-explorer{}", pttacg);
        }
    }

    #[test]
    fn test_board_with_first_click_safe() {
        // Test with guaranteed safe first click
        let w = 30usize;
        let h = 16usize;
        let m = 99usize;
        let threshold = 1.5f32;
        let first_row = 8usize;
        let first_col = 15usize;

        let mut test_board = Board::new(w, h, m)
            .expect("Error creating fresh board");

        let result = test_board.generate_eff_board(threshold, true, first_row, first_col, false);
        assert!(result.is_ok());

        // Ensure first click is not a mine
        assert!(!test_board.mine_locations.contains(&(first_row, first_col)),
            "First click should be safe!");

        println!("\nBoard with safe first click at ({}, {})", first_row, first_col);
        println!("3BV: {}", test_board.info.bbbv);

        let pttacg = test_board.generate_pttacg();
        println!("URL: https://llamasweeper.com/#/game/zini-explorer{}", pttacg);
    }

    #[test]
    fn test_board_statistics() {
        // Generate a few boards and show statistics
        let w = 30usize;
        let h = 16usize;
        let m = 99usize;
        let threshold = 1.25f32; // Low threshold to ensure success
        let count = 5;

        println!("\n\nGenerating {} boards with threshold {}...", count, threshold);

        for i in 0..count {
            let mut test_board = Board::new(w, h, m)
                .expect("Error creating fresh board");

            if let Ok(_) = test_board.generate_eff_board(threshold, false, 0, 0, false) {
                let zini = test_board.calculate_zini_8way(false).unwrap_or(0);
                let score = test_board.info.bbbv as f32 / zini as f32;

                let main_zini = test_board.info.zini;
                let main_score = test_board.info.bbbv as f32 / test_board.info.zini as f32;

                println!("\nBoard {}: 3BV={}, ZINI={}, Score={:.3}",
                    i + 1, test_board.info.bbbv, zini, score);
                println!("Board {}: 3BV={}, ZINI={}, Score={:.3}",
                    i + 1, test_board.info.bbbv, main_zini, main_score);
                println!("URL: https://llamasweeper.com/#/game/zini-explorer{}", test_board.generate_pttacg());
            }
        }
    }

    #[test]
    fn test_board_loaded() {

        let pttacg_strs: Vec<String> = vec![
            "?b=3&m=13o00s840gl3000g42g100a8hac4ch1e2c40s812g5o001k9402d444210k04042080a2000o00088o8820gg40010963104".into(),
            "?b=3&m=a0c00o08886j12h0g0101r44g5003ghf23501g009g9928920c2080480o21020102242814400000904g0140g15g52m11h".into(),
        ];

        // let threshold = 1.25f32;

        for pttacg in pttacg_strs {
            let mut test_board = Board::load_board_pttacg(pttacg.clone())
                .expect("Error creating fresh board");
            test_board.initialize_all()
                .expect("Error initializing loaded board");

            let zini = test_board.calculate_zini_8way(false).unwrap_or(0);
            let score = test_board.info.bbbv as f32 / zini as f32;

            let main_zini = test_board.info.zini;
            let main_score = test_board.info.bbbv as f32 / test_board.info.zini as f32;

            println!("\nURL: https://llamasweeper.com/#/game/zini-explorer{}", test_board.generate_pttacg());
            println!("3BV={}, ZINI={}, Score={:.3}", test_board.info.bbbv, zini, score);
            println!("3BV={}, ZINI={}, Score={:.3}", test_board.info.bbbv, main_zini, main_score);
        }
    }

    #[test]
    fn test_zini_difference() {

        let test_sizes = [(9, 9, 10), (16, 16, 40), (30, 16, 99), (30, 16, 120)];

        let eight_way: Vec<(bool, bool, bool)> = (0..8)
            .map(|i| (
                i & 1 != 0,      // bit 0
                i & 2 != 0,      // bit 1
                i & 4 != 0,      // bit 2
            ))
            .collect();

        for size in test_sizes {
            let (w, h, m) = size;
            let mut test_board = Board::new(w, h, m)
                .expect("Error creating fresh board");

            test_board.add_mines();
            test_board.initialize_all().expect("Error initializing board");

            let mut best_zini = u16::MAX;      // lowest zini is best
            let mut worst_zini = 0u16;         // highest zini is worst
            let mut current_eff_score: f32;
            let mut best_eff: f32 = 0.0;            // highest efficiency is best
            let mut worst_eff: f32 = 999.9;         // lowest efficiency is worst
            for (row_desc, col_desc, swap) in eight_way.iter() {
                match test_board.zini(*row_desc, *col_desc, *swap) {
                    Ok((zini_score, _path)) => {
                        if zini_score < best_zini {
                            best_zini = zini_score;
                        }
                        if zini_score > worst_zini {
                            worst_zini = zini_score;
                        }
                    },
                    Err(e) => {
                        eprintln!("8-Way ZINI failed: {}", e);
                        return;
                    }
                }
                current_eff_score = test_board.info.bbbv as f32 / (best_zini as f32);
                if current_eff_score > best_eff {
                    best_eff = current_eff_score;
                }
                if current_eff_score < worst_eff {
                    worst_eff = current_eff_score;
                }
            }

            let zini = test_board.calculate_zini_8way(false)
                .expect("Error calculating ZINI");
            let efficiency = test_board.info.bbbv as f32 / zini as f32;

            assert!(zini == best_zini,
                "Calculated ZINI should be equal to best ZINI");
            assert!(efficiency == best_eff,
                "Calculated efficiency should be equal to best efficiency");

            let zini_diff_percent = ((worst_zini as f32 / best_zini as f32) - 1.0) * 100.0;
            let eff_diff_percent = ((best_eff / worst_eff) - 1.0) * 100.0;
            let best_clicks_saved = test_board.info.bbbv - best_zini;
            let worst_clicks_saved = test_board.info.bbbv - worst_zini;
            let clicks_saved_diff_percent = ((best_clicks_saved as f32 / worst_clicks_saved as f32) - 1.0) * 100.0;

            println!("\nBoard Size {}x{} with {} mines:", w, h, m);
            println!("3BV: {}\nBest ZINI: {}, Worst ZINI: {}, \nBest Eff: {:.3}, Worst Eff: {:.3}",
                test_board.info.bbbv, best_zini, worst_zini, best_eff, worst_eff);
            println!("Zini diff: {}\nZini diff %: {:.2}\nEff diff: {:.2}\nEff diff %: {:.2}",
                worst_zini - best_zini, zini_diff_percent, best_eff - worst_eff, eff_diff_percent);
            println!("Best Clicks Saved: {}, Worst Clicks Saved: {}, Clicks Saved diff %: {:.2}",
                best_clicks_saved, worst_clicks_saved, clicks_saved_diff_percent);
        }
    }

}
