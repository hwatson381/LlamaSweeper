<template>
  <div
    style="
      border: 1px solid white;
      margin: 5px;
      border-radius: 5px;
      padding: 5px;
      max-width: 600px;
    "
  >
    <span>Random dev stuff box</span><br />
    <button @click="bulkrun8">Bulk run</button>
    Iterations: <input v-model.number="bulkIterations" type="text" />
    <button @click="playSound('dig')">Play sound</button>
  </div>
</template>

<script setup>
import { ref } from "vue";

import Benchmark from "src/classes/Benchmark";
import Algorithms from "src/classes/Algorithms";
import BoardStats from "src/classes/BoardStats";
import effShuffleManager from "src/classes/EffShuffleManager";
import BoardGenerator from "src/classes/BoardGenerator";
import ChainZini from "src/classes/ChainZini";

import playSound from "src/includes/Sounds";

import testGames from "src/assets/janitor-test-data";

import {
  boardWidth,
  boardHeight,
  boardMines,
  minimumEff,
} from "src/composables/useSettings";

defineOptions({
  name: "DevBlock",
});

let bulkIterations = ref(1000);
function bulkrun() {
  //Entries are diffs and counts
  let oneDiff = new Map();
  let eightDiff = new Map();
  let womFixDiff = new Map();

  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    benchmark.startTime("one-way");
    let oneZini = Algorithms.calcOneWayZini(mines).total;
    benchmark.stopTime("one-way");

    benchmark.startTime("8-way");
    let eightZini = Algorithms.calcEightWayZini(mines).total;
    benchmark.stopTime("8-way");

    //wom zini without correction
    benchmark.startTime("wom-zini-hzini-no-corr");
    let womZini = Algorithms.calcWomZiniAndHZini(mines, false).womZini.total;
    benchmark.stopTime("wom-zini-hzini-no-corr");

    //wom zini with correction
    benchmark.startTime("wom-zini-hzini-with-corr");
    let womFixZini = Algorithms.calcWomZiniAndHZini(mines, true).womZini.total;
    benchmark.stopTime("wom-zini-hzini-with-corr");

    let thisOneDiff = oneZini - womZini;
    let thisEightDiff = eightZini - womZini;
    let thisWomFixDiff = womFixZini - womZini;

    oneDiff.set(thisOneDiff, (oneDiff.get(thisOneDiff) ?? 0) + 1);
    eightDiff.set(thisEightDiff, (eightDiff.get(thisEightDiff) ?? 0) + 1);
    womFixDiff.set(thisWomFixDiff, (womFixDiff.get(thisWomFixDiff) ?? 0) + 1);
  }

  benchmark.report();
  benchmark.clearAll();

  //report zini differences
  let oneZiniOut = "One-way zini stats: \n";
  let oneZiniDiffSum = 0;
  for (let [key, val] of [...oneDiff.entries()].sort((a, b) => a[0] - b[0])) {
    oneZiniOut += `${key} | ${val}` + "\n";
    oneZiniDiffSum += key * val;
  }
  oneZiniOut += `Average-diff: ${oneZiniDiffSum / bulkIterations.value}`;
  console.log(oneZiniOut);

  let eightZiniOut = "Eight-way zini stats: \n";
  let eightZiniDiffSum = 0;
  for (let [key, val] of [...eightDiff.entries()].sort((a, b) => a[0] - b[0])) {
    eightZiniOut += `${key} | ${val}` + "\n";
    eightZiniDiffSum += key * val;
  }
  eightZiniOut += `Average-diff: ${eightZiniDiffSum / bulkIterations.value}`;
  console.log(eightZiniOut);

  let womFixZiniOut = "WoM L zini WITH FIX stats: \n";
  let womFixZiniDiffSum = 0;
  for (let [key, val] of [...womFixDiff.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    womFixZiniOut += `${key} | ${val}` + "\n";
    womFixZiniDiffSum += key * val;
  }
  womFixZiniOut += `Average-diff: ${womFixZiniDiffSum / bulkIterations.value}`;
  console.log(womFixZiniOut);
}

function bulkrun2() {
  //gather data that we can use to figure out for a given 3bv value on a given board, where the 99th percentile of subzini is

  let cutoff = 0.99;

  let bbbvsMap = new Map(); //Entries are another map from subzini => count

  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let preprocessedData =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    let bbbv = Algorithms.calc3bv(mines, false, preprocessedData).bbbv;

    let singleZini = Algorithms.calcBasicZini(
      mines,
      false,
      preprocessedData
    ).total;
    let eightZini = Algorithms.calcBasicZini(
      mines,
      true,
      preprocessedData
    ).total;

    //Find data so far for the particular 3bv value of this board
    let this3bvEntry = bbbvsMap.get(bbbv);
    if (!this3bvEntry) {
      this3bvEntry = new Map();
      bbbvsMap.set(bbbv, this3bvEntry);
    }

    //Increment data for this subzini amount on this board
    let amountBelowZini = singleZini - eightZini;

    this3bvEntry.set(
      amountBelowZini,
      (this3bvEntry.get(amountBelowZini) ?? 0) + 1
    );
  }

  let out = "";
  for (let [bbbvKey, bbbvEntry] of [...bbbvsMap.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    out += `Results for ${bbbvKey} 3bv:` + "\n";

    let totalCount = [...bbbvEntry.values()].reduce(
      (partialSum, a) => partialSum + a,
      0
    );
    let runningCount = 0; //Used to figure out when we cross xth percentile
    let subziniSum = 0;
    let gamesOverCutoff = 0;

    let cutoffHit = false;
    let cutoffCrossedDuring;

    //Loop through subzini values in order
    for (let [subziniKey, subziniAmount] of [...bbbvEntry.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      runningCount += subziniAmount;
      subziniSum += subziniKey * subziniAmount;

      if (cutoffHit) {
        gamesOverCutoff += subziniAmount;
      }

      if (runningCount >= cutoff * totalCount && cutoffHit === false) {
        cutoffHit = true;
        cutoffCrossedDuring = subziniKey;
      }
    }

    const averageSubZini = subziniSum / totalCount;
    const averageSubziniPer3bv = averageSubZini / bbbvKey;

    out +=
      `Total games: ${totalCount}, cutoff-crossed-during-zini: ${cutoffCrossedDuring}, games over cutoff: ${gamesOverCutoff}` +
      "\n";
    out +=
      `Average subzini: ${averageSubZini.toPrecision(
        3
      )}, Average-zini-per-3bv: ${averageSubziniPer3bv.toPrecision(3)}` +
      "\n\n";
  }

  console.log(out);
}

function bulkrun3() {
  let targetHitCount = 0;

  let oldTriggeredTimes = 0;
  let oldSuccess = 0;
  let oldMissed = 0;

  let newTriggeredTimes = 0;
  let newSuccess = 0;
  let newMissed = 0;

  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let preprocessedData =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    let bbbv = Algorithms.calc3bv(mines, false, preprocessedData).bbbv;

    benchmark.startTime("single-zini");
    let singleZini = Algorithms.calcBasicZini(
      mines,
      false,
      preprocessedData
    ).total;
    benchmark.stopTime("single-zini");

    benchmark.startTime("eight-zini");
    let eightZini = Algorithms.calcBasicZini(
      mines,
      true,
      preprocessedData
    ).total;
    benchmark.stopTime("eight-zini");

    let oldCheckTriggered =
      bbbv / (bbbv - (bbbv - singleZini) * 1.15 - 2) >= minimumEff.value / 100;
    oldCheckTriggered && oldTriggeredTimes++;

    let newCheckTriggered =
      bbbv /
        (singleZini -
          Algorithms.get99thPercentileSubzini(
            boardWidth.value,
            boardHeight.value,
            boardMines.value,
            bbbv,
            singleZini
          )) >=
      minimumEff.value / 100;
    newCheckTriggered && newTriggeredTimes++;

    let wasTargetHit = bbbv / eightZini >= minimumEff.value / 100;

    if (wasTargetHit) {
      targetHitCount++;

      if (oldCheckTriggered) {
        oldSuccess++;
      } else {
        oldMissed++;
      }

      if (newCheckTriggered) {
        newSuccess++;
      } else {
        newMissed++;
      }

      console.log(
        `8way: ${eightZini}, single: ${singleZini}, oldTriggered:${oldCheckTriggered}, newTriggered:${newCheckTriggered} 3bv: ${bbbv}`
      );
    }
  }
  console.log(`8 way found: ${targetHitCount}`);

  console.log(`## OldCheck Summary ###.
  triggered: ${oldTriggeredTimes}, missed: ${oldMissed}, success: ${oldSuccess}`);

  console.log(`## NewCheck Summary ###.
  triggered: ${newTriggeredTimes}, missed: ${newMissed}, success: ${newSuccess}`);

  benchmark.report();
  benchmark.clearAll();
}

function bulkrun4() {
  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    benchmark.startTime("100zini");
    ChainZini.calcNWayChainZini({
      mines: mines,
      numberOfIterations: 100,
    });
    benchmark.stopTime("100zini");
  }
}

function bulkrun5() {
  console.time();
  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let preprocessedData =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    let bbbv = Algorithms.calc3bv(mines, false, preprocessedData).bbbv;

    if (bbbv !== 39) {
      continue;
    }

    let eightZini = Algorithms.calcBasicZini(
      mines,
      true,
      preprocessedData
    ).total;

    if (eightZini >= 26) {
      console.log("Found candidate");
      console.log(`EightZini: ${eightZini}`);

      let boardStats = new BoardStats(mines, null);
      let link = boardStats.getPttaLink();
      console.log(`Link:
      ${link}`);
    }
  }
  console.timeEnd();
}

function bulkrun6() {
  let results = {
    eightWay: {
      sum: 0,
      bests: 0,
    },
    nChain: {
      sum: 0,
      bests: 0,
    },
    minDeep: {
      sum: 0,
      bests: 0,
    },
    avgDeep: {
      sum: 0,
      bests: 0,
    },
    avgMinDeep: {
      sum: 0,
      bests: 0,
    },
    separateDeep: {
      sum: 0,
      bests: 0,
    },
  };

  for (let i = 0; i < bulkIterations.value; i++) {
    console.log(`Iteration ${i}`);

    //Find board with best eff out of 1000, and use that for benchmarking with
    let bestEffThisIteration = 0;
    let mines;
    for (let j = 0; j < 1000; j++) {
      let minesCandidate = BoardGenerator.basicShuffle(
        boardWidth.value,
        boardHeight.value,
        boardMines.value
      );
      let preprocessedData =
        Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
          minesCandidate
        );
      let bbbv = Algorithms.calc3bv(
        minesCandidate,
        false,
        preprocessedData
      ).bbbv;
      let eightZini = Algorithms.calcBasicZini(
        minesCandidate,
        true,
        preprocessedData
      ).total;
      let eff = bbbv / eightZini;
      if (eff > bestEffThisIteration) {
        bestEffThisIteration = eff;
        mines = minesCandidate;
      }
    }

    //Compute diff zinis for this mines
    let eightZini = Algorithms.calcBasicZini(mines, true).total;

    benchmark.startTime("10000chain zini");
    let chainZini = ChainZini.calcNWayChainZini({
      mines: mines,
      numberOfIterations: 10000,
    }).total;
    benchmark.stopTime("10000chain zini");

    benchmark.startTime("min deep chain zini");
    let minDeepChainZini = ChainZini.calcInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
      analysisType: "minimum",
    }).total;
    benchmark.stopTime("min deep chain zini");

    benchmark.startTime("average deep chain zini");
    let averageDeepChainZini = ChainZini.calcInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
      analysisType: "average",
    }).total;
    benchmark.stopTime("average deep chain zini");

    benchmark.startTime("avgmin deep chain zini");
    let avgMinDeepChainZini = ChainZini.calcInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
      analysisType: "average then minimum",
    }).total;
    benchmark.stopTime("avgmin deep chain zini");

    benchmark.startTime("separate deep chain zini");
    let separateDeepChainZini = ChainZini.calcNWayInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
    }).total;
    benchmark.stopTime("separate deep chain zini");

    let best = Math.min(
      eightZini,
      chainZini,
      minDeepChainZini,
      averageDeepChainZini,
      avgMinDeepChainZini,
      separateDeepChainZini
    );

    eightZini === best && results.eightWay.bests++;
    chainZini === best && results.nChain.bests++;
    minDeepChainZini === best && results.minDeep.bests++;
    averageDeepChainZini === best && results.avgDeep.bests++;
    avgMinDeepChainZini === best && results.avgMinDeep.bests++;
    separateDeepChainZini === best && results.separateDeep.bests++;

    results.eightWay.sum += eightZini;
    results.nChain.sum += chainZini;
    results.minDeep.sum += minDeepChainZini;
    results.avgDeep.sum += averageDeepChainZini;
    results.avgMinDeep.sum += avgMinDeepChainZini;
    results.separateDeep.sum += separateDeepChainZini;

    console.log(
      `8-way: ${eightZini}, chain: ${chainZini}, min: ${minDeepChainZini}, avg: ${averageDeepChainZini}, avg-min: ${avgMinDeepChainZini}, separate: ${separateDeepChainZini}`
    );
  }

  benchmark.report();
  benchmark.clearAll();

  console.log("Results:");
  console.log(results);
}

function bulkrun7() {
  let ziniSum = 0;

  let csv = "womurl, janitor, separate\n";
  for (let i = 500; i < testGames.length; i++) {
    let testGame = testGames[i];

    let mines = BoardGenerator.readFromPtta(testGame.ptt);

    let separateDeepChainZini = ChainZini.calcNWayInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 5,
    }).total;

    console.log(`
    Url: ${testGame.wom}
    Janitor: ${testGame.zini}, Separate DeepChain: ${separateDeepChainZini}
    `);

    if (testGame.zini < separateDeepChainZini) {
      throw new Error("DeepChain beaten!");
    }

    csv += `${testGame.wom}, ${testGame.zini}, ${separateDeepChainZini}` + "\n";

    ziniSum += separateDeepChainZini;
  }

  console.log(csv);
  console.log(`ziniSum: ${ziniSum}`);
}

function bulkrun8() {
  //Benchmarking run for zini algs
  effShuffleManager.doBenchmarkingRun({
    width: boardWidth.value,
    height: boardHeight.value,
    mineCount: boardMines.value,
    targetEff: minimumEff.value,
    iterations: bulkIterations.value,
  });
}

const benchmark = new Benchmark();
</script>
