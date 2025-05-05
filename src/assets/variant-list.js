/*
  tags:
    community
    informational
    game
    mobile
    tool (solver, zini calc)

  properties:
    ~~rating~~
    brief desc
    features
    image
    link
    name
    tags (see above)

  community:
    wom, msgame, discord, reddit, saolei
  info:
    msgame, minesweeper board museum, metasweeper website, mzrg.com
  game:
    sudosweeper, heptesvegmal advent calendar, 14 ms variants, 4D minesweeper, 3D website minesweeper (yellow cubes)
    square finder, qqwref multisweeper, tathams, mineTGM, demoncrawl, carykh + qq version, mnsw.pro, mamono_sweeper,
    qqwref mouse control, tetrissweeper, megasweeper, metalogic game (https://butcherberries.itch.io/unveiling), 
    other variants in icely videos?

    also desktop apps -
    arbiter, meowsweeper, metasweeper, viennasweeper
  mobile:
    msgo, mastermine, LoM, chocolatesweeper
  tool:
    qqwref prob calc, mscoach solver, ptta zini calc, mzrg make_board
*/

let variantList = [
  {
    "name": "Minesweeper Online",
    "url": "https://minesweeper.online/",
    "desc": "The most popular minesweeper website which regularly has 2000+ people online at any time. Has rankings for lots of different categories (winstreak/time/3bvs/mastery/efficiency/difficulty...). Saves replays of every game. Has no guess mode. Has player vs player mode (multiplayer). Has a global chat. Monthly rankings, monthly events, championships once per month. Previously called World of Minesweeper (WoM). ",
    "image": "/img/variants/wom.png",
    "tags": [
      "community",
      "informational",
      "game"
    ],
    "rating": 4.9,
    "popularity": 5
  },
  {
    "name": "Authoritative Minesweeper",
    "url": "https://minesweepergame.com/",
    "desc": "This is considered to be the official rankings for minesweeper with rankings for time, 3bv/s and density. It requires playing on specific desktop clones. It also has a mostly inactive forum (but may be of historic interest due to the age of the site). It also has archives of old minesweeper websites/resources and various informational pages.",
    "image": "/img/variants/authms.png",
    "tags": [
      "community",
      "informational"
    ],
    "rating": 3.8,
    "popularity": 5
  },
  {
    "name": "Minesweeper Community Discord",
    "url": "https://discord.gg/6Qz8zsquKA",
    "desc": "Created by Kiraa96, this is the largest minesweeper Discord with 1000+ members. Has many of the fastest players, including lots of top players from minesweeper.online. ",
    "image": "/img/variants/discord.png",
    "tags": [
      "community"
    ],
    "rating": 5,
    "popularity": 3
  },
  {
    "name": "r/minesweeper subreddit",
    "url": "https://www.reddit.com/r/Minesweeper",
    "desc": "The official minesweeper community on Reddit. It's good for those who are casually interested in minesweeper (over 100s expert), although I'd consider other communities to be better for more serious minesweeper players (Minesweeper Community Discord or Minesweeper.online chat). It has been growing quickly and as of writing it has 40k Members.",
    "image": "/img/variants/reddit.png",
    "tags": [
      "community"
    ],
    "rating": 2,
    "popularity": 5
  },
  {
    "name": "Saolei",
    "url": "http://saolei.wang/Main/Index.asp",
    "desc": "The main ranking for Chinese players. The Chinese community is a lot more active than the international community. It's worth looking around with the aid of translation software. JZE's page is here http://saolei.wang/Player/Index.asp?Id=18290 (best player in the world).",
    "image": "/img/variants/saolei.png",
    "tags": [
      "community",
      "informational"
    ],
    "rating": 4.1,
    "popularity": 3
  },
  {
    "name": "Minesweeper Board Museum",
    "url": "https://mzrg.com/js/mbm/",
    "desc": "A collection of interesting boards created by qqwref (USA minesweeper player)",
    "image": "/img/variants/mbm.png",
    "tags": [
      "informational"
    ],
    "rating": 3.5,
    "popularity": 1
  },
  {
    "name": "Open Minesweeper",
    "url": "https://openms.top/#/",
    "desc": "This is a new modern minesweeper website under active development. It has a ranking with support for several different clones including metasweeper. It also has a section for guides. The website is created by a team of mostly Chinese minesweeper players, although it supports several languages.",
    "image": "/img/variants/openms.png",
    "tags": [
      "informational"
    ],
    "rating": 3.6,
    "popularity": 1
  },
  {
    "name": "qqwref personal website",
    "url": "https://mzrg.com/",
    "desc": "The personal website of qqwref (aka Michael Gottlieb). It contains links to various ms and non-ms projects he has created.",
    "image": "/img/variants/mzrg.png",
    "tags": [
      "informational",
      "game",
      "tool"
    ],
    "rating": 3.4,
    "popularity": 2
  },
  {
    "name": "Sudo Sweep",
    "url": "https://gamesforcrows.itch.io/sudo-sweep",
    "desc": "This is a hybrid between Sudoku and Minesweeper. There is a sudoku grid on the left and a minesweeper grid on the right, and you can use information from the sudoku side to solve the minesweeper side and vice versa. Logic players will love this.",
    "image": "/img/variants/sudosweep.png",
    "tags": [
      "game"
    ],
    "rating": 4.7,
    "popularity": 1
  },
  {
    "name": "Minesweeper Advent Calendar",
    "url": "https://heptaveegesimal.com/2018/advent-calendar/",
    "desc": "A collection of many different variations on the rules of minesweeper (or as the site calls it, minesveeper). The link I've chosen for this goes to the 2018 calendar, but it also includes links to advent calendars for other years (the site is a little confusing to navigate). There are lots of different variations included in this, such as using different rules for which squares each number \"sees\" and having negative mines.",
    "image": "/img/variants/advent.png",
    "tags": [
      "game"
    ],
    "rating": 4.5,
    "popularity": 2
  },
  {
    "name": "14 Minesweeper Variants",
    "url": "https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/",
    "desc": "Minesweeper but with different creative twists on the rules. For example, in one of the variants, the numbers lie to you and are off by one (but you don't know which way). I haven't played this but the people I know who have speak highly of it. Aliensrock (a popular puzzle gaming youtuber) has made several videos on this. As of writing, it costs $7. It also has a sequel called 14 Minesweeper Variants 2.",
    "image": "/img/variants/14ms.png",
    "tags": [
      "game"
    ],
    "rating": 0,
    "popularity": 4
  },
  {
    "name": "4D Minesweeper",
    "url": "https://store.steampowered.com/app/787980/4D_Minesweeper/",
    "desc": "Play minesweeper in higher dimensions (1D up to 4D). It displays 4D as a \"grid of grids\" and lets you hover your mouse over any square to see which ones are the neighbours. It's free on steam. I haven't played this but have seen others play it.",
    "image": "/img/variants/4d.png",
    "tags": [
      "game"
    ],
    "rating": 4,
    "popularity": 2
  },
  {
    "name": "Mine3D",
    "url": "http://egraether.com/mine3d/",
    "desc": "Minesweeper in true 3D (as in solving the volume of a cube/cuboid rather than just solving the surface). This is quite mind-bending to play. It can be quite hard to tell which numbers are next to which blocks. Someone should make something like this in VR (or with crossview 3D).",
    "image": "/img/variants/mine3d.png",
    "tags": [
      "game"
    ],
    "rating": 4,
    "popularity": 2
  },
  {
    "name": "Square Finder",
    "url": "https://mzrg.com/js/mine/square_finder.html",
    "desc": "The greatest minesweeper variant to exist. This variant randomly generates almost completed minesweeper boards, and you have to find the last tile as quickly as possible. It tracks the average time of your last 5/10/100 attempts.",
    "image": "/img/variants/squarefinder.png",
    "tags": [
      "game"
    ],
    "rating": 4.4,
    "popularity": 1
  },
  {
    "name": "MultiSweeper",
    "url": "https://mzrg.com/js/mine/multi.html",
    "desc": "Minesweeper clone by qqwref with options for different control schemes and rule variations. Examples of the control schemes are drag (which lets you hold down click and move your mouse to uncover squares) and various modes for automatically flagging/chording. Examples of rule variations include having random colours instead of numbers, spider mode (where the board changes as you play it), free openings (where all openings are revealed at the start) and generating boards with high/low 3bv.",
    "image": "/img/variants/multisweeper.png",
    "tags": [
      "game"
    ],
    "rating": 3.9,
    "popularity": 1
  },
  {
    "name": "Simon Tatham's Mines",
    "url": "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/mines.html",
    "desc": "A solid minesweeper web clone with left click chord and the ability to generate very high density no guess boards (such as 16x16 99 mines and 30x16 170 mines). Simon Tatham also has many other fun puzzle games in his collection, and there is a mobile app to play them as well. For those who are interested in computers, Simon Tatham also created PuTTY which is a popular SSH client for windows.",
    "image": "/img/variants/tathams.png",
    "tags": [
      "game"
    ],
    "rating": 4.2,
    "popularity": 5
  },
  {
    "name": "Minesweeper: The Grand Master",
    "url": "https://qqwref.github.io/minetgm/",
    "desc": "Inspired by Tetris: The Grand Master, this variant features a series of increasingly hard minesweeper levels (with difficulty increased by adding various constraints, such as no flags or using colours instead of numbers). After clicking a mine, you will be given a grade for how well you did. There is a speed requirement to reach the later levels.",
    "image": "/img/variants/minetgm.png",
    "tags": [
      "game"
    ],
    "rating": 3.2,
    "popularity": 1
  },
  {
    "name": "DemonCrawl",
    "url": "https://store.steampowered.com/app/1141220/DemonCrawl/",
    "desc": "A minesweeper roguelite with many different stages, items to collect, rule modifications and more. I've never played this. As of writing, it costs $15.",
    "image": "/img/variants/demoncrawl.png",
    "tags": [
      "game"
    ],
    "rating": 0,
    "popularity": 4
  },
  {
    "name": "carykh knightsweeper",
    "url": "https://htwins.net/minesweeper/",
    "desc": "Minesweeper, but with different rules for how the neighbouring cells are counted. For example, the numbers could count mines that are a knights move away or that are orthogonally adjacent (no diagonals). There are lots of different rules to choose from. The rules used can be changed by clicking on the box which has the pattern (\"normal\" is the default pattern). This was made by the youtuber carykh.",
    "image": "/img/variants/carykh.png",
    "tags": [
      "game"
    ],
    "rating": 4.3,
    "popularity": 3
  },
  {
    "name": "carykh knightsweeper qqwref mod",
    "url": "https://mzrg.com/mines/carykh.html",
    "desc": "A mod of Carykh minesweeper that adds additional counting rules to choose from. For example, there is the binary rule, where instead of each number being from 1-8, it now goes from 1-255 and converting a number to binary tells you exactly where the mines are (e.g. 5 -> 101 -> mine in top left and top right).",
    "image": "/img/variants/qqwref-carykh.png",
    "tags": [
      "game"
    ],
    "rating": 4.3,
    "popularity": 1
  },
  {
    "name": "mnsw.pro",
    "url": "https://mnsw.pro/",
    "desc": "A multiplayer minesweeper version with versus mode and coop mode. Multiplayer allows there to be an arbitrary number of competitors (not just 1v1), it also has no guess board generation, a chat window and allows you to play in a first to x format (e.g. first to beat 5 games wins). In versus mode, competitors will receive the same boards. Coop mode sometimes gets out of sync when many people are playing the same board at the same time. mnsw.pro is used for the chord cup competition.",
    "image": "/img/variants/mnsw-pro.png",
    "tags": [
      "game"
    ],
    "rating": 3.7,
    "popularity": 3
  },
  {
    "name": "qqwref mouse control",
    "url": "https://mzrg.com/js/mine/mouse.html",
    "desc": "Practise your minesweeper aim by click on all the unrevealed squares as fast as possible. Made by qqwref.",
    "image": "/img/variants/mouse.png",
    "tags": [
      "game"
    ],
    "rating": 3,
    "popularity": 1
  },
  {
    "name": "Tetrisweeper",
    "url": "https://kertisjones.itch.io/tetrisweeper",
    "desc": "A cross between minesweeper and tetris. Tetris blocks will fall, and then once they land, they will make up the space of the minesweeper board. Then to clear rows, you need to have a full row in tetris, and also have solved that row in minesweeper.",
    "image": "/img/variants/tetrisweeper.png",
    "tags": [
      "game"
    ],
    "rating": 4,
    "popularity": 2
  },
  {
    "name": "Mega minesweeper",
    "url": "http://mega-minesweeper.com/",
    "desc": "1000x1000 multiplayer minesweeper where everyone is solving the same board. shift-click or middle-click and drag to move around the board or use the minimap.",
    "image": "/img/variants/mega.png",
    "tags": [
      "game"
    ],
    "rating": 3.4,
    "popularity": 2
  },
  {
    "name": "Unveiling",
    "url": "https://butcherberries.itch.io/unveiling",
    "desc": "A creative variant of minesweeper where you have to deduce all the squares that are safe each turn before being able to proceed. This includes squares that can be deduced to be safe through metalogic.",
    "image": "/img/variants/unveiling.png",
    "tags": [
      "game"
    ],
    "rating": 4.2,
    "popularity": 2
  },
  {
    "name": "Minesweeper Arbiter",
    "url": "https://minesweepergame.com/download/arbiter.php",
    "desc": "Arbiter is an official desktop minesweeper clone that can be used for the Authoritative Minesweeper rankings. It saves replays for games played and tracks many different stats. This clone cannot be resized, so will appear small on high res screens (unless you lower screen resolution). All clones allowed for the Authoritative Minesweeper rankings have left+right chord (this is different from minesweeper.online which defaults to left-click chord). It is no longer receiving updates.",
    "image": "/img/variants/arbiter.png",
    "tags": [
      "game"
    ],
    "rating": 3.4,
    "popularity": 4
  },
  {
    "name": "meowsweeper",
    "url": "https://github.com/darknessgod/whitemeow/releases/latest",
    "desc": "Meowsweeper is an unofficial desktop clone with statistics, resize-able board and recursive chording (squares that get revealed from an opening or chord automatically get chorded again). The link above takes you to the download page - to install you need to download the .rar file and extract, then run main.exe to play.",
    "image": "/img/variants/meowsweeper.png",
    "tags": [
      "game"
    ],
    "rating": 3,
    "popularity": 1
  },
  {
    "name": "Metasweeper",
    "url": "https://github.com/eee555/Metasweeper",
    "desc": "A modern desktop minesweeper clone. It saves replays of games and has resizable cells and is capable of display game statistics including using custom formulae. It features several different types of no-guess mode (including variations where it automatically makes guesses correct). It supports English/German/Polish/Chinese. Games played on this mode can be submitted to the Open minesweeper website. The download link can be found under \"Releases\" on the github page (download + run the latest .exe file to install).",
    "image": "/img/variants/metasweeper.png",
    "tags": [
      "game"
    ],
    "rating": 4.5,
    "popularity": 2
  },
  {
    "name": "Viennasweeper",
    "url": "https://sweeper.wien/",
    "desc": "Viennasweeper is an official desktop clone that can be used for the Authoritative minesweeper rankings. It is created and maintained by Ralokt. It is a fairly minimal clone that saves replays of games and tracks some statistics (although less than other clones). Whilst the latest full release of Viennasweeper does not support scaling, this is actively being worked on and there are preview versions available that do support scaling through using skins. Once this is fully out, Viennasweeper will be the only official clone that has scaling. Like all official clones, it uses left+right click to chord.",
    "image": "/img/variants/viennasweeper.png",
    "tags": [
      "game"
    ],
    "rating": 3.8,
    "popularity": 3
  },
  {
    "name": "Minesweeper GO - classic game",
    "url": "https://play.google.com/store/apps/details?id=com.EvolveGames.MinesweeperGo",
    "desc": "Minesweeper GO is a popular mobile app available on both Android and Apple. It is one of the best mobile apps out there for competitive-minded sweepers. It has all the usual statistics (time/3bvs/efficiency etc), saves replays of games, has competitive global leaderboards and multiplayer mode (in the style of first to x games wins). It also has a no guess campaign with 1000+ levels. It has a lot of different settings for adjusting things such as tap time and scroll behaviour and it has a setting to enable recursive chording (revealed squares get automatically chorded if they have the right number of flags). It's free, but with ads that can be disabled by paying.",
    "image": "/img/variants/msgo.png",
    "tags": [
      "mobile",
      "game"
    ],
    "rating": 4.7,
    "popularity": 4
  },
  {
    "name": "Mastermine",
    "url": "https://mastermine.app/",
    "desc": "A 3D minesweeper game where you play on the outside layer of a cube. It's available on Android, Apple and also PC, although I personally think it's better on mobile (the mobile versions are free whereas the PC version costs $3). It has a range of different skins, powerups, achievements and a campaign mode where you solve cubes of increasingly large size, but go down a level if you make a mistake.",
    "image": "/img/variants/mastermine.png",
    "tags": [
      "game",
      "mobile"
    ],
    "rating": 2.9,
    "popularity": 2
  },
  {
    "name": "League of Minesweeper",
    "url": "http://tapsss.com/",
    "desc": "An Android only mobile app designed for and by competitive minesweeper players. It has a very active community in China where many of the top players play on it (including JZE, the world record holder). It also features several other games similar to minesweeper such as nonosweeper (similar to picross/nonograms), schulte grid (finding numbers in a grid), sudoku, 2048, 15 puzzle. It has a pvp mode and a (mostly Chinese) community within the app where you can chat with people and see other records. It has a no-guess mode, as well as a mode for playing custom minesweeper puzzles created by other players.",
    "image": "/img/variants/lom.png",
    "tags": [
      "game",
      "mobile"
    ],
    "rating": 4.8,
    "popularity": 3
  },
  {
    "name": "Chocolate Sweeper",
    "url": "https://nyahoon.com/products/chocolate-sweeper",
    "desc": "A quirky mobile app with a campaign that generates some of the hardest no guess logic you'll find in all of minesweeper outside of manually created puzzles. It generates no guess puzzles with guaranteed difficult logic, and makes you lose if you tap on a square that cannot be deduced to be safe. It has a leaderboard which adjusts the time of a game based on how hard the logic was that was used to solve the game. Highly recommended for anyone that wants to get very good at logic. It's available on Apple and Android.",
    "image": "/img/variants/chocolatesweeper.png",
    "tags": [
      "game",
      "mobile"
    ],
    "rating": 4.6,
    "popularity": 3
  },
  {
    "name": "qqwref probability calculator",
    "url": "https://mzrg.com/js/mine/probability.html",
    "desc": "A tool made by qqwref that allows you to create arbitrary minesweeper positions and shows the probability of each square being a mine. It's possible to place numbers, known mines and known safe squares.",
    "image": "/img/variants/qqprob.png",
    "tags": [
      "tool"
    ],
    "rating": 3.6,
    "popularity": 1
  },
  {
    "name": "DavidNHill JS Minesweeper Solver",
    "url": "https://davidnhill.github.io/JSMinesweeper",
    "desc": "The current state of the art minesweeper solver made by MSCoach. This solver achieves the highest known win rate of any minesweeper solver program, winning 41% of the time on expert difficulty. It has two different modes. In the player mode, it will generate a game and let you play along aided by the solver. In the analyser mode, you can create your own position (clicking and using scroll wheel to change the numbers), and then see which move the solver thinks is best.",
    "image": "/img/variants/jsminesweeper.png",
    "tags": [
      "tool"
    ],
    "rating": 5,
    "popularity": 3
  },
  {
    "name": "PTTACGfans ZiNi Calculator",
    "url": "https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/",
    "desc": "This is a tool used to calculate the minimum number of clicks that a board can be solved in using flags, chords and left-clicks. Positions can either be created manually by placing the mines on the board or imported from Minesweeper Online by clicking the arrow next to the ZiNi stat that shows up next to a finished game (ZiNi may need to be enabled in settings for this). This tool was created by PTTACGfans, a well known player on Minesweeper Online. ",
    "image": "/img/variants/ptta-zini.png",
    "tags": [
      "tool"
    ],
    "rating": 4,
    "popularity": 3
  },
  {
    "name": "qqwref make_board",
    "url": "https://mzrg.com/js/mine/make_board.html",
    "desc": "A tool by qqwref for created minesweeper boards and calculating various stats about them. Stats include openings, islands, various ZiNi implementations and the amount of times each number appears. It has various controls for adjusting properties of the board.",
    "image": "/img/variants/make_board.png",
    "tags": [
      "tool"
    ],
    "rating": 3.1,
    "popularity": 1
  },
  {
    "name": "Inesweeper",
    "url": "https://inesweeper.vercel.app/",
    "desc": "A modern collection of minesweeper variants that take inspiration from 14 minesweeper variants and minesweeper advent calendar as well as some others. As of writing there are 7 variants. Examples include liar where numbers are off by one and contrast where there is a red-blue checkboard pattern and the numbers give the difference between the number of mines in the red and blue squares.",
    "image": "/img/variants/inesweeper.png",
    "tags": [
      "game"
    ],
    "rating": 4.1,
    "popularity": 1
  },
  {
    "name": "GM Puzzles",
    "url": "https://www.gmpuzzles.com/blog/category/objectplacement/minesweeper/",
    "desc": "A collection of handcrafted logic puzzles. These puzzles each have custom rules. For example, some puzzles will be based around sudoku, some will allow multiple mines in a cell, some will use hexagonal grids, and so on. Logic players will love this.",
    "image": "/img/variants/gm_puzzles.png",
    "tags": [
      "game"
    ],
    "rating": 4.2,
    "popularity": 2
  },
  {
    "name": "Puzzle Minesweeper",
    "url": "https://www.puzzle-minesweeper.com/",
    "desc": "A no guess minesweeper website where a set of numbers scattered around the board is revealed at the start and you have to mark the remaining tiles as being mines or safe. Note that marking a tile as safe does not reveal a number.",
    "image": "/img/variants/puzzle_ms.png",
    "tags": [
      "game"
    ],
    "rating": 3.7,
    "popularity": 2
  },
  {
    "name": "youtube playables minesweeper",
    "url": "https://www.youtube.com/playables/UgkxhpR_EFQxif6EFOQZKOss5-BadJj6TIvQ",
    "desc": "A mobile-web optimised minesweeper game with unusual rules. When you reveal a square it will also reveal the adjacent squares. This means that it is possible to win on higher densities than usual, and the decision making behind guessing is very different. I've included this variant as it may be of interest to mobile no-flag players who like high density + guessing and have a high tolerance for frustration. There are several things wrong with this clone, notably that you have to long-press to flag (even on desktop) and that you have to sit through an animation whenever you lose.",
    "image": "/img/variants/yt-playables.png",
    "tags": [
      "mobile",
      "game"
    ],
    "rating": 1.7,
    "popularity": 1
  },
  {
    "name": "Dragonsweeper",
    "url": "https://danielben.itch.io/dragonsweeper",
    "desc": "A minesweeper rpg game that will appeal to people who like strategy games and maths. Instead of mines, there are monsters which have a level that contribute to the numbers shown. And then goal is to explore the board whilst leveling up enough to be able to kill the dragon. Make sure to read through the rules before playing. The first thing to be aware of is that the hearts can (and should) go down to zero - you should not try to conserve hearts, but rather think of these as an \"exploration budget\" for how much information you can get. The second thing to be aware of is that the monsters have particular patterns to how they are arranged, you should observe these as it can help in future runs.",
    "image": "/img/variants/dragonsweeper.png",
    "tags": [
      "game"
    ],
    "rating": 3.6,
    "popularity": 2
  },
  {
    "name": "MineMasters",
    "url": "https://minemasters.pro/",
    "desc": "A modern community focused website with custom rankings and statistics for Minesweeper Online and the Chord Cup (this is a tournament ran on mnsw.pro). There is also a classic minesweeper implementation with a button for solving basic logic. It was made by JSwole who is a top minesweeper player and streamer.",
    "image": "/img/variants/mine_masters.png",
    "tags": [
      "informational",
      "game"
    ],
    "rating": 4.0,
    "popularity": 1
  },
  {
    "name": "Minesweeper fandom wiki",
    "url": "https://minesweeper.fandom.com/",
    "desc": "A community wiki with information about players, clones, past competitions, strategy and more. It is a bit incomplete.",
    "image": "/img/variants/minesweeper-wiki.png",
    "tags": [
      "informational"
    ],
    "rating": 3.3,
    "popularity": 2
  }
]

export default variantList;