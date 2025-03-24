import Algorithms from "./Algorithms";
import PriorityPremiums from "./PriorityPremiums";
import Utils from "./Utils";
import Benchmark from "./Benchmark";

import seedrandom from "seedrandom";

const benchmark = new Benchmark();

class ChainZini {
  constructor() {
    throw new Error('ChainZini class only has static methods, and cannot be instantiated')
  }

  static calcChainZini({
    mines,
    preprocessedData = false,
    initialRevealedStates = false,
    initialFlagStates = false,
    initialChainIds = false,
    initialChainMap = false,
    initialChainNeighbourhoodGrid = false,
    priorityGrids = false,
    returnAllZinis = false,
    includeClickPath = false
  }) {
    window.loopCount = 0;//debug-line
    benchmark.startTime('setup');
    if (!preprocessedData) {
      preprocessedData =
        Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
          mines
        );
    }

    const { numbersArray, openingLabels, preprocessedOpenings } =
      preprocessedData;

    const width = mines.length;
    const height = mines[0].length;

    //false for unrevealed, true for revealed
    let revealedStates;
    if (initialRevealedStates) {
      revealedStates = initialRevealedStates;
    } else {
      revealedStates = new Array(width)
        .fill(0)
        .map(() => new Array(height).fill(false));
    }

    //false for unflagged, true for flagged
    let flagsPlacedBefore = 0;
    let flagStates;
    if (initialFlagStates) {
      flagStates = initialFlagStates
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (initialFlagStates[x][y]) {
            flagsPlacedBefore++;
          }
        }
      }
    } else {
      flagStates = new Array(width)
        .fill(0)
        .map(() => new Array(height).fill(false));
    }

    //2d array telling you which (if any) chain a square belongs to
    let chainIds;
    if (initialChainIds) {
      chainIds = initialChainIds
    } else {
      chainIds = new Array(width)
        .fill(0)
        .map(() => new Array(height).fill(null));
    }

    //map of chains
    let chainMap;
    let nextChainId;
    if (initialChainMap) {
      chainMap = initialChainMap
      nextChainId = Math.max(0, Math.max(0, ...initialChainMap.keys())) + 1;
    } else {
      chainMap = new Map();
      nextChainId = 0;
    }

    //tracks for each square which chains neighbour it
    let chainNeighbourhoodGrid;
    if (initialChainNeighbourhoodGrid) {
      chainNeighbourhoodGrid = initialChainNeighbourhoodGrid;
    } else {
      chainNeighbourhoodGrid = new Array(width)
        .fill(0)
        .map(() => new Array(height).fill(0).map(() => {
          return {
            //Note - arrays used instead of sets as they are more performant when small (even if duplicates)
            floating: [], //floating can floating seeded chains and also be smotherable unchordedDig neighbours
            fixed: [] //fixed can be fixed seeded chains or the current square if it is a fixed unchordedDig
          }
        }));
    }

    //array of saved info for square about what the neighbours are etc
    const chainSquareInfo = this.computeChainSquareInfo(mines, numbersArray, openingLabels, preprocessedOpenings);

    //store chainPremiums of opening + chording each cell
    const chainPremiums = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          continue;
        }
        this.updateChainPremiumForCoord(
          x,
          y,
          chainSquareInfo,
          flagStates,
          revealedStates,
          chainPremiums,
          preprocessedOpenings,
          chainIds,
          chainMap,
          chainNeighbourhoodGrid
        );
      }
    }

    //Work out how many squares need to be revealed for it to be solved (will typically be width * height - mines, but could be different if calculating zini from current board state)
    let revealedSquaresToSolve = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!mines[x][y] && !revealedStates[x][y]) {
          revealedSquaresToSolve++;
        }
      }
    }

    if (!priorityGrids) {
      let basicPriorityGrid = PriorityGridCreator.createBasic(width, height)
      priorityGrids = [basicPriorityGrid];
    }

    let currentZiniValue = Infinity; //Set to the best zini we've found so far
    let currentSolution = null; //Set to the best zini solution we've found so far. This will be an object with data of the solution.
    let allZinis = [];

    benchmark.stopTime('setup');

    for (let i = 0; i < priorityGrids.length; i++) {
      benchmark.startTime('copying');
      let priorityGrid = priorityGrids[i];
      //Take copies of variables that track board state as they need to be re-initialised for each priority grid
      const thisEnumerationChainIds = Algorithms.fast2dArrayCopy(chainIds);
      const thisEnumerationChainMap = this.cloneChainMap(chainMap);
      const thisEnumerationChainNeighbourhoodGrid = this.cloneChainNeighbourhoodGrid(chainNeighbourhoodGrid);
      const thisEnumerationFlagStates = Algorithms.fast2dArrayCopy(flagStates);
      const thisEnumerationRevealedStates =
        Algorithms.fast2dArrayCopy(revealedStates);
      const thisEnumerationChainPremiums = Algorithms.fast2dArrayCopy(chainPremiums);
      let squaresSolvedThisRun = 0;
      let flagsPlacedSoFar = flagsPlacedBefore;
      const nextChainRef = { id: nextChainId };

      const thisEnumerationPriorityPremiums = new PriorityPremiums(
        priorityGrid,
        true
      );

      //Initialise based on premiums
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (mines[x][y]) {
            continue;
          }
          thisEnumerationPriorityPremiums.lazyAddPremium(x, y, chainPremiums[x][y]);
        }
      }
      thisEnumerationPriorityPremiums.sortAfterLazyAdd();

      benchmark.stopTime('copying');

      benchmark.startTime('core-loop');

      let needToDoNFClicks = false;
      while (squaresSolvedThisRun !== revealedSquaresToSolve) {
        let chainZiniStepResult = this.doChainZiniStep(
          chainSquareInfo,
          thisEnumerationFlagStates,
          thisEnumerationRevealedStates,
          thisEnumerationChainPremiums,
          preprocessedOpenings,
          thisEnumerationChainIds,
          thisEnumerationChainMap,
          thisEnumerationChainNeighbourhoodGrid,
          thisEnumerationPriorityPremiums,
          nextChainRef
        );
        squaresSolvedThisRun += chainZiniStepResult.newlyRevealed;
        flagsPlacedSoFar += chainZiniStepResult.flagsPlaced;

        if (chainZiniStepResult.onlyNFRemaining) {
          needToDoNFClicks = true;
          break;
        }
      }
      benchmark.stopTime('core-loop');

      if (needToDoNFClicks) {
        this.nfClickEverythingForChainZini(
          chainSquareInfo,
          thisEnumerationRevealedStates,
          preprocessedOpenings,
          thisEnumerationChainIds,
          thisEnumerationChainMap,
          nextChainRef
        );
      }

      let clicksForThisEnumeration = flagsPlacedSoFar;
      for (let chain of thisEnumerationChainMap.values()) {
        clicksForThisEnumeration += chain.getClickCount();
      }

      //Check if this solution is better than current best
      if (clicksForThisEnumeration < currentZiniValue) {
        currentZiniValue = clicksForThisEnumeration;
        currentSolution = {
          chainIds: thisEnumerationChainIds,
          chainMap: thisEnumerationChainMap,
          flagStates: thisEnumerationFlagStates
        };
      }

      if (returnAllZinis) {
        allZinis[i] = clicksForThisEnumeration;
      }
    }

    let returnObj = {
      total: currentZiniValue,
      solution: currentSolution
    };

    if (returnAllZinis) {
      returnObj.allZinis = allZinis;
    }

    if (includeClickPath) {
      returnObj.clicks = this.convertSolutionToClickPath({
        chainIds: currentSolution.chainIds,
        chainMap: currentSolution.chainMap,
        mines: mines,
        chainSquareInfo: chainSquareInfo,
        preprocessedOpenings: preprocessedOpenings
      });
    }

    console.log(window.loopCount);//debug-line

    return returnObj;
  }

  //Note this is similar to Algorithms.computeSquareInfo
  static computeChainSquareInfo(mines, numbersArray, openingLabels, preprocessedOpenings) {
    const width = mines.length;
    const height = mines[0].length;

    //saved info for square about what the neighbours are
    const squareInfo = new Array(width).fill(0).map(() =>
      new Array(height).fill(0).map(() => {
        return {
          isMine: false,
          number: null, //Set later
          is3bv: null, //Set later. Note that this info can also be determined by whether this.number = 0 and this.openingsTouched.size = 0
          labelIfOpening: null, //Set later if this is a zero square. This gives the "identifier" of the opening this square is part of
          mineNeighbours: [],
          safeNeighbours: [],
          nonOpening3bvNeighbours: [], //i.e. single "protected" squares
          openingsTouched: new Set(), //These correspond to "3bv" that are openings. Values are the labels of the openings it touches
          chainNeighbours: [] //Chordable squares that this square would reveal if chorded (or opened if a zero tile).
        };
      })
    );

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const thisSquare = squareInfo[x][y];

        //Is this square a mine
        if (mines[x][y]) {
          thisSquare.isMine = true;
          continue;
        }
        //What number is this square
        thisSquare.number = numbersArray[x][y];

        //Is the square 3bv
        if (openingLabels[x][y] === 0 || numbersArray[x][y] === 0) {
          thisSquare.is3bv = true;
        } else {
          thisSquare.is3bv = false;
        }

        if (numbersArray[x][y] === 0) {
          thisSquare.labelIfOpening = openingLabels[x][y];
        }

        //Gather info about the neighbours of this square
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (i < 0 || i >= width || j < 0 || j >= height) {
              continue; //Neighbour Square outside board
            }
            if (i === x && j === y) {
              continue; //The square itself is not a neighbour
            }

            if (mines[i][j]) {
              thisSquare.mineNeighbours.push({ x: i, y: j });
              continue;
            } else {
              thisSquare.safeNeighbours.push({ x: i, y: j });
            }

            if (openingLabels[i][j] === 0) {
              //Neighbour cell is a protected square
              thisSquare.nonOpening3bvNeighbours.push({ x: i, y: j });
            } else if (
              typeof openingLabels[i][j] === "number" &&
              numbersArray[x][y] !== 0
            ) {
              //Neighbour cell belongs to the opening with label openingLabels[i][j]
              //Note that openingsTouched is a set since a square can have multiple neighbours belonging to the same opening
              //Also note that we don't track openings touched if the square itself is a zero as this messes up zini calc
              thisSquare.openingsTouched.add(openingLabels[i][j]);
            }
          }
        }
      }
    }

    return squareInfo;
  }

  static updateChainPremiumForCoord(
    x,
    y,
    chainSquareInfo,
    flagStates,
    revealedStates,
    chainPremiums,
    preprocessedOpenings,
    chainIds,
    chainMap,
    chainNeighbourhoodGrid,
    priorityPremiums = false
  ) {
    //Based on Algorithms.updatePremiumForCoord
    //Chain premiums are different to regular premiums
    //Chain premiums allow for rewriting history when a chord joins up other chord chains

    //Below explains regular premiums
    //https://minesweepergame.com/forum/viewtopic.php?t=70&sid=8bb9f4500da68f4ef4a8989e5a89b6a4
    /*
      1. calculate premium for each cell (open or closed) not containing a mine:
      premium= [adjacent 3bv] - [adjacent unflagged mines] - 1_[if cell is closed] - 1
      determine the benifit of performing a double click over a left click.
      '1' represents the double click assuming 1.5 technique

      2. find the (top-left most) cell with the highest premium
      a. if premium non-negative perform solve:
      ZiNi=ZiNi+[adjacent unflagged mines] +1
      a premium of 0 might add evenually benificial flags, which still means a benifit over a left click
      b. if premium is negative open top left most cell (note by llama - top-left-most cell THAT IS 3BV)
      ZiNi=ZiNi+1
      top-left-most to be unambigous

      3. if closed cells remain start from 1.
    */
    const width = revealedStates.length;
    const height = revealedStates[0].length;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      //Exit early as square is outside board
      return;
    }

    const thisSquare = chainSquareInfo[x][y];
    if (thisSquare.isMine) {
      //Exit early if this square is a mine as it makes no sense to do premiums for this
      return;
    }
    if (thisSquare.number === 0) {
      //Never makes sense to chord zeros, this will always waste a click
      //Note - we don't update this in priorityPremiums since the premium will always be -1
      chainPremiums[x][y] = -1;
      return;
    }
    if (chainIds[x][y] !== null && !chainMap.get(chainIds[x][y]).isUnchordedDig) {
      //This square must've been chorded before, so premium = -1
      if (priorityPremiums) {
        priorityPremiums.updatePremium(x, y, chainPremiums[x][y], -1);
      }
      chainPremiums[x][y] = -1;
      return
    }

    let adjacentUnrevealedNonOpening3bv = 0;
    for (let neighbour of thisSquare.nonOpening3bvNeighbours) {
      if (!revealedStates[neighbour.x][neighbour.y]) {
        adjacentUnrevealedNonOpening3bv++;
      }
    }

    let adjacentUnrevealedOpenings = 0;
    for (let op of thisSquare.openingsTouched) {
      const zeroBelongingToOpening =
        preprocessedOpenings.get(op).zeros[0];

      if (
        !revealedStates[zeroBelongingToOpening.x][zeroBelongingToOpening.y]
      ) {
        adjacentUnrevealedOpenings++;
      }
    }

    let unflaggedAdjacentMines = 0;
    for (let neighbour of thisSquare.mineNeighbours) {
      if (!flagStates[neighbour.x][neighbour.y]) {
        unflaggedAdjacentMines++;
      }
    }

    const bbbvOpenedWithChord =
      adjacentUnrevealedNonOpening3bv + adjacentUnrevealedOpenings;

    //Note - the original forum post for zini has premium = [adjacent 3bv] - [adjacent unflagged mines] - 1_[if cell is closed] - 1
    //I believe this is either wrong or misleading. Since we have a term "- 1_[if cell is closed]". Since we are still tied for clicks saved if the cell needs to be revealed first, with the only exception being if the cell we are click on is not 3bv.
    let penaltyForFirstClick = 0;
    if (!thisSquare.is3bv && !revealedStates[x][y]) {
      penaltyForFirstClick = 1;
    }

    //Look at chain merge possiblities
    const chainNeighbourhood = chainNeighbourhoodGrid[x][y];
    const adjustmentForChainsMerged = Math.max(
      0,
      chainNeighbourhood.floating.length +
      Math.min(1, chainNeighbourhood.fixed.length) - 1
    );

    /*
    //Check chain neighbours to see if any of them are merge-able
    let neighbourChainIds = new Set();
    for (let chainNeighbour of thisSquare.chainNeighbours) {
      let neighbourChainId = chainIds[chainNeighbour.x][chainNeighbour.y]
      if (neighbourChainId !== null) {
        neighbourChainIds.add(neighbourChainId);
      }
    }

    //Check which neighbour chains we might merge with, or whether we can smother anything
    let totalFloatingSeededNeighbourChains = 0;
    let totalFixedSeededNeighbourChains = 0;
    let totalSmotherableDigs = 0;

    let checkForSelfSmothering = false;
    //Self-smothered is when we have a typically fixed seed single left click
    // and then chording it joins another chain which removes the need for the original left click
    //Note that we assume/require that it is not floating. This is because floating seeds would've been smothered previously
    if (chainIds[x][y] !== null && chainMap.get(chainIds[x][y]).isUnchordedDig && !chainMap.get(chainIds[x][y]).isFloatingSeed) {
      checkForSelfSmothering = true;
    }

    for (let chainId of neighbourChainIds) {
      const neighbourChain = chainMap.get(chainId)
      if (!neighbourChain.isUnchordedDig && neighbourChain.isFloatingSeed) {
        //Floating seed chains are always candidates for merging
        totalFloatingSeededNeighbourChains++
      } else if (!neighbourChain.isUnchordedDig && !neighbourChain.isFloatingSeed) {
        //Assume that fixed seeds can only be merged if they go at the start
        totalFixedSeededNeighbourChains++;
      } else if (neighbourChain.isUnchordedDig && neighbourChain.isFloatingSeed) {
        totalSmotherableDigs++;
      } else if (neighbourChain.isUnchordedDig && !neighbourChain.isFloatingSeed) {
        //Smothered, but not floating means that we can't remove it, so premium is unaffected
        //Do nothing
      }
    }

    let adjustmentForChainsMerged2 = 0;
    let mergeable = totalFloatingSeededNeighbourChains + Math.min(totalFixedSeededNeighbourChains, 1);
    if (mergeable >= 2) {
      adjustmentForChainsMerged2 += mergeable - 1;
    }
    if (checkForSelfSmothering && totalFloatingSeededNeighbourChains > 1 && totalFixedSeededNeighbourChains === 0) {
      adjustmentForChainsMerged2 += 1
    }
    adjustmentForChainsMerged2 += totalSmotherableDigs;
    */

    /*
    if (adjustmentForChainsMerged !== adjustmentForChainsMerged2) {
      throw new Error('Adjustment mismatch');
    }
    */

    const clicksSaved =
      bbbvOpenedWithChord - unflaggedAdjacentMines - 1 - penaltyForFirstClick + adjustmentForChainsMerged;

    if (priorityPremiums) {
      //Also save premium to priority premiums assuming it is available
      priorityPremiums.updatePremium(x, y, chainPremiums[x][y], clicksSaved);
    }
    chainPremiums[x][y] = clicksSaved;
  }

  static doChainZiniStep(
    chainSquareInfo,
    flagStates,
    revealedStates,
    chainPremiums,
    preprocessedOpenings,
    chainIds,
    chainMap,
    chainNeighbourhoodGrid,
    priorityPremiums,
    nextChainRef
  ) {
    const width = revealedStates.length;
    const height = revealedStates[0].length;
    let squaresRevealedDuringStep = 0;
    let flagsPlacedDuringStep = 0;

    //Use priority premiums to quickly find the best premium
    const { x: chordX, y: chordY, premium: highestPremium } = priorityPremiums.getHighestPremium();
    const chordClick = { x: chordX, y: chordY };

    //If the candidate chord saves clicks then do it, otherwise NF click all remaining squares
    if (highestPremium <= -1) {
      //Exit early as everything left will be NF clicks
      return { newlyRevealed: 0, flagsPlaced: 0, onlyNFRemaining: true };
    }

    //Track squares that will need premium updated after doing the chord
    let squaresThatNeedPremiumUpdated = [];

    ///////////////////////////
    //DOING A CHORD
    ///////////////////////////
    const thisSquare = chainSquareInfo[chordClick.x][chordClick.y];

    const thisSquareChainNeighbours = chainNeighbourhoodGrid[chordClick.x][chordClick.y];
    const thisSquareFloatingNeighbourIds = thisSquareChainNeighbours.floating.slice();
    const thisSquareFixedNeighbourIds = thisSquareChainNeighbours.fixed.slice();
    //Note - we take copies, since otherwise it causes issues when looping over if we delete from the original array

    let baseChainId = null;
    if (thisSquareFixedNeighbourIds.length !== 0) {
      //If fixed neighbour (could be self, use that as starting point)
      baseChainId = thisSquareFixedNeighbourIds[0];
    } else if (thisSquareFloatingNeighbourIds.length !== 0) {
      //Use a floating chain as base
      //Consider instead use heuristic to find the largest floating chain to use as base?
      //Pick first floating that isn't a single unchordedDig
      let floatingBaseMostOpeningsTouchedSoFar = -1;
      for (const floatingId of thisSquareFloatingNeighbourIds) {
        const floatingBaseCandidate = chainMap.get(floatingId);
        if (!floatingBaseCandidate.isUnchordedDig) {
          //Chorded floating chains can always be used as base
          if (floatingBaseCandidate.openingsTouched.length > floatingBaseMostOpeningsTouchedSoFar) {
            floatingBaseMostOpeningsTouchedSoFar = floatingBaseCandidate.openingsTouched.length;
            baseChainId = floatingId;
          }
          continue;
        } else {
          //floating unchorded digs can only be used as baseChain if they are an exact match or
          //if they are on the edge of an opening
          const candidatePos = floatingBaseCandidate.positionIfUnchordedDig;
          if (
            floatingId === chainIds[chordClick.x][chordClick.y] ||
            chainSquareInfo[candidatePos.x][candidatePos.y].number === 0
          ) {
            if (floatingBaseCandidate.openingsTouched.length > floatingBaseMostOpeningsTouchedSoFar) {
              floatingBaseMostOpeningsTouchedSoFar = floatingBaseCandidate.openingsTouched.length;
              baseChainId = floatingId;
            }
            continue;
          }
        }

        // Mismatched unchordedDigs get excluded from being baseChain
        // they can be handled by smothering instead later on.
      }
    } else {
      //Do nothing, we will need to make a new chain later
    }

    if (baseChainId !== null) {
      //combine chains
      let baseChain = chainMap.get(baseChainId);

      //look at floating neighbouring chains
      for (let floatingChainId of thisSquareFloatingNeighbourIds) {
        if (baseChainId === floatingChainId) {
          //Base chain is untouched (note - if statement gets hit more than needed, but still fast in practise)
          continue;
        }

        let floatingChain = chainMap.get(floatingChainId);
        if (floatingChain.isUnchordedDig) {
          //Floating left click that gets smothered
          //remove this "single-left-click" chain and push neighbours
          if (!floatingChain.positionIfUnchordedDig) {
            throw new Error('Unchorded dig with missing position');
          }
          const smotheredCoord = floatingChain.positionIfUnchordedDig;
          chainIds[smotheredCoord.x][smotheredCoord.y] = null;
          //Also delete smothered coord from neighbouring self (just in case)
          Utils.deleteValueFromArray(chainNeighbourhoodGrid[smotheredCoord.x][smotheredCoord.y].floating, floatingChainId);
          chainMap.delete(floatingChainId);
          const smotheredChainInfo = chainSquareInfo[smotheredCoord.x][smotheredCoord.y];
          if (smotheredChainInfo.number === 0) {
            const openingLabel = smotheredChainInfo.labelIfOpening;
            const thisOpening = preprocessedOpenings.get(openingLabel);
            for (let edge of thisOpening.edges) {
              Utils.deleteValueFromArray(chainNeighbourhoodGrid[edge.x][edge.y].floating, floatingChainId);
              squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
            }
          } else {
            //Note - this is slightly overkill with pushing more squares for premium updates than is needed.
            //This is ok because it is rare to smother digs.
            for (let n of smotheredChainInfo.safeNeighbours) {
              Utils.deleteValueFromArray(chainNeighbourhoodGrid[n.x][n.y].floating, floatingChainId);
              squaresThatNeedPremiumUpdated.push({ x: n.x, y: n.y });
            }
            for (let openingLabel of smotheredChainInfo.openingsTouched) {
              const thisOpening = preprocessedOpenings.get(openingLabel);
              for (let edge of thisOpening.edges) {
                if (edge.x === smotheredCoord.x && edge.y === smotheredCoord.y) {
                  //The square itself was removed from various arrays earlier
                  continue;
                } else {
                  Utils.deleteValueFromArray(chainNeighbourhoodGrid[edge.x][edge.y].floating, floatingChainId);
                  squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
                }
              }
            }
          }
        } else {
          //Most common merge case - merge in a floating chain
          baseChain.mergeWithPath(floatingChain.path);
          baseChain.mergeWithOpeningsTouched(floatingChain.openingsTouched);
          for (let chord of floatingChain.path) {
            //Change this square to belong to base chain
            chainIds[chord.x][chord.y] = baseChainId;

            //Also update chainNeighbourhoodGrid so that the squares neighbouring this chain are aware that they do neighbour it
            let pathSquare = chainSquareInfo[chord.x][chord.y];
            for (let safeNeighbour of pathSquare.safeNeighbours) {
              //Note - a bit inefficient as safeNeighbours will get hit more than once
              //Probably ok as large chain merges aren't super common
              //We look at squares that are chainNeighbours through openings separately later
              let safeNeighbourhood = chainNeighbourhoodGrid[safeNeighbour.x][safeNeighbour.y];
              const oldAdjustment = Math.max(
                0,
                safeNeighbourhood.floating.length +
                Math.min(1, safeNeighbourhood.fixed.length) - 1
              );
              if (baseChain.isFloatingSeed) {
                //base floating => both floating
                Utils.deleteValueFromArray(safeNeighbourhood.floating, floatingChainId);
                safeNeighbourhood.floating.includes(baseChainId) || safeNeighbourhood.floating.push(baseChainId);
              } else {
                //base is fixed, so this also becomes fixed
                Utils.deleteValueFromArray(safeNeighbourhood.floating, floatingChainId);
                safeNeighbourhood.fixed.includes(baseChainId) || safeNeighbourhood.fixed.push(baseChainId);
              }
              const newAdjustment = Math.max(
                0,
                safeNeighbourhood.floating.length +
                Math.min(1, safeNeighbourhood.fixed.length) - 1
              );
              if (oldAdjustment !== newAdjustment) {
                squaresThatNeedPremiumUpdated.push({ x: safeNeighbour.x, y: safeNeighbour.y });
              }
            }
          }

          //Update chainNeighbourhood for openings that belong to the chain we merged in
          for (let openingTouched of floatingChain.openingsTouched) {
            let thisOpening = preprocessedOpenings.get(openingTouched);
            for (let edge of thisOpening.edges) {
              let edgeNeighbourhood = chainNeighbourhoodGrid[edge.x][edge.y];
              const oldAdjustment = Math.max(
                0,
                edgeNeighbourhood.floating.length +
                Math.min(1, edgeNeighbourhood.fixed.length) - 1
              );
              if (baseChain.isFloatingSeed) {
                //base floating => both floating
                Utils.deleteValueFromArray(edgeNeighbourhood.floating, floatingChainId);
                edgeNeighbourhood.floating.includes(baseChainId) || edgeNeighbourhood.floating.push(baseChainId);
              } else {
                //base is fixed, so this also becomes fixed
                Utils.deleteValueFromArray(edgeNeighbourhood.floating, floatingChainId);
                edgeNeighbourhood.fixed.includes(baseChainId) || edgeNeighbourhood.fixed.push(baseChainId);
              }
              const newAdjustment = Math.max(
                0,
                edgeNeighbourhood.floating.length +
                Math.min(1, edgeNeighbourhood.fixed.length) - 1
              );
              if (oldAdjustment !== newAdjustment) {
                squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
              }
            }
          }

          //Lastly remove the chain we merged in from the chain map
          chainMap.delete(floatingChainId);
        }
      }

      //look at how to add the newly chorded cell to the base chain
      if (baseChain.isUnchordedDig) {
        //This is the special case where we started on a single-left click
        //So we change the chain to be a standard chorded chain.
        baseChain.isUnchordedDig = false;
        baseChain.addToPath(chordClick.x, chordClick.y);

        if (baseChain.isFloatingSeed) {
          //Floating seed, keep neighbourhoodGrid as is since premium adjustment is still the same despite being chorded now
          //Do nothing
          baseChain.positionIfUnchordedDig = false;

          //Note - don't have to worry about baseChain being floating-seeded-unchordedDig-opening
          //This is because we exclude these from being baseChain and just let them get smothered instead
        } else {
          //Fixed seed, neighbourhoodGrid needs updating, as it's now chorded, so can be used to merge chains which affects premium

          //Add seed
          baseChain.seedLocationsIfFixed = [{ x: baseChain.positionIfUnchordedDig.x, y: baseChain.positionIfUnchordedDig.y }];
          baseChain.positionIfUnchordedDig = false;

          //Note that baseChain being unchordedDig implies it's on the same square we chorded
          Utils.deleteValueFromArray(thisSquareFixedNeighbourIds, baseChainId);

          //Also update neighbours of centre chord as they now neighbour a fixed chain
          for (let chordNeighbour of thisSquare.safeNeighbours) {
            let cnNeighbourhood = chainNeighbourhoodGrid[chordNeighbour.x][chordNeighbour.y];
            const oldAdjustment = Math.max(
              0,
              cnNeighbourhood.floating.length +
              Math.min(1, cnNeighbourhood.fixed.length) - 1
            );
            cnNeighbourhood.fixed.includes(baseChainId) || cnNeighbourhood.fixed.push(baseChainId);
            const newAdjustment = Math.max(
              0,
              cnNeighbourhood.floating.length +
              Math.min(1, cnNeighbourhood.fixed.length) - 1
            );
            if (oldAdjustment !== newAdjustment) {
              squaresThatNeedPremiumUpdated.push({ x: chordNeighbour.x, y: chordNeighbour.y });
            }
          }
          for (let openingLabel of thisSquare.openingsTouched) {
            const thisOpening = preprocessedOpenings.get(openingLabel);
            for (let edge of thisOpening.edges) {
              if (edge.x === chordClick.x && edge.y === chordClick.y) {
                continue;
              } else {
                let cnNeighbourhood = chainNeighbourhoodGrid[edge.x][edge.y];
                const oldAdjustment = Math.max(
                  0,
                  cnNeighbourhood.floating.length +
                  Math.min(1, cnNeighbourhood.fixed.length) - 1
                );
                cnNeighbourhood.fixed.includes(baseChainId) || cnNeighbourhood.fixed.push(baseChainId);
                const newAdjustment = Math.max(
                  0,
                  cnNeighbourhood.floating.length +
                  Math.min(1, cnNeighbourhood.fixed.length) - 1
                );
                if (oldAdjustment !== newAdjustment) {
                  squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
                }
              }
            }
          }
        }
      } else {
        //The starting square would only be included if it was a single left click
        //This isn't the case in this else statement, so add it
        baseChain.addToPath(chordClick.x, chordClick.y);
        chainIds[chordClick.x][chordClick.y] = baseChainId;

        //Inform neighbours of the square we chorded that they are now adjacent to our chain
        for (let safeNeighbour of thisSquare.safeNeighbours) {
          let safeNeighbourhood = chainNeighbourhoodGrid[safeNeighbour.x][safeNeighbour.y];
          const oldAdjustment = Math.max(
            0,
            safeNeighbourhood.floating.length +
            Math.min(1, safeNeighbourhood.fixed.length) - 1
          );
          if (baseChain.isFloatingSeed) {
            safeNeighbourhood.floating.includes(baseChainId) || safeNeighbourhood.floating.push(baseChainId);
          } else {
            safeNeighbourhood.fixed.includes(baseChainId) || safeNeighbourhood.fixed.push(baseChainId);
          }
          const newAdjustment = Math.max(
            0,
            safeNeighbourhood.floating.length +
            Math.min(1, safeNeighbourhood.fixed.length) - 1
          );
          if (oldAdjustment !== newAdjustment) {
            squaresThatNeedPremiumUpdated.push({ x: safeNeighbour.x, y: safeNeighbour.y });
          }
        }

        //Also process openings, but only if they aren't already part of the chord chain
        for (let openingTouched of thisSquare.openingsTouched) {
          if (baseChain.openingsTouched.includes(openingTouched)) {
            continue;
          }

          let thisOpening = preprocessedOpenings.get(openingTouched)
          for (let edgeNeighbours of thisOpening.edges) {
            let edgeNeighbourhood = chainNeighbourhoodGrid[edgeNeighbours.x][edgeNeighbours.y];
            const oldAdjustment = Math.max(
              0,
              edgeNeighbourhood.floating.length +
              Math.min(1, edgeNeighbourhood.fixed.length) - 1
            );
            if (baseChain.isFloatingSeed) {
              edgeNeighbourhood.floating.includes(baseChainId) || edgeNeighbourhood.floating.push(baseChainId);
            } else {
              edgeNeighbourhood.fixed.includes(baseChainId) || edgeNeighbourhood.fixed.push(baseChainId);
            }
            const newAdjustment = Math.max(
              0,
              edgeNeighbourhood.floating.length +
              Math.min(1, edgeNeighbourhood.fixed.length) - 1
            );
            if (oldAdjustment !== newAdjustment) {
              squaresThatNeedPremiumUpdated.push({ x: edgeNeighbours.x, y: edgeNeighbours.y });
            }
          }
        }
      }

      //Save the info that any openings that are now touched due to the chord we did are also touched by the baseChain
      for (let openingTouched of thisSquare.openingsTouched) {
        baseChain.addOpeningTouched(openingTouched);
      }
    } else {
      //This else statement is for when there is no base chain

      //Still need to check for smothering squares.
      for (let floatingChainId of thisSquareFloatingNeighbourIds) {
        let floatingChain = chainMap.get(floatingChainId);
        if (floatingChain.isUnchordedDig) {
          //Floating left click that gets smothered
          //remove this "single-left-click" chain and push neighbours
          if (!floatingChain.positionIfUnchordedDig) {
            throw new Error('Unchorded dig with missing position');
          }
          const smotheredCoord = floatingChain.positionIfUnchordedDig;
          chainIds[smotheredCoord.x][smotheredCoord.y] = null;
          //Also delete smothered coord from neighbouring self (just in case)
          Utils.deleteValueFromArray(chainNeighbourhoodGrid[smotheredCoord.x][smotheredCoord.y].floating, floatingChainId);
          chainMap.delete(floatingChainId);
          const smotheredChainInfo = chainSquareInfo[smotheredCoord.x][smotheredCoord.y];
          if (smotheredChainInfo.number !== 0) {
            //A bit inefficient as it can consider the same square multiple times, but ok as it's rare to smother digs
            for (let n of smotheredChainInfo.safeNeighbours) {
              Utils.deleteValueFromArray(chainNeighbourhoodGrid[n.x][n.y].floating, floatingChainId);
              squaresThatNeedPremiumUpdated.push({ x: n.x, y: n.y });
            }
            for (let openingLabel of smotheredChainInfo.openingsTouched) {
              const thisOpening = preprocessedOpenings.get(openingLabel);
              for (let edge of thisOpening.edges) {
                if (edge.x === smotheredCoord.x && edge.y === smotheredCoord.y) {
                  //The square itself was removed from various arrays earlier
                  continue;
                } else {
                  Utils.deleteValueFromArray(chainNeighbourhoodGrid[edge.x][edge.y].floating, floatingChainId);
                  squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
                }
              }
            }
          } else {
            throw new Error("We don't have a baseChain, yet neighbour an unchordedDig with opening. This is impossible.");
          }
        } else {
          throw new Error("We don't have a baseChain, yet neighbour a chorded chain. This is impossible.")
        }
      }

      //Make new chain
      chainIds[chordClick.x][chordClick.y] = nextChainRef.id;
      let newChain = new Chain();
      newChain.addToPath(chordClick.x, chordClick.y)
      chainMap.set(nextChainRef.id, newChain);

      //Do chainNeighbourGrid stuff
      for (let chordNeighbour of thisSquare.safeNeighbours) {
        let cnNeighbourhood = chainNeighbourhoodGrid[chordNeighbour.x][chordNeighbour.y];
        const oldAdjustment = Math.max(
          0,
          cnNeighbourhood.floating.length +
          Math.min(1, cnNeighbourhood.fixed.length) - 1
        );
        cnNeighbourhood.floating.includes(nextChainRef.id) || cnNeighbourhood.floating.push(nextChainRef.id);
        const newAdjustment = Math.max(
          0,
          cnNeighbourhood.floating.length +
          Math.min(1, cnNeighbourhood.fixed.length) - 1
        );
        if (oldAdjustment !== newAdjustment) {
          squaresThatNeedPremiumUpdated.push({ x: chordNeighbour.x, y: chordNeighbour.y });
        }
      }
      for (let openingLabel of thisSquare.openingsTouched) {
        const thisOpening = preprocessedOpenings.get(openingLabel);
        for (let edge of thisOpening.edges) {
          if (edge.x === chordClick.x && edge.y === chordClick.y) {
            continue;
          } else {
            let cnNeighbourhood = chainNeighbourhoodGrid[edge.x][edge.y];
            const oldAdjustment = Math.max(
              0,
              cnNeighbourhood.floating.length +
              Math.min(1, cnNeighbourhood.fixed.length) - 1
            );
            cnNeighbourhood.floating.includes(nextChainRef.id) || cnNeighbourhood.floating.push(nextChainRef.id);
            const newAdjustment = Math.max(
              0,
              cnNeighbourhood.floating.length +
              Math.min(1, cnNeighbourhood.fixed.length) - 1
            );
            if (oldAdjustment !== newAdjustment) {
              squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
            }
          }
        }
      }

      //Save the info that any openings that are now touched due to the chord we did are also touched by the newChain
      for (let openingTouched of thisSquare.openingsTouched) {
        newChain.addOpeningTouched(openingTouched);
      }

      nextChainRef.id += 1;
    }

    /*
      TODO - see which of below can be removed or needs adjusting
      There could be duplication of pushing to neighbourhoodGrid?
    */

    /* OK TO DELETE
    //Do logic for handling/merging chains
    let neighbourChainIds = new Set();
    for (let chainNeighbour of thisSquare.chainNeighbours) {
      let neighbourChainId = chainIds[chainNeighbour.x][chainNeighbour.y];
      if (neighbourChainId !== null) {
        neighbourChainIds.add(neighbourChainId);
      }
    }

    //Check which neighbour chains we might merge with, or whether we can smother anything
    let floatingSeededNeighbourChainsIds = [];
    let firstFixedSeedChainId = null;
    let digsToSmotherIds = [];

    //Check to see if we are on a fixed seed single-left-click.
    //In this case, we may use this as a starting point for merging
    //Elsewhere I refer to this as self-smothering
    if (chainIds[chordClick.x][chordClick.y] !== null && chainMap.get(chainIds[chordClick.x][chordClick.y]).isUnchordedDig && !chainMap.get(chainIds[chordClick.x][chordClick.y]).isFloatingSeed) {
      firstFixedSeedChainId = chainIds[chordClick.x][chordClick.y];
    }

    for (let chainId of neighbourChainIds) {
      const neighbourChain = chainMap.get(chainId)
      if (!neighbourChain.isUnchordedDig && neighbourChain.isFloatingSeed) {
        //Floating seed chains are always candidates for merging
        floatingSeededNeighbourChainsIds.push(chainId);
      } else if (!neighbourChain.isUnchordedDig && !neighbourChain.isFloatingSeed) {
        //At most one fixed seed can be merged
        if (firstFixedSeedChainId === null) {
          firstFixedSeedChainId = chainId;
        }
      } else if (neighbourChain.isUnchordedDig && neighbourChain.isFloatingSeed) {
        digsToSmotherIds.push(chainId)
      } else if (neighbourChain.isUnchordedDig && !neighbourChain.isFloatingSeed) {
        //Smothered, but not floating means that we can't remove it, so can't do anything about this
        //Do nothing
      }
    }

    //Remove any smothered digs
    for (let smotheredChainId of digsToSmotherIds) {
      let smotheredChain = chainMap.get(smotheredChainId);
      chainIds[smotheredChain.path[0].x][smotheredChain.path[0].y] = null;
      chainMap.delete(smotheredChainId);
    }

    //Combine chains
    if (firstFixedSeedChainId !== null || floatingSeededNeighbourChainsIds.length !== 0) {
      //merge with other chains
      let baseChainId;
      if (firstFixedSeedChainId !== null) {
        baseChainId = firstFixedSeedChainId;
      } else {
        //Note that shifting also removes it from the array so we don't process twice
        baseChainId = floatingSeededNeighbourChainsIds.shift();
      }

      let baseChain = chainMap.get(baseChainId);

      for (let chainToMergeId of floatingSeededNeighbourChainsIds) {
        let chainToMerge = chainMap.get(chainToMergeId);
        baseChain.mergeWithPath(chainToMerge.path);
        for (let chord of chainToMerge.path) {
          chainIds[chord.x][chord.y] = baseChainId;
        }
        chainMap.delete(chainToMergeId);
      }

      if (baseChain.isUnchordedDig) {
        //This is the special case where we started on a single-left click
        //So we change the chain to be a standard chorded chain.
        baseChain.isUnchordedDig = false;
      } else {
        //The starting square would only be included if it was a single left click
        //So add it
        baseChain.addToPath(chordClick.x, chordClick.y);
        chainIds[chordClick.x][chordClick.y] = baseChainId;
      }
    } else {
      //start new chain
      chainIds[chordClick.x][chordClick.y] = nextChainRef.id;
      let newChain = new Chain();
      newChain.addToPath(chordClick.x, chordClick.y)
      chainMap.set(nextChainRef.id, newChain);
      nextChainRef.id += 1;
    }
    */

    const unflaggedAdjacentMines = thisSquare.mineNeighbours.filter(
      (neighbour) => !flagStates[neighbour.x][neighbour.y]
    );

    //If we need to NF click first then we should do so
    if (!revealedStates[chordClick.x][chordClick.y]) {
      revealedStates[chordClick.x][chordClick.y] = true;
      squaresRevealedDuringStep++;
    }

    //Place flags
    for (let unflaggedMine of unflaggedAdjacentMines) {
      flagsPlacedDuringStep++;
      flagStates[unflaggedMine.x][unflaggedMine.y] = true;
    }

    //Expand unrevealed openings that it touches
    //(needs to be done before revealing neighbour cells, as we do some hacky stuff with
    //checking a single zero of the opening to see if the whole opening is a zero
    //and if this zero is a neighbour it would otherwise break stuff...)
    const adjacentUnrevealedOpenings = [...thisSquare.openingsTouched]
      .map((openingLabel) => preprocessedOpenings.get(openingLabel))
      .filter((opening) => {
        //Find a zero tile in the opening and check whether this is open or not
        const zeroBelongingToOpening = opening.zeros[0];
        return !revealedStates[zeroBelongingToOpening.x][
          zeroBelongingToOpening.y
        ];
      });

    for (let opening of adjacentUnrevealedOpenings) {
      //Reveal both the zeros and the edges of this opening, also update premiums for these
      //Note that we do not need to update premiums for squares that neighbour the opening edges
      //as opening edges are by definition not 3bv, so don't affect premiums
      for (let zero of opening.zeros) {
        if (!revealedStates[zero.x][zero.y]) {
          revealedStates[zero.x][zero.y] = true;
          squaresRevealedDuringStep++;
        }
        //below commented out as zero tiles always have a premium of -1
        //squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
      }
      for (let edge of opening.edges) {
        if (!revealedStates[edge.x][edge.y]) {
          revealedStates[edge.x][edge.y] = true;
          squaresRevealedDuringStep++;
        }
        squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
      }
    }

    //Open neighbour cells
    for (let safeNeighbour of thisSquare.safeNeighbours) {
      //Note - it may already be revealed, but easiest to set anyway rather than checking
      if (!revealedStates[safeNeighbour.x][safeNeighbour.y]) {
        revealedStates[safeNeighbour.x][safeNeighbour.y] = true;
        squaresRevealedDuringStep++;
      }
    }

    //5x5 block centred on the square we are chording should have premiums updated
    //Note that bounds check happens in the function for updating premiums, so we can be lazy :)
    for (let x = chordClick.x - 2; x <= chordClick.x + 2; x++) {
      for (let y = chordClick.y - 2; y <= chordClick.y + 2; y++) {
        squaresThatNeedPremiumUpdated.push({ x, y });
      }
    }

    //Now update all the premiums for squares that need to be updated.

    //De-duplicate the list of squaresThatNeedPremiumUpdated as some may be included twice if part of an opening and a neighbour to where we clicked
    //https://stackoverflow.com/questions/2218999/how-to-remove-all-duplicates-from-an-array-of-objects
    squaresThatNeedPremiumUpdated = squaresThatNeedPremiumUpdated.filter(
      (square, index, self) =>
        index ===
        self.findIndex(
          (otherSquare) =>
            otherSquare.x === square.x && otherSquare.y === square.y
        )
    );

    benchmark.startTime('core-premium-updates');
    //Update premiums
    for (let square of squaresThatNeedPremiumUpdated) {
      window.loopCount++;
      this.updateChainPremiumForCoord(
        square.x,
        square.y,
        chainSquareInfo,
        flagStates,
        revealedStates,
        chainPremiums,
        preprocessedOpenings,
        chainIds,
        chainMap,
        chainNeighbourhoodGrid,
        priorityPremiums
      );
    }
    benchmark.stopTime('core-premium-updates');

    return { newlyRevealed: squaresRevealedDuringStep, flagsPlaced: flagsPlacedDuringStep, onlyNFRemaining: false };
  }

  static nfClickEverythingForChainZini(
    chainSquareInfo,
    revealedStates,
    preprocessedOpenings,
    chainIds,
    chainMap,
    nextChainRef
  ) {
    //Note - this is always the last step, so doesn't need to keep all the chain
    // tracking variables (in particular chainNeighbourhoodGrid) up to date

    const width = revealedStates.length;
    const height = revealedStates[0].length;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const thisSquare = chainSquareInfo[x][y];
        if (thisSquare.isMine) {
          continue;
        }
        if (revealedStates[x][y]) {
          continue;
        }
        if (!thisSquare.is3bv) {
          continue;
        }
        //Square is an unrevealed 3bv, so do an nf click on it
        revealedStates[x][y] = true;
        chainIds[x][y] = nextChainRef.id;
        let newSingleDigChain = new Chain();
        newSingleDigChain.isUnchordedDig = true;
        //newSingleDigChain.addToPath(x, y); //Commented out as we use positionIfUnchorded instead
        newSingleDigChain.positionIfUnchordedDig = { x, y };
        chainMap.set(nextChainRef.id, newSingleDigChain);
        nextChainRef.id += 1;

        //Open connected squares if this is an opening
        const labelIfOpening = thisSquare.labelIfOpening;
        if (labelIfOpening !== null) {
          const opening = preprocessedOpenings.get(labelIfOpening);
          for (let zero of opening.zeros) {
            revealedStates[zero.x][zero.y] = true;
          }
          for (let edge of opening.edges) {
            revealedStates[edge.x][edge.y] = true;
            //We may still end up smothering stuff
            const edgeChainIdPossiblyNull = chainIds[edge.x][edge.y]
            if (edgeChainIdPossiblyNull !== null) {
              //Check for smotherable chain
              const edgeChain = chainMap.get(edgeChainIdPossiblyNull);
              if (edgeChain.isFloatingSeed && edgeChain.isUnchordedDig) {
                //Smother this chain
                if (!edgeChain.positionIfUnchordedDig) {
                  throw new Error('Unchorded dig with missing position');
                }
                const smotheredCoord = edgeChain.positionIfUnchordedDig;
                chainIds[smotheredCoord.x][smotheredCoord.y] = null;
                chainMap.delete(floatingChainId);
                //Don't need to update chainNeighbourGrid or premiums etc here as nfClicking is the final step
              }
            }
          }
        }
      }
    }
  }

  static calcNWayChainZini({
    mines,
    preprocessedData = false,
    initialRevealedStates = false,
    initialFlagStates = false,
    initialChainIds = false,
    initialChainMap = false,
    initialChainNeighbourhoodGrid = false,
    returnAllZinis = false,
    includeClickPath = false,
    numberOfIterations
  }) {
    console.time();

    const width = mines.length;
    const height = mines[0].length;

    benchmark.startTime('make-priority-grids');
    let priorityGrids = PriorityGridCreator.createBulkRandom(width, height, numberOfIterations, true)
    benchmark.stopTime('make-priority-grids');

    let retVal = this.calcChainZini({
      mines,
      preprocessedData,
      initialRevealedStates,
      initialFlagStates,
      initialChainIds,
      initialChainMap,
      initialChainNeighbourhoodGrid,
      priorityGrids,
      returnAllZinis,
      includeClickPath
    });

    console.timeEnd();

    benchmark.report();
    benchmark.clearAll();

    return retVal;
  }

  static convertSolutionToClickPath({
    chainIds,
    chainMap,
    mines,
    chainSquareInfo,
    preprocessedOpenings
  }) {
    let clickPath = [];

    //clone grid
    const width = mines.length;
    const height = mines[0].length;

    let flagsPlaced = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    let chordableSquares = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    for (let chain of chainMap.values()) {
      //Add seed(s)
      if (chain.isFloatingSeed) {
        if (chain.isUnchordedDig) {
          if (!chain.positionIfUnchordedDig) {
            throw new Error('Unchorded dig with missing position');
          }
          clickPath.push({ type: 'left', x: chain.positionIfUnchordedDig.x, y: chain.positionIfUnchordedDig.y });
          //Next line is commented out - this is ok because we know that due to this move being an unchorded dig, it must not get chorded later
          //chordableSquares[chain.positionIfUnchordedDig.x][chain.positionIfUnchordedDig.y] = true;
        } else {
          clickPath.push({ type: 'left', x: chain.path[0].x, y: chain.path[0].y });
          chordableSquares[chain.path[0].x][chain.path[0].y] = true;
        }
      } else {
        for (let fixedSeed of chain.seedLocationsIfFixed) {
          clickPath.push({ type: 'left', x: fixedSeed.x, y: fixedSeed.y });
          chordableSquares[fixedSeed.x][fixedSeed.y] = true;

          //If seed is on zero, then also mark opening edges as chordable
          const seedChainInfo = chainSquareInfo[fixedSeed.x][fixedSeed.y]
          if (seedChainInfo.number === 0) {
            const thisOpening = preprocessedOpenings.get(seedChainInfo.labelIfOpening);
            for (let edge of thisOpening.edges) {
              chordableSquares[edge.x][edge.y] = true;
            }
          }
        }
      }

      if (chain.isUnchordedDig) {
        //Not chorded, so no more clicks to do
        continue;
      }

      let chordsToDo = [...chain.path];

      while (chordsToDo.length !== 0) {
        //Find chords that can be played
        let playableChords = chordsToDo.filter((ch) => chordableSquares[ch.x][ch.y]);

        if (playableChords.length === 0) {
          console.log(chain);
          throw new Error('Bad chain - no playable chords');
        }

        //Play the chord and mark all consequential squares as playable
        for (let pc of playableChords) {
          //Check for surrounding flags
          for (let x = pc.x - 1; x <= pc.x + 1; x++) {
            for (let y = pc.y - 1; y <= pc.y + 1; y++) {
              if (x === pc.x && y === pc.y) {
                continue;
              }
              if (x < 0 || x >= width || y < 0 || y >= height) {
                continue;
              }
              if (mines[x][y] && !flagsPlaced[x][y]) {
                flagsPlaced[x][y] = true;
                clickPath.push({ type: 'right', x: x, y: y });
              }
            }
          }

          clickPath.push({ type: 'chord', x: pc.x, y: pc.y });
          for (let cn of chainSquareInfo[pc.x][pc.y].safeNeighbours) {
            chordableSquares[cn.x][cn.y] = true;
          }
          for (let openingLabel of chainSquareInfo[pc.x][pc.y].openingsTouched) {
            const thisOpening = preprocessedOpenings.get(openingLabel);
            for (let edge of thisOpening.edges) {
              if (edge.x === pc.x && edge.y === pc.y) {
                continue;
              } else {
                chordableSquares[edge.x][edge.y] = true;
              }
            }
          }
        }

        //Remove played chords from the list of chords left to do
        chordsToDo = chordsToDo.filter(cd => !playableChords.includes(cd));
      }
    }

    return clickPath;
  }

  static convertClickPathToChainInput(clickPath, mines, isFloating) {
    //Takes a click path and converts to all the initial data required for chainZini

    const width = mines.length;
    const height = mines[0].length;

    //Strip wasted clicks
    clickPath = clickPath.filter(click => !click.type.includes('wasted'));

    const { numbersArray, openingLabels, preprocessedOpenings } =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
        mines
      );

    const chainSquareInfo = this.computeChainSquareInfo(mines, numbersArray, openingLabels, preprocessedOpenings);

    let initialRevealedStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    let initialFlagStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    let initialChainIds = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    let initialChainMap = new Map();

    let initialChainNeighbourhoodGrid = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0).map(() => {
        return {
          floating: [],
          fixed: []
        }
      }));

    ////// flag states ///////
    clickPath.forEach(click => {
      if (click.type === 'right') {
        initialFlagStates[click.x][click.y] = true;
      }
    });

    ////// build chains //////
    /*
      Idea: Choose a random left click, and recurse it, update everything as we go
    */

    let leftClickPool = new Set(clickPath.filter(click => click.type === 'left'));
    let chordPool = new Set(clickPath.filter(click => click.type === 'chord'));

    let moveGrid = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0).map(() => { return { left: null, chord: null } }));
    for (let lc of leftClickPool) {
      moveGrid[lc.x][lc.y].left = lc;
    };
    for (let c of chordPool) {
      moveGrid[c.x][c.y].chord = c;
    };

    let unchordedDigNonZerosToProcess = [];
    let unchordedDigZerosToProcess = [];

    let currentChainId = 0;
    while (leftClickPool.size !== 0) {
      let leftClick = leftClickPool.values().next().value;
      let thisSquare = chainSquareInfo[leftClick.x][leftClick.y]
      leftClickPool.delete(leftClick);

      //Figure out if it is chorded
      let firstChord = null;
      if (thisSquare.number === 0) {
        let openingLabel = openingLabels[leftClick.x][leftClick.y];
        let thisOpening = preprocessedOpenings.get(openingLabel);
        for (let edge of thisOpening.edges) {
          if (
            moveGrid[edge.x][edge.y].chord &&
            chordPool.has(moveGrid[edge.x][edge.y].chord)
          ) {
            firstChord = moveGrid[edge.x][edge.y].chord;
            break;
          }
        }
      } else {
        if (
          moveGrid[leftClick.x][leftClick.y].chord &&
          chordPool.has(moveGrid[leftClick.x][leftClick.y].chord)
        ) {
          firstChord = moveGrid[leftClick.x][leftClick.y].chord;
        }
      }

      if (!firstChord) {
        //UnchordedDig, so process later
        if (thisSquare.number === 0) {
          unchordedDigZerosToProcess.push(leftClick);
        } else {
          unchordedDigNonZerosToProcess.push(leftClick);
        }
        continue;
      }

      //Since we have confirmed it isn't an unchordedDig (which are processed later), we can reveal the square for the initial left click here
      initialRevealedStates[leftClick.x][leftClick.y] = true;

      let newChain = new Chain();
      if (isFloating) {
        newChain.isFloatingSeed = true;
      } else {
        newChain.isFloatingSeed = false;
      }

      let seedsIfFixed = [];
      if (!isFloating) {
        if (!seedsIfFixed.some(s => s.x === leftClick.x && s.y === leftClick.y)) {
          seedsIfFixed.push({
            x: leftClick.x,
            y: leftClick.y
          })
        }
      }

      let chordsToDo = [firstChord];

      while (chordsToDo.length !== 0) {
        let thisChord = chordsToDo.shift();
        let thisChordInfo = chainSquareInfo[thisChord.x][thisChord.y]

        chordPool.delete(thisChord);
        newChain.addToPath(thisChord.x, thisChord.y);

        initialChainIds[thisChord.x][thisChord.y] = currentChainId;

        let nonZerosToProcess = [];

        for (let openingLabel of thisChordInfo.openingsTouched) {
          if (newChain.openingsTouched.includes(openingLabel)) {
            continue;
          }
          newChain.addOpeningTouched(openingLabel);
          const thisOpening = preprocessedOpenings.get(openingLabel);
          for (let zero of thisOpening.zeros) {
            initialRevealedStates[zero.x][zero.y] = true;

            let left = moveGrid[zero.x][zero.y].left;
            if (isFloating) {
              if (left) {
                //Smothered/multi-seed, remove this
                //Note this could also be the seed that started this chain. Though harmless to try remove twice
                leftClickPool.delete(left);
              }
            } else {
              //If fixed, we just need to track seeds
              if (left) {
                leftClickPool.delete(left); //Possibly already deleted if seed that started chain
                if (!seedsIfFixed.some(s => s.x === left.x && s.y === left.y)) {
                  seedsIfFixed.push({
                    x: left.x,
                    y: left.y
                  });
                }
              }
            }
          }
          for (let edge of thisOpening.edges) {
            nonZerosToProcess.push(edge);
            /* OK TO DELETE
            initialRevealedStates[edge.x][edge.y] = true;

            let cng = initialChainNeighbourhoodGrid[edge.x][edge.y];
            if (isFloating) {
              cng.floating.includes(currentChainId) || cng.floating.push(currentChainId);
            } else {
              cng.fixed.includes(currentChainId) || cng.fixed.push(currentChainId);
            }

            let left = moveGrid[edge.x][edge.y].left;
            let chord = moveGrid[edge.x][edge.y].chord;

            if (isFloating) {
              if (left) {
                //smothered or multi-seeded chain remove
                leftClickPool.delete(left);
              }
              if (chord) {
                if (chordPool.has(chord)) {
                  //New chord found, so push it to be added later
                  chordsToDo.push(chord);
                  chordPool.delete(chord);
                }
              }
            } else {
              //Fixed chain. If smothered, then leave it, if multi-seed, then track it
              if (chord && !left) {
                if (chordPool.has(chord)) {
                  //New chord found, so push it to be added later
                  chordsToDo.push(chord);
                  chordPool.delete(chord);
                }
              }

              if (chord && left) {
                //Add seed if not already added
                leftClickPool.delete(left); //Possibly already deleted, but it's ok
                if (!seedsIfFixed.some(s => s.x === left.x && s.y === left.y)) {
                  seedsIfFixed.push({
                    x: left.x,
                    y: left.y
                  });
                }

                //Also add new chord
                if (chordPool.has(chord)) {
                  //New chord found, so push it to be added later
                  chordsToDo.push(chord);
                  chordPool.delete(chord);
                }
              }

              if (!chord && left) {
                //Smothered click
                //Just delete and leave it to be processed later through unchordedDigs
                if (leftClickPool.has(left)) {
                  unchordedDigNonZerosToProcess.push(left);
                  leftClickPool.delete(left);
                }
              }
            }
            */
          }
        }

        //Add surrounding 8 squares to be processed
        for (let neighbour of thisChordInfo.safeNeighbours) {
          if (numbersArray[neighbour.x][neighbour.y] !== 0) {
            nonZerosToProcess.push(neighbour);
          }
        }

        for (let nonZero of nonZerosToProcess) {
          initialRevealedStates[nonZero.x][nonZero.y] = true;

          let cng = initialChainNeighbourhoodGrid[nonZero.x][nonZero.y];
          if (isFloating) {
            cng.floating.includes(currentChainId) || cng.floating.push(currentChainId);
          } else {
            cng.fixed.includes(currentChainId) || cng.fixed.push(currentChainId);
          }

          let left = moveGrid[nonZero.x][nonZero.y].left;
          let chord = moveGrid[nonZero.x][nonZero.y].chord;

          if (isFloating) {
            if (left) {
              //smothered or multi-seeded chain remove
              leftClickPool.delete(left);
            }
            if (chord) {
              if (chordPool.has(chord)) {
                //New chord found, so push it to be added later
                chordsToDo.push(chord);
                chordPool.delete(chord);
              }
            }
          } else {
            //Fixed chain. If smothered, then leave it, if multi-seed, then track it
            if (chord && !left) {
              if (chordPool.has(chord)) {
                //New chord found, so push it to be added later
                chordsToDo.push(chord);
                chordPool.delete(chord);
              }
            }

            if (chord && left) {
              //Add seed if not already added
              leftClickPool.delete(left); //Possibly already deleted, but it's ok
              if (!seedsIfFixed.some(s => s.x === left.x && s.y === left.y)) {
                seedsIfFixed.push({
                  x: left.x,
                  y: left.y
                });
              }

              //Also add new chord
              if (chordPool.has(chord)) {
                //New chord found, so push it to be added later
                chordsToDo.push(chord);
                chordPool.delete(chord);
              }
            }

            if (!chord && left) {
              //Smothered click
              //Just delete and leave it to be processed later through unchordedDigs
              if (leftClickPool.has(left)) {
                unchordedDigNonZerosToProcess.push(left);
                leftClickPool.delete(left);
              }
            }
          }
        }
      }

      if (!isFloating) {
        newChain.seedLocationsIfFixed = seedsIfFixed;
      }

      initialChainMap.set(currentChainId, newChain);
      currentChainId++;
    }

    //Deal with unchordedDigs (if floating, some may need to be removed)
    //Go through zeros first incase these smother any single square digs
    let unchordedDigsToProcess = [...unchordedDigZerosToProcess, ...unchordedDigNonZerosToProcess];
    for (let unchordedDig of unchordedDigsToProcess) {
      if (isFloating && initialRevealedStates[unchordedDig.x][unchordedDig.y]) {
        //Smothered floating click, so leave it out
        continue;
      }

      initialRevealedStates[unchordedDig.x][unchordedDig.y] = true;
      if (numbersArray[unchordedDig.x][unchordedDig.y] === 0) {
        //unchordedDig is an opening. Open it.
        let openingLabel = openingLabels[unchordedDig.x][unchordedDig.y]
        let thisOpening = preprocessedOpenings.get(openingLabel);
        for (let zero of thisOpening.zeros) {
          initialRevealedStates[zero.x][zero.y] = true;
        }
        for (let edge of thisOpening.edges) {
          initialRevealedStates[edge.x][edge.y] = true;
        }
      }

      initialChainIds[unchordedDig.x][unchordedDig.y] = currentChainId;

      let newChain = new Chain();
      if (isFloating) {
        newChain.isFloatingSeed = true;
      } else {
        newChain.isFloatingSeed = false;
      }

      newChain.isUnchordedDig = true;
      //newChain.addToPath(unchordedDig.x, unchordedDig.y); //Commented out as we use positionIfUnchorded instead
      newChain.positionIfUnchordedDig = { x: unchordedDig.x, y: unchordedDig.y };

      if (!isFloating) {
        newChain.seedLocationsIfFixed = [{ x: unchordedDig.x, y: unchordedDig.y }];
      }
      initialChainMap.set(currentChainId, newChain);

      /////// update chainNeighbourhoodGrid
      //If floating, then include for neighbours, as it's smotherable
      //Note that we assume floating it's mergable, since it would've been smothered before
      //If fixed, then include for self, since if chorded it may be mergable

      if (isFloating) {
        const unchordedChainInfo = chainSquareInfo[unchordedDig.x][unchordedDig.y];
        for (let openingTouched of unchordedChainInfo.openingsTouched) {
          let thisOpening = preprocessedOpenings.get(openingTouched);
          for (let edge of thisOpening.edges) {
            const cng = initialChainNeighbourhoodGrid[edge.x][edge.y];
            cng.floating.includes(currentChainId) || cng.floating.push(currentChainId);
          }
        }
        for (let safeNeighbour of unchordedChainInfo.safeNeighbours) {
          if (numbersArray[safeNeighbour.x][safeNeighbour.y] !== 0) {
            const cng = initialChainNeighbourhoodGrid[safeNeighbour.x][safeNeighbour.y];
            cng.floating.includes(currentChainId) || cng.floating.push(currentChainId);
          }
        }

        //special case - unchordedDig is opening. Edges can smother it
        if (numbersArray[unchordedDig.x][unchordedDig.y] === 0) {
          let openingLabel = openingLabels[unchordedDig.x][unchordedDig.y]
          let thisOpening = preprocessedOpenings.get(openingLabel);
          for (let edge of thisOpening.edges) {
            const cng = initialChainNeighbourhoodGrid[edge.x][edge.y];
            cng.floating.includes(currentChainId) || cng.floating.push(currentChainId);
          }
        }

        //Also neighbours itself (as long as not zero)
        if (numbersArray[unchordedDig.x][unchordedDig.y] !== 0) {
          const ncng = initialChainNeighbourhoodGrid[unchordedDig.x][unchordedDig.y];
          ncng.floating.includes(currentChainId) || ncng.floating.push(currentChainId);
        }
      } else {
        if (numbersArray[unchordedDig.x][unchordedDig.y] !== 0) {
          //Fixed unchordedDig neighbours itself (since new chain can start on-top of it)
          const cng = initialChainNeighbourhoodGrid[unchordedDig.x][unchordedDig.y];
          cng.fixed.includes(currentChainId) || cng.fixed.push(currentChainId);
        } else {
          //If it's an opening then it neighbours edges as the chain can continue there
          let openingLabel = openingLabels[unchordedDig.x][unchordedDig.y]
          let thisOpening = preprocessedOpenings.get(openingLabel);
          for (let edge of thisOpening.edges) {
            const cng = initialChainNeighbourhoodGrid[edge.x][edge.y];
            cng.fixed.includes(currentChainId) || cng.fixed.push(currentChainId);
          }
        }
      }
      //End update chainNeighbourhoodGrid

      currentChainId++;
    }

    return {
      initialRevealedStates,
      initialFlagStates,
      initialChainIds,
      initialChainMap,
      initialChainNeighbourhoodGrid
    }
  }

  static cloneChainMap(chainMap) {
    let replicaMap = new Map();
    for (const [key, value] of chainMap) {
      replicaMap.set(key, value.cloneChain());
    }

    return replicaMap;
  }

  static cloneChainNeighbourhoodGrid(chainNeighbourhoodGrid) {
    return chainNeighbourhoodGrid.map(col => col.map(cell => {
      return {
        floating: cell.floating.slice(),
        fixed: cell.fixed.slice()
      }
    }));
  }
}

//Chain class represents a path of chords
//We may include info about the seeds of the chain (where they are, are they locked, does it have multiple seeds)
//We may also also for a chain to be unchorded, if it represents a single left click
class Chain {
  constructor() {
    this.path = [];
    this.isFloatingSeed = true; //Easiest case where there is a single floating seed
    this.seedLocationsIfFixed = []; //Array of {x: ..., y: ...} coords of seeds if the locations are fixed

    this.isUnchordedDig = false; //If this is a single left click
    this.positionIfUnchordedDig = false; // {x: ..., y: ...} coords if it is a single left click

    this.openingsTouched = []; //track which openings this chord chain touches as these don't need to be reprocessed when expanded
  }

  addToPath(x, y) {
    this.path.push({ x, y })
  }

  addOpeningTouched(openingId) {
    this.openingsTouched.includes(openingId) || this.openingsTouched.push(openingId);
  }

  mergeWithPath(arr) {
    this.path = this.path.concat(arr);
  }

  mergeWithOpeningsTouched(arr) {
    for (let openingId of arr) {
      this.openingsTouched.includes(openingId) || this.openingsTouched.push(openingId);
    }
  }

  getClickCount() {
    //Note - be careful with openings?
    if (this.isUnchordedDig) {
      return 1;
    }

    if (this.isFloatingSeed) {
      return this.path.length + 1;
    } else {
      return this.path.length + this.seedLocationsIfFixed.length;
    }
  }

  cloneChain() {
    let replicaChain = new Chain();
    replicaChain.path = this.path.map(el => { return { x: el.x, y: el.y } });
    replicaChain.isFloatingSeed = this.isFloatingSeed;
    replicaChain.seedLocationsIfFixed = this.seedLocationsIfFixed.map(el => { return { x: el.x, y: el.y } });
    replicaChain.isUnchordedDig = this.isUnchordedDig;
    replicaChain.positionIfUnchordedDig = this.positionIfUnchordedDig;
    replicaChain.openingsTouched = this.openingsTouched.slice();
    return replicaChain;
  }
}

class PriorityGridCreator {
  constructor() {
    throw new Error('PriorityGridCreator class only has static methods, and cannot be instantiated')
  }

  //High priority = prefer this square
  //By default, we prefer topmost and then leftmost
  static createBasic(width, height) {
    let priorityGrid = [];

    for (let x = 0; x < width; x++) {
      priorityGrid[x] = [];

      for (let y = 0; y < height; y++) {
        priorityGrid[x][y] = (width * height) - (y * width + x);
      }
    }

    return priorityGrid;
  }

  static createRandom(width, height, rng = false) {
    //rng is either the funciton we use for seeded rng, or false to use Math.random()
    let flatPriorities = new Array(width * height).fill(0).map((v, i) => i + 1);

    //Shuffle it
    Algorithms.fisherYatesArrayShuffle(flatPriorities, rng);

    //Generate width x height 2D array
    const priorityGrid = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    let flatIndex = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        priorityGrid[x][y] = flatPriorities[flatIndex];
        flatIndex++;
      }
    }

    return priorityGrid;
  }

  static createBulkRandom(width, height, numberOfGrids, useSeededRng) {
    let rng = false;
    if (useSeededRng) {
      //Seed with number of grids, since that makes it easier to test things with different grids
      rng = seedrandom(numberOfGrids);
    }

    let priorityGrids = [];
    for (let i = 0; i < numberOfGrids; i++) {
      priorityGrids[i] = PriorityGridCreator.createRandom(width, height, rng);
    }

    return priorityGrids;
  }
}

export default ChainZini;