import Algorithms from "./Algorithms";

class CompareReplay {
  constructor() {
    throw new Error('CompareReplay class only has static methods, and cannot be instantiated')
  }

  static generate(mines, clicks) {
    const width = mines.length;
    const height = mines[0].length;

    clicks = structuredClone(this.stripWasted(clicks));

    let projectedZinis = []; //Array of what zinis would be assuming the game was continued



    //calculate projected zinis
    const ziniAtStart = Algorithms.calcEightWayZini(mines).total //Special case as not covered by for loop

    for (let i = 0; i < clicks.length; i++) {
      let initialRevealedStates = this.getRevealedStates(i, clicks, mines);
      let initialFlagStates = this.getFlagStates(i, clicks, mines);

      let projectedZini = i + 1 + Algorithms.calcEightWayZini(mines, false, initialRevealedStates, initialFlagStates).total

      projectedZinis[i] = projectedZini;
    }

    console.log(projectedZinis);

    //Figure out where projected zinis go down/up
    let ziniDeltas = new Map(); //click index => {isClickGain: true}

    //special case for first click
    if (projectedZinis[0] > ziniAtStart) {
      ziniDeltas.set(0, { isClickGain: false })
    } else if (projectedZinis[0] < ziniAtStart) {
      ziniDeltas.set(0, { isClickGain: true })
    }

    for (let i = 1; i < clicks.length; i++) {
      if (projectedZinis[i] > projectedZinis[i - 1]) {
        ziniDeltas.set(i, { isClickGain: false })
      } else if (projectedZinis[i] < projectedZinis[i - 1]) {
        ziniDeltas.set(i, { isClickGain: true })
      }
    }

    //Add surrounding context for click gains/losses
    const CONTEXT_AMOUNT = 1; //Show 1 click before/after click gain/loss
    let includeInReplay = new Array(clicks.length).fill(false);

    for (const clickIndex of ziniDeltas.keys()) {
      for (let i = clickIndex - CONTEXT_AMOUNT; i <= clickIndex + CONTEXT_AMOUNT; i++) {
        if (i < 0 || i >= clicks.length) {
          continue;
        }
        includeInReplay[i] = true;
      }
    }

    //Compress unimportant parts of replay
    /*
    let subtractFromTime = 0;
    let lastTime = 0;

    for (let i = 0; i < clicks.length; i++) {
      let currentTime = clicks[i].time

      if (!includeInReplay[i]) {
        subtractFromTime += currentTime - lastTime;
      }

      clicks[i].time = clicks[i].time - subtractFromTime;

      lastTime = currentTime;
    }
    */

    const BETWEEN_MOVE_TIME = 0.15;
    const MAIN_MOVE_TIME = 0.9;

    let timeOfMove = 0;

    clicks[0].time = 0; //reset first click to 0 seconds, since it can sometimes differ due difference between starting game and recording it.

    for (let i = 1; i < clicks.length; i++) {
      if (includeInReplay[i]) {
        timeOfMove += MAIN_MOVE_TIME
      } else {
        timeOfMove += BETWEEN_MOVE_TIME
      }

      clicks[i].time = timeOfMove;
    }

    return {
      clicks, ziniDeltas
    }
  }

  static stripWasted(clicks) {
    return clicks.filter(click => !click.type.includes('wasted'));
  }

  static getRevealedStates(latestIndex, clicks, mines) {
    const width = mines.length;
    const height = mines[0].length;

    const { numbersArray, openingLabels, preprocessedOpenings } =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
        mines
      );

    const revealedStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    for (let i = 0; i <= latestIndex; i++) {
      const click = clicks[i]
      if (click.type === 'left') {
        this.addRevealedSquareAndPossiblyOpening(
          revealedStates,
          click.x,
          click.y,
          numbersArray,
          openingLabels,
          preprocessedOpenings
        );
        continue;
      }
      if (click.type === 'chord') {
        for (let x = click.x - 1; x <= click.x + 1; x++) {
          for (let y = click.y - 1; y <= click.y + 1; y++) {
            if (x < 0 || x >= width || y < 0 || y >= height) {
              continue; //out of baord
            }
            if (revealedStates[x][y]) {
              continue; //already opening square
            }
            if (mines[x][y]) {
              continue; //assume that flags are correct, so bombs don't open. May give weird behaviour on final click of lost game
            }

            this.addRevealedSquareAndPossiblyOpening(
              revealedStates,
              x,
              y,
              numbersArray,
              openingLabels,
              preprocessedOpenings
            )
          }
        }
        continue;
      }
    }

    return revealedStates;
  }

  static addRevealedSquareAndPossiblyOpening(revealedStates, x, y, numbersArray, openingLabels, preprocessedOpenings) {
    revealedStates[x][y] = true;
    if (numbersArray[x][y] === 0) {
      const thisOpeningLabel = openingLabels[x][y];
      const opening = preprocessedOpenings.get(thisOpeningLabel);
      for (let zero of opening.zeros) {
        revealedStates[zero.x][zero.y] = true;
      }
      for (let edge of opening.edges) {
        revealedStates[edge.x][edge.y] = true;
      }
    }
  }

  static getFlagStates(latestIndex, clicks, mines) {
    const width = mines.length;
    const height = mines[0].length;

    const flagStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    for (let i = 0; i <= latestIndex; i++) {
      const click = clicks[i]
      if (click.type === 'right') {
        flagStates[click.x][click.y] = true;
      }
    }

    return flagStates;
  }
}

export default CompareReplay;