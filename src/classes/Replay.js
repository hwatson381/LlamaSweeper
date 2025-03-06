import Algorithms from "./Algorithms";
import Utils from "src/classes/Utils";

class Replay {
  constructor({
    clicks,
    moves = [],
    board,
    isWin = true,
    isComplete = true,
    forceSteppy = false,
    analysis = false
  }, refs) {
    this.refs = refs;

    this.clicks = clicks;
    this.moves = moves;
    this.rawTime = null;
    this.currentClickIndex = null;
    this.currentClickIndexLerped = null;
    this.isPlaying = false;
    this.board = board;
    this.performWastedClicks = true;

    this.isWin = isWin;
    this.isComplete = isComplete;
    this.analysis = analysis;

    this.refs.replayTypeForceSteppy.value = forceSteppy;

    this.millisPerSteppyTurn = 500; //milliseconds to pass before we advance to next click on "steppy" mode

    this.tLastFrame = null;

    this.jumpToSpecificClickLerped(-1);

    this.setupReplayBar();

    this.play();
  }

  //Jump to a "steppy" time - e.g. replay stepper
  jumpToSpecificClickLerped(newClickIndexLerped) {
    //Restrict based on the range of clicks that can actually happen
    newClickIndexLerped = Utils.clamp(
      newClickIndexLerped,
      -1,
      this.clicks.length - 1
    );

    this.currentClickIndexLerped = newClickIndexLerped; //Possible no-op, but needed if the value has changed

    let newClickIndex = Math.floor(newClickIndexLerped);

    //Figure out what timer should show and where the mouse should be
    this.rawTime = this.lerpedClickIndexToRawTime(newClickIndexLerped);

    this.board.cursor =
      this.lerpedClickIndexToCursorPosition(newClickIndexLerped);

    this.board.integerTimer = Math.max(Math.floor(this.rawTime), 0);

    //If the click index hasn't changed, then no moves get performed. However, the mouse/timer position may change
    if (newClickIndex === this.currentClickIndex) {
      if (newClickIndex === this.clicks.length - 1) {
        //Pause if playhead at the end. This would be checked later, though can get missed if it hits replay end during a pan
        !this.refs.replayIsPanning.value && !this.refs.replayIsInputting.value && this.pause();
      }
      return;
    }

    let clickHead = this.currentClickIndex;

    this.currentClickIndex = newClickIndex;

    if (clickHead === null || newClickIndex < clickHead) {
      clickHead = -1;

      //Full reset of tiles
      this.board.resetTiles();

      if (this.refs.replayShowHidden.value !== 'none') {
        this.board.populateHiddenNumbers(this.refs.replayShowHidden.value);
      }

      this.board.unflagged = this.board.mineCount;

      if (this.board.variant === "mean openings") {
        this.board.resetMeanMinesActiveness();
      }
    }

    for (
      let clickPointer = clickHead + 1;
      clickPointer <= newClickIndex;
      clickPointer++
    ) {
      //Get next click
      let clickToDo = this.clicks[clickPointer];

      if (!this.performWastedClicks && clickToDo.type.startsWith("wasted")) {
        continue;
      }

      switch (clickToDo.type) {
        case "left":
          this.board.openTile(clickToDo.x, clickToDo.y);
          break;
        case "wasted_left":
          //Do nothing
          break;
        case "chord":
          this.board.chord(clickToDo.x, clickToDo.y, false);
          break;
        case "wasted_chord":
          //Do nothing
          break;
        case "right":
          this.board.attemptFlag(clickToDo.x, clickToDo.y, false);
          break;
        case "wasted_right":
          //Do something as it may be an unflag
          this.board.attemptFlag(clickToDo.x, clickToDo.y, false);
          break;
        default:
          throw new Error("Disallowed click type seen in replay");
      }

      if (this.analysis && this.analysis.ziniDeltas) {
        //For compare replay, check if this move gained/lost a click
        let thisZiniDelta = this.analysis.ziniDeltas.get(clickPointer);

        if (thisZiniDelta !== undefined) {
          this.board.tilesArray[clickToDo.x][clickToDo.y].addZiniDelta(thisZiniDelta.isClickGain);
        }
      }

      if (
        this.board.variant === "mean openings" &&
        this.board.unprocessedMeanZeros?.length !== 0
      ) {
        this.board.makeOpeningMean();
      }
    }

    //Pause if we have hit the end, also, blast if lost, flagged all if won
    if (newClickIndex === this.clicks.length - 1) {
      if (this.isComplete) {
        this.isWin && this.board.markRemainingFlags();
        !this.isWin && this.board.blast();
      }
      !this.refs.replayIsPanning.value && !this.refs.replayIsInputting.value && this.pause();
    }
  }

  jumpToNextClick() {
    if (this.currentClickIndex === this.clicks.length - 1) {
      this.pause();
      return;
    }

    this.tLastFrame = null; //So we don't immediately jump back to where we were before

    this.jumpToSpecificClickLerped(this.currentClickIndex + 1);

    this.updateReplayBarValue();

    this.board.draw(); //as we may be paused
  }

  jumpToPreviousClick() {
    if (this.currentClickIndex === -1) {
      return;
    }

    this.tLastFrame = null; //So we don't immediately jump back to where we were before

    this.jumpToSpecificClickLerped(this.currentClickIndex - 1);

    this.updateReplayBarValue();

    this.board.draw(); //as we may be paused
  }

  lerpedClickIndexToRawTime(lerpedClickIndex) {
    const flooredClickIndex = Math.floor(lerpedClickIndex);
    const lerp = lerpedClickIndex - flooredClickIndex;

    let rawTime;

    if (lerpedClickIndex < 0) {
      //Before first click
      rawTime = lerpedClickIndex; //This means when starting, we assume it is up to 1 second before the first click
    } else if (flooredClickIndex === this.clicks.length - 1) {
      //At last click
      rawTime = this.clicks.at(-1).time ?? 0;
    } else {
      //Inbetween clicks, so need to check both and lerp
      const firstRawTime = this.clicks[flooredClickIndex].time ?? 0;
      const secondRawTime = this.clicks[flooredClickIndex + 1].time ?? 0;

      rawTime = (1 - lerp) * firstRawTime + lerp * secondRawTime;
    }

    return rawTime;
  }

  lerpedClickIndexToCursorPosition(lerpedClickIndex) {
    if (this.clicks.length === 0) {
      return { x: 0, y: 0 };
    }

    const flooredClickIndex = Math.floor(lerpedClickIndex);
    const lerp = lerpedClickIndex - flooredClickIndex;

    let cursor;

    if (lerpedClickIndex < 0) {
      //Before first click
      if (this.refs.replayType.value === "accurate") {
        cursor = { x: this.clicks[0].xRaw, y: this.clicks[0].yRaw };
      } else {
        cursor = { x: this.clicks[0].x + 0.5, y: this.clicks[0].y + 0.5 };
      }
    } else if (flooredClickIndex === this.clicks.length - 1) {
      //At last click
      if (this.refs.replayType.value === "accurate") {
        cursor = { x: this.clicks.at(-1).xRaw, y: this.clicks.at(-1).yRaw };
      } else {
        cursor = {
          x: this.clicks.at(-1).x + 0.5,
          y: this.clicks.at(-1).y + 0.5,
        };
      }
    } else {
      //Inbetween clicks, so need to find clicks before and after and lerp
      if (this.refs.replayType.value === "accurate") {
        //Accurate replay also needs to check the moves array
        cursor =
          this.getAccurateCursorFromlerpedClickIndexBetweenClicks(
            lerpedClickIndex
          );
      } else {
        const firstCursor = {
          x: this.clicks[flooredClickIndex].x,
          y: this.clicks[flooredClickIndex].y,
        };
        const secondCursor = {
          x: this.clicks[flooredClickIndex + 1].x,
          y: this.clicks[flooredClickIndex + 1].y,
        };

        cursor = {
          x: (1 - lerp) * firstCursor.x + lerp * secondCursor.x + 0.5, //+0.5 needed to centre the click
          y: (1 - lerp) * firstCursor.y + lerp * secondCursor.y + 0.5,
        };
      }
    }

    return cursor;
  }

  //This is for the special case where we know there is a click before and after, and also need to look at mvoes array
  getAccurateCursorFromlerpedClickIndexBetweenClicks(lerpedClickIndex) {
    //Check clicks and moves etc to find where the cursor should be
    const flooredClickIndex = Math.floor(lerpedClickIndex);
    const lerpForClicks = lerpedClickIndex - flooredClickIndex;

    //clicks before and after
    let firstDataPoint = this.clicks[flooredClickIndex];
    let secondDataPoint = this.clicks[flooredClickIndex + 1];

    //Compute raw time
    const firstRawTime = firstDataPoint.time;
    const secondRawTime = secondDataPoint.time;
    const rawTime =
      (1 - lerpForClicks) * firstRawTime + lerpForClicks * secondRawTime;

    //Look to see if there are moves before
    let { above: moveAfter, below: moveBefore } =
      this.findArrayEntryBeforeAndAfterTime(this.moves, rawTime);

    //Update first data point if the data in the moves array is closer to the time we are looking for
    if (moveBefore !== null && moveBefore.time > firstDataPoint.time) {
      firstDataPoint = moveBefore;
    }

    //Likewise for second data point
    if (moveAfter !== null && moveAfter.time < secondDataPoint.time) {
      secondDataPoint = moveAfter;
    }

    //Check special case where the mouse left
    if (firstDataPoint.type === "mouse_leave") {
      return { x: null, y: null };
    }

    let refinedLerp =
      (rawTime - firstDataPoint.time) /
      (secondDataPoint.time - firstDataPoint.time);

    let lerpedPosition = {
      x:
        (1 - refinedLerp) * firstDataPoint.xRaw +
        refinedLerp * secondDataPoint.xRaw,
      y:
        (1 - refinedLerp) * firstDataPoint.yRaw +
        refinedLerp * secondDataPoint.yRaw,
    };

    return lerpedPosition;
  }

  findArrayEntryBeforeAndAfterTime(array, time) {
    //Takes array with elements such as {time: 1.23}
    //And returns the entries before and after it

    //see here https://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers

    var low = 0,
      high = array.length;

    while (low < high) {
      var mid = (low + high) >>> 1;
      if (array[mid].time < time) low = mid + 1;
      else high = mid;
    }

    //Low becomes the index where an element at the given time would be spliced in.

    let elementAbove = array[low]; //Possibly undefined
    let elementBelow = array[low - 1]; //Possibly undefined

    return {
      above: elementAbove ?? null,
      below: elementBelow ?? null,
      aboveIndex: low ?? null,
      belowIndex: low - 1 ?? null,
    };
  }

  forwardSearchForClickIndexlerped(newRawTime) {
    //Loop forwards to locate value to use for currentClickIndexLerped

    let beforeIndex = null;
    let afterIndex = null;

    for (
      let i = Math.max(this.currentClickIndex, 0);
      i < this.clicks.length;
      i++
    ) {
      if (this.clicks[i].time <= newRawTime) {
        beforeIndex = i;
      } else {
        afterIndex = i;
        break;
      }
    }

    if (beforeIndex === null) {
      //Must be at the start
      return Math.max(newRawTime, -1);
    }

    if (afterIndex === null) {
      //Must be at the end
      return this.clicks.length - 1;
    }

    //If we get here, we have a click before and after the time
    //So use lerp stuff to adjust return value based on how close we are to the before and after clicks

    return (
      beforeIndex +
      (newRawTime - this.clicks[beforeIndex].time) /
      (this.clicks[afterIndex].time - this.clicks[beforeIndex].time)
    );
  }

  binarySearchForClickIndexLerped(newRawTime) {
    let {
      above: clickAfter,
      below: clickBefore,
      belowIndex: beforeIndex,
    } = this.findArrayEntryBeforeAndAfterTime(this.clicks, newRawTime);

    if (clickBefore === null) {
      //Must be at the start
      return Math.max(newRawTime, -1);
    }

    if (clickAfter === null) {
      //Must be at the end
      return this.clicks.length - 1;
    }

    //If we get here, we should do lerp stuff to find click index

    return (
      beforeIndex +
      (newRawTime - clickBefore.time) / (clickAfter.time - clickBefore.time)
    );
  }

  //Regular update based on the amount of time that passed.
  doUpdate(tFrame) {
    if (this.tLastFrame === null) {
      this.tLastFrame = tFrame;
    }

    let delta = tFrame - this.tLastFrame;
    this.tLastFrame = tFrame;

    if (this.refs.replayIsPanning.value || this.refs.replayIsInputting.value) {
      delta = 0; //When panning/inputting, we do a soft pause
    }

    if (this.refs.replayType.value === "steppy") {
      let clickIndexDelta =
        (delta / this.millisPerSteppyTurn) * this.refs.replaySpeedMultiplier.value;

      this.currentClickIndexLerped += clickIndexDelta;

      this.jumpToSpecificClickLerped(this.currentClickIndexLerped);
    } else {
      //accurate or rounded replay types

      let timeDelta = (delta / 1000) * this.refs.replaySpeedMultiplier.value;

      let newRawTime = this.rawTime + timeDelta;

      this.currentClickIndexLerped =
        this.forwardSearchForClickIndexlerped(newRawTime);

      this.jumpToSpecificClickLerped(this.currentClickIndexLerped);
    }

    this.updateReplayBarValue();
  }

  //reqAnimFrame loop used when playing
  doReplayLoop(tFrame) {
    this.reqAnimFrameHandle = window.requestAnimationFrame(
      this.doReplayLoop.bind(this)
    );

    this.doUpdate(tFrame);

    this.board.draw();
  }

  //Sets up reqAnimFrame loop
  play() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.refs.replayIsPlaying.value = true;

      this.tLastFrame = null; //So that we don't simulate all the time that's passed since pausing

      if (this.currentClickIndex === this.clicks.length - 1) {
        //If we are already at the end then playing should jump to the start
        this.jumpToSpecificClickLerped(-1);
      }

      this.reqAnimFrameHandle = window.requestAnimationFrame(
        this.doReplayLoop.bind(this)
      );
    }
  }

  pause() {
    if (this.isPlaying) {
      window.cancelAnimationFrame(this.reqAnimFrameHandle);
      this.isPlaying = false;
      this.refs.replayIsPlaying.value = false;

      this.tLastFrame = null; //So that we don't simulate passing (defensive, probably not needed0)

      this.board.draw(); //just in case
    }
  }

  togglePausePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  refreshForReplayTypeChange() {
    this.pause();

    this.setupReplayBar();

    //Small hacky way to get it to update mouse position for replay type
    this.jumpToSpecificClickLerped(this.currentClickIndexLerped);

    this.board.draw();
  }

  setupReplayBar() {
    this.refs.replayBarStartValue.value = -1;
    if (this.refs.replayType.value === "steppy") {
      this.refs.replayBarLastValue.value = this.clicks.length - 1;
    } else {
      //accurate/rounded replay type
      this.refs.replayBarLastValue.value = this.clicks.at(-1)?.time;
    }

    this.updateReplayBarValue();
  }

  updateReplayBarValue() {
    if (this.refs.replayType.value === "steppy") {
      this.refs.replayProgress.value = this.currentClickIndexLerped;
      if (!this.refs.replayIsInputting.value) {
        //Guard against changing value whilst we are editing it
        this.refs.replayProgressRounded.value = this.currentClickIndexLerped.toFixed(3);
      }
    } else {
      //accurate/rounded replay type
      this.refs.replayProgress.value = this.rawTime;
      if (!this.refs.replayIsInputting.value) {
        //Guard against changing value whilst we are editing it
        this.refs.replayProgressRounded.value = this.rawTime.toFixed(3);
      }
    }
  }

  handleSliderChange(newValue) {
    //Update stuff when the user changes the slider

    this.tLastFrame = null; //So we don't immediately jump back to where we were before

    if (this.refs.replayType.value === "steppy") {
      this.jumpToSpecificClickLerped(newValue);
    } else {
      //accurate/rounded replay type
      this.currentClickIndexLerped =
        this.binarySearchForClickIndexLerped(newValue);

      this.jumpToSpecificClickLerped(this.currentClickIndexLerped);
    }

    this.updateReplayBarValue();

    this.board.draw();
  }

  handleInputChange(newValue) {
    //This is for updating the time of a replay using the input box to the right of the slider
    //First we figure out which time to update with
    let floatVal = parseFloat(newValue);

    let valueToUpdateWith;

    if (!Number.isFinite(floatVal)) {
      return; //Do nothing
    }

    if (this.refs.replayBarLastValue.value.toFixed(3) === floatVal.toFixed(3)) {
      //f we are at the end of the replay, then allow small rounding to hit the final click
      valueToUpdateWith = this.refs.replayBarLastValue.value;
    } else {
      valueToUpdateWith = Utils.clamp(
        floatVal,
        this.refs.replayBarStartValue.value,
        this.refs.replayBarLastValue.value
      );
    }

    //After figuring out which time to change to, we do the same as if it was a slider change
    this.handleSliderChange(valueToUpdateWith);
  }

  handleReplayClick(x, y) {
    //Clicking on a square will jump to just before that square was revealed
    let targetIndex = null;

    let {
      clickIndex: mainClickIndex,
      revealedByOpeningIndex: mainRevealedByOpeningIndex,
    } = this.findFirstInteractionForSquare(x, y);

    //Check if the square gets directly revealed (and not by an opening)
    if (mainClickIndex !== null && targetIndex === null) {
      targetIndex = mainClickIndex;
    }

    //Check if the square gets revealed by an opening
    if (mainRevealedByOpeningIndex !== null && targetIndex === null) {
      targetIndex = mainRevealedByOpeningIndex;
    }

    //If we still haven't found this square, then look at when the neighbouring cells were revealed
    if (targetIndex === null) {
      let allNeighboursBestIndex = null;

      for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
          if (!this.board.checkCoordsInBounds(i, j)) {
            continue;
          }

          let {
            clickIndex: neighbourClickIndex,
            revealedByOpeningIndex: neighbourRevealedByOpeningIndex,
          } = this.findFirstInteractionForSquare(i, j);

          //Check if this neighbour is an improvement
          let neighbourBest = null;

          //First try look at when the neighbour was interacted with
          // and, barring that, look at when it was opened (if part of an opening)
          if (neighbourClickIndex !== null) {
            neighbourBest = neighbourClickIndex;
          } else if (neighbourRevealedByOpeningIndex !== null) {
            neighbourBest = neighbourRevealedByOpeningIndex;
          }

          //If neighbour was interacted with, and this interaction was later than other neighbours
          //Then update current best for all neighbours
          if (neighbourBest !== null) {
            if (
              allNeighboursBestIndex === null ||
              neighbourBest > allNeighboursBestIndex
            ) {
              allNeighboursBestIndex = neighbourBest;
            }
          }
        }
      }

      if (allNeighboursBestIndex !== null) {
        targetIndex = allNeighboursBestIndex;
      }
    }

    //If we still haven't found it, then jump to the end
    if (targetIndex === null) {
      targetIndex = this.clicks.length - 1;
    }

    if (this.refs.replayType.value === "steppy") {
      //Jump to click before the one that reveals the square
      this.handleSliderChange(targetIndex - 1);
    } else {
      //Jump to 0.5 seconds before the click that reveals the square
      this.handleSliderChange(this.clicks[targetIndex].time - 0.5);
    }
    this.play();
  }

  findFirstInteractionForSquare(x, y) {
    //Used by replay jumper
    //There are various rules for finding which time/index to jump to when a square is clicked on
    //Primarily, we find when the square was first revealed normally
    //and also when it was first revealed as part of an opening

    const { numbersArray, openingLabels, preprocessedOpenings } =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
        this.board.mines
      );

    const openingsLabelsTouched = [];

    //check what openings it touches
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (!this.board.checkCoordsInBounds(i, j)) {
          continue;
        }

        const neighbourOpeningLabel = openingLabels[i][j];
        if (
          typeof neighbourOpeningLabel === "number" &&
          neighbourOpeningLabel !== 0
        ) {
          if (!openingsLabelsTouched.includes(neighbourOpeningLabel)) {
            openingsLabelsTouched.push(neighbourOpeningLabel);
          }
        }
      }
    }

    let clickIndex = null;
    let revealedByOpeningIndex = null;

    for (let i = 0; i < this.clicks.length; i++) {
      const thisClick = this.clicks[i];

      if (
        thisClick.type === "left" &&
        thisClick.x === x &&
        thisClick.y === y &&
        numbersArray[x][y] !== 0
      ) {
        //Square was directly left clicked on, and wasn't an opening
        clickIndex = i;
        break;
      }

      if (
        thisClick.type === "left" &&
        numbersArray[thisClick.x][thisClick.y] === 0 &&
        openingsLabelsTouched.includes(openingLabels[thisClick.x][thisClick.y])
      ) {
        //This click was an opening that would reveal this square
        if (revealedByOpeningIndex === null) {
          revealedByOpeningIndex = i;
        }
        break;
      }

      if (
        thisClick.type === "right" &&
        thisClick.x === x &&
        thisClick.y === y
      ) {
        //square was flagged
        clickIndex = i;
        break;
      }

      if (
        thisClick.type === "chord" &&
        Math.abs(thisClick.x - x) <= 1 &&
        Math.abs(thisClick.y - y) <= 1
      ) {
        //square was revealed from chord
        clickIndex = i;
        break;
      }

      //Also check case where it was a chord that opened the opening that this cell is a part of
      if (thisClick.type === "chord") {
        for (let k = thisClick.x - 1; k <= thisClick.x + 1; k++) {
          for (let l = thisClick.y - 1; l <= thisClick.y + 1; l++) {
            if (!this.board.checkCoordsInBounds(k, l)) {
              continue;
            }
            if (numbersArray[k][l] !== 0) {
              //Only need to look at chord neighbours that are zeros
              continue;
            }

            const neighbourOpeningLabel = openingLabels[k][l];

            if (openingsLabelsTouched.includes(neighbourOpeningLabel)) {
              //The chord has a neighbouring zero that opens our square
              if (revealedByOpeningIndex === null) {
                revealedByOpeningIndex = i;
              }
              //Ideally would break out of both loops here, but code would be messier and performance doesn't matter...
            }
          }
        }
      }
    }

    return {
      clickIndex,
      revealedByOpeningIndex,
    };
  }

  refreshAndDraw() {
    const currentClickIndexLerped = this.currentClickIndexLerped;

    this.currentClickIndex = null;
    this.currentClickIndexLerped = null;

    this.jumpToSpecificClickLerped(currentClickIndexLerped);
    this.board.draw();
  }
}

export default Replay;