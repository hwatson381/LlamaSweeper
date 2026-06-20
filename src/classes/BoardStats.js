import Algorithms from "./Algorithms";
import ChainZini from "./ChainZini";
import DeepChainZiniRunner from "./DeepChainZiniRunner";

class BoardStats {
  constructor(minesArray, refs, statsWorkerManager) {
    this.mines = structuredClone(minesArray);
    this.clicks = [];
    this.moves = []; //Mouse movements, use separate array as this can get quite large
    this.isWin = null;
    this.refs = refs;
    this.attributes = {
      //Other data that we should track related to the game
      //but doesn't fit neatly elsewhere.
      //Would we want to include fully details of the settings here?
      //Such as the variant and any variant specific settings?
      //Or maybe that goes elsewhere when we start looking at storing replays?
      noGuess: false,
      hintsUsed: false,
      variant: null,
    };
    this.statsWorkerManager = statsWorkerManager;
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

  addHintUsed() {
    this.attributes.hintsUsed = true;
  }

  addNoGuessAttribute() {
    this.attributes.noGuess = true;
  }

  addVariantAttribute(variantInternalName) {
    this.attributes.variant = variantInternalName;
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

  lateCalcForceZinis() {
    let eightZiniResult = Algorithms.calcEightWayZini(this.mines);
    let chainZiniResult = ChainZini.calcNWayChainZini({
      mines: this.mines,
      numberOfIterations: 100,
      includeClickPath: true
    });

    //wom zini without correction
    let { womZini, womHzini } = Algorithms.calcWomZiniAndHZini(
      this.mines,
      false
    );
    //wom zini with correction
    let { womZini: cWomZini, womHzini: cWomHzini } =
      Algorithms.calcWomZiniAndHZini(this.mines, true);

    let womZiniResult = {
      womZini,
      womHzini,
      cWomZini,
      cWomHzini
    };

    this.extractZiniResults(eightZiniResult, chainZiniResult, womZiniResult);
    this.updateMaxEffAndZiniDisplay();
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

    this.deepZini = null;
    this.deepZiniPath = null;
    this.womZini = null;
    this.womZiniPath = null;
    this.womHzini = null;
    this.womHziniPath = null;
    this.cWomZini = null;
    this.cWomZiniPath = null;
    this.cWomHzini = null;
    this.cWomHziniPath = null;

    const totalClicks = this.clicks.length;
    const totalEffectiveClicks = this.clicks.filter(
      (c) => c.type === "left" || c.type === "right" || c.type === "chord"
    ).length;

    const clicksObject = {
      total: totalClicks,
      effective: totalEffectiveClicks,
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
      clicksPerSecond: (totalClicks / time).toFixed(3),
      effectiveClicksPerSecond: (totalEffectiveClicks / time).toFixed(3),
    };

    const eff = (100 * solved3bv) / totalClicks;

    let stnb = null;

    stnb = this.calcStnb(time, solved3bv, bbbv);

    const thrp = Math.round((100 * solved3bv) / totalEffectiveClicks);

    let rqp = null;
    if (isWin) {
      rqp = (time + 1) / bbbvs;
    } else {
      rqp = (estTime + 1) / bbbvs;
    };

    const corr = totalEffectiveClicks / totalClicks;

    const pttaLink = this.getPttaLink();

    this.refs.statsObject.value = {};

    if (isWin) {
      this.refs.statsObject.value.isWonGame = true;
      this.refs.statsObject.value.time = time.toFixed(3);
      this.refs.statsObject.value.total3bv = bbbv;
      this.refs.statsObject.value.bbbvs = bbbvs.toFixed(3);
      this.refs.statsObject.value.eff = Math.round(eff);
      this.refs.statsObject.value.maxEff = null;
      this.refs.statsObject.value.deepMaxEff = null;
      this.refs.statsObject.value.clicks = clicksObject;
      this.refs.statsObject.value.eightZini = null;
      this.refs.statsObject.value.chainZini = null;
      this.refs.statsObject.value.womZini = null;
      this.refs.statsObject.value.womHzini = null;
      this.refs.statsObject.value.cWomZini = null;
      this.refs.statsObject.value.cWomHzini = null;
      this.refs.statsObject.value.pttaLink = pttaLink;
      this.refs.statsObject.value.deepZini = null;
      this.refs.statsObject.value.stnb = stnb !== null ? stnb.toFixed(3) : null;
      this.refs.statsObject.value.thrp = Math.round(thrp);
      this.refs.statsObject.value.rqp = rqp.toFixed(3);
      this.refs.statsObject.value.corr = corr.toFixed(3);
    } else {
      this.refs.statsObject.value.isWonGame = false;
      this.refs.statsObject.value.time = time.toFixed(3);
      this.refs.statsObject.value.estTime = estTime.toFixed(3);
      this.refs.statsObject.value.solved3bv = solved3bv;
      this.refs.statsObject.value.total3bv = bbbv;
      this.refs.statsObject.value.bbbvs = bbbvs.toFixed(3);
      this.refs.statsObject.value.eff = Math.round(eff);
      this.refs.statsObject.value.maxEff = null;
      this.refs.statsObject.value.deepMaxEff = null;
      this.refs.statsObject.value.clicks = clicksObject;
      this.refs.statsObject.value.eightZini = null;
      this.refs.statsObject.value.chainZini = null;
      this.refs.statsObject.value.womZini = null;
      this.refs.statsObject.value.womHzini = null;
      this.refs.statsObject.value.cWomZini = null;
      this.refs.statsObject.value.cWomHzini = null;
      this.refs.statsObject.value.pttaLink = pttaLink;
      this.refs.statsObject.value.deepZini = null;
      this.refs.statsObject.value.stnb = stnb !== null ? stnb.toFixed(3) : null;
      this.refs.statsObject.value.thrp = Math.round(thrp);
      this.refs.statsObject.value.rqp = rqp.toFixed(3);
      this.refs.statsObject.value.corr = corr.toFixed(3);
    }

    this.refs.statsObject.value.attributes = {
      noGuess: this.attributes.noGuess,
      hintsUsed: this.attributes.hintsUsed,
    };

    this.calcZinisForStatsPanel();
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
          this.deepZini = result.total;
          this.deepZiniPath = result.clicks;

          this.updateMaxEffAndZiniDisplay();

          if (completionCallback) {
            completionCallback();
          }
        }
      },
      true
    );
  }

  async calcZinisForStatsPanel() {
    if (!this.statsWorkerManager) return;

    const includeEightWay = this.refs.statsShowMaxEff.value || this.refs.statsShow8Way.value;
    const include100Chain = this.refs.statsShowMaxEff.value || this.refs.statsShowChain.value;
    //Note womzini only shown by default for 3bv < 500, if this threshold changes also remember to update in PlayPage.vue.
    const includeWomZini = (this.refs.statsShowMaxEff.value || this.refs.statsShowWomZini.value) && this.bbbv < 500;

    let eightZiniResult = null;
    let chainZiniResult = null;
    let womZiniResult = null;

    try {
      //try-catch required because await might throw error if it rejects
      if (includeEightWay) {
        eightZiniResult = await this.statsWorkerManager.calc8WayZiniInWorker(this.mines)
      }

      if (include100Chain) {
        chainZiniResult = await this.statsWorkerManager.calc100ChainInWorker(this.mines)
      }

      if (includeWomZini) {
        womZiniResult = await this.statsWorkerManager.calcWomZinisInWorker(this.mines)
      }

      this.extractZiniResults(eightZiniResult, chainZiniResult, womZiniResult);
      this.updateMaxEffAndZiniDisplay();
    } catch (err) {
      //Do nothing, probably means that the board changed
    }
  }

  extractZiniResults(eightZiniResult, chainZiniResult, womZiniResult) {
    if (eightZiniResult !== null) {
      this.eightZini = eightZiniResult.total;
      this.eightZiniPath = eightZiniResult.clicks;
    }

    if (chainZiniResult !== null) {
      this.chainZini = chainZiniResult.total;
      this.chainZiniPath = chainZiniResult.clicks;
    }

    if (womZiniResult !== null) {
      this.womZini = womZiniResult.womZini.total;
      this.womZiniPath = womZiniResult.womZini.clicks;
      this.womHzini = womZiniResult.womHzini.total;
      this.womHziniPath = womZiniResult.womHzini.clicks;

      this.cWomZini = womZiniResult.cWomZini.total;
      this.cWomZiniPath = womZiniResult.cWomZini.clicks;
      this.cWomHzini = womZiniResult.cWomHzini.total;
      this.cWomHziniPath = womZiniResult.cWomHzini.clicks;
    }
  }

  updateMaxEffAndZiniDisplay() {
    //recomputes max eff based on available stats
    const nonNullZinis = [this.chainZini, this.eightZini, this.womZini, this.cWomZini].filter(z => z !== null);
    let bestZini;
    if (nonNullZinis.length !== 0) {
      bestZini = Math.min(...nonNullZinis);
    } else {
      bestZini = null;
    }

    if (!this.refs.statsShowMaxEff.value) { bestZini = null; }

    let maxEff;
    if (bestZini !== null) {
      maxEff = ((100 * this.bbbv) / bestZini).toFixed(0);
    } else {
      maxEff = null;
    }

    this.refs.statsObject.value.eightZini = this.eightZini;
    this.refs.statsObject.value.chainZini = this.chainZini;
    this.refs.statsObject.value.womZini = this.womZini;
    this.refs.statsObject.value.womHzini = this.womHzini;
    this.refs.statsObject.value.cWomZini = this.cWomZini;
    this.refs.statsObject.value.cWomHzini = this.cWomHzini;
    this.refs.statsObject.value.bestZini = bestZini;
    this.refs.statsObject.value.maxEff = maxEff;

    if (this.deepZini != null) {
      this.refs.statsObject.value.deepZini = this.deepZini;
      this.refs.statsObject.value.deepMaxEff = (
        (100 * this.bbbv) / this.deepZini).toFixed(0);
    }
  }

  calcStnb(time, solved3bv, total3bv) {
    //Check board dimensions
    let width = this.mines.length;
    let height = this.mines[0].length;
    const totalMines = this.mines.flat().filter((s) => s).length;

    let mode;

    if (width === 9 && height === 9 && totalMines === 10) {
      mode = 1; //Beginner
    } else if (width === 16 && height === 16 && totalMines === 40) {
      mode = 2; //Intermediate
    } else if ((width === 30 && height === 16 && totalMines === 99) ||
      (width === 16 && height === 30 && totalMines === 99)) {
      mode = 3; //Expert
    } else {
      return null; //Not a standard board, so STNB can't be calculated
    }

    //Formula from https://minesweeper.fandom.com/wiki/STNB
    //note - STNB is very confusing. Arbiter/Minesweepergame/saolei all seem to do it slightly differently
    let stnb = (87.420 * (mode ** 2) - 155.829 * mode + 115.708) / ((time ** 1.7) / solved3bv / ((solved3bv / total3bv) ** 0.5));

    //extra note. Another way to do STNB for partial games would be to use Estimated Time instead of time.
    //This is equivalent to the below. Note ^0.7 in the formula instead of 0.5. 0.7 comes from doing a lot of maths with rearranging stuff (ends up being 1.7 - 0.7).
    //let stnb = (87.420 * (mode ** 2) - 155.829 * mode + 115.708) / ((estTime ** 1.7) / solved3bv / ((solved3bv / total3bv) ** 0.7));

    return stnb;
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

    //Reset activeness of mines (defensive)
    this.meanMineStates.forEach((c) => c.forEach(cell => cell.isActive = false));
  }
}

export default BoardStats;