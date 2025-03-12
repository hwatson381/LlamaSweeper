import Algorithms from "./Algorithms";
import PriorityPremiums from "./PriorityPremiums";

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
    priorityGrids = false,
    returnAllZinis = false,
    includeClickPath = false
  }) {
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
    let flagStates;
    if (initialFlagStates) {
      flagStates = initialFlagStates
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
      nextChainId = Math.max(0, Math.max(0, ...myMap.keys())) + 1;
    } else {
      chainMap = new Map();
      nextChainId = 0;
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
          chainMap
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

    for (let i = 0; i < priorityGrids.length; i++) {
      let priorityGrid = priorityGrids[i];
      //Take copies of variables that track board state as they need to be re-initialised for each priority grid
      const thisEnumerationChainIds = Algorithms.fast2dArrayCopy(chainIds);
      const thisEnumerationChainMap = this.cloneChainMap(chainMap);
      const thisEnumerationFlagStates = Algorithms.fast2dArrayCopy(flagStates);
      const thisEnumerationRevealedStates =
        Algorithms.fast2dArrayCopy(revealedStates);
      const thisEnumerationChainPremiums = Algorithms.fast2dArrayCopy(chainPremiums);
      let squaresSolvedThisRun = 0;
      let flagsPlacedThisRun = 0;
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
          thisEnumerationPriorityPremiums,
          nextChainRef
        );
        squaresSolvedThisRun += chainZiniStepResult.newlyRevealed;
        flagsPlacedThisRun += chainZiniStepResult.flagsPlaced;

        if (chainZiniStepResult.onlyNFRemaining) {
          needToDoNFClicks = true;
          break;
        }
      }

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

      let clicksForThisEnumeration = flagsPlacedThisRun;
      for (let chain of thisEnumerationChainMap.values()) {
        //This is scuffed as chains may include previous chains
        //Whereas flags includes new flags
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
        chainSquareInfo: chainSquareInfo
      });
    }

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

        //Figure out chain neighbours
        if (numbersArray[x][y] === 0) {
          //For zeros, just leave empty as these can't be chorded (it's complicated)
        } else {
          //For number squares, include the edges that would come from the openings it reveals
          //As well as the normal surrounding squares
          thisSquare.chainNeighbours = thisSquare.safeNeighbours.map(s => { return { x: s.x, y: s.y } })
          for (let openingLabel of thisSquare.openingsTouched) {
            const thisOpening = preprocessedOpenings.get(openingLabel);
            for (let edge of thisOpening.edges) {
              if (edge.x === x && edge.y === y) {
                continue;
              } else if (thisSquare.chainNeighbours.some(n => n.x === edge.x && n.y === edge.y)) {
                //Don't add neighbours multiple times
                continue;
              } else {
                thisSquare.chainNeighbours.push({ x: edge.x, y: edge.y })
              }
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

    const adjacentUnrevealedNonOpening3bv =
      thisSquare.nonOpening3bvNeighbours.filter(
        (neighbour) => !revealedStates[neighbour.x][neighbour.y]
      ).length;

    const adjacentUnrevealedOpenings = [...thisSquare.openingsTouched].filter(
      (openingLabel) => {
        //Find a zero tile in the opening and check whether this is revealed or not
        const zeroBelongingToOpening =
          preprocessedOpenings.get(openingLabel).zeros[0];
        return !revealedStates[zeroBelongingToOpening.x][
          zeroBelongingToOpening.y
        ];
      }
    ).length;

    const bbbvOpenedWithChord =
      adjacentUnrevealedNonOpening3bv + adjacentUnrevealedOpenings;

    const unflaggedAdjacentMines = thisSquare.mineNeighbours.filter(
      (neighbour) => !flagStates[neighbour.x][neighbour.y]
    ).length;

    //Note - the original forum post for zini has premium = [adjacent 3bv] - [adjacent unflagged mines] - 1_[if cell is closed] - 1
    //I believe this is either wrong or misleading. Since we have a term "- 1_[if cell is closed]". Since we are still tied for clicks saved if the cell needs to be revealed first, with the only exception being if the cell we are click on is not 3bv.
    let penaltyForFirstClick = 0;
    if (!thisSquare.is3bv && !revealedStates[x][y]) {
      penaltyForFirstClick = 1;
    }

    //Look at chain merge possiblities

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

    let adjustmentForChainsMerged = 0;
    let mergeable = totalFloatingSeededNeighbourChains + Math.min(totalFixedSeededNeighbourChains, 1);
    if (mergeable >= 2) {
      adjustmentForChainsMerged += mergeable - 1;
    }
    if (checkForSelfSmothering && totalFloatingSeededNeighbourChains > 1 && totalFixedSeededNeighbourChains === 0) {
      adjustmentForChainsMerged += 1
    }
    adjustmentForChainsMerged += totalSmotherableDigs;

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
      chainIds[smotheredChain.x][smotheredChain.y] = null;
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

    //Update premiums
    for (let square of squaresThatNeedPremiumUpdated) {
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
        priorityPremiums
      );
    }

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
        newSingleDigChain.addToPath(x, y);
        newSingleDigChain.isUnchordedDig = true;
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
          }
        }
      }
    }
  }

  static convertSolutionToClickPath({
    chainIds,
    chainMap,
    mines,
    chainSquareInfo
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
        clickPath.push({ type: 'left', x: chain.path[0].x, y: chain.path[0].y })
        chordableSquares[chain.path[0].x][chain.path[0].y] = true;
      } else {
        for (let fixedSeed of chain.seedLocationsIfFixed) {
          clickPath.push({ type: 'left', x: fixedSeed.x, y: fixedSeed.y });
          chordableSquares[fixedSeed.x][fixedSeed.y] = true;
        }
      }

      if (chain.isUnchordedDig) {
        //Not chorded, so no more clicks to do
        return;
      }

      let chordsToDo = [...chain.path];

      while (chordsToDo.length !== 0) {
        //Find chords that can be played
        let playableChords = chordsToDo.filter((ch) => chordableSquares[ch.x][ch.y]);

        //Play the chord and mark all consequential squares as playable
        for (let pc of playableChords) {
          //Check for surrounding flags
          for (let x = pc.x - 1; x < pc.x + 1; x++) {
            for (let y = pc.y - 1; y < pc.y + 1; y++) {
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
          for (let cn of chainSquareInfo[pc.x][pc.y].chainNeighbours) {
            chordableSquares[cn.x][cn.y] = true;
          }
        }

        //Remove played chords from the list of chords left to do
        chordsToDo = chordsToDo.filter(cd => !playableChords.includes(cd));
      }
    }

    return clickPath;
  }

  static cloneChainMap(chainMap) {
    let replicaMap = new Map();
    for (const [key, value] of chainMap) {
      replicaMap.set(key, value.cloneChain());
    }

    return replicaMap;
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
  }

  addToPath(x, y) {
    this.path.push({ x, y })
  }

  mergeWithPath(arr) {
    this.path = this.path.concat(arr);
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
    replicaChain.isUnchordedDig = this.isUnchordedDig
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

  static createRandom(width, height, seed) {
    let flatPriorities = new Array(width * height).fill(0).map((v, i) => i + 1);

    //Shuffle it
    Algorithms.fisherYatesArrayShuffle(flatPriorities);

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
}

export default ChainZini;