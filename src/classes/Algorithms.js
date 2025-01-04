import OrganisedPremiums from "src/classes/OrganisedPremiums.js";

class Algorithms {
  constructor() { }

  calcBasicZini(mines, is8Way, preprocessedData = false) {
    //PreprocessedData is the result from algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines)
    //Which means that we don't have to run that function multiple times

    //Get various data structures which information about numbers and openings
    if (!preprocessedData) {
      preprocessedData =
        this.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
          mines
        );
    }

    const { numbersArray, openingLabels, preprocessedOpenings } =
      preprocessedData;

    const width = mines.length;
    const height = mines[0].length;

    //false for unrevealed, true for revealed
    const revealedStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    //false for unflagged, true for flagged
    const flagStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

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

    //store premiums of opening + chording each cell
    const premiums = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          continue;
        }
        this.updatePremiumForCoord(
          x,
          y,
          squareInfo,
          flagStates,
          revealedStates,
          premiums,
          preprocessedOpenings
        );
      }
    }

    //Work out how many squares need to be revealed for it to be solved (will typically be width * height - mines, but we may add the option to calc zini from current board state in future)
    let revealedSquaresToSolve = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!mines[x][y] && !revealedStates[x][y]) {
          revealedSquaresToSolve++;
        }
      }
    }

    //Set up is done, so now prepare to do zini iterations (find best cell, update premiums, repeat)
    let enumerationsOrders;
    if (is8Way) {
      enumerationsOrders = [
        [false, false, false],
        [true, false, false],
        [false, true, false],
        [true, true, false],
        [false, false, true],
        [true, false, true],
        [false, true, true],
        [true, true, true],
      ];
    } else {
      enumerationsOrders = [[false, false, false]];
    }

    let currentZiniValue = Infinity; //Set to the best zini we've found so far
    let currentClicksArray = null; //Set to the clicks array of the best zini solution we've found so far

    for (const enumeration of enumerationsOrders) {
      //Take copies of variable that track board state as they need to be re-initialised for each zini direction
      const thisEnumerationClicks = []; //Track clicks that get done by ZiNi
      const thisEnumerationFlagStates = this.fast2dArrayCopy(flagStates);
      const thisEnumerationRevealedStates =
        this.fast2dArrayCopy(revealedStates);
      const thisEnumerationPremiums = this.fast2dArrayCopy(premiums);
      let squaresSolvedThisRun = 0;
      let thisEnumerationOrganisedPremiums = false;

      thisEnumerationOrganisedPremiums = new OrganisedPremiums(
        enumeration[0],
        enumeration[1],
        enumeration[2],
        width,
        height,
        true
      );

      //Initialise based on premiums
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (mines[x][y]) {
            continue;
          }
          thisEnumerationOrganisedPremiums.lazyAddPremium(x, y, premiums[x][y]);
        }
      }
      thisEnumerationOrganisedPremiums.sortAfterLazyAdd();

      let needToDoNFClicks = false;
      while (squaresSolvedThisRun !== revealedSquaresToSolve) {
        let basicZiniStepResult = this.doBasicZiniStep(
          squareInfo,
          thisEnumerationFlagStates,
          thisEnumerationRevealedStates,
          thisEnumerationPremiums,
          preprocessedOpenings,
          thisEnumerationClicks,
          enumeration[0], //iterate x coord in diff order
          enumeration[1], //iterate y coord in diff order
          enumeration[2], //affects whether we iterate x or y first
          thisEnumerationOrganisedPremiums
        );
        squaresSolvedThisRun += basicZiniStepResult.newlyRevealed;

        if (basicZiniStepResult.onlyNFRemaining) {
          needToDoNFClicks = true;
          break;
        }
      }

      if (needToDoNFClicks) {
        this.nfClickEverythingForZini(
          squareInfo,
          thisEnumerationRevealedStates,
          preprocessedOpenings,
          thisEnumerationClicks
        );
      }

      if (thisEnumerationClicks.length < currentZiniValue) {
        currentZiniValue = thisEnumerationClicks.length;
        currentClicksArray = thisEnumerationClicks;
      }
    }

    return currentZiniValue; //Consider also returning currentClicksArray
  }

  doBasicZiniStep(
    squareInfo,
    flagStates,
    revealedStates,
    premiums,
    preprocessedOpenings,
    clicks,
    xReverse, //If true, prefer the premium with higher x coord
    yReverse, //If true, prefer the premium with higher y coord
    xySwap, //If true, use y in outer loop instead of x,
    organisedPremiums = false //Optimised data structure for storing premiums and retrieving the highest one that is earliest in iteration order
  ) {
    const width = revealedStates.length;
    const height = revealedStates[0].length;
    let squaresRevealedDuringStep = 0;

    //Find move with highest premium
    let highestPremiumSoFar = -1; //Default to -1 as if all premiums negative we need to click a square
    let nfClick = null; //This is the first square in the enumeration, which we nf click if no chords are found
    let chordClick = null; //This is our candidate square for chording

    if (!organisedPremiums) {
      //Set up enumeration order
      const xStart = xReverse ? width - 1 : 0;
      const xEnd = xReverse ? 0 : width - 1;
      const yStart = yReverse ? height - 1 : 0;
      const yEnd = yReverse ? 0 : height - 1;
      const iStart = xySwap ? yStart : xStart;
      const iEnd = xySwap ? yEnd : xEnd;
      const jStart = xySwap ? xStart : yStart;
      const jEnd = xySwap ? xEnd : yEnd;
      const iReverse = xySwap ? yReverse : xReverse;
      const jReverse = xySwap ? xReverse : yReverse;

      for (
        let i = iStart;
        iReverse ? i >= 0 : i <= iEnd;
        iReverse ? i-- : i++
      ) {
        for (
          let j = jStart;
          jReverse ? j >= 0 : j <= jEnd;
          jReverse ? j-- : j++
        ) {
          const [x, y] = xySwap ? [j, i] : [i, j];
          const thisSquare = squareInfo[x][y];
          if (thisSquare.isMine) {
            continue;
          }
          if (nfClick === null && thisSquare.is3bv) {
            //First square enumerated over becomes nfClick
            if (!revealedStates[x][y]) {
              nfClick = { x, y };
            }
          }
          if (highestPremiumSoFar < premiums[x][y]) {
            highestPremiumSoFar = premiums[x][y];
            chordClick = { x, y };
          }
        }
      }
    } else {
      //Use organised premiums to quickly find the best premium

      const { x, y, premium } = organisedPremiums.getHighestPremium();
      chordClick = { x, y };
      highestPremiumSoFar = premium;
    }

    //We've found a good move, now do it and update things. The move will either be an nf click or a chord.
    if (organisedPremiums && highestPremiumSoFar <= -1) {
      //Exit early as everything left will be NF clicks
      return { newlyRevealed: 0, onlyNFRemaining: true };
    }

    //Track squares that will need premium update after doing the nf click or chord
    let squaresThatNeedPremiumUpdated = [];

    if (chordClick === null) {
      ///////////////////////////
      //DOING AN NF CLICK
      ///////////////////////////

      //No chord, try nf click
      if (nfClick === null) {
        throw new Error("No chords or NF clicks found?");
      }
      if (revealedStates[nfClick.x][nfClick.y]) {
        throw new Error("Square already revealed? Should never happen");
      }
      clicks.push({ type: "left", x: nfClick.x, y: nfClick.y });
      revealedStates[nfClick.x][nfClick.y] = true;
      squaresRevealedDuringStep++;

      //Update premiums of neighbour cells as they may go down if this is a 3bv cell
      for (let safeNeighbour of squareInfo[nfClick.x][nfClick.y]
        .safeNeighbours) {
        squaresThatNeedPremiumUpdated.push({
          x: safeNeighbour.x,
          y: safeNeighbour.y,
        });
      }

      //Also handle if this square is an opening. Both opening the squares and also requesting them to have premiums updated
      const labelIfOpening = squareInfo[nfClick.x][nfClick.y].labelIfOpening;
      if (labelIfOpening !== null) {
        const opening = preprocessedOpenings.get(labelIfOpening);
        for (let zero of opening.zeros) {
          if (!revealedStates[zero.x][zero.y]) {
            revealedStates[zero.x][zero.y] = true;
            squaresRevealedDuringStep++;
          }
          squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
        }
        for (let edge of opening.edges) {
          if (!revealedStates[edge.x][edge.y]) {
            revealedStates[edge.x][edge.y] = true;
            squaresRevealedDuringStep++;
          }
          squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
        }
      }
    } else {
      ///////////////////////////
      //DOING A CHORD
      ///////////////////////////
      const thisSquare = squareInfo[chordClick.x][chordClick.y];

      const unflaggedAdjacentMines = thisSquare.mineNeighbours.filter(
        (neighbour) => !flagStates[neighbour.x][neighbour.y]
      );

      //If we need to NF click first then we should do so
      if (!revealedStates[chordClick.x][chordClick.y]) {
        clicks.push({ type: "left", x: chordClick.x, y: chordClick.y });
        revealedStates[chordClick.x][chordClick.y] = true;
        squaresRevealedDuringStep++;
      }

      //Place flags
      for (let unflaggedMine of unflaggedAdjacentMines) {
        clicks.push({ type: "right", x: unflaggedMine.x, y: unflaggedMine.y });
        flagStates[unflaggedMine.x][unflaggedMine.y] = true;
      }

      //Do the click for the chord
      clicks.push({ type: "chord", x: chordClick.x, y: chordClick.y });

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
          squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
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
      this.updatePremiumForCoord(
        square.x,
        square.y,
        squareInfo,
        flagStates,
        revealedStates,
        premiums,
        preprocessedOpenings,
        organisedPremiums //may be false in which case updatePremiumForCoord will ignore it
      );
    }

    return { newlyRevealed: squaresRevealedDuringStep, onlyNFRemaining: false };
  }

  nfClickEverythingForZini(
    squareInfo,
    revealedStates,
    preprocessedOpenings,
    clicks
  ) {
    const width = revealedStates.length;
    const height = revealedStates[0].length;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const thisSquare = squareInfo[x][y];
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

        clicks.push({ type: "left", x: x, y: y });
        revealedStates[x][y] = true;

        //Open connected squares if this is an opening
        const labelIfOpening = squareInfo[x][y].labelIfOpening;
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

  //preprocessedData is the result from algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines)
  //Which means that we don't have to run that function multiple times
  calcWomZini(mines, preprocessedData = false) {
    //WoM zini is really (NOT) 8-way zini
    const is8Way = true;

    return this.calcBasicZini(mines, is8Way, preprocessedData);
  }

  updatePremiumForCoord(
    x,
    y,
    squareInfo,
    flagStates,
    revealedStates,
    premiums,
    preprocessedOpenings,
    organisedPremiums = false
  ) {
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

    const thisSquare = squareInfo[x][y];
    if (thisSquare.isMine) {
      //Exit early if this square is a mine as it makes no sense to do premiums for this
      return;
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

    const clicksSaved =
      bbbvOpenedWithChord - unflaggedAdjacentMines - 1 - penaltyForFirstClick;

    if (organisedPremiums) {
      //Also save premium to organised premiums assuming it is available
      organisedPremiums.updatePremium(x, y, premiums[x][y], clicksSaved);
    }
    premiums[x][y] = clicksSaved;
  }

  //Returns an object with three structures
  //Numbers array gives the numbers of each cell.
  //OpeningLabels tracks which squares are part of the same openings or on opening edges.
  //Preprocessed openings tracks which squares are the edge and inside of openings
  getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines) {
    const width = mines.length;
    const height = mines[0].length;

    const numbersArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    //Populate which numbers squares have. Slightly more efficient to loop over and find mines and increment neighbours since mines are usually rare
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!mines[x][y]) {
          continue;
        }
        numbersArray[x][y] = "x";
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (mines[i]?.[j] === false) {
              numbersArray[i][j]++;
            }
          }
        }
      }
    }
    //Generate grid with labelled openings. Like
    /*
      11+00x
      1++x++
      1+x0+2

      In this grid, 1's are part of the first opening, 2's are part of the 2nd opening.
      0s are not part of any opening, +'s are on the edge of an opening, x's are mines.
    */
    let openingLabels = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    let nextOpeningLabel = 0;

    //At same time also populate preprocessedOpenings

    //Initialise map for preprocessedOpenings
    /*
      It has the below form:
      opening label number
       =>
      {
        zeros: [], //Which coords in this opening have zeros
        edges: [], //Which coords are on the edge of this opening
      }
    */
    const preprocessedOpenings = new Map();

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          openingLabels[x][y] = "x";
          continue;
        }

        if (numbersArray[x][y] === 0 && openingLabels[x][y] === 0) {
          nextOpeningLabel++;
          let thisOpening = {
            zeros: [], //Which coords in this opening have zeros
            edges: [], //Which coords are on the edge of this opening
          };
          preprocessedOpenings.set(nextOpeningLabel, thisOpening);
          this.floodOpeningForProcessing(
            x,
            y,
            mines,
            openingLabels,
            numbersArray,
            preprocessedOpenings,
            nextOpeningLabel
          );
        }
      }
    }

    return {
      numbersArray,
      openingLabels,
      preprocessedOpenings,
    };
  }

  floodOpeningForProcessing(
    x,
    y,
    mines,
    openingLabels,
    numbersArray,
    preprocessedOpenings,
    newLabel
  ) {
    if (openingLabels[x]?.[y] === undefined) {
      //Square outside board
      return;
    }
    if (openingLabels[x][y] === newLabel) {
      //Square has already been included in this opening
      return;
    }

    if (numbersArray[x][y] !== 0) {
      openingLabels[x][y] = "+"; //Squares that are on the edge of an opening
      //Also add as an edge to preprocessedOpenings
      const preprocessedOpening = preprocessedOpenings.get(newLabel);
      //Add to edges of the opening provided it hasn't already been included
      if (
        !preprocessedOpening.edges.some(
          (edgeSquare) => edgeSquare.x === x && edgeSquare.y === y
        )
      ) {
        preprocessedOpening.edges.push({ x, y });
      }

      return;
    } else if (numbersArray[x][y] === 0) {
      openingLabels[x][y] = newLabel;
      const preprocessedOpening = preprocessedOpenings.get(newLabel);
      preprocessedOpening.zeros.push({ x, y });
      //Flood square
      this.floodOpeningForProcessing(
        x - 1,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x - 1,
        y,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x - 1,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x + 1,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x + 1,
        y,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x + 1,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
    }
  }

  calc3bv(mines, revealedNumbers = false, preprocessedData = false) {
    // Basic idea = generate grid of numbers
    // Do flood fill with the zeros - this will label openings and find which squares touch which openings
    // Maybe can reuse openings in zini calc? (Or not needed?)

    const width = mines.length;
    const height = mines[0].length;

    let openingLabels;
    if (preprocessedData) {
      openingLabels = preprocessedData.openingLabels;
    } else {
      openingLabels =
        this.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
          mines
        ).openingLabels;
    }

    //Find total number of openings. Each opening is labeled with a non-zero number, so we count up the number of unique opening labels
    const totalNumberOfOpenings = new Set(
      openingLabels.flat().filter((el) => typeof el === "number" && el !== 0)
    ).size;

    const totalNumberOfProtectedSquares = openingLabels
      .flat()
      .filter((el) => el === 0).length;

    let bbbv = totalNumberOfOpenings + totalNumberOfProtectedSquares;

    let solved3bv = 0;

    //Only calculate solved 3bv if we have the array of revealed numbers
    if (revealedNumbers) {
      //Calculate solved 3bv for when it's a lost game
      //Scuffed as this includes openings that have not been fully opened
      //and tiles that were solved from blasted chord

      let solvedProtectedSquares = 0;
      let solvedOpenings = new Set();
      //^ Add openings to this set if there is a cell of them opened
      //Slightly scuffed since this also captures partially opened openings
      //But not worth the effort of trying to catch these

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (typeof revealedNumbers[x][y].state !== "number") {
            //Tile has not been opened, so don't include in solved 3bv
            continue;
          }
          if (openingLabels[x][y] === 0) {
            solvedProtectedSquares++;
          } else if (typeof openingLabels[x][y] === "number") {
            solvedOpenings.add(openingLabels[x][y]); //Add the opening to the set as we've seen a zero tile from it
          }
        }
      }

      solved3bv = solvedProtectedSquares + solvedOpenings.size;
    }

    return {
      bbbv,
      solved3bv,
    };
  }

  fast2dArrayCopy(toBeCopied) {
    //shallow copy for 2d arrays
    return toBeCopied.map((arr) => arr.slice());
  }

  fisherYatesArrayShuffle(arr) {
    //https://stackoverflow.com/questions/59810241/how-to-fisher-yates-shuffle-a-javascript-array
    var i = arr.length,
      j,
      temp;
    while (--i > 0) {
      j = Math.floor(Math.random() * (i + 1));
      temp = arr[j];
      arr[j] = arr[i];
      arr[i] = temp;
    }
  }

  basicShuffle(
    width,
    height,
    mineCount,
    safeCoord = null,
    isOpening = false
  ) {
    let knownSafes = [];
    if (safeCoord) {
      knownSafes.push({ x: safeCoord.x, y: safeCoord.y });
      if (isOpening) {
        for (let x = safeCoord.x - 1; x <= safeCoord.x + 1; x++) {
          for (let y = safeCoord.y - 1; y <= safeCoord.y + 1; y++) {
            if (x === safeCoord.x && y === safeCoord.y) {
              continue;
            }
            if (x >= 0 && x <= width - 1 && y >= 0 && y <= height - 1) {
              knownSafes.push({ x, y });
            }
          }
        }
      }
    }

    if (width * height - knownSafes.length < mineCount) {
      if (width * height - 1 >= mineCount) {
        knownSafes = [{ x: safeCoord.x, y: safeCoord.y }]; //Board too dense, so try remove condition about opening start
      } else {
        throw new Error(`Cannot generate ${width}x${height}/${mineCount}`);
      }
    }

    const flatMinesWithoutKnownSafes = new Array(
      width * height - knownSafes.length
    ).fill(false);

    for (let i = 0; i < mineCount; i++) {
      flatMinesWithoutKnownSafes[i] = true;
    }
    this.fisherYatesArrayShuffle(flatMinesWithoutKnownSafes);

    //Generate width x height 2D array
    const minesArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    let flatIndex = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (knownSafes.some((square) => square.x === x && square.y === y)) {
          continue; //False/safe by default as that's how we initialised
        }
        minesArray[x][y] = flatMinesWithoutKnownSafes[flatIndex];
        flatIndex++;
      }
    }

    return minesArray;
  }

  effBoardShuffle(
    width,
    height,
    mineCount,
    firstClick,
    targetEff,
    timeoutSeconds //How many seconds we have to generate the board
  ) {
    const startTime = performance.now();

    let minesArray = false;

    let attempts = 0;
    let passedFirstCheck = 0;

    while (!minesArray) {
      if (performance.now() - startTime > timeoutSeconds * 1000) {
        //console.log(`effBoardShuffle had ${attempts}`);
        return false; //Failed to generate a board in time
      }

      let candidateMinesArray = this.basicShuffle(
        width,
        height,
        mineCount,
        firstClick,
        true //First click is an opening
      );

      //Needed for performance as this is used by both 3bv and zini, but is expensive to calculate
      let preprocessedData =
        this.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
          candidateMinesArray
        );

      const bbbv = this.calc3bv(
        candidateMinesArray,
        false,
        preprocessedData
      ).bbbv;

      const oneWayZini = this.calcBasicZini(
        candidateMinesArray,
        false, //one-way
        preprocessedData
      );

      //If saving 1.15x as many clicks as one-way zini (plus 2 more) would exceed the goal then investigate further (by checking 8-way zini)
      if (
        bbbv / (bbbv - (bbbv - oneWayZini) * 1.15 - 2) >=
        targetEff / 100
      ) {
        passedFirstCheck++;

        const eightWayZini = this.calcBasicZini(
          candidateMinesArray,
          true, //eight-way
          preprocessedData
        );

        if (bbbv / eightWayZini >= targetEff / 100) {
          //Successfully found a board with at least min eff
          minesArray = candidateMinesArray;
        }
      }

      attempts++;
    }

    /*console.log(
      `effBoardShuffle had ${attempts} attempts. ${passedFirstCheck} passed first check`
    );*/

    return minesArray;
  }

  getRandomZeroCell(minesArray) {
    //Finds a random zero cell on board to click
    //Inefficient, but only runs when we've found a good board, which isn't that often

    let numbersArray = this.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
      minesArray
    ).numbersArray;

    let width = minesArray.length;
    let height = minesArray[0].length;

    let zeros = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (numbersArray[x][y] === 0) {
          zeros.push({ x, y });
        }
      }
    }

    if (zeros.length === 0) {
      //board has no zeros, so instead choose a random non-mine
      while (true) {
        //inefficient, but most boards will have zeros
        let x = Math.floor(Math.random() * width);
        let y = Math.floor(Math.random() * height);
        if (!minesArray[x][y]) {
          return { x, y }
        }
      }
    }

    return zeros[Math.floor(Math.random() * zeros.length)];
  }
}

export default Algorithms;