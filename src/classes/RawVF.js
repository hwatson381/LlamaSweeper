import { exportFile } from "quasar";
import Utils from "./Utils.js";

const RAWVF_SQUARE_SIZE = 64; //Keep this high to make things smoother even though real square size may differ

class RawVF {
  constructor() {
    throw new Error('RawVF class only has static methods, and cannot be instantiated')
  }

  static createRawVfText(boardStats) {
    const boardWidth = boardStats.mines.length;
    const boardHeight = boardStats.mines[0].length

    let rawVfText = "";

    let description = "";
    description += "RawVF_Version: Rev6.2\n"
    description += "Program: LlamaSweeper\n"
    //description += "Player: Anon\n"
    //description += "Timestamp: 2026-02-24T01:13:18.825Z\n"
    description += `Level: ${this.getLevelFromSize(boardStats)}\n`
    description += `Width: ${boardWidth}\n`
    description += `Height: ${boardHeight}\n`
    description += "Marks: Off\n"
    description += "SuperClick: On\n" //Keep this on for now as we only track chord is a specific input
    description += `SquareSize: ${RAWVF_SQUARE_SIZE}\n` //May differ from real square size
    description += `Time: ${boardStats.endTime.toFixed(3)}\n`
    description += `Status: ${boardStats.isWin ? "won" : "loss"}\n`
    description += `Mode: ${this.getDescriptionMode(boardStats)}\n`

    rawVfText += description;

    let board = "Board:\n";

    for (let y = 0; y < boardHeight; y++) {
      let row = "";

      for (let x = 0; x < boardWidth; x++) {
        if (boardStats.mines[x][y]) {
          row += "*"
        } else {
          row += "0"
        }
      }

      board += row + "\n";
    }

    rawVfText += board;

    let events = "Events:\n";

    let clicksIndex = 0;
    let movesIndex = 0;

    const clicks = boardStats.clicks;
    const moves = boardStats.moves;

    //Since llamasweeper tracks clicks and moves separately we iterate through both together taking the earlier timestamped event from each
    //Although in hindsight it might just be simpler to merge arrays and sort...
    while (clicksIndex < clicks.length || movesIndex < moves.length) {
      let maybeClick = clicks[clicksIndex]; //may be undefined
      let maybeMove = moves[movesIndex]; //may be undefined

      if (maybeClick && !maybeClick.hasOwnProperty('time') ||
        maybeMove && !maybeMove.hasOwnProperty('time')) {
        throw new Error('click/move data missing time property');
      }

      let clickNext; //Whether the earliest time stamp is from the next click or next chord
      if (maybeClick && maybeMove) {
        clickNext = maybeClick.time < maybeMove.time;
      } else if (maybeClick) {
        clickNext = true;
      } else if (maybeMove) {
        clickNext = false;
      } else {
        throw new Error('Should never happen');
      }

      if (clickNext) {
        //Take the current click and increment
        events += this.getMouseClickEventLine(maybeClick, boardWidth, boardHeight);
        clicksIndex++;
      } else {
        events += this.getMouseMoveEventLine(maybeMove, boardWidth, boardHeight);
        movesIndex++;
      }
    }

    rawVfText += events;

    return rawVfText;
  }

  static downloadRawVf(boardStats) {
    let rawVfText = this.createRawVfText(boardStats);

    const fileName = this.createFileName(boardStats);

    exportFile(fileName, rawVfText);
  }

  static sendToStrangeDust(boardStats) {
    let rawVfText = this.createRawVfText(boardStats);

    const replayFileName = this.createFileName(boardStats);

    if (!("TextEncoder" in window)) {
      alert("Sorry, this browser does not support TextEncoder...");
      throw new Error("TextEncoder unavailable");
    }
    var enc = new TextEncoder();
    const replayBuffer = enc.encode(rawVfText).buffer;

    //Wait for ready signal
    const onMessage = (event) => {
      if (event.origin !== 'https://strange-dust.github.io') {
        return
      };

      if (event.data?.type === 'replay-analyzer-ready') {
        analyzerWindow.postMessage({
          type: 'replay-analyzer-load',
          buffer: replayBuffer,
          filename: replayFileName
        }, 'https://strange-dust.github.io')
        window.removeEventListener('message', onMessage)
      }
    }

    window.addEventListener('message', onMessage);

    //Open analyser in a new tab
    const analyzerWindow = window.open("https://strange-dust.github.io/minesweeper-replay-analyzer/", '_blank')

    if (!analyzerWindow) {
      //Possibly popup blocked?
      window.removeEventListener('message', onMessage)
      return;
    }
  }

  static getLevelFromSize(boardStats) {
    let width = boardStats.mines.length;
    let height = boardStats.mines[0].length;

    switch (`${width}x${height}`) {
      case '9x9':
        return 'Beginner';
      case '16x16':
        return "Intermediate";
      case '30x16':
        return "Expert";
      default:
        return "Custom";
    }
  }

  static getDescriptionMode(boardStats) {
    /*
      For the `Mode: Classic` line in the RawVF description header
      According to docs it should be one of
      classic/lucky/density/upk/cheat
      but I will see if I can get away with using arbitrary text
    */

    const noGuess = boardStats.attributes.noGuess;
    const hintsUsed = boardStats.attributes.hintsUsed;
    const variant = boardStats.attributes.variant;

    let mode = 'Classic';

    if (variant === 'normal') {
      mode = 'Classic';
      if (noGuess) {
        mode = 'Classic NG';
      }
      if (hintsUsed) {
        mode = 'Cheat (hinted)'; //It's deliberate that this replaces NG as it's a stronger condition
      }
    } else if (variant === 'board editor') {
      mode = 'Upk';
    } else if (variant === 'eff boards') {
      mode = 'Eff Boards';
      if (hintsUsed) {
        mode = 'Cheat (hinted)';
      }
    }

    return mode;
  }

  /*
    relevant bit of spec
    <mouse_event> ::= <elapsed_time> <mouse_event_id> [column] [row] (<coord_x> <coord_y>) [(<mouse_state>)]\n
    <elapsed_time> ::= <second>.<hundredth> | <second>.<thousandth> | -<second>.<hundredth> | -<second>.<thousandth>
    <mouse_event_id> ::= <left_click> | <left_release> | <right_click> | <right_release> | <middle_click> | <middle_release> | <mouse_move> | <left_click_with_shift> | <toggle_question_mark_setting>
    <left_click> ::= lc 
    <left_release> ::= lr 
    <right_click> ::= rc 
    <right_release> ::= rr 
    <middle_click> ::= mc 
    <middle_release> ::= mr 
    <mouse_move> ::= mv
    <left_click_with_shift> ::= sc
    <toggle_question_mark_setting> ::= mt
    <mouse_state> ::= [<left_pressed>][<right_pressed>][<middle_pressed>]
    <left_pressed> ::= l
    <right_pressed> ::= r
    <middle_pressed> ::= m
  */
  static getMouseClickEventLine(click, boardWidth, boardHeight) {
    const elapsedTime = click.time.toFixed(3);

    //Our click events map to multiple rawVF events because we don't store mouseup/down currently
    const typeMap = {
      left: ['lc', 'lr'],
      wasted_left: ['lc', 'lr'],
      chord: ['lc', 'lr'], //treat all chords as left click chord even though they may not be (as we send replay with SuperClick: On)
      wasted_chord: ['lc', 'lr'],
      right: ['rc', 'rr'],
      wasted_right: ['rc', 'rr']
    }

    if (!typeMap.hasOwnProperty(click.type)) {
      throw new Error('Unexpected click type');
    }

    const eventId = typeMap[click.type];

    const col = Utils.clamp(click.x, 0, boardWidth - 1);
    const row = Utils.clamp(click.y, 0, boardHeight - 1);

    const coordX = Utils.clamp(Math.floor(click.xRaw * RAWVF_SQUARE_SIZE), 0, boardWidth * RAWVF_SQUARE_SIZE - 1);
    const coordY = Utils.clamp(Math.floor(click.yRaw * RAWVF_SQUARE_SIZE), 0, boardHeight * RAWVF_SQUARE_SIZE - 1);

    let event = "";
    event += `${elapsedTime} ${eventId[0]} ${col} ${row} (${coordX} ${coordY})\n`
    event += `${elapsedTime} ${eventId[1]} ${col} ${row} (${coordX} ${coordY})\n`

    return event;
  }

  static getMouseMoveEventLine(move, boardWidth, boardHeight) {
    if (move.type !== 'mouse_move') {
      //currently only handle move events and ignore events such as mouse_leave or mouse_enter
      return "";
    }

    const elapsedTime = move.time.toFixed(3);

    const col = Utils.clamp(Math.floor(move.xRaw), 0, boardWidth - 1);
    const row = Utils.clamp(Math.floor(move.yRaw), 0, boardHeight - 1);

    const coordX = Utils.clamp(Math.floor(move.xRaw * RAWVF_SQUARE_SIZE), 0, boardWidth * RAWVF_SQUARE_SIZE - 1);
    const coordY = Utils.clamp(Math.floor(move.yRaw * RAWVF_SQUARE_SIZE), 0, boardHeight * RAWVF_SQUARE_SIZE - 1);

    const event = `${elapsedTime} mv ${col} ${row} (${coordX} ${coordY})\n`

    return event;
  }

  static createFileName(boardStats) {
    const boardWidth = boardStats.mines.length;
    const boardHeight = boardStats.mines[0].length

    const boardMines = boardStats.mines.flat().filter(val => val).length;

    const variantHyphenated = boardStats.attributes.variant.replaceAll(" ", "-");

    const endTime = `${boardStats.endTime.toFixed(3)}s`;

    let now = new Date();

    //Get current time. Then convert to desired format, hacky way is with ISOString
    //e.g. 2011-10-05T14:48:00.000Z -> 2011100_144800
    const exportTimestamp = now.toISOString()
      .replace("T", "_")
      .replace(/\.\d{3}Z/, "")
      .replaceAll(":", "")
      .replaceAll("-", "");

    let fileName = `${boardWidth}x${boardHeight}_${boardMines}-${variantHyphenated}-${endTime}-${exportTimestamp}.rawvf`;

    return fileName;
  }
}

export default RawVF;