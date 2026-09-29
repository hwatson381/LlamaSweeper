# Deterministically Optimal Minesweeper Solver (DOMS)

DOMS is based on an idea by **qqwref** and was implemented and optimized by
**OpenAI Codex**.

The standalone C++17 implementation in `minesweeper_chord_dp.cpp` finds a
shortest sequence of clicks that clears a
Minesweeper board when every mine position is known in advance.

The program optimizes the complete click sequence, including:

- right-clicks used to flag mines;
- left-clicks used to open the first square of a chord component;
- chord clicks; and
- ordinary left-clicks needed for 3BV openings not reached by a chord.

It outputs both the optimal number of clicks and a valid sequence of actions
that achieves it. The solver is exact: dominance pruning and its configurable
comparison limit affect performance, not the correctness of the result.

The implementation is a standalone C++17 program with no third-party
dependencies.

## Building

### GCC or Clang

```console
g++ -std=c++17 -O3 -DNDEBUG minesweeper_chord_dp.cpp -o doms
```

For the machine on which the binary is compiled and run, native CPU tuning may
improve performance:

```console
g++ -std=c++17 -O3 -DNDEBUG -march=native minesweeper_chord_dp.cpp -o doms
```

With Clang, replace `g++` with `clang++`.

### Windows with Visual C++

Open an **x64 Native Tools Command Prompt for Visual Studio** and run:

```console
cl /std:c++17 /O2 /DNDEBUG /EHsc minesweeper_chord_dp.cpp /Fe:doms.exe
```

### Windows with MinGW-w64

```console
g++ -std=c++17 -O3 -DNDEBUG -march=native minesweeper_chord_dp.cpp -o doms.exe
```

The resulting executable does not require Python.

## Quick start

Pass a board as the first argument. For example, to solve a PTTACG-encoded board
from a LlamaSweeper URL and print the exact clicks as `(click_type, x, y)`
tuples:

```console
./doms "https://llamasweeper.com/#/game/board-editor?b=2&m=000g14s0010421g080414h4540a0g8880kg200800080o5400c00" --click-tuples
```

On Windows:

```console
doms.exe "https://llamasweeper.com/#/game/board-editor?b=2&m=000g14s0010421g080414h4540a0g8880kg200800080o5400c00" --click-tuples
```

Always quote LlamaSweeper URLs. In particular, shells treat the `&` in the URL
as a special character when it is not quoted.

For ordinary human-readable output:

```console
./doms board.txt
```

For machine-readable output:

```console
./doms board.txt --json > solution.json
```

The solution is written to standard output. Timing, progress, and generated
board information are written to standard error, so they do not corrupt JSON
or click-tuple output.

## Input formats

The input format is normally detected automatically. Use `--format` to force a
particular parser if necessary.

### Text grid

A text grid uses `*` or `M` for a mine and `.` for a safe square:

```text
*...
....
..*.
....
```

Whitespace is ignored. Lines beginning with `;` are treated as comments.
Digits `0` through `8` are accepted as safe cells, but their values are ignored
and recalculated from the mine positions.

```console
./doms board.txt
./doms board.txt --format grid
```

### PTTACG string or compatible LlamaSweeper URL

Complete board-editor URLs and bare `b=...&m=...` parameter strings are
accepted:

```console
./doms "https://llamasweeper.com/#/game/board-editor?b=2&m=0000000000000000220c8014k0pg0i80h30cc01140oo0ii0hh00"
```

This board-string format was created by
[PTTACGfans](https://github.com/PTTACGfans) for the
[Minesweeper ZiNi Calculator](https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/)
([source code](https://github.com/PTTACGfans/Minesweeper-ZiNi-Calculator)).
LlamaSweeper supports the format but did not originate it. This README refers
to these encodings as **PTTACG strings**.

For command-line compatibility, the forced parser name remains
`--format llamasweeper`.

The standard board codes are:

| Code | Dimensions |
| --- | --- |
| `b=1` | 9 x 9 |
| `b=2` | 16 x 16 |
| `b=3` | 30 x 16 |

Unambiguous custom-dimension codes are also supported. The `m=` value is the
row-major mine bitfield, packed five cells per character with the alphabet
`0-9a-v`.

### MBF file or hexadecimal

Binary `.mbf` files can be passed directly:

```console
./doms example.mbf
```

MBF data can also be supplied as quoted hexadecimal bytes:

```console
./doms "1e 10 00 08 10 03 0a 05 15 06 11 08 0a 09 19 0a 15 0c 1d 0e"
```

The four-byte MBF header contains the width, height, and a two-byte big-endian
mine count. It is followed by one `(x, y)` byte pair per mine.

### Random standard board

The program can generate and immediately solve a standard Intermediate or
Expert board:

```console
./doms --generate intermediate
./doms --generate expert --progress
```

Intermediate boards are 16 x 16 with 40 mines. Expert boards are 30 x 16 with
99 mines. The generated PTTACG string, embedded in a compatible LlamaSweeper
board-editor URL, and the random seed are printed before the solve.

Use `--seed` for a reproducible board:

```console
./doms --generate expert --seed 8675309
```

Seeded generation is reproducible across C++ standard-library implementations.
The printed PTTACG board URL is the most portable way to preserve a generated
board.

## Output formats and coordinates

Coordinates are 1-based by default. Add `--zero-based` for 0-based coordinates.

The normal action listing uses `(row, column)`. JSON coordinate arrays and the
named fields in `actions` also use row before column. Click tuples use
`(click_type, x, y)`, where `x` is the column and `y` is the row.

### Human-readable output

The default output includes:

- the optimal click count and unchorded 3BV;
- a breakdown into flags, component-seeding left-clicks, chords, and remaining
  3BV clicks;
- frontier-DP statistics; and
- the complete ordered action sequence.

Elapsed solve time is always printed to standard error.

### Click tuples

```console
./doms board.txt --click-tuples
```

This prints a list of:

```text
('left', x, y)
('right', x, y)
('chord', x, y)
```

`right` means place a flag.

### JSON

```console
./doms board.txt --json
```

JSON output includes:

- `optimal_clicks` and `three_bv`;
- the selected chord squares and required flags;
- chord components and remaining base clicks;
- an ordered `actions` list using named row/column fields;
- an ordered `clicks` list using `[type, x, y]`; and
- search statistics, including `peak_dp_states` and `solve_seconds`.

`--json` and `--click-tuples` are mutually exclusive.

## Command-line reference

```text
Usage: doms [BOARD] [options]

BOARD may be a grid filename, PTTACG string or compatible LlamaSweeper URL,
MBF filename, or quoted MBF hexadecimal.
```

| Option | Meaning |
| --- | --- |
| `--generate intermediate\|expert` | Generate, print, and solve a random standard board. Do not also supply `BOARD`. |
| `--seed N` | Reproduce a generated board. Requires `--generate`. |
| `--format auto\|grid\|llamasweeper\|mbf` | Select the input parser. The default is `auto`. |
| `--method frontier\|bruteforce` | Select the exact solver. The default is `frontier`; brute force is limited to 25 chord candidates. |
| `--order auto\|rows\|columns` | Choose the frontier sweep direction. The default is `auto`. |
| `--band-size N` | Set a band width of `N` rows or columns. With `--order auto`, compare both orientations. |
| `--max-states N` | Stop if a pruned frontier layer exceeds `N` live states. The default is 2,000,000. |
| `--progress` | Print frontier size and pruning progress to standard error. |
| `--progress-every N` | Print progress after every `N` chord candidates. The default is 10. |
| `--dominance-comparisons N` | Limit dominance comparisons per layer. The default is 1,000,000; `0` disables dominance pruning. |
| `--verify` | On boards with at most 25 chord candidates, compare the frontier result with exhaustive brute force. |
| `--json` | Print machine-readable JSON. |
| `--click-tuples` | Print only `(click_type, x, y)` tuples. |
| `--zero-based` | Use coordinates beginning at zero instead of one. |
| `-h`, `--help` | Display command-line help. |

The program exits with status `0` on success and `2` after an input, resource,
or validation error.

## Useful examples

Show live frontier statistics while solving:

```console
./doms board.txt --progress --progress-every 5
```

Force a particular sweep direction:

```console
./doms board.txt --order rows
./doms board.txt --order columns
```

Try wider frontier bands:

```console
./doms board.txt --band-size 2
```

Increase the live-state limit when sufficient memory is available:

```console
./doms board.txt --max-states 5000000
```

Disable dominance pruning for comparison:

```console
./doms board.txt --dominance-comparisons 0
```

Exhaustively verify a small board:

```console
./doms small-board.txt --verify
./doms small-board.txt --method bruteforce
```

## What is being optimized?

Let `S` be the set of numbered safe squares that will be chorded. The click
cost of `S` is:

```text
number of selected chord squares
+ number of distinct mines that must be flagged
+ number of chord-propagation components
+ number of 3BV units not opened by a chord
```

The four terms are respectively chord clicks, right-clicks, initial left-clicks,
and remaining ordinary left-clicks.

Two selected chord squares are in the same propagation component when opening
and chording one can eventually reveal the other. This includes direct chord
adjacency and connections through a shared zero opening. One initial left-click
is sufficient for each such component.

The program precomputes standard 3BV units: one for every connected zero region
and one for every nonzero safe square not adjacent to a zero.

## Algorithm overview

The primary solver is a frontier dynamic program over possible chord sets.
Candidates are processed in a spatial sweep. A boundary state records:

- the future reachability of each unfinished selected-chord component; and
- which active mine-flag and 3BV-coverage factors have already been hit.

Equivalent histories are merged. Connectivity signatures are interned per
layer, small bitsets are stored inline, and DP states are held in a dense
open-addressed table.

The solver also applies exact dominance pruning:

- Within one connectivity signature, a state is discarded when another state's
  existing cost advantage covers every possible future flag liability and 3BV
  saving.
- Between compatible connectivity signatures, a coarser partition may dominate
  a finer partition when it can never require more future component-seeding
  clicks.

Connectivity dominance uses safe scalar and component-size prefilters before
performing the full subset and matching test. The comparison cap limits
state-to-state dominance comparisons per layer; structural signature tests are
evaluated lazily. Reaching the cap merely retains more states. It never removes
a state without proof and therefore does not make the answer approximate.

For `--order auto`, the program evaluates row, column, and promising banded
orders and selects the one with the best structural frontier estimate. This is
important for rectangular Expert boards, where sweep direction can have a large
effect.

## Complexity and limitations

The algorithm is exact but exponential. It is best viewed as fixed-parameter
tractable in the maximum frontier width rather than polynomial in total board
area.

Let:

- `q` be the number of numbered safe squares that could be chorded;
- `b` be the maximum number of future-relevant connectivity items at a cut;
- `f` be the maximum number of active mine/3BV factors; and
- `S` be the maximum number of retained DP states.

A conservative state bound is:

```text
S <= min(2^q, Bell(b + 1) * 2^f)
```

For a somewhat more implementation-specific view, let `F` be the total number
of mine/3BV factors, `R` the maximum number of distinct connectivity signatures
in a layer, `c <= b` the maximum number of unfinished components, `D` the
dominance-comparison limit, and `w = 64` the bitset word size. The main state
storage is approximately

```text
O(S * (ceil(F/w) + ceil(q/w)) + R * c * ceil(q/w)).
```

A conservative time bound for all `q` layers includes

```text
O(q * (S*(F+q)/w
       + R*c*log(c)*q/w
       + D*F/w
       + R^2*(c^2*q/w + c^3))).
```

This deliberately overstates typical behavior: connectivity transitions are
cached, dominance normally stops early, and safe prefilters reject most
signature pairs without running the full matching test. Actual performance
depends heavily on the board, processing order, state merging, and dominance
pruning.

Some unusually connected boards can still exceed the default state limit or
take a long time. Useful responses are:

1. Enable `--progress` to identify where the frontier grows.
2. Try `--order rows` and `--order columns` explicitly.
3. Experiment with a small `--band-size`.
4. Raise `--max-states` only when sufficient memory is available.

The solver assumes that all mine locations are already known and that flags may
be placed before their neighboring numbered squares are opened. It is not a
solver for discovering an unknown board without guessing.

## Development checks

Compile with warnings enabled:

```console
g++ -std=c++17 -O3 -DNDEBUG -Wall -Wextra -Wpedantic minesweeper_chord_dp.cpp -o doms
```

Compile with AddressSanitizer and UndefinedBehaviorSanitizer:

```console
g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer minesweeper_chord_dp.cpp -o doms_san
```

Then use `--verify` on small boards to compare the frontier DP against exhaustive
enumeration.