import Algorithms from "./Algorithms";
import { Dialog } from 'quasar';

//Class for doing different board gen. E.g. generating boards with fisher yates or maybe selecting boards with certain properties
class BoardGenerator {
  static basicShuffle(
    width,
    height,
    mineCount,
    safeCoord = null,
    isOpening = false
  ) {
    return Algorithms.basicShuffle(
      width,
      height,
      mineCount,
      safeCoord,
      isOpening
    );
  }

  static effBoardShuffle(width, height, mineCount, firstClick, effShuffleManager) {
    let effBoard = effShuffleManager.provideEffBoard(
      width,
      height,
      mineCount,
      firstClick
    );

    if (!effBoard) {
      //Failed to generate
      return false;
    }

    //Return value has form {mines:[[]], firstClick: {x, y}}.
    //This is because the first click may be changed if using a pregenerated board.
    return effBoard;
  }

  static readFromPtta(pttaUrl) {
    //VERY HACKY. REDO LATER
    //Mostly lifted from ptta code...
    let b = "";
    let s = "";

    if (pttaUrl === "") {
      Dialog.create({
        title: "Alert",
        message: "Please provide a PTT URL",
      });
      throw new Error("PTTA NOT SET");
    }

    //Special case, if only search params are provided, we prepend the ptt part so it works
    if (/^\??b=\d+&m=\w+$/.test(pttaUrl)) {
      if (pttaUrl.charAt(0) !== "?") {
        pttaUrl = "?" + pttaUrl;
      }

      pttaUrl = "https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/" + pttaUrl;
    }

    if (!pttaUrl.startsWith("https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/") &&
      !pttaUrl.startsWith("https://llamasweeper.com/#/game/zini-explorer") &&
      !pttaUrl.startsWith("https://llamasweeper.com/#/game/board-editor")) {
      Dialog.create({
        title: "Alert",
        message: "Please enter a URL of the form https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=...&m=... in the PTT URL field",
      });
      throw new Error("PTTA NOT URL");
    }

    //Special case - for llamasweeper.com, remove the /#/ bit, as this confuses it when finding search params (since # is used for anchors)
    if (pttaUrl.startsWith("https://llamasweeper.com/#/game/zini-explorer") ||
      pttaUrl.startsWith("https://llamasweeper.com/#/game/board-editor")) {
      pttaUrl = pttaUrl.replace("#/", "");
    }

    const pttaAsURL = new URL(pttaUrl);
    b = pttaAsURL.searchParams.get("b");
    s = pttaAsURL.searchParams.get("m");

    return this.readFromPttaSearchParams(b, s);
  }

  static readFromPttaSearchParams(b, s, suppressDialogsAndErrors = false) {
    if (b === null || s === null) {
      if (suppressDialogsAndErrors) {
        return false;
      }
      Dialog.create({
        title: "Alert",
        message: "Please make sure the PTT URL ends with ?b=...&m=... where ... is the board data. If you don't see this info, try clicking the calculate button on the PTT calculator",
      });
      throw new Error("PTTA MISSING PARAMS");
    }

    if (!/^\d+$/.test(b) || !/^[a-zA-Z0-9]+$/.test(s)) {
      if (suppressDialogsAndErrors) {
        return false;
      }
      Dialog.create({
        title: "Alert",
        message: "The ?b=...&m=... part of the URL is in the wrong format",
      });
      throw new Error("PTTA BAD PARAMS");
    }

    let width;
    let height;

    switch (b) {
      case "1":
        width = 9;
        height = 9;
        break;
      case "2":
        width = 16;
        height = 16;
        break;
      case "3":
        width = 30;
        height = 16;
        break;
      default:
        width = parseInt(b.substring(0, b.length / 2));
        height = parseInt(b.substring(b.length / 2, b.length));
        break;
    }

    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      width > 100 ||
      height < 1 ||
      width > 100
    ) {
      if (suppressDialogsAndErrors) {
        return false;
      }
      Dialog.create({
        title: "Alert",
        message: "Bad value for PTT URL",
      });
      throw new Error("Bad width height from PTT URL");
    }

    const minesArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    for (var i = 0; i < width * height; i += 5) {
      var tempN = parseInt(s.charAt(i / 5), 32);

      if (isNaN(tempN)) continue;

      for (var j = i + 4; j >= i; j--) {
        if (j >= width * height) {
          tempN >>= 1;
          continue;
        }

        //$scope.mines += tempN & 1;
        if (tempN & (1 === 1)) {
          minesArray[j % width][Math.floor(j / width)] = true;
        }
        tempN >>= 1;
      }
    }

    return minesArray;
  }

  static fisherYatesArrayShuffle(arr) {
    Algorithms.fisherYatesArrayShuffle(arr);
  }
}

export default BoardGenerator;