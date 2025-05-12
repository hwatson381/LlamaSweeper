import CONSTANTS from "src/includes/Constants";
import Algorithms from "./Algorithms";
import { Dialog } from 'quasar'
import ChainZini from "./ChainZini";
import DeepChainZiniRunner from "./DeepChainZiniRunner";

class ZiniExplore {
  constructor(board, refs) {
    this.board = board
    this.refs = refs

    this.classicPath = []; //Array of clicks {type:'left', x: 1, y: 2} etc for classic display mode

    this.preprocessedData = {
      numbersArray: false,
      openingLabels: false,
      preprocessedOpenings: false
    }
  }

  handleZiniExploreClick(tileX, tileY, isDigInput, isFlagInput) {
    if (this.refs.ziniRunnerActive.value || this.refs.synchronousZiniActive.value) {
      //Block click if we are in the middle of computing zini
      return;
    }

    if (this.refs.analyseDisplayMode.value === 'classic') {
      this.handleClassicClick(tileX, tileY, isDigInput, isFlagInput);
    } else if (this.refs.analyseDisplayMode.value === 'chain') {
      this.handleChainClick(tileX, tileY, isDigInput, isFlagInput);
    } else {
      throw new Error('Unrecognised display mode');
    }

    this.updateUiAndBoard();
  }

  handleClassicClick(tileX, tileY, isDigInput, isFlagInput) {
    //Clicks on mines will always either flag or unflag
    const squareProperties = this.getSquareProperties(tileX, tileY);

    //Unflagged mine, so flag it
    if (squareProperties.isMine && !squareProperties.isFlagged) {
      this.classicPath.push({ type: 'right', x: tileX, y: tileY })
      return;
    }

    //Flagged mine, so unflag it
    if (squareProperties.isMine && squareProperties.isFlagged) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'right' && c.x === tileX && c.y === tileY))
      return;
    }

    //Below we can assume it is a safe tile

    //Unrevealed square, so dig it
    if (!squareProperties.isRevealed) {
      this.classicPath.push({ type: 'left', x: tileX, y: tileY })
      return;
    }

    //Revealed and chordable, so chord it
    if (squareProperties.isChordable) {
      this.classicPath.push({ type: 'chord', x: tileX, y: tileY })
      return;
    }

    //Was digged, but not chordable, so undig it
    if (squareProperties.isDigged && !squareProperties.isChordable) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'left' && c.x === tileX && c.y === tileY))
      return;
    }

    //Was chorded and digged, so undig + unchord it
    if (squareProperties.isDigged && squareProperties.isChorded) {
      this.classicPath = this.classicPath.filter(c => !((c.type === 'left' || c.type === 'chord') && c.x === tileX && c.y === tileY))
      return;
    }

    //Was chorded and not digged, so just unchord it
    if (!squareProperties.isDigged && squareProperties.isChorded) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'chord' && c.x === tileX && c.y === tileY))
      return;
    }

    //Was a zero that was digged from elsewhere, so undig the zero that digged it
    if (squareProperties.isDiggedZero) {
      const openingLabel = this.preprocessedData.openingLabels[tileX][tileY];

      const sharedZeros = this.preprocessedData.preprocessedOpenings.get(openingLabel).zeros

      this.classicPath = this.classicPath.filter(c => {
        if (c.type !== 'left') {
          //Keep chords/flags
          return true;
        }

        //Remove digs if they are on one of the zeros that would reveal the square we initially clicked on
        return !sharedZeros.some(zero => c.x === zero.x && c.y === zero.y);
      });
    }
  }

  handleChainClick(tileX, tileY, isDigInput, isFlagInput) {
    //For chain input, we have the following behaviour - 
    //Left click toggle chord
    //Right click toggles dig
    //Chording works even without enough flags

    //Clicks on mines will always either flag or unflag
    const squareProperties = this.getSquareProperties(tileX, tileY);

    //Unflagged mine, so flag it
    if (squareProperties.isMine && !squareProperties.isFlagged) {
      this.classicPath.push({ type: 'right', x: tileX, y: tileY })
      return;
    }

    //Flagged mine, so unflag it
    if (squareProperties.isMine && squareProperties.isFlagged) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'right' && c.x === tileX && c.y === tileY))
      return;
    }

    //Below we can assume it is a safe tile

    if (isDigInput) {
      this.handleChainToggleChord(tileX, tileY, squareProperties);
      return;
    }

    if (isFlagInput) {
      this.handleChainToggleDig(tileX, tileY, squareProperties);
      return;
    }
  }

  handleChainToggleChord(tileX, tileY, squareProperties) {
    //Left click on safe squares will toggle whether we chord that square.
    //Note that this automatically flags/unflags surrounding mines if they are adjacent to the chord

    //Note - we allow chording any number square, even though some of the time it will be pointless
    //this is because we may need to chord these squares in order to merge chains
    //if instead we only want to allow chording stuff that is next to safe's then we set
    //canAddChainChord = squareProperties.isPotentiallyChordable
    const canAddChainChord = !squareProperties.isZero;

    //Unrevealed square, so dig it, and then chord it if possible
    let newlyDug = false;

    if (!squareProperties.isRevealed) {
      this.classicPath.push({ type: 'left', x: tileX, y: tileY });
      newlyDug = true; //Mark that we need to try chord it next
    }

    //digged openings need to be checked for chain merge possibilities
    if (newlyDug && squareProperties.isZero) {
      this.optimiseChain(tileX, tileY);
      return;
    }

    //Chord + flag neighbours if the square hasn't been chorded before, but could be
    if (!squareProperties.isChorded && canAddChainChord && !squareProperties.isZero) {
      //Flag any unflagged neighbours
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (x === tileX && y === tileY) {
            continue;
          }
          if (!this.board.checkCoordsInBounds(x, y)) {
            continue; //ignore squares outside board
          }
          if (
            this.board.tilesArray[x][y].state === CONSTANTS.UNREVEALED &&
            this.board.mines[x][y]
          ) {
            this.classicPath.push({ type: 'right', x: x, y: y });
          }
        }
      }

      //Chord
      this.classicPath.push({ type: 'chord', x: tileX, y: tileY });

      this.optimiseChain(tileX, tileY);
      return;
    }

    //Was digged, but not chorded and not chordable, so undig it
    if (squareProperties.isDigged && !squareProperties.isChorded && !canAddChainChord) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'left' && c.x === tileX && c.y === tileY))
      if (squareProperties.isZero) {
        this.optimiseChainForRemoval(tileX, tileY); //Zeros could be part of a chain, so optimisation required
      }
      return;
    }

    //Was chorded and possibly digged, so unchord it and possibly undig it
    //also remove unused neighbour flags
    if (squareProperties.isChorded) {
      //Remove left/chord
      this.classicPath = this.classicPath.filter(c => !((c.type === 'left' || c.type === 'chord') && c.x === tileX && c.y === tileY));
      //Find and remove neighbour flags
      this.classicPath = this.classicPath.filter(c => {
        if (c.type === 'right' && Math.abs(c.x - tileX) <= 1 && Math.abs(c.y - tileY) <= 1) {
          //For adjacent flags, we only keep them if they belong to other chords
          let keepAdjacentFlag = this.classicPath.some(d => d.type === 'chord' && Math.abs(d.x - c.x) <= 1 && Math.abs(d.y - c.y) <= 1);
          return keepAdjacentFlag;
        } else {
          //Keep lefts/digs and also flags that are not touching chord
          return true;
        }
      })
      this.optimiseChainForRemoval(tileX, tileY);
      return;
    }

    //Was a zero that was digged from elsewhere, so undig the zero that digged it
    if (squareProperties.isDiggedZero) {
      const openingLabel = this.preprocessedData.openingLabels[tileX][tileY];

      const sharedZeros = this.preprocessedData.preprocessedOpenings.get(openingLabel).zeros

      this.classicPath = this.classicPath.filter(c => {
        if (c.type !== 'left') {
          //Keep chords/flags
          return true;
        }

        return !sharedZeros.some(zero => c.x === zero.x && c.y === zero.y);
      });

      this.optimiseChainForRemoval(tileX, tileY);
      return;
    }
  }

  handleChainToggleDig(tileX, tileY, squareProperties) {
    //Right click will do NF clicks on squares.
    //For simplicity, it has no action if the square was chorded

    //unrevealed, so dig it
    if (!squareProperties.isRevealed) {
      this.classicPath.push({ type: 'left', x: tileX, y: tileY });
      if (squareProperties.isZero) {
        this.optimiseChain(tileX, tileY);
      }
      return;
    }

    //digged, but not chorded, so undig it
    if (squareProperties.isDigged && !squareProperties.isChorded) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'left' && c.x === tileX && c.y === tileY))
      if (squareProperties.isZero) {
        this.optimiseChainForRemoval(tileX, tileY);
      }
      return;
    }

    //Was a zero that was digged from elsewhere, so undig the zero that digged it
    if (squareProperties.isDiggedZero) {
      const openingLabel = this.preprocessedData.openingLabels[tileX][tileY];

      const sharedZeros = this.preprocessedData.preprocessedOpenings.get(openingLabel).zeros

      this.classicPath = this.classicPath.filter(c => {
        if (c.type !== 'left') {
          //Keep chords/flags
          return true;
        }

        return !sharedZeros.some(zero => c.x === zero.x && c.y === zero.y);
      });

      this.optimiseChainForRemoval(tileX, tileY);
      return;
    }
  }

  optimiseChain(tileX, tileY, validateSingleSeedChain = false) {
    //takes chorded square and optimise chain that it is part of

    let chords = [];
    let smotheredDigs = []; //digs on squares that are revealed by a chord (so can be removed)
    let seeds = []; //left clicks in the chain that we later chord

    let startingMove;
    if (this.preprocessedData.numbersArray[tileX][tileY] === 0) {
      //If on a zero, then we start with a dig
      startingMove = this.classicPath.find(c => c.type === 'left' && c.x === tileX && c.y === tileY);
      seeds.push(startingMove);
    } else {
      //not a zero, so start from a chord
      startingMove = this.classicPath.find(c => c.type === 'chord' && c.x === tileX && c.y === tileY);
      const possibleSeed = this.classicPath.find(c => c.type === 'left' && c.x === tileX && c.y === tileY);
      chords.push(startingMove);
      //also look to see if this is seeded
      if (possibleSeed) {
        seeds.push(possibleSeed);
      }
    }

    this.buildChain(startingMove, chords, smotheredDigs, seeds);

    //remove smothered digs
    this.classicPath = this.classicPath.filter(c => !smotheredDigs.includes(c));

    //if there is the wrong number of seeds (1) then we may need to reorder stuff and add/remove seeds
    if (seeds.length === 1) {
      //Special case is when there is 1 seed. We then need to check that the ordering is correct (but only when specified by arguments)
      if (validateSingleSeedChain) {
        if (this.validateSingleSeedChain(chords, seeds[0])) {
          return;
        }
      } else {
        return
      }
    }

    /* COMMENTED OUT as instead we reseed entirely
    //Figure out which seed is the earliest, as that's the one to keep
    let earliestSeed = this.classicPath.find(c => seeds.includes(c));

    let seedsToRemove = seeds.filter(s => s !== earliestSeed);
    //Remove all seeds except the earliest one from our path
    this.classicPath = this.classicPath.filter(c => !seedsToRemove.includes(c));
    */

    /* new plan

      New tileX etc will be the seed
      and then other seeds will be removed
      and we reorder from there

    */

    //Remove all current seeds and chords in this chain from the path
    this.classicPath = this.classicPath.filter(c => !chords.includes(c) && !seeds.includes(c));

    //Find which flags should be moved into new chain
    let flagsToMove = this.classicPath.filter(
      c => {
        if (c.type !== 'right') {
          return false;
        }

        //Check if flag needed by chain
        if (!chords.some(ch => Math.abs(ch.x - c.x) <= 1 && Math.abs(ch.y - c.y) <= 1)) {
          return false;
        }

        //Check if flag must remain in main path due to being adjacent to a chord there
        if (this.classicPath.some(cl => cl.type === 'chord' && Math.abs(cl.x - c.x) <= 1 && Math.abs(cl.y - c.y) <= 1)) {
          return false;
        }

        return true; //Flag needed by chain and not needed by rest of path
      }
    )

    //Remove flagsToMove from classic path
    this.classicPath = this.classicPath.filter(c => !flagsToMove.includes(c));

    //Rebuild the chord chain, seeding it from (tileX, tileY)
    let newChain = [];

    //tileX/tileY is always start of chain
    newChain.push({
      type: 'left',
      x: tileX,
      y: tileY
    });

    //Then loop over chords, and add flags where needed
    for (let chord of chords) {
      //First add in any prerequisite flags
      let requiredFlags = flagsToMove.filter(fl => !newChain.includes(fl) && Math.abs(fl.x - chord.x) <= 1 && Math.abs(fl.y - chord.y) <= 1);

      newChain = newChain.concat(requiredFlags);
      newChain.push(chord);
    }

    //Finally add the new chain to the end of classic path
    this.classicPath = this.classicPath.concat(newChain);
  }

  optimiseChainForRemoval(tileX, tileY) {
    //takes a removed chord and splits up chains it was merging
    //this code is very ugly/confusing, as it has a lot in common with doing a single "buildChain" step to find neighbour clicks

    //First find neighbour clicks, and then run optimise chain on all of them
    let openingsLabelsToCheck = [];
    let nonOpeningsToCheck = [];

    let possiblyDependentNeighbourCoords = [];

    if (this.preprocessedData.numbersArray[tileX][tileY] === 0) {
      //If digging a zero, then just add it as an opening to check
      openingsLabelsToCheck.push(this.preprocessedData.openingLabels[tileX][tileY])
    } else {
      //Otherwise check neighbours
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (x === tileX && y === tileY) {
            continue;
          }
          if (!this.board.checkCoordsInBounds(x, y)) {
            continue;
          }

          if (this.preprocessedData.numbersArray[x][y] === 0) {
            const label = this.preprocessedData.openingLabels[x][y]
            if (!openingsLabelsToCheck.includes(label)) {
              openingsLabelsToCheck.push(label);
            }
          } else {
            nonOpeningsToCheck.push({ x, y });
          }
        }
      }
    }

    //Handle new openings
    for (let openingLabel of openingsLabelsToCheck) {
      let thisOpening = this.preprocessedData.preprocessedOpenings.get(openingLabel);

      //zeros could be neighbours
      for (let zero of thisOpening.zeros) {
        if (this.classicPath.some(c => c.x === zero.x && c.y === zero.y)) {
          possiblyDependentNeighbourCoords.push({ x: zero.x, y: zero.y });
        }
      }

      //edges can be processed with the other nonOpening squares
      for (let edge of thisOpening.edges) {
        if (!nonOpeningsToCheck.some(n => n.x === edge.x && n.y === edge.y)) {
          nonOpeningsToCheck.push({ x: edge.x, y: edge.y }); //Note - that just pushing edge would also work, I just did it this way incase edge gets new properties
        }
      }
    }

    //Handle nonOpening squares.
    //Lots can happen with these depending on if they are chorded/digged/both
    for (let nonOpeningSquare of nonOpeningsToCheck) {
      let hasDigClick = this.classicPath.some(c => c.type === 'left' && c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y)
      let hasChordClick = this.classicPath.some(c => c.type === 'chord' && c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y)

      //Dig, but no chord means the dig was previously smothered, but now may be needed idk?
      if (hasDigClick && !hasChordClick) {
        possiblyDependentNeighbourCoords.push({ x: nonOpeningSquare.x, y: nonOpeningSquare.y })
        continue;
      }

      //Chord and dig means we can spread (and likely this chain will remain the same)
      if (hasDigClick && hasChordClick) {
        possiblyDependentNeighbourCoords.push({ x: nonOpeningSquare.x, y: nonOpeningSquare.y })
        continue;
      }

      //Just chord also means we can spread, and possibly this chain may need a new seed
      if (!hasDigClick && hasChordClick) {
        possiblyDependentNeighbourCoords.push({ x: nonOpeningSquare.x, y: nonOpeningSquare.y })
        continue;
      }
    }

    //Now we loop through and optimise any chains that start from neighbouring clicks.
    //Note that we may hit chains multiple time, which is disgustingly inefficient, but may be ok in practise
    for (let neighbourCoordsToSpreadFrom of possiblyDependentNeighbourCoords) {
      this.optimiseChain(neighbourCoordsToSpreadFrom.x, neighbourCoordsToSpreadFrom.y, true)
    }
  }

  buildChain(moveToSpreadFrom, chords, smotheredDigs, seeds) {
    //Builds up a chain
    const moveX = moveToSpreadFrom.x;
    const moveY = moveToSpreadFrom.y;

    //assume we are zero or chord
    //assert just incase
    if (this.preprocessedData.numbersArray[moveX][moveY] !== 0 && moveToSpreadFrom.type !== 'chord') {
      throw new Error('Cannot spread from tile when building opening');
    }

    let nonOpeningsToCheck = []; //{x: 1, y: 2} etc squares that are non-zero (so possibly chordable)
    let openingsLabelsToCheck = [];

    if (this.preprocessedData.numbersArray[moveX][moveY] === 0) {
      //If digging a zero, then just add it as an opening to check
      openingsLabelsToCheck.push(this.preprocessedData.openingLabels[moveX][moveY])
    } else {
      //Otherwise check neighbours
      for (let x = moveX - 1; x <= moveX + 1; x++) {
        for (let y = moveY - 1; y <= moveY + 1; y++) {
          if (x === moveX && y === moveY) {
            continue;
          }
          if (!this.board.checkCoordsInBounds(x, y)) {
            continue;
          }

          if (this.preprocessedData.numbersArray[x][y] === 0) {
            const label = this.preprocessedData.openingLabels[x][y]
            if (!openingsLabelsToCheck.includes(label)) {
              openingsLabelsToCheck.push(label);
            }
          } else {
            nonOpeningsToCheck.push({ x, y });
          }
        }
      }
    }

    //Handle new openings
    for (let openingLabel of openingsLabelsToCheck) {
      let thisOpening = this.preprocessedData.preprocessedOpenings.get(openingLabel);

      //zeros could be seeds
      for (let zero of thisOpening.zeros) {
        let zeroClick = this.classicPath.find(c => c.x === zero.x && c.y === zero.y);
        if (zeroClick && !seeds.includes(zeroClick)) {
          seeds.push(zeroClick);
        }
      }

      //edges can be processed with the other nonOpening squares
      for (let edge of thisOpening.edges) {
        if (!nonOpeningsToCheck.some(n => n.x === edge.x && n.y === edge.y)) {
          nonOpeningsToCheck.push({ x: edge.x, y: edge.y }); //Note - that just pushing edge would also work, I just did it this way incase edge gets new properties
        }
      }
    }

    //Handle nonOpening squares.
    //Lots can happen with these depending on if they are chorded/digged/both
    for (let nonOpeningSquare of nonOpeningsToCheck) {
      //Exit early if square already accounted for
      if (
        chords.some(c => c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y) ||
        smotheredDigs.some(c => c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y) ||
        seeds.some(c => c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y)
      ) {
        continue;
      }

      let possibleDigClick = this.classicPath.find(c => c.type === 'left' && c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y)
      let possibleChordClick = this.classicPath.find(c => c.type === 'chord' && c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y)

      //Dig, but no chord means the dig is smothered
      if (possibleDigClick && !possibleChordClick) {
        smotheredDigs.push(possibleDigClick);
        continue;
      }

      //Chord and dig means we can spread and the dig is a seed
      if (possibleDigClick && possibleChordClick) {
        seeds.push(possibleDigClick);
        chords.push(possibleChordClick);
        //Recursively add stuff from this
        this.buildChain(possibleChordClick, chords, smotheredDigs, seeds)
        continue;
      }

      //Just chord also means we can spread
      if (!possibleDigClick && possibleChordClick) {
        chords.push(possibleChordClick);
        //Recursively add stuff from this
        this.buildChain(possibleChordClick, chords, smotheredDigs, seeds)
        continue;
      }
    }
  }

  validateSingleSeedChain(chords, seed) {
    //run through single chain to check it is valid

    //First make sure that the seed happens before the clicks (in current path)
    for (let i = 0; i < this.classicPath.length; i++) {
      //If we come across the seed first, then we can continue to next checks
      if (this.classicPath[i] === seed) {
        break;
      }

      //If we come across a chord in the chain first, then the chain is not valid.
      if (chords.includes(this.classicPath[i])) {
        return false;
      }
    }

    //Now we play the seed and run through moves to make sure they are all valid
    let allowedMoves = [seed]; //Tracks which moves can be played

    let chainToCheck = [seed, ...chords];

    for (let i = 0; i < chainToCheck.length; i++) {
      const thisMove = chainToCheck[i];

      if (!allowedMoves.includes(thisMove)) {
        //Illegal move played, so chord chain is invalid
        return false;
      }

      let nonOpeningsToCheck = []; //{x: 1, y: 2} etc squares that are non-zero (so possibly chordable)
      let openingsLabelsToCheck = [];

      if (thisMove.type === 'left') {
        if (this.preprocessedData.numbersArray[thisMove.x][thisMove.y] === 0) {
          openingsLabelsToCheck.push(this.preprocessedData.openingLabels[thisMove.x][thisMove.y])
        } else {
          nonOpeningsToCheck.push({ x: thisMove.x, y: thisMove.y });
        }
      } else if (thisMove.type === 'chord') {
        //check neighbours
        for (let x = thisMove.x - 1; x <= thisMove.x + 1; x++) {
          for (let y = thisMove.y - 1; y <= thisMove.y + 1; y++) {
            if (x === thisMove.x && y === thisMove.y) {
              continue;
            }
            if (!this.board.checkCoordsInBounds(x, y)) {
              continue;
            }

            if (this.preprocessedData.numbersArray[x][y] === 0) {
              const label = this.preprocessedData.openingLabels[x][y]
              if (!openingsLabelsToCheck.includes(label)) {
                openingsLabelsToCheck.push(label);
              }
            } else {
              nonOpeningsToCheck.push({ x, y });
            }
          }
        }
      }

      //Figure out which moves are now available

      //Handle new openings
      for (let openingLabel of openingsLabelsToCheck) {
        let thisOpening = this.preprocessedData.preprocessedOpenings.get(openingLabel);

        //don't need to do anything with zeros as they can't be used in future chords

        //edges can be processed with the other nonOpening squares
        for (let edge of thisOpening.edges) {
          if (!nonOpeningsToCheck.some(n => n.x === edge.x && n.y === edge.y)) {
            nonOpeningsToCheck.push({ x: edge.x, y: edge.y }); //Note - that just pushing edge would also work, I just did it this way incase edge gets new properties
          }
        }
      }

      //Handle nonOpening squares.
      //Non-openings squares unlock options for future chords
      for (let nonOpeningSquare of nonOpeningsToCheck) {
        let chordOnSquare = chords.find(c => c.x === nonOpeningSquare.x && c.y === nonOpeningSquare.y)

        if (chordOnSquare && !allowedMoves.includes(chordOnSquare)) {
          allowedMoves.push(chordOnSquare)
        }
      }
    }

    return true
  }

  getSquareProperties(tileX, tileY) {
    //This function makes the assumption that the click path is valid (e.g. all chords are from squares that were opened before)
    //Check whether square is mine/flagged/digged/chorded/open/closed/part of opening etc

    let isMine = this.board.mines[tileX][tileY];

    let isFlagged = this.classicPath.some(c => c.type === 'right' && c.x === tileX && c.y === tileY);

    let isDigged = this.classicPath.some(c => c.type === 'left' && c.x === tileX && c.y === tileY);

    let isRevealed = this.board.tilesArray[tileX][tileY].state !== CONSTANTS.UNREVEALED;

    let isZero = this.preprocessedData.numbersArray[tileX][tileY] === 0;

    //zeros in openings are merged (if one is digged then all are digged etc)
    //Figure out if there was another zero in the same opening that was clicked on
    let isDiggedZero = false;
    if (isRevealed && isZero) {
      const openingLabel = this.preprocessedData.openingLabels[tileX][tileY];

      const sharedZeros = this.preprocessedData.preprocessedOpenings.get(openingLabel).zeros
      if (sharedZeros.some(zero => this.classicPath.some(c => c.type === 'left' && c.x === zero.x && c.y === zero.y))) {
        //Shared zero was digged, so this one is also digged
        isDiggedZero = true;
      }
    }

    //true if it has a neighbour that is unrevealed and safe
    let isPotentiallyChordable = false;
    if (!isZero) {
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (x === tileX && y === tileY) {
            continue;
          }
          if (!this.board.checkCoordsInBounds(x, y)) {
            continue; //ignore squares outside board
          }
          if (
            this.board.tilesArray[x][y].state === CONSTANTS.UNREVEALED &&
            !this.board.mines[x][y]
          ) {
            isPotentiallyChordable = true;
          }
        }
      }
    }

    let isChorded = this.classicPath.some(c => c.type === 'chord' && c.x === tileX && c.y === tileY);

    //Chordable if it has an unrevealed neighbour and right number of flags
    let isChordable = isRevealed &&
      !isZero &&
      isPotentiallyChordable &&
      this.board.getNumberSurroundingFlags(tileX, tileY) === this.board.getNumberSurroundingMines(tileX, tileY, false);

    return {
      isMine,
      isFlagged,
      isDigged,
      isRevealed,
      isZero,
      isDiggedZero,
      isChorded,
      isChordable,
      isPotentiallyChordable
    }
  }

  promptForPathReset() {
    Dialog.create({
      title: "Current click path",
      message: "Would you like to preserve the current click path?",
      ok: {
        flat: true,
        label: "Preserve",
      },
      cancel: {
        flat: true,
        label: "Reset",
      },
      persistent: true,
    })
      .onOk(() => {
        // Do nothing
      })
      .onCancel(() => {
        // Clear path
        this.clearCurrentPath();
        this.updateUiAndBoard();
      })
  }

  removeInvalidDigsAndFlags() {
    const oldClassicPathLength = this.classicPath.length;

    this.classicPath = this.classicPath.filter(c => {
      //remove bad flags
      if (c.type === 'right' && !this.board.mines[c.x][c.y]) {
        return false
      }
      //remove bad digs
      if (c.type === 'left' && this.board.mines[c.x][c.y]) {
        return false
      }
      return true
    });

    return oldClassicPathLength !== this.classicPath.length
  }

  //Replays moves on tilesArray whilst also removing invalid moves
  removeInvalidChordsAndRegenerateTileStates() {
    this.board.resetTiles();

    //Clear moves, then replay stuff, keeping track of what to remove
    let invalidChordIndices = [];

    for (let clickPointer = 0; clickPointer < this.classicPath.length; clickPointer++) {
      let clickToDo = this.classicPath[clickPointer];

      if (clickToDo.type === 'left') {
        this.board.openTile(clickToDo.x, clickToDo.y);
      } else if (clickToDo.type === 'right') {
        this.board.attemptFlag(clickToDo.x, clickToDo.y, false);
      } else if (clickToDo.type === 'chord') {
        //For chords, we need to verify that they are chordable before taking
        const isChordable = this.board.tilesArray[clickToDo.x][clickToDo.y].state !== CONSTANTS.UNREVEALED &&
          this.board.getNumberSurroundingFlags(clickToDo.x, clickToDo.y) === this.board.getNumberSurroundingMines(clickToDo.x, clickToDo.y, false);

        if (isChordable) {
          this.board.chord(clickToDo.x, clickToDo.y, false);
        } else {
          invalidChordIndices.push(clickPointer);
        }
      }
    }

    let pathWithInvalidChordsRemoved = this.classicPath.filter((val, idx) => !invalidChordIndices.includes(idx));

    let flagIndicesToCheck = new Set(); //Use a set just because of flags being checked multiple times (though array would be fine in practise)

    //Check which flags are next to chords we removed
    for (let invalidChordIndex of invalidChordIndices) {
      let removedChord = this.classicPath[invalidChordIndex];

      for (let i = 0; i < this.classicPath.length; i++) {
        let possibleFlagClick = this.classicPath[i];
        if (possibleFlagClick.type !== 'right') {
          continue;
        }
        if (Math.abs(possibleFlagClick.x - removedChord.x) <= 1 &&
          Math.abs(possibleFlagClick.y - removedChord.y) <= 1) {
          flagIndicesToCheck.add(i);
          continue;
        }
      }
    }

    let flagsIndicesToRemove = [];

    //Check whether or not these flags are next to other chords that are kept
    for (let flagIndexToCheck of flagIndicesToCheck) {
      let flagToCheck = this.classicPath[flagIndexToCheck];

      let flagHasKeptNeighbourChord = false
      for (let i = 0; i < pathWithInvalidChordsRemoved.length; i++) {
        let possibleNeighbouringKeptChord = pathWithInvalidChordsRemoved[i];
        if (possibleNeighbouringKeptChord.type !== 'chord') {
          continue;
        }
        if (Math.abs(possibleNeighbouringKeptChord.x - flagToCheck.x) <= 1 &&
          Math.abs(possibleNeighbouringKeptChord.y - flagToCheck.y) <= 1) {
          flagHasKeptNeighbourChord = true;
          break;
        }
      }

      if (!flagHasKeptNeighbourChord) {
        flagsIndicesToRemove.push(flagIndexToCheck);
      }
    }

    //Unmark the flags on the board that were removed
    for (let i of flagsIndicesToRemove) {
      let flagToRemove = this.classicPath[i];

      this.board.tilesArray[flagToRemove.x][flagToRemove.y].state = CONSTANTS.UNREVEALED;
    }

    //Finally, remove the flags that are no longer needed (were only used by invalid chord)
    this.classicPath = this.classicPath.filter((val, idx) => !invalidChordIndices.includes(idx) && !flagsIndicesToRemove.includes(idx));
  }

  updateFlagCounter() {
    this.board.unflagged = this.board.mineCount - this.classicPath.filter(c => c.type === 'right').length
  }

  updateZiniSumRefs() {
    if (this.refs.analyseDisplayMode.value === 'classic' || this.refs.analyseDisplayMode.value === 'chain') {
      this.refs.classicPathBreakdown.value.lefts = this.classicPath.filter(c => c.type === 'left').length;
      this.refs.classicPathBreakdown.value.rights = this.classicPath.filter(c => c.type === 'right').length;
      this.refs.classicPathBreakdown.value.chords = this.classicPath.filter(c => c.type === 'chord').length;

      const bbbv = Algorithms.calc3bv(this.board.mines, this.board.tilesArray, this.preprocessedData);
      const remaining3bv = bbbv.bbbv - bbbv.solved3bv;
      this.refs.classicPathBreakdown.value.remaining3bv = remaining3bv;

      this.refs.analyseZiniTotal.value = remaining3bv + this.classicPath.length;
      this.refs.analyse3bv.value = bbbv.bbbv;
      this.refs.analyseEff.value = Math.round((this.refs.analyse3bv.value / this.refs.analyseZiniTotal.value) * 100)
    } else {
      throw new Error('Unrecognised display mode');
    }
  }

  calculateNormalPremiums() {
    const width = this.board.mines.length;
    const height = this.board.mines[0].length;

    //array of saved info for square about what the neighbours are
    const squareInfo = Algorithms.computeSquareInfo(
      this.board.mines,
      this.preprocessedData.numbersArray,
      this.preprocessedData.openingLabels
    );

    //Figure out which flags/revealed squares are based on board states
    const { revealedStates, flagStates } = this.getRevealedAndFlagStates();

    //store premiums of opening + chording each cell
    const premiums = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.board.mines[x][y]) {
          continue;
        }
        Algorithms.updatePremiumForCoord(
          x,
          y,
          squareInfo,
          flagStates,
          revealedStates,
          premiums,
          this.preprocessedData.preprocessedOpenings
        );
      }
    }

    return premiums;
  }

  calculateChainPremiums() {
    /*
      Note - there could be some performance improvements here.
      We could pass preprocessedData to "convertClickpathToChainInput" function
      and also return chainSquareInfo from "convertClickpathToChainInput" function
      so we don't have to calculate chainSquareInfo twice.
    */

    const width = this.board.mines.length;
    const height = this.board.mines[0].length;

    const {
      initialRevealedStates,
      initialFlagStates,
      initialChainIds,
      initialChainMap,
      initialChainNeighbourhoodGrid
    } = ChainZini.convertClickPathToChainInput(
      this.classicPath,
      this.board.mines,
      true //Allow rewriting (floating chains etc)
    );

    //array of saved info for square about what the neighbours are etc
    const chainSquareInfo = ChainZini.computeChainSquareInfo(
      this.board.mines,
      this.preprocessedData.numbersArray,
      this.preprocessedData.openingLabels,
      this.preprocessedData.preprocessedOpenings
    );

    //store chainPremiums of opening + chording each cell
    const chainPremiums = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.board.mines[x][y]) {
          continue;
        }
        ChainZini.updateChainPremiumForCoord(
          x,
          y,
          chainSquareInfo,
          initialFlagStates,
          initialRevealedStates,
          chainPremiums,
          this.preprocessedData.preprocessedOpenings,
          initialChainIds,
          initialChainMap,
          initialChainNeighbourhoodGrid
        );
      }
    }

    return chainPremiums;
  }

  displayPremiums(premiums) {
    const width = this.board.mines.length;
    const height = this.board.mines[0].length;

    const showPremiumsValue = this.refs.analyseShowPremiums.value; //Shorter to type :)
    const displayInputMode = this.refs.analyseDisplayMode.value;

    let highestPremium = premiums
      .flat()
      .filter(s => s !== null)
      .reduce(function (p, v) {
        return (p > v ? p : v);
      }, -1);

    if (
      ['numbers positive', 'highlight'].includes(showPremiumsValue) &&
      highestPremium === -1
    ) {
      //exit early on highlight/positive if no non-negative premiums
      return;
    }

    //Add premium info to tiles
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        //Only add premiums when a cell has potential to be chorded
        if (this.board.mines[x][y]) {
          //Mines can't be chorded!
          continue;
        }
        if (this.preprocessedData.numbersArray[x][y] === 0) {
          //Zeros can't be chorded
          continue;
        }
        //Check if there is an unopened safe neighbour cell
        let hasUnopenedSafeNeighbour = false
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (i < 0 || j < 0 || i >= width || j >= height) {
              continue;
            }
            if (this.board.tilesArray[i][j].state === CONSTANTS.UNREVEALED && !this.board.mines[i][j]) {
              hasUnopenedSafeNeighbour = true;
            }
          }
        }
        if (!hasUnopenedSafeNeighbour) {
          if (displayInputMode === 'classic') {
            //Never chordable on normal
            continue;
          } else if (displayInputMode === 'chain') {
            //On chain, we check if this move has positive premium (note that this is very unlikely)
            if (premiums[x][y] <= 0) {
              continue;
            }
          } else {
            throw new Error('unexpected premium type');
          }
        }
        if (
          showPremiumsValue === 'numbers' ||
          (
            showPremiumsValue === 'numbers positive' &&
            premiums[x][y] >= 0
          )
        ) {
          //On numbers mode, we show the number of the premium in the cell
          this.board.tilesArray[x][y].addPremium(premiums[x][y]);
        }
        if (
          showPremiumsValue === 'highlight' &&
          premiums[x][y] === highestPremium) {
          //On highlight mode, we just highlight the top cells 
          this.board.tilesArray[x][y].addHighlight();
        }
      }
    }
  }

  clearCurrentPath() {
    this.classicPath = [];
  }

  refreshForEditedBoard(skipAskForPathReset = false) {
    //This is ran when we switch to analyse mode
    this.preprocessedData = Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(this.board.mines);
    if (this.removeInvalidDigsAndFlags() && !skipAskForPathReset) {
      this.promptForPathReset();
    }
    this.updateUiAndBoard();
  }

  updateUiAndBoard() {
    this.removeInvalidChordsAndRegenerateTileStates();
    this.board.populateHiddenNumbers(this.refs.analyseHiddenStyle.value);
    this.updateFlagCounter();
    this.updateZiniSumRefs();
    this.updateTileAnnotations();
    if (this.refs.analyseShowPremiums.value !== 'none') {
      let premiumsArray;
      if (this.refs.analyseDisplayMode.value === 'classic') {
        premiumsArray = this.calculateNormalPremiums();
      }
      if (this.refs.analyseDisplayMode.value === 'chain') {
        premiumsArray = this.calculateChainPremiums();
      }

      this.displayPremiums(premiumsArray);
    }
    this.board.draw();
  }

  updateTileAnnotations() {
    if (this.refs.analyseDisplayMode.value === 'classic' || this.refs.analyseDisplayMode.value === 'chain') {
      for (const click of this.classicPath) {
        if (click.type === 'left') {
          this.board.tilesArray[click.x][click.y].addClassicDig();
        }
        if (click.type === 'chord') {
          this.board.tilesArray[click.x][click.y].addClassicChord();
        }
      }
    }
  }

  runAlgorithm() {
    switch (this.refs.analyseAlgorithm.value) {
      case '8 way':
        this.refs.synchronousZiniActive.value = true;
        this.run8way();
        setTimeout(() => this.refs.synchronousZiniActive.value = false, 100);
        break;
      case 'womzini':
        this.refs.synchronousZiniActive.value = true;
        this.classicPath = Algorithms.calcWomZiniAndHZini(
          this.board.mines,
          false
        ).womZini.clicks;
        setTimeout(() => this.refs.synchronousZiniActive.value = false, 100);
        break;
      case 'womzinifix':
        this.refs.synchronousZiniActive.value = true;
        this.classicPath = Algorithms.calcWomZiniAndHZini(
          this.board.mines,
          true
        ).womZini.clicks;
        setTimeout(() => this.refs.synchronousZiniActive.value = false, 100);
        break;
      case 'womhzini':
        this.refs.synchronousZiniActive.value = true;
        this.classicPath = Algorithms.calcWomZiniAndHZini(
          this.board.mines,
          false
        ).womHzini.clicks;
        setTimeout(() => this.refs.synchronousZiniActive.value = false, 100);
        break;
      case 'chainzini':
        this.refs.synchronousZiniActive.value = true;
        this.runChainZini();
        setTimeout(() => this.refs.synchronousZiniActive.value = false, 100);
        break;
      case 'incexzini':
        this.runInclusionExclusionZini(true);
        break;
      default:
        alert('disallowed algorithm')
        throw new Error('disallowed algorithm');
    }

    this.updateUiAndBoard();
  }

  runDefaultAlgorithmOrPromptForInfo() {
    if (this.refs.replayIsShown.value) {
      Dialog.create({
        title: "Alert",
        message: "Please close the replay first",
      });
      return;
    }

    if (this.classicPath.length === 0 || this.getIsComplete()) {
      this.runDefaultAlgorithm(false); //Board is empty or complete - run zini from beginning.
    } else {
      //Prompt for whether to run from current or beginning
      Dialog.create({
        title: "Run from current path",
        message: "Would you like to run DeepChain ZiNi from the current board path?",
        ok: {
          flat: true,
          label: "From current",
        },
        cancel: {
          flat: true,
          label: "From beginning",
        },
        persistent: true,
      })
        .onOk(() => {
          //Run zini from current path
          this.runDefaultAlgorithm(true);
        })
        .onCancel(() => {
          //Run zini from beginning
          this.runDefaultAlgorithm(false);
        })
    }
  }

  runDefaultAlgorithm(runFromCurrent) {
    this.runInclusionExclusionZini(false, runFromCurrent); //false to ignore refs, and instead use default parameters
    this.updateUiAndBoard();
  }

  run8way() {
    if (this.refs.analyseAlgorithmScope.value === 'beginning') {
      this.classicPath = Algorithms.calcEightWayZini(this.board.mines).clicks
    } else {
      const { revealedStates, flagStates } = this.getRevealedAndFlagStates();
      const pathExtension = Algorithms.calcEightWayZini(this.board.mines, false, revealedStates, flagStates).clicks;
      this.classicPath = this.classicPath.concat(pathExtension);
    }
  }

  runChainZini() {
    let iterations = this.refs.analyseIterations.value;
    if (
      !Number.isFinite(iterations) ||
      !Number.isInteger(iterations) ||
      iterations < 1
    ) {
      this.refs.analyseIterations.value = 100;
      iterations = 100;
    }

    if (iterations > 1000000) {
      this.refs.analyseIterations.value = 1000000;
      iterations = 1000000;
    }

    if (this.refs.analyseAlgorithmScope.value === 'beginning') {
      this.classicPath = ChainZini.calcNWayChainZini({
        mines: this.board.mines,
        numberOfIterations: iterations,
        includeClickPath: true
      }).clicks
    } else {
      const {
        initialRevealedStates,
        initialFlagStates,
        initialChainIds,
        initialChainMap,
        initialChainNeighbourhoodGrid
      } = ChainZini.convertClickPathToChainInput(
        this.classicPath,
        this.board.mines,
        this.refs.analyseHistoryRewrite.value
      );
      this.classicPath = ChainZini.calcNWayChainZini({
        mines: this.board.mines,
        initialRevealedStates,
        initialFlagStates,
        initialChainIds,
        initialChainMap,
        initialChainNeighbourhoodGrid,
        numberOfIterations: iterations,
        includeClickPath: true
      }).clicks
    }
  }

  runInclusionExclusionZini(useRefs = true, runFromCurrentIfDefault = false) {
    this.killDeepChainZiniRunner(); //just in case it is already running

    let scope = runFromCurrentIfDefault ? 'current' : 'beginning';
    let rewrite = true;
    let deepType = 'separate';
    let deepIterations = 5;
    let deepReportProgress = true;
    let forbidMoves = false;

    if (useRefs) {
      scope = this.refs.analyseAlgorithmScope.value;
      rewrite = this.refs.analyseHistoryRewrite.value;
      deepType = this.refs.analyseDeepType.value;
      deepIterations = this.refs.analyseDeepIterations.value;
      deepReportProgress = this.refs.analyseVisualise.value;
      forbidMoves = this.refs.analyseForbid.value;
    }

    if (
      !Number.isFinite(deepIterations) ||
      !Number.isInteger(deepIterations) ||
      deepIterations < 1
    ) {
      this.refs.analyseDeepIterations.value = 5;
      deepIterations = 5;
    }

    if (deepIterations > 1000) {
      this.refs.analyseDeepIterations.value = 1000;
      deepIterations = 1000;
    }

    this.classicPathBeforeRun = structuredClone(this.classicPath);

    if (scope === 'beginning') {
      this.ziniRunner = new DeepChainZiniRunner(
        this.refs,
        {
          mines: this.board.mines,
          analysisType: deepType,
          deepIterations: deepIterations,
          forbidMoves: forbidMoves,
          progressType: 'visual',
        },
        {
          onBoardProgress: (clicks) => {
            this.classicPath = clicks;
            this.updateUiAndBoard();
          },
          onCompleteRun: (result) => {
            this.classicPath = result.clicks;
            this.updateUiAndBoard();
            this.ziniRunner = null;
            this.classicPathBeforeRun = null;
          }
        },
        deepReportProgress
      );
    } else {
      const {
        initialRevealedStates,
        initialFlagStates,
        initialChainIds,
        initialChainMap,
        initialChainNeighbourhoodGrid
      } = ChainZini.convertClickPathToChainInput(
        this.classicPath,
        this.board.mines,
        rewrite
      );
      this.ziniRunner = new DeepChainZiniRunner(
        this.refs,
        {
          mines: this.board.mines,
          initialRevealedStates,
          initialFlagStates,
          initialChainIds,
          initialChainMap,
          initialChainNeighbourhoodGrid,
          analysisType: deepType,
          deepIterations: deepIterations,
          forbidMoves: forbidMoves,
          progressType: 'visual',
        },
        {
          onBoardProgress: (clicks) => {
            this.classicPath = clicks;
            this.updateUiAndBoard();
          },
          onCompleteRun: (result) => {
            this.classicPath = result.clicks;
            this.updateUiAndBoard();
            this.ziniRunner = null;
            this.classicPathBeforeRun = null;
          }
        },
        deepReportProgress,
      )
    }
  }

  killDeepChainZiniRunner() {
    if (this.ziniRunner) {
      this.ziniRunner.killWorker();
      this.classicPath = structuredClone(this.classicPathBeforeRun);
      this.updateUiAndBoard();
      this.ziniRunner = null;
      this.classicPathBeforeRun = null;
    }
  }

  getRevealedAndFlagStates() {
    //Assume that tilesArray states are correct
    const width = this.board.mines.length;
    const height = this.board.mines[0].length;

    //Figure out which flags/revealed squares are based on board states
    const flagStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));
    const revealedStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.board.tilesArray[x][y].state === CONSTANTS.FLAG) {
          flagStates[x][y] = true;
          continue
        }
        if (typeof this.board.tilesArray[x][y].state === 'number') {
          revealedStates[x][y] = true
        }
      }
    }

    return { revealedStates, flagStates }
  }

  getIsComplete() {
    //Needed for the "watch" replay. Checks whether the board is fully completed
    const width = this.board.mines.length;
    const height = this.board.mines[0].length;

    let isComplete = true;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.board.tilesArray[x][y].state === CONSTANTS.UNREVEALED &&
          !this.board.mines[x][y]
        ) {
          isComplete = false;
          //We don't break out of loops here, but ok as performance is not important here
        }
      }
    }

    return isComplete;
  }

  isReplayPossible() {
    if (this.classicPath.length === 0) {
      //No clicks done. Return false and warn user.
      Dialog.create({
        title: "Alert",
        message: "Nothing to watch. Please either click on the board to create a manual path, or run a zini algorithm.",
      });
      return false;
    } else {
      return true;
    }
  }
}

export default ZiniExplore;