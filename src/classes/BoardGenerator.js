import Algorithms from "./Algorithms";

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
      window.alert("PTTA NOT SET");
      throw new Error("PTTA NOT SET");
    }

    if (pttaUrl.startsWith("https")) {
      const pttaAsURL = new URL(pttaUrl);
      b = pttaAsURL.searchParams.get("b");
      s = pttaAsURL.searchParams.get("m");
    } else {
      window.alert("PTTA NOT URL");
      throw new Error("PTTA NOT URL");
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
      window.alert("Bad value for PTT url");
      throw new Error("Bad width height from ptt url");
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