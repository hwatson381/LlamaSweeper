import CONSTANTS from "src/includes/Constants";

import {
  boardHorizontalPadding,
  boardTopPadding,
  topPanelTopAndBottomBorder,
  topPanelHeight,
  showBorders,
  chordingButtons,
  flagToggleActive,
  flagToggleSwitchAfterStart,
  mobileModeEnabled,
  mobileScrollSetting,
  scrollLetThroughActive,
  mobileDelayForEnableScroll,
  touchRevealLocation,
  touchRevealTiming,
  touchLongPressTime,
  touchLongPressDisabled,
  touchMaxTime,
  touchScrollDistance,
  faceHitbox,
  keyboardClickOpenOnKeyDown,
} from "src/composables/useSettings";

class BoardInput {
  constructor(board) {
    this.board = board;
  }

  handleMouseDown(event) {
    if (mobileModeEnabled.value) {
      return;
    }

    const canvasCoords = this.eventToCanvasCoord(event);
    const flooredCoords = this.eventToFlooredTileCoords(event);
    const unflooredCoords = this.eventToUnflooredTileCoords(event);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isDigInput = event.button === 0;
    const isFlagInput = event.button === 2;
    const isMiddleClick = event.button === 1;
    const isTouchInput = false;
    const isDown = true;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      event,
      "mouse"
    );

    return;
  }

  handleMouseUp(event) {
    if (mobileModeEnabled.value) {
      return;
    }

    const canvasCoords = this.eventToCanvasCoord(event);
    const flooredCoords = this.eventToFlooredTileCoords(event);
    const unflooredCoords = this.eventToUnflooredTileCoords(event);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isDigInput = event.button === 0;
    const isFlagInput = event.button === 2;
    const isMiddleClick = event.button === 1;
    const isTouchInput = false;
    const isDown = false;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      event,
      "mouse"
    );

    return;
  }

  handleMouseMove(event, isEnter, isLeave) {
    if (mobileModeEnabled.value) {
      return;
    }

    //Update coords as would be used by keyboard clicks
    this.board.lastClientCoords.clientX = event.clientX;
    this.board.lastClientCoords.clientY = event.clientY;

    if (this.board.gameStage !== "pregame" && this.board.gameStage !== "running") {
      return; //only track mouse when game is running or just before
    }

    if (this.board.quickPaintActive) {
      //Do nothing as quickpaint
      return;
    }
    if (this.board.gameStage === "edit") {
      //Do nothing as edit mode - consider disabling stats object entirely for this mode
      return;
    }

    let unflooredCoords = this.eventToUnflooredTileCoords(event);

    //checks if left mouse button down
    const isLeftDown =
      Boolean(event.buttons & 1) ||
      (this.board.keyboardClickIsDigDown && !keyboardClickOpenOnKeyDown.value);

    //checks if right mouse button down
    const isRightDown =
      Boolean(event.buttons & 2) || this.board.keyboardClickIsFlagDown;

    const requiresRedraw = this.mouseMove(
      unflooredCoords.tileX,
      unflooredCoords.tileY,
      isEnter,
      isLeave,
      isLeftDown,
      isRightDown
    );
    if (requiresRedraw) {
      this.board.boardRenderer.draw();
    }
  }

  handleTouchStart(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.board.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      const canvasCoords = this.eventToCanvasCoord(touch);
      const flooredCoords = this.eventToFlooredTileCoords(touch);
      const unflooredCoords = this.eventToUnflooredTileCoords(touch);

      const coordsData = {
        canvasCoords,
        flooredCoords,
        unflooredCoords,
      };

      let isScrollingTouch = false;
      if (
        mobileScrollSetting.value === "zero" &&
        this.board.gameStage === "running" &&
        this.board.tilesArray[flooredCoords.tileX]?.[flooredCoords.tileY]?.state ===
        0 &&
        this.canTileBeUsedForMobileScrollConditions(
          flooredCoords.tileX,
          flooredCoords.tileY
        )
      ) {
        //If we have the scroll on zeros setting then this touch gets blocked, and we let the touch through
        //We also check the timestamp incase there is a delay that must pass before the tile becomes scrollable
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      if (
        mobileScrollSetting.value === "enclosed nf" &&
        this.board.gameStage === "running" &&
        this.isTileEnclosed(flooredCoords.tileX, flooredCoords.tileY, false)
      ) {
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      if (
        mobileScrollSetting.value === "enclosed flag" &&
        this.board.gameStage === "running" &&
        this.isTileEnclosed(flooredCoords.tileX, flooredCoords.tileY, true)
      ) {
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      let isDigInput;
      let isFlagInput;

      if (mobileModeEnabled.value && flagToggleActive.value) {
        isDigInput = false;
        isFlagInput = true;
      } else {
        isDigInput = true;
        isFlagInput = false;
      }

      const isMiddleClick = false;
      const isTouchInput = true;

      let isDown;

      if (touchRevealTiming.value === "end") {
        isDown = true; //Normally the first touch is down, and the release is up (like mousedown/mouseup except for touches)
      } else if (touchRevealTiming.value === "start") {
        //This is very hacky
        isDown = false;
        //If we are timing it to reveal the square when the finger first makes contact
        //then we fake it by sending an "up" input immediately
        //Later on we deactivate the touch, so it doesn't get processed for a second time
      }

      const touchIdentifier = touch.identifier;

      const screenCoords = {
        x: touch.screenX,
        y: touch.screenY,
      };

      this.board.ongoingTouches.set(touchIdentifier, {
        startTime: event.timeStamp,
        startCoordsData: structuredClone(coordsData), //Ugly, but just in case it gets changed in boardInput.handlePointerInput function.
        startScreenCoords: screenCoords,
        active: true, //Changes to false if the touch is cancelled (e.g. it moved more than x distance or lasted more than y seconds)
        isScrollingTouch: isScrollingTouch,
      });

      if (isScrollingTouch && !scrollLetThroughActive.value) {
        //this touch is for scrolling, so doesn't need to be processed further
        continue;
      }

      this.handlePointerInput(
        isDigInput,
        isFlagInput,
        isMiddleClick,
        isTouchInput,
        isDown,
        coordsData,
        event,
        touchIdentifier
      );

      if (touchRevealTiming.value === "start") {
        //Since we already processed the touch on the start, we deactivate so it doesn't get processed again
        this.board.ongoingTouches.get(touchIdentifier).active = false;
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }
  }

  handleTouchEnd(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let redrawNeededForBlockedTouched = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.board.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      //Get touch entry and delete it (whilst hanging onto reference inside this function)
      let thisTouch = this.board.ongoingTouches.get(touch.identifier);
      this.board.ongoingTouches.delete(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue;
        }
      }

      let isDigInput;
      let isFlagInput;

      const isLongPress =
        !touchLongPressDisabled.value &&
        event.timeStamp - thisTouch.startTime >= touchLongPressTime.value;

      //Note - below is the same as doing isFlagMode XOR isLongPress
      if (mobileModeEnabled.value && flagToggleActive.value != isLongPress) {
        isDigInput = false;
        isFlagInput = true;
      } else {
        isDigInput = true;
        isFlagInput = false;
      }

      const isMiddleClick = false;
      const isTouchInput = true;
      const isDown = false;
      const touchIdentifier = touch.identifier;

      const endCanvasCoords = this.eventToCanvasCoord(touch);
      const endFlooredCoords = this.eventToFlooredTileCoords(touch);
      const endUnflooredCoords = this.eventToUnflooredTileCoords(touch);

      const endCoordsData = {
        canvasCoords: endCanvasCoords,
        flooredCoords: endFlooredCoords,
        unflooredCoords: endUnflooredCoords,
      };

      let coordsData;

      if (touchRevealLocation.value === "start") {
        coordsData = thisTouch.startCoordsData;
      } else if (touchRevealLocation.value === "end") {
        coordsData = endCoordsData;
      } else if (touchRevealLocation.value === "block") {
        //Check touch start and touch end are on the same square. Otherwise cancel the touch
        //But only if the touch is on the board, otherwise use end location
        if (
          this.board.checkCoordsInBounds(
            endCoordsData.flooredCoords.tileX,
            endCoordsData.flooredCoords.tileY
          )
        ) {
          if (
            thisTouch.startCoordsData.flooredCoords.tileX ===
            endCoordsData.flooredCoords.tileX &&
            thisTouch.startCoordsData.flooredCoords.tileY ===
            endCoordsData.flooredCoords.tileY
          ) {
            coordsData = endCoordsData;
          } else {
            //Cancel touch on board as it started and ended on different square
            thisTouch.active = false;
          }
        } else {
          coordsData = endCoordsData;
        }
      }

      //Check if touch has exceeded max time
      if (event.timeStamp - thisTouch.startTime >= touchMaxTime.value) {
        //Cancel touch if it has went on too long
        thisTouch.active = false;
      }

      //Check touch has moved max distance
      if (
        Math.sqrt(
          (touch.screenX - thisTouch.startScreenCoords.x) ** 2 +
          (touch.screenY - thisTouch.startScreenCoords.y) ** 2
        ) /
        this.board.tileSize >=
        touchScrollDistance.value
      ) {
        //Cancel touch as it has moved too much
        thisTouch.active = false;
      }

      if (!thisTouch.active) {
        //Touch was deactivated, so remove depressed square if needed and exit instead of processing further
        this.updateDepressedSquares(null, null, isDown, touchIdentifier);
        redrawNeededForBlockedTouched = true;
        continue;
      }

      this.handlePointerInput(
        isDigInput,
        isFlagInput,
        isMiddleClick,
        isTouchInput,
        isDown,
        coordsData,
        event,
        touchIdentifier
      );
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (redrawNeededForBlockedTouched) {
      this.board.boardRenderer.draw();
    }
  }

  handleTouchMove(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //NOTE - currently we don't save position changes to stats, but we may start doing this in the future
    //It's a bit more complicated than tracking the mouse as there can be multiple simultaneous paths
    //that start and stop. So we'd also have to save identifier information

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    if (this.board.gameStage !== "pregame" && this.board.gameStage !== "running") {
      return; //only track touch moves when game is running or just before
    }
    if (this.board.quickPaintActive) {
      //Do nothing as quickpaint
      return;
    }
    if (this.board.gameStage === "edit") {
      //Do nothing as edit mode
      return;
    }

    const touches = event.changedTouches;

    let requiresRedraw = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.board.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if coniditons are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      let thisTouch = this.board.ongoingTouches.get(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue; //This touch is scrolling, so no need to process further
        }
      }

      if (!thisTouch.active) {
        continue;
      }

      let needsDeactivating = false;

      //Check if touch has exceeded max time
      if (event.timeStamp - thisTouch.startTime >= touchMaxTime.value) {
        needsDeactivating = true;
      }

      //Check touch has moved max distance
      if (
        Math.sqrt(
          (touch.screenX - thisTouch.startScreenCoords.x) ** 2 +
          (touch.screenY - thisTouch.startScreenCoords.y) ** 2
        ) /
        this.board.tileSize >=
        touchScrollDistance.value
      ) {
        needsDeactivating = true;
      }

      if (needsDeactivating) {
        thisTouch.active = false;
        this.updateDepressedSquares(null, null, false, touch.identifier);
        requiresRedraw = true;
        continue;
      }

      if (touchRevealLocation.value === "end") {
        const flooredCoords = this.eventToFlooredTileCoords(touch);

        const isDown = true;
        const touchIdentifier = touch.identifier;

        let thisTouchNeededRedraw = this.updateDepressedSquares(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDown,
          touchIdentifier
        );

        if (thisTouchNeededRedraw) {
          requiresRedraw = true;
        }
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (requiresRedraw) {
      this.board.boardRenderer.draw();
    }
  }

  handleTouchCancel(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let requiresRedraw = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.board.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      let thisTouch = this.board.ongoingTouches.get(touch.identifier);
      this.board.ongoingTouches.delete(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue;
        }
      }

      if (!thisTouch.active) {
        continue;
      }

      const isDown = false;
      const touchIdentifier = touch.identifier;

      let thisTouchNeededRedraw = this.updateDepressedSquares(
        null,
        null,
        isDown,
        touchIdentifier
      );

      if (thisTouchNeededRedraw) {
        requiresRedraw = true;
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (requiresRedraw) {
      this.board.boardRenderer.draw();
    }
  }

  sendKeyboardClick(isDigInput, isFlagInput, isDown, timeStamp) {
    //Sends a keyboard click base on the last location of boardInput.mouseMove
    //Very hacky

    if (mobileModeEnabled.value) {
      //Just in case - tbh it might be possible to allow this, but simpler to not.
      return;
    }

    if (isDigInput) {
      //defend against repeating keys
      if (isDown && this.board.keyboardClickIsDigDown) {
        return;
      }
      if (isDown) {
        this.board.keyboardClickIsDigDown = true;
      }
      if (!isDown) {
        this.board.keyboardClickIsDigDown = false;
      }
    }

    if (isFlagInput) {
      //defend against repeating keys
      if (isDown && this.board.keyboardClickIsFlagDown) {
        return;
      }
      if (isDown) {
        this.board.keyboardClickIsFlagDown = true;
      }
      if (!isDown) {
        this.board.keyboardClickIsFlagDown = false;
      }
    }

    //If they have the setting for it, we do digs on key down instead of up
    //We do this by faking a key up input, and blocking the real key up
    //This is very hacky
    if (isDigInput && !isDown && keyboardClickOpenOnKeyDown.value) {
      //Block key up from doing anything
      return;
    }
    if (isDigInput && isDown && keyboardClickOpenOnKeyDown.value) {
      //Convert key down into key up
      isDown = false;
    }

    let fakeEvent = {
      clientX: this.board.lastClientCoords.clientX,
      clientY: this.board.lastClientCoords.clientY,
      timeStamp: timeStamp,
    };

    const canvasCoords = this.eventToCanvasCoord(fakeEvent);
    const flooredCoords = this.eventToFlooredTileCoords(fakeEvent);
    const unflooredCoords = this.eventToUnflooredTileCoords(fakeEvent);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isMiddleClick = false;
    const isTouchInput = false;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      fakeEvent,
      "mouse"
    );

    return;
  }

  handlePageScroll(event) {
    //On mobile, if the page starts scrolling, we should cancel all active touches.
    //Try keep this function fast as page scroll gets called a lot

    let redrawRequired = false;

    for (let touch of this.board.ongoingTouches.values()) {
      if (!touch.active) {
        continue; //Touch already cancelled, so skip it
      }

      touch.active = false;

      const isDown = false;
      const touchIdentifier = touch.identifier;

      let thisTouchNeededRedraw = this.updateDepressedSquares(
        null,
        null,
        isDown,
        touchIdentifier
      );

      if (thisTouchNeededRedraw) {
        redrawRequired = true;
      }
    }

    if (redrawRequired) {
      this.board.boardRenderer.draw();
    }
  }

  eventToCanvasCoord(event) {
    //Get coords relative to canvas
    const canvasRawX =
      event.clientX - this.board.mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - this.board.mainCanvas.value.getBoundingClientRect().top;

    return { canvasRawX, canvasRawY };
  }

  eventToUnflooredTileCoords(event) {
    //Extracts tile coords from mouseEvent. But not floored
    const canvasRawX =
      event.clientX - this.board.mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - this.board.mainCanvas.value.getBoundingClientRect().top;

    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardTopPadding.value;

    let tileX = boardRawX / this.board.tileSize;
    let tileY = boardRawY / this.board.tileSize;

    return { tileX, tileY };
  }

  eventToFlooredTileCoords(event) {
    //Extracts tile coords from mouseEvent. These are floored
    let { tileX, tileY } = this.eventToUnflooredTileCoords(event);
    let flooredCoords = this.board.unflooredToFlooredTileCoords(tileX, tileY);

    return flooredCoords; //format is {tileX: ..., tileY: ...}
  }

  handlePointerInput(
    isDigInput,
    isFlagInput,
    isMiddleClick,
    isTouchInput,
    isDown,
    coordsData,
    event,
    touchIdentifier
  ) {
    //generic handler for left/right up/down and also touch

    let isDrawRequired = false;

    const mouseDownOrTouchUp =
      (!isTouchInput && isDown) || (isTouchInput && !isDown);

    let flooredCoords = coordsData.flooredCoords;
    let unflooredCoords = coordsData.unflooredCoords;
    let canvasCoords = coordsData.canvasCoords;

    if (this.board.gameStage === "running") {
      this.board.lastSquaresChangedForAutoHint = [];
    }

    if (touchIdentifier === "mouse" && chordingButtons.value === "l+r") {
      //Update states for l+r chord
      if (isDigInput) {
        //Track whether left click is up or down
        this.board.lrChordingState.leftDown = isDown;
      }
      if (isFlagInput) {
        //Track whether right click is up or down
        this.board.lrChordingState.rightDown = isDown;
      }

      //Update whether the hover is a 3x3 block or a single square, but only if there has been a new click event
      if (isDigInput || isFlagInput) {
        if (this.board.lrChordingState.leftDown && this.board.lrChordingState.rightDown) {
          //Both down => hover should be 3x3 block
          this.board.lrChordingState.hoverType = "block";
        } else if (
          this.board.lrChordingState.leftDown &&
          !this.board.lrChordingState.rightDown &&
          this.board.lrChordingState.hoverType !== "empty"
        ) {
          //Only left down => hover should be single square
          this.board.lrChordingState.hoverType = "single";
        } else if (
          !this.board.lrChordingState.leftDown &&
          !this.board.lrChordingState.rightDown &&
          this.board.lrChordingState.hoverType !== "empty"
        ) {
          //If nothing is down then reset to default behaviour of single square hover
          this.board.lrChordingState.hoverType = "single";
        }
      }
    }

    // ########## Check for face click #############

    //Check for face click and exit early if it was clicked on
    if (
      (!isTouchInput && isDigInput && !isDown) ||
      (isTouchInput && (isDigInput || isFlagInput) && !isDown)
    ) {
      let wasClickOnFace = this.attemptFaceClick(
        canvasCoords,
        flooredCoords,
        touchIdentifier
      );
      if (wasClickOnFace) {
        //Don't process click further
        this.board.boardRenderer.draw(); //just in case
        return; //Note that this includes clicks on face that then got cancelled.
      }
    }

    // ############### Section for mostly mouse down stuff #################

    //Handle clicks in quickpaint, and exit early
    if (this.board.quickPaintActive && this.board.gameStage === "running") {
      if (mouseDownOrTouchUp) {
        this.board.quickPaint.handleQuickPaintClick(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDigInput,
          isFlagInput,
          isMiddleClick,
          event
        );
        this.board.boardRenderer.draw();
      }
      return;
    }

    //handle clicks in edit mode and exit early if nothing to do
    if (this.board.gameStage === "edit") {
      if (mouseDownOrTouchUp && (isDigInput || isFlagInput)) {
        this.board.handleEditClick(flooredCoords.tileX, flooredCoords.tileY);
        this.board.boardRenderer.draw();
      }

      return;
    }

    //handle clicks in analyse mode (used by zini explorer)
    if (this.board.gameStage === "analyse") {
      if (mouseDownOrTouchUp) {
        this.board.handleZiniExploreClick(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDigInput,
          isFlagInput
        );
        this.board.boardRenderer.draw();
      }
      return;
    }

    //handle clicks in replay mode and exit early if nothing to do
    if (this.board.gameStage === "replay") {
      if (mouseDownOrTouchUp && (isDigInput || isFlagInput)) {
        this.board.handleReplayClick(flooredCoords.tileX, flooredCoords.tileY);
        this.board.boardRenderer.draw();
      }

      return;
    }

    //Depress squares when hovered over with mouse down
    if (
      (this.board.gameStage === "running" || this.board.gameStage === "pregame") &&
      isDown &&
      isDigInput
    ) {
      isDrawRequired = this.holdDownDig(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Potentially change hover when right click is down and on l+r chording
    if (
      chordingButtons.value === "l+r" &&
      touchIdentifier === "mouse" &&
      isFlagInput &&
      isDown
    ) {
      isDrawRequired = this.holdDownFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Potentially change hover when right click is up and on l+r chording
    if (
      chordingButtons.value === "l+r" &&
      touchIdentifier === "mouse" &&
      isFlagInput &&
      !isDown
    ) {
      isDrawRequired = this.releaseFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Depress squares when hovered over with flag toggled on with mobile (chord on flag mode)
    if (this.board.gameStage === "running" && isDown && isFlagInput && isTouchInput) {
      isDrawRequired = this.holdDownTouchFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Flag square for mouse
    if (
      this.board.gameStage === "running" &&
      isDown &&
      isFlagInput &&
      !isTouchInput &&
      !(
        touchIdentifier === "mouse" &&
        chordingButtons.value === "l+r" &&
        this.board.lrChordingState.leftDown
      )
    ) {
      this.board.attemptFlag(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        true,
        true
      );
      isDrawRequired = true;
    }

    // ############### Section for mostly mouse up stuff #################

    //Do first click on board
    if (this.board.gameStage === "pregame" && !isDown && isDigInput) {
      const generationResult = this.board.generateBoard(
        flooredCoords.tileX,
        flooredCoords.tileY
      );
      if (generationResult.success) {
        this.board.gameStage = "running";
        //Game then continues with the code below providing the click to open the first square.
        //Slightly hacky, but we also optionally change where the first click is if the board
        //received requires a different first click
        if (generationResult.rewrittenFirstClick) {
          //unflooredCoords as these are what attemptChordOrDig uses.
          unflooredCoords.tileX = generationResult.rewrittenFirstClick.x;
          unflooredCoords.tileY = generationResult.rewrittenFirstClick.y;
        }
        if (mobileModeEnabled.value && flagToggleSwitchAfterStart.value) {
          flagToggleActive.value = true;
        }
      } else {
        this.updateDepressedSquares(
          flooredCoords.tileX,
          flooredCoords.tileY,
          false,
          touchIdentifier
        );
        this.board.boardRenderer.draw();
        return; //Don't start game. Click not inbounds, or something else went wrong
      }
    }

    let needToCheckForWinOrLoss = false;

    //Try to chord or open square with left click (e.g. mouse left click)
    if (
      this.board.gameStage === "running" &&
      !isDown &&
      isDigInput &&
      !(touchIdentifier === "mouse" && chordingButtons.value === "l+r")
    ) {
      this.board.attemptChordOrDig(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier,
        event.timeStamp
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to chord square using l+r chord
    //Lifting up either left click or right click when both were down
    if (
      this.board.gameStage === "running" &&
      !isDown &&
      ((isDigInput && this.board.lrChordingState.rightDown) || //Lift up left whilst right down
        (isFlagInput && this.board.lrChordingState.leftDown)) && //Or lift up right whilst left down
      touchIdentifier === "mouse" &&
      chordingButtons.value === "l+r"
    ) {
      this.board.attemptChordOnly(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to dig square when on l+r chord
    //Lifting up left click when only left click was down, and also a chord was not spent
    if (
      this.board.gameStage === "running" &&
      !isDown &&
      isDigInput &&
      !this.board.lrChordingState.rightDown &&
      touchIdentifier === "mouse" &&
      chordingButtons.value === "l+r" &&
      this.board.lrChordingState.hoverType !== "empty"
    ) {
      this.board.attemptDigOnly(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier,
        event.timeStamp
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to flag or chord (when the flag toggle is active on mobile)
    if (
      this.board.gameStage === "running" &&
      isFlagInput &&
      !isDown &&
      isTouchInput
    ) {
      this.board.attemptFlagOrChord(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Edge case - cancel mobile long-press flag input in pregame (otherwise depressed squares get stuck)
    if (
      this.board.gameStage === "pregame" &&
      isFlagInput &&
      !isDown &&
      isTouchInput
    ) {
      isDrawRequired = this.updateDepressedSquares(
        flooredCoords.tileX,
        flooredCoords.tileY,
        false,
        touchIdentifier
      );
    }

    //Edge case, return to single hover when everything released and empty hover (has to happen at end so that we can block a secondary dig that would happen after chording)
    if (
      touchIdentifier === "mouse" &&
      chordingButtons.value === "l+r" &&
      (isDigInput || isFlagInput) &&
      !this.board.lrChordingState.leftDown &&
      !this.board.lrChordingState.rightDown &&
      this.board.lrChordingState.hoverType === "empty"
    ) {
      //If nothing is down then reset to default behaviour of single square hover
      this.board.lrChordingState.hoverType = "single";
    }

    //Check if an opening has occured on mean openings
    if (
      this.board.variant === "mean openings" &&
      this.board.unprocessedMeanZeros?.length !== 0
    ) {
      this.board.meanOpenings.makeOpeningMean(event.timeStamp);
    }

    //Check if board is complete (note that checking gameStage is redundant but defensive)
    if (this.board.gameStage === "running" && needToCheckForWinOrLoss) {
      if (this.board.blasted) {
        this.board.doLose();
      } else if (this.board.checkWin()) {
        this.board.doWin();
      }
    }

    if (isDrawRequired) {
      this.board.boardRenderer.draw();
    }
  }


  mouseMove(
    unflooredTileX,
    unflooredTileY,
    isEnter,
    isLeave,
    isLeftDown,
    isRightDown
  ) {
    let time = this.board.getTime();

    let { tileX, tileY } = this.board.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (chordingButtons.value === "l+r") {
      //Update states for l+r chord
      let buttonsChanged = false;
      if (this.board.lrChordingState.leftDown !== isLeftDown) {
        //left button changed, possibly off canvas
        this.board.lrChordingState.leftDown = isLeftDown;
        buttonsChanged = true;
      }

      if (this.board.lrChordingState.rightDown !== isRightDown) {
        //right button changed, possibly off canvas
        this.board.lrChordingState.rightDown = isRightDown;
        buttonsChanged = true;
      }

      //Update whether the hover is a 3x3 block or a single square, but only if there has been a new click event
      if (buttonsChanged) {
        if (this.board.lrChordingState.leftDown && this.board.lrChordingState.rightDown) {
          //Both down => hover should be 3x3 block
          this.board.lrChordingState.hoverType = "block";
        } else if (
          this.board.lrChordingState.leftDown &&
          !this.board.lrChordingState.rightDown &&
          this.board.lrChordingState.hoverType !== "empty"
        ) {
          //Only left down => hover should be single square
          this.board.lrChordingState.hoverType = "single";
        } else if (
          !this.board.lrChordingState.leftDown &&
          !this.board.lrChordingState.rightDown &&
          this.board.lrChordingState.hoverType !== "empty"
        ) {
          //If nothing is down then reset to default behaviour of single square hover
          this.board.lrChordingState.hoverType = "single";
        }
      }
    }

    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      isLeftDown,
      "mouse"
    );

    if (this.board.gameStage !== "pregame") {
      if (isEnter) {
        this.board.stats.addMouseEnter(unflooredTileX, unflooredTileY, time);
      } else if (isLeave) {
        this.board.stats.addMouseLeave(unflooredTileX, unflooredTileY, time);
      } else {
        this.board.stats.addMouseMove(unflooredTileX, unflooredTileY, time);
      }
    }

    return requiresRedraw;
  }

  updateDepressedSquares(
    tileX,
    tileY,
    newIsLeftMouseDownValue,
    touchIdentifier = "mouse"
  ) {
    //Handle depressing squares when left mouse is down and over a square or a number (in which case this "prepares" the chord)

    //Set tileX/tileY to null if out of bounds
    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      tileX = null;
      tileY = null;
    }

    //Find out where the current hovered square is and whether it is depressed.
    //This works a bit differently for touches as we can have multiple depressed at once
    let isCurrentlyDown;
    let currentLocation;

    if (touchIdentifier === "mouse") {
      isCurrentlyDown = this.board.isLeftMouseDown;
      currentLocation = this.board.hoveredSquare;
    } else {
      isCurrentlyDown = this.board.touchDepressedSquaresMap.has(touchIdentifier);
      if (isCurrentlyDown) {
        currentLocation = this.board.touchDepressedSquaresMap.get(touchIdentifier);
      } else {
        currentLocation = { x: null, y: null };
      }
    }

    const leftMouseDownChanged = isCurrentlyDown !== newIsLeftMouseDownValue;
    const hoveredSquareMoved =
      tileX !== currentLocation.x || tileY !== currentLocation.y;

    const hoverTypeChanged =
      this.board.lrChordingState.hoverType !==
      this.board.lrChordingState.lastDrawnHoverType;

    if (
      !hoveredSquareMoved &&
      !leftMouseDownChanged &&
      !(
        touchIdentifier === "mouse" &&
        chordingButtons.value === "l+r" &&
        hoverTypeChanged
      )
    ) {
      const requiresRedraw = false;
      return requiresRedraw;
    }

    this.board.lrChordingState.lastDrawnHoverType = this.board.lrChordingState.hoverType; //for l+r chord only

    //Maybe slightly excessive and inefficient, but easier to clear out hover and reapply each time rather than going through all cases

    let clearHover = (hoverSquareX, hoverSquareY) => {
      for (let x = hoverSquareX - 1; x <= hoverSquareX + 1; x++) {
        for (let y = hoverSquareY - 1; y <= hoverSquareY + 1; y++) {
          if (this.board.tilesArray[x]?.[y]) {
            this.board.tilesArray[x][y].depressed = false;
          }
        }
      }
    };

    //Clear out old hover (3x3 block so we don't have to check whether it was a chord or singleton)
    //clear mouse hover
    if (
      this.board.hoveredSquare.x !== null &&
      this.board.hoveredSquare.y !== null &&
      this.board.isLeftMouseDown
    ) {
      clearHover(this.board.hoveredSquare.x, this.board.hoveredSquare.y);
    }
    //clear touch hover
    for (let touchedSquare of this.board.touchDepressedSquaresMap.values()) {
      if (touchedSquare.x !== null && touchedSquare.y !== null) {
        clearHover(touchedSquare.x, touchedSquare.y);
      }
    }

    //Update which squares we store as being hovered
    if (touchIdentifier === "mouse") {
      //for mouse
      this.board.hoveredSquare.x = tileX;
      this.board.hoveredSquare.y = tileY;
      this.board.isLeftMouseDown = newIsLeftMouseDownValue;
    } else {
      //for touch
      if (newIsLeftMouseDownValue) {
        //add if newly touched square
        this.board.touchDepressedSquaresMap.set(touchIdentifier, {
          x: tileX,
          y: tileY,
        });
      } else {
        //remove if no longer touched
        this.board.touchDepressedSquaresMap.delete(touchIdentifier);
      }
    }

    //Apply new hover for all squares (from touch and from mouse)
    let applyHover = (hoverSquareX, hoverSquareY) => {
      var doSingleHover = false;
      var doBlockHover = false;

      if (touchIdentifier === "mouse" && chordingButtons.value === "l+r") {
        //l+r chord does hover based on what buttons are depressed
        if (this.board.lrChordingState.hoverType === "single") {
          doSingleHover = true;
        } else if (this.board.lrChordingState.hoverType === "block") {
          doBlockHover = true;
        } else {
          //empty or something else, so don't hover anything
          return;
        }
      } else {
        //l chord does single hover on unrevealed squares
        doSingleHover =
          this.board.tilesArray[hoverSquareX][hoverSquareY].state ===
          CONSTANTS.UNREVEALED;

        //l chord does 3x3 block hover on numbers
        doBlockHover =
          typeof this.board.tilesArray[hoverSquareX][hoverSquareY].state === "number";
      }

      //Single square
      if (doSingleHover) {
        this.board.tilesArray[hoverSquareX][hoverSquareY].depressed = true;
      }

      //Chord
      if (doBlockHover) {
        for (let x = hoverSquareX - 1; x <= hoverSquareX + 1; x++) {
          for (let y = hoverSquareY - 1; y <= hoverSquareY + 1; y++) {
            //Note that the middle square automatically gets excluded as it's been revealed
            if (this.board.tilesArray[x]?.[y]?.state === CONSTANTS.UNREVEALED) {
              this.board.tilesArray[x][y].depressed = true;
            }
          }
        }
      }
    };

    //apply mouse hover
    if (
      this.board.hoveredSquare.x !== null &&
      this.board.hoveredSquare.y !== null &&
      this.board.isLeftMouseDown
    ) {
      applyHover(this.board.hoveredSquare.x, this.board.hoveredSquare.y);
    }
    //apply touch hover
    for (let touchedSquare of this.board.touchDepressedSquaresMap.values()) {
      if (touchedSquare.x !== null && touchedSquare.y !== null) {
        applyHover(touchedSquare.x, touchedSquare.y);
      }
    }

    const requiresRedraw = true;
    return requiresRedraw;
  }

  clearAllDepressedSquares() {
    this.board.hoveredSquare = { x: null, y: null };
    this.board.isLeftMouseDown = false;
    this.board.lrChordingState = {
      leftDown: false,
      rightDown: false,
      hoverType: "single", //single, block, empty
      lastDrawnHoverType: "single", //for l+r chord only
    };
    this.board.touchDepressedSquaresMap.clear();
  }


  holdDownDig(tileX, tileY, touchIdentifier) {
    //Don't track this in stats yet (but may add in future)
    //All this does is depress the current square or surrounding squares as the user pressed down left mouse
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      true,
      touchIdentifier
    );

    return requiresRedraw;
  }

  holdDownFlag(tileX, tileY, touchIdentifier) {
    //Currently only needed for l+r chord
    //Don't track this in stats yet (but may add in future)
    //All this does is potentially change depressed squares to block hover (if left mouse is also down)
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      this.board.lrChordingState.leftDown,
      touchIdentifier
    );

    return requiresRedraw;
  }

  releaseFlag(tileX, tileY, touchIdentifier) {
    //Currently only needed for l+r chord
    //Don't track this in stats yet (but may add in future)
    //All this does is potentially change depressed squares to single hover (if left mouse is still down)
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      this.board.lrChordingState.leftDown,
      touchIdentifier
    );

    return requiresRedraw;
  }

  holdDownTouchFlag(tileX, tileY, touchIdentifier) {
    let requiresRedraw;

    //Only depress stuff if hovering over a number (i.e. for a chord)
    if (typeof this.board.tilesArray[tileX]?.[tileY]?.state === "number") {
      requiresRedraw = this.updateDepressedSquares(
        tileX,
        tileY,
        true,
        touchIdentifier
      );
    } else {
      requiresRedraw = this.updateDepressedSquares(
        null,
        null,
        true,
        touchIdentifier
      );
    }

    return requiresRedraw;
  }

  attemptFaceClick(canvasCoords, flooredCoords, touchIdentifier) {
    if (
      this.board.gameStage !== "pregame" &&
      showBorders.value &&
      canvasCoords.canvasRawY <= boardTopPadding.value
    ) {
      //Check if face is being clicked on
      const topPanelMiddleWidth = (this.board.width * this.board.tileSize) / 2;
      const topPanelInnerPadding = this.board.tileSize / 4;
      const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
      const faceStartX =
        boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
      const faceStartY =
        topPanelTopAndBottomBorder.value + topPanelInnerPadding;

      const isWithinSmallHitbox =
        canvasCoords.canvasRawX >= faceStartX &&
        canvasCoords.canvasRawX <= faceStartX + faceWidth &&
        canvasCoords.canvasRawY >= faceStartY &&
        canvasCoords.canvasRawY <= faceStartY + faceWidth;

      const isWithinLargeHitbox =
        canvasCoords.canvasRawX >= boardHorizontalPadding.value &&
        canvasCoords.canvasRawX <=
        boardHorizontalPadding.value + this.board.width * this.board.tileSize &&
        canvasCoords.canvasRawY >= topPanelTopAndBottomBorder.value &&
        canvasCoords.canvasRawY <=
        topPanelTopAndBottomBorder.value + topPanelHeight.value;

      const useSmallHitbox =
        faceHitbox.value === "face" ||
        (faceHitbox.value === "adaptive" && this.board.gameStage === "running");

      if (
        (useSmallHitbox && isWithinSmallHitbox) ||
        (!useSmallHitbox && isWithinLargeHitbox)
      ) {
        if (!this.board.quickPaint.confirmBoardResetIfQuickPaint()) {
          return true; //Clicked on, but stopped, though still need to stop processing click further
        }

        this.updateDepressedSquares(
          flooredCoords.tileX, //Coords not strictly necessary, but including incase this changes
          flooredCoords.tileY,
          false,
          touchIdentifier
        );
        this.board.resetBoard(false); //Reset and don't process the click any further
        return true; //reset, don't process click further
      }
    }

    return false; //Not clicked on
  }

  isTileEnclosed(tileX, tileY, useFlagVersion) {
    //Check if a tile is surrounded in such a way that we trivially
    // know that all it's neighbours are revealed or known mines

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      return false;
    }

    if (this.board.gameStage !== "running") {
      throw new Error("Enclosed setting should only apply during running game");
    }

    //As an initial check, look to see if any of the 3x3 block centred on tileX, tileY
    //have squares that are safe, but unrevealed

    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.board.checkCoordsInBounds(x, y)) {
          continue;
        }
        const isMeanMine =
          this.board.variant === "mean openings" &&
          this.board.meanMineStates[x][y].isMine &&
          this.board.meanMineStates[x][y].isActive;

        const isNormalOrMeanMine = this.board.mines[x][y] || isMeanMine;

        if (
          (typeof this.board.tilesArray[x][y].state !== "number" ||
            !this.canTileBeUsedForMobileScrollConditions(x, y)) &&
          !isNormalOrMeanMine
        ) {
          //Found square in 3x3 block that is unrevealed (see next comment) and safe. So return false as the centre square is not enclosed by known mines
          //We also count squares that were revealed very recently (within mobile scroll delay) as unrevealed
          return false;
        }
      }
    }

    //In the more complicated case, we need to work out which squares surrounding the centre tile are obvious mines
    //Look at the 5x5 block of numbers, and collect the list of mines which are confirmed by these

    //Confirmed mines: {x: number, y: number} coord pairs of squares known to be mines
    //Ideally, we'd use a set for this, and remove duplicated, but it's neglibile for performance
    let confirmedMines = [];

    //Get mines confirmed by 5x5 block centred on tileX, tileY
    for (let x = tileX - 2; x <= tileX + 2; x++) {
      for (let y = tileY - 2; y <= tileY + 2; y++) {
        if (!this.board.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (typeof this.board.tilesArray[x][y].state !== "number") {
          continue;
        }
        if (!this.canTileBeUsedForMobileScrollConditions(x, y)) {
          continue;
        }

        confirmedMines = confirmedMines.concat(
          this.getMinesConfirmedByTile(x, y)
        );
      }
    }

    //Check mines in 3x3 block centred on tileX, tileY to make sure they are all confirmed
    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.board.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (typeof this.board.tilesArray[x][y].state === "number") {
          continue;
        }

        //Note - these tiles are guaranteed to be mines due to the loop we did at the start of the method
        if (
          !confirmedMines.some(
            (confMine) => x === confMine.x && y === confMine.y
          )
        ) {
          //Return false as we have found a mine in the 3x3 block that isn't confirmed by basic logic
          return false;
        }
      }
    }

    //Special case for flaggers. Tiles that can be flagged to use in a chord should not be scrollable
    if (
      this.board.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED &&
      useFlagVersion
    ) {
      //Check numbers adjacent to centre tile
      //Make sure each number is maxed out (and therefore can't be chorded)
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (!this.board.checkCoordsInBounds(x, y)) {
            continue;
          }
          if (typeof this.board.tilesArray[x][y].state !== "number") {
            continue;
          }
          if (this.board.tilesArray[x][y].state === 0) {
            continue;
          }

          let minesConfedByCentreAdjacentNumber = this.getMinesConfirmedByTile(
            x,
            y
          );

          if (minesConfedByCentreAdjacentNumber.length === 0) {
            //We know that the tile adjacent to centre, is not a zero, so if it was maxed out
            //it would confirm mines equal to it's number
            //But because it confirms no mines, then it must have surrounding safe squares
            //So it may get chorded. Therefore are flag is not enclosed
            return false; //ret false as flag may be used for chording
          }
        }
      }
    }

    return true;
  }

  getMinesConfirmedByTile(tileX, tileY) {
    if (typeof this.board.tilesArray[tileX][tileY].state !== "number") {
      throw new Error(
        "This function is expected to be called on a number tile"
      );
    }

    let potentiallyConfirmedMines = [];

    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.board.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (x === tileX && y === tileY) {
          continue;
        }

        const isMeanMine =
          this.board.variant === "mean openings" &&
          this.board.meanMineStates[x][y].isMine &&
          this.board.meanMineStates[x][y].isActive;

        const isNormalOrMeanMine = this.board.mines[x][y] || isMeanMine;

        if (isNormalOrMeanMine) {
          //Neighbour is a mine. If the centre square turns out to be maxed out then this mine is proven
          potentiallyConfirmedMines.push({ x, y });
        } else if (
          (typeof this.board.tilesArray[x][y].state !== "number" ||
            !this.canTileBeUsedForMobileScrollConditions(x, y)) &&
          !isNormalOrMeanMine
        ) {
          //Neighbour is unrevealed and safe. Therefore the centre square is NOT maxed out
          //So we cannot deduce any of the mines used basic "max out" logic
          //Note we treat squares that have been revealed very recently (within mobile scroll delay) as unrevealed
          return [];
        } else {
          //Neighbour is revealed and safe, do nothing
        }
      }
    }

    return potentiallyConfirmedMines;
  }

  //Check if tile was revealed a while ago
  canTileBeUsedForMobileScrollConditions(tileX, tileY) {
    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      return false; //Defensive
    }

    let tileRevealedSufficientlyLongAgo =
      this.board.tilesArray[tileX][tileY]?.revealedTimeForMobileScrollBehaviour ===
      null ||
      this.board.getTime() -
      this.board.tilesArray[tileX][tileY]?.revealedTimeForMobileScrollBehaviour >=
      mobileDelayForEnableScroll.value / 1000;

    return tileRevealedSufficientlyLongAgo;
  }
}

export default BoardInput;