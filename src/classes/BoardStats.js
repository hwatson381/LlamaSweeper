import Algorithms from "./Algorithms";
import ChainZini from "./ChainZini";

class BoardStats {
  constructor(minesArray, refs) {
    this.mines = structuredClone(minesArray);
    this.clicks = [];
    this.moves = []; //Mouse movements, use separate array as this can get quite large
    this.isWin = null;
    this.refs = refs;
  }

  addLeft(x, y, xRaw, yRaw, time) {
    this.clicks.push({
      type: "left",
      x,
      y,
      xRaw,
      yRaw,
      time,
    });
  }

  addRight(x, y, xRaw, yRaw, time) {
    this.clicks.push({
      type: "right",
      x,
      y,
      xRaw,
      yRaw,
      time,
    });
  }

  addChord(x, y, xRaw, yRaw, time) {
    this.clicks.push({
      type: "chord",
      x,
      y,
      xRaw,
      yRaw,
      time,
    });
  }

  addWastedLeft(x, y, xRaw, yRaw, time) {
    this.clicks.push({
      type: "wasted_left",
      x,
      y,
      xRaw,
      yRaw,
      time,
    });
  }

  addWastedRight(x, y, xRaw, yRaw, time) {
    this.clicks.push({
      type: "wasted_right",
      x,
      y,
      xRaw,
      yRaw,
      time,
    });
  }

  addWastedChord(x, y, xRaw, yRaw, time) {
    this.clicks.push({
      type: "wasted_chord",
      x,
      y,
      xRaw,
      yRaw,
      time,
    });
  }

  addMouseMove(xRaw, yRaw, time) {
    this.moves.push({
      type: "mouse_move",
      xRaw,
      yRaw,
      time,
    });
  }

  addMouseEnter(xRaw, yRaw, time) {
    this.moves.push({
      type: "mouse_enter",
      xRaw,
      yRaw,
      time,
    });
  }

  addMouseLeave(xRaw, yRaw, time) {
    this.moves.push({
      type: "mouse_leave",
      xRaw,
      yRaw,
      time,
    });
  }

  makeRepeatFlagsWasted() {
    //If someone flags a correct square, unflags and then reflags
    // only the first flag should be "effective" and the reflag should be wasted

    let onlyEffectiveFlags = this.clicks.filter(
      (click) => click.type === "right"
    );

    for (let i = onlyEffectiveFlags.length - 1; i >= 0; i--) {
      const thisFlag = onlyEffectiveFlags[i];

      let firstFlagOccurenceOnSameSquare = onlyEffectiveFlags.findIndex(
        (click) => click.x === thisFlag.x && click.y === thisFlag.y
      );

      if (firstFlagOccurenceOnSameSquare !== i) {
        thisFlag.type = "wasted_right";
      }
    }
  }

  calc3bv(tilesArray) {
    let { bbbv, solved3bv } = Algorithms.calc3bv(this.mines, tilesArray);

    this.bbbv = bbbv;
    this.solved3bv = solved3bv;
  }

  calcZinis(includeWomZini) {
    let eightZiniResult = Algorithms.calcEightWayZini(this.mines);

    this.eightZini = eightZiniResult.total;
    this.eightZiniPath = eightZiniResult.clicks;

    /*
    let chainZiniResult = ChainZini.calcChainZini({
      mines: this.mines,
      includeClickPath: true
    })
    */
    let chainZiniResult = ChainZini.calcNWayChainZini({
      mines: this.mines,
      numberOfIterations: 100,
      includeClickPath: true
    });
    this.chainZini = chainZiniResult.total;
    this.chainZiniPath = chainZiniResult.clicks;

    //Also do wom zini
    if (includeWomZini) {
      //wom zini without correction
      let { womZini, womHzini } = Algorithms.calcWomZiniAndHZini(
        this.mines,
        false
      );
      //wom zini with correction
      let { womZini: cWomZini, womHzini: cWomHzini } =
        Algorithms.calcWomZiniAndHZini(this.mines, true);

      this.womZini = womZini.total;
      this.womZiniPath = womZini.clicks;
      this.womHzini = womHzini.total;
      this.womHziniPath = womHzini.clicks;

      this.cWomZini = cWomZini.total;
      this.cWomZiniPath = cWomZini.clicks;
      this.cWomHzini = cWomHzini.total;
      this.cWomHziniPath = cWomHzini.clicks;
    } else {
      this.womZini = null;
      this.womZiniPath = null;
      this.womHzini = null;
      this.womHziniPath = null;
      this.cWomZini = null;
      this.cWomZiniPath = null;
      this.cWomHzini = null;
      this.cWomHziniPath = null;
    }
  }

  getPttaLink() {
    let link = new URL(
      "https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/"
    );

    const width = this.mines.length;
    const height = this.mines[0].length;

    let boardDimensions;

    if (width === 9 && height === 9) {
      boardDimensions = "1";
    } else if (width === 16 && height === 16) {
      boardDimensions = "2";
    } else if (width === 30 && height === 16) {
      boardDimensions = "3";
    } else {
      let maxLength = width.toString().length;
      boardDimensions =
        width.toString() + height.toString().padStart(maxLength, "0");
    }

    link.searchParams.set("b", boardDimensions);

    const totalMines = this.mines.flat().filter((s) => s).length;

    if (totalMines != 0) {
      link.searchParams.set("m", this.getPttaMinesString());
    }

    return link.href;
  }

  getPttaMinesString() {
    const width = this.mines.length;
    const height = this.mines[0].length;

    let result = "";

    const totalNumberOfSquares = width * height;
    for (var i = 0; i < totalNumberOfSquares; i += 5) {
      var tempN = 0;
      for (var j = i; j < i + 5; j++) {
        if (j >= totalNumberOfSquares) {
          tempN *= 2;
        } else if (this.mines[j % width][Math.floor(j / width)] === false) {
          tempN *= 2;
        } else {
          tempN *= 2;
          tempN++;
        }
      }
      result += tempN.toString(32);
    }
    return result;
  }

  calcStats(isWin, tilesArray) {
    const time = this.endTime;
    this.calc3bv(tilesArray);
    const solved3bv = this.solved3bv;
    const bbbv = this.bbbv;
    const bbbvs = solved3bv / time;

    const estTime = bbbv / bbbvs;

    this.calcZinis(bbbv < 500);
    const eightZini = this.eightZini;
    const chainZini = this.chainZini;
    const womZini = this.womZini;
    const womHzini = this.womHzini;
    const cWomZini = this.cWomZini;
    const cWomHzini = this.cWomHzini;

    const bestZini = chainZini; //Change when I do a better zini

    const totalClicks = this.clicks.length;

    const clicksObject = {
      total: totalClicks,
      effective: this.clicks.filter(
        (c) => c.type === "left" || c.type === "right" || c.type === "chord"
      ).length,
      wasted: this.clicks.filter(
        (c) =>
          c.type === "wasted_left" ||
          c.type === "wasted_right" ||
          c.type === "wasted_chord"
      ).length,
      left: this.clicks.filter((c) => c.type === "left").length,
      leftWasted: this.clicks.filter((c) => c.type === "wasted_left").length,
      chord: this.clicks.filter((c) => c.type === "chord").length,
      chordWasted: this.clicks.filter((c) => c.type === "wasted_chord").length,
      right: this.clicks.filter((c) => c.type === "right").length,
      rightWasted: this.clicks.filter((c) => c.type === "wasted_right").length,
    };

    const eff = (100 * solved3bv) / totalClicks;
    const maxEff = (100 * bbbv) / bestZini;

    const pttaLink = this.getPttaLink();

    this.refs.statsObject.value = {};

    if (isWin) {
      this.refs.statsObject.value.isWonGame = true;
      this.refs.statsObject.value.time = time.toFixed(3);
      this.refs.statsObject.value.total3bv = bbbv;
      this.refs.statsObject.value.bbbvs = bbbvs.toFixed(3);
      this.refs.statsObject.value.eff = Math.round(eff);
      this.refs.statsObject.value.maxEff = maxEff.toFixed(0);
      this.refs.statsObject.value.clicks = clicksObject;
      this.refs.statsObject.value.eightZini = eightZini;
      this.refs.statsObject.value.chainZini = chainZini;
      this.refs.statsObject.value.womZini = womZini;
      this.refs.statsObject.value.womHzini = womHzini;
      this.refs.statsObject.value.cWomZini = cWomZini;
      this.refs.statsObject.value.cWomHzini = cWomHzini;
      this.refs.statsObject.value.pttaLink = pttaLink;
    } else {
      this.refs.statsObject.value.isWonGame = false;
      this.refs.statsObject.value.time = time.toFixed(3);
      this.refs.statsObject.value.estTime = estTime.toFixed(3);
      this.refs.statsObject.value.solved3bv = solved3bv;
      this.refs.statsObject.value.total3bv = bbbv;
      this.refs.statsObject.value.bbbvs = bbbvs.toFixed(3);
      this.refs.statsObject.value.eff = Math.round(eff);
      this.refs.statsObject.value.maxEff = maxEff.toFixed(0);
      this.refs.statsObject.value.clicks = clicksObject;
      this.refs.statsObject.value.eightZini = eightZini;
      this.refs.statsObject.value.chainZini = chainZini;
      this.refs.statsObject.value.womZini = womZini;
      this.refs.statsObject.value.womHzini = womHzini;
      this.refs.statsObject.value.cWomZini = cWomZini;
      this.refs.statsObject.value.cWomHzini = cWomHzini;
      this.refs.statsObject.value.pttaLink = pttaLink;
    }
  }

  lateCalcWomZiniStats() {
    this.calcZinis(true);
    const womZini = this.womZini;
    const womHzini = this.womHzini;
    const cWomZini = this.cWomZini;
    const cWomHzini = this.cWomHzini;

    this.refs.statsObject.value.womZini = womZini;
    this.refs.statsObject.value.womHzini = womHzini;
    this.refs.statsObject.value.cWomZini = cWomZini;
    this.refs.statsObject.value.cWomHzini = cWomHzini;
  }

  addEndTime(time, isWin) {
    this.isWin = isWin;
    this.endTime = time;
  }

  addMeanMines(meanMineStates) {
    this.meanMineStates = structuredClone(meanMineStates);

    //Reset activiness of mines (defensive)
    this.meanMineStates.forEach((c) => c.forEach((c.isActive = false)));
  }
}

export default BoardStats;