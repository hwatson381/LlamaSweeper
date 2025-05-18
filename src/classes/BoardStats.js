import Algorithms from "./Algorithms";
import ChainZini from "./ChainZini";
import DeepChainZiniRunner from "./DeepChainZiniRunner";

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

  calcZinis(includeWomZiniIfShown, forceAllZinis = false) {
    if (this.refs.statsShowMaxEff.value || this.refs.statsShow8Way.value || forceAllZinis) {
      let eightZiniResult = Algorithms.calcEightWayZini(this.mines);

      this.eightZini = eightZiniResult.total;
      this.eightZiniPath = eightZiniResult.clicks;
    } else {
      this.eightZini = null;
      this.eightZiniPath = null;
    }

    if (this.refs.statsShowMaxEff.value || this.refs.statsShowChain.value || forceAllZinis) {
      let chainZiniResult = ChainZini.calcNWayChainZini({
        mines: this.mines,
        numberOfIterations: 100,
        includeClickPath: true
      });
      this.chainZini = chainZiniResult.total;
      this.chainZiniPath = chainZiniResult.clicks;
    } else {
      this.chainZini = null;
      this.chainZiniPath = null;
    }

    //Also do wom zini
    if (((this.refs.statsShowMaxEff.value || this.refs.statsShowWomZini.value) && includeWomZiniIfShown) || forceAllZinis) {
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

    //Set to null just in case. These only get calculated by manually running.
    this.deepZini = null;
    this.deepZiniPath = null;
  }

  getPttaLink() {
    let link = new URL(
      "https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/"
    );

    let boardDimensions = Algorithms.getPttaDimensionString(this.mines);

    link.searchParams.set("b", boardDimensions);

    const totalMines = this.mines.flat().filter((s) => s).length;

    if (totalMines != 0) {
      link.searchParams.set("m", Algorithms.getPttaMinesString(this.mines));
    }

    return link.href;
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

    let bestZini = chainZini; //Change when I do a better zini
    if (eightZini !== null && eightZini < bestZini) {
      bestZini = eightZini;
    }
    if (womZini !== null && womZini < bestZini) {
      bestZini = womZini;
    }
    if (cWomZini !== null && cWomZini < bestZini) {
      bestZini = cWomZini;
    }
    if (!this.refs.statsShowMaxEff.value) {
      bestZini = null;
    }

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

    let maxEff;
    if (bestZini !== null) {
      maxEff = ((100 * bbbv) / bestZini).toFixed(0);
    } else {
      maxEff = null;
    }

    const pttaLink = this.getPttaLink();

    this.refs.statsObject.value = {};

    if (isWin) {
      this.refs.statsObject.value.isWonGame = true;
      this.refs.statsObject.value.time = time.toFixed(3);
      this.refs.statsObject.value.total3bv = bbbv;
      this.refs.statsObject.value.bbbvs = bbbvs.toFixed(3);
      this.refs.statsObject.value.eff = Math.round(eff);
      this.refs.statsObject.value.maxEff = maxEff;
      this.refs.statsObject.value.clicks = clicksObject;
      this.refs.statsObject.value.eightZini = eightZini;
      this.refs.statsObject.value.chainZini = chainZini;
      this.refs.statsObject.value.womZini = womZini;
      this.refs.statsObject.value.womHzini = womHzini;
      this.refs.statsObject.value.cWomZini = cWomZini;
      this.refs.statsObject.value.cWomHzini = cWomHzini;
      this.refs.statsObject.value.bestZini = bestZini;
      this.refs.statsObject.value.pttaLink = pttaLink;
      this.refs.statsObject.value.deepZini = null;
    } else {
      this.refs.statsObject.value.isWonGame = false;
      this.refs.statsObject.value.time = time.toFixed(3);
      this.refs.statsObject.value.estTime = estTime.toFixed(3);
      this.refs.statsObject.value.solved3bv = solved3bv;
      this.refs.statsObject.value.total3bv = bbbv;
      this.refs.statsObject.value.bbbvs = bbbvs.toFixed(3);
      this.refs.statsObject.value.eff = Math.round(eff);
      this.refs.statsObject.value.maxEff = maxEff;
      this.refs.statsObject.value.clicks = clicksObject;
      this.refs.statsObject.value.eightZini = eightZini;
      this.refs.statsObject.value.chainZini = chainZini;
      this.refs.statsObject.value.womZini = womZini;
      this.refs.statsObject.value.womHzini = womHzini;
      this.refs.statsObject.value.cWomZini = cWomZini;
      this.refs.statsObject.value.cWomHzini = cWomHzini;
      this.refs.statsObject.value.bestZini = bestZini;
      this.refs.statsObject.value.pttaLink = pttaLink;
      this.refs.statsObject.value.deepZini = null;
    }
  }

  lateCalcForceZinis() {
    this.calcZinis(true, true);
    const womZini = this.womZini;
    const womHzini = this.womHzini;
    const cWomZini = this.cWomZini;
    const cWomHzini = this.cWomHzini;

    this.refs.statsObject.value.womZini = womZini;
    this.refs.statsObject.value.womHzini = womHzini;
    this.refs.statsObject.value.cWomZini = cWomZini;
    this.refs.statsObject.value.cWomHzini = cWomHzini;

    const eightZini = this.eightZini;
    const chainZini = this.chainZini;

    this.refs.statsObject.value.eightZini = eightZini;
    this.refs.statsObject.value.chainZini = chainZini;

    //Note - we don't recalculate max eff, since that requires knowing 3bv, which isn't worth doing
  }

  lateCalcDeepChainZini(completionCallback = false) {
    this.ziniRunner = new DeepChainZiniRunner(
      this.refs,
      {
        mines: this.mines,
        analysisType: 'separate',
        deepIterations: 5,
        progressType: 'text',
      },
      {
        onPercentageProgress: (percent) => {
          this.refs.ziniRunnerPercentageProgress.value = `${percent}%`;
        },
        onCompleteRun: (result) => {
          this.refs.statsObject.value.deepZini = result.total;
          this.deepZini = result.total;
          this.deepZiniPath = result.clicks;

          if (completionCallback) {
            completionCallback();
          }
        }
      },
      true
    );
  }

  killDeepChainZiniRunner() {
    if (this.ziniRunner) {
      this.ziniRunner.killWorker();
    }
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