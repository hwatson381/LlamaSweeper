import CONSTANTS from "src/includes/Constants";

class Tile {
  constructor(state, refs, skinManager) {
    this.refs = refs
    this.skinManager = skinManager

    this.state = state; //Possible values are numbers (e.g. 0, 1, 2... and stuff like CONSTANTS.UNREVEALED etc)
    this.depressed = false;
    this.paintColour = null; //values such as red, green, orange, white
    this.paintDots = 0; //values can be 0, 1, 2
    this.unrevealedState = null; //State to draw instead of UNREVEALED (e.g. for drawing transparent tiles)

    this.ziniDelta = {
      loss: false,
      gain: false
    }

    this.explore = {
      classicDig: false,
      classicChord: false,
      premium: null,
      highlight: false
    }
  }

  draw(rawX, rawY, size) {
    const ctx = this.refs.mainCanvas.value.getContext("2d");

    //Depressed squares get drawn as a zero tile
    let toDraw;
    if (this.state !== CONSTANTS.UNREVEALED) {
      toDraw = this.state;
    } else if (this.depressed) {
      toDraw = 0;
    } else if (this.unrevealedState !== null) {
      toDraw = this.unrevealedState;
    } else {
      toDraw = CONSTANTS.UNREVEALED
    }

    ctx.drawImage(this.skinManager.getImage(toDraw), rawX, rawY, size, size);
  }

  drawPaint(rawX, rawY, size) {
    if (this.paintColour === null && this.paintDots === null) {
      return;
    }

    const ctx = this.refs.mainCanvas.value.getContext("2d");

    //draw square
    if (this.paintColour) {
      let fillColour;
      switch (this.paintColour) {
        case "red":
          fillColour = "red";
          break;
        case "green":
          fillColour = "green";
          break;
        case "orange":
          fillColour = "orange";
          break;
        case "white":
          fillColour = "white";
          break;
        default:
          throw new Error("illegal paint colour");
      }
      ctx.fillStyle = fillColour;

      //downsize slightly
      const downsizeFactor = 0.8;
      const squareX = rawX + (size * (1 - downsizeFactor)) / 2;
      const squareY = rawY + (size * (1 - downsizeFactor)) / 2;
      const squareSize = size * downsizeFactor;

      ctx.fillRect(squareX, squareY, squareSize, squareSize);
    }

    //draw dots
    if (this.paintDots !== 0) {
      ctx.fillStyle = this.skinManager.getDotMainColour();
      ctx.strokeStyle = this.skinManager.getDotSecondaryColour();

      const dotRadius = size * 0.11;

      const dotCentreFromEdge = 0.3;

      const leftDotX = rawX + size * dotCentreFromEdge;
      const dotsY = rawY + size * 0.5;
      const rightDotX = rawX + (1 - dotCentreFromEdge) * size;
      const centreDotX = rawX + size * 0.5;

      const dotOutlineWidth = size * 0.04;
      ctx.lineWidth = dotOutlineWidth;

      if (this.paintDots === 1) {
        //Draw single dot in centre

        ctx.beginPath();
        ctx.arc(centreDotX, dotsY, dotRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centreDotX, dotsY, dotRadius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (this.paintDots === 2) {
        //Draw left and right dot

        //draw left dot
        ctx.beginPath();
        ctx.arc(leftDotX, dotsY, dotRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(leftDotX, dotsY, dotRadius, 0, 2 * Math.PI);
        ctx.stroke();

        //draw right dot
        ctx.beginPath();
        ctx.arc(rightDotX, dotsY, dotRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightDotX, dotsY, dotRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  drawZiniDelta(rawX, rawY, size) {
    //Red or green outline for click loss/gain
    //If we add more analysis stuff, we may instead want to call this method "drawAnalysis"

    if (!this.ziniDelta.gain && !this.ziniDelta.loss) {
      return;
    }

    const ctx = this.refs.mainCanvas.value.getContext("2d");
    const gainColour = this.skinManager.getClickGainColour();
    const lossColour = this.skinManager.getClickLossColour();
    const neutralColour = this.skinManager.getClickNeutralColour();

    const thickness = 0.07 * size;

    /*
    if (this.ziniDelta.gain && this.ziniDelta.loss) {
      //Draw both
      ctx.lineWidth = thickness / 2;

      //inner red
      ctx.strokeStyle = lossColour;
      ctx.strokeRect(rawX + thickness * 3 / 4, rawY + thickness * 3 / 4, size - thickness * 3 / 2, size - thickness * 3 / 2);

      //outer green
      ctx.strokeStyle = gainColour;
      ctx.strokeRect(rawX + thickness * 1 / 4, rawY + thickness * 1 / 4, size - thickness * 1 / 2, size - thickness * 1 / 2);
      return;
    }
    */

    if (this.ziniDelta.gain && this.ziniDelta.loss) {
      //A square that is both click-loss and gain is yellow
      ctx.lineWidth = thickness;

      //yellow
      ctx.strokeStyle = neutralColour;
      ctx.strokeRect(rawX + thickness * 1 / 2, rawY + thickness * 1 / 2, size - thickness, size - thickness);
      return;
    }

    if (this.ziniDelta.gain && !this.ziniDelta.loss) {
      //Draw gain only
      ctx.lineWidth = thickness;

      //green
      ctx.strokeStyle = gainColour;
      ctx.strokeRect(rawX + thickness * 1 / 2, rawY + thickness * 1 / 2, size - thickness, size - thickness);
      return;
    }

    if (!this.ziniDelta.gain && this.ziniDelta.loss) {
      //Draw loss only
      ctx.lineWidth = thickness;

      //red
      ctx.strokeStyle = lossColour;
      ctx.strokeRect(rawX + thickness * 1 / 2, rawY + thickness * 1 / 2, size - thickness, size - thickness);
      return;
    }
  }

  /* DELETE ME
  drawExploreAnalysis(rawX, rawY, size) {
    // Dark grey outline for dig, blue out for chord

    if (!this.explore.classicDig && !this.explore.classicChord) {
      return;
    }

    const ctx = this.refs.mainCanvas.value.getContext("2d");
    const classicDigColour = this.skinManager.getClassicDigColour();
    const classicChordColour = this.skinManager.getClassicChordColour();

    const thickness = 0.07 * size;

    if (this.explore.classicChord && this.explore.classicDig) {
      //Draw both
      ctx.lineWidth = thickness / 2;

      //inner grey (dig)
      ctx.strokeStyle = classicDigColour;
      ctx.strokeRect(rawX + thickness * 3 / 4, rawY + thickness * 3 / 4, size - thickness * 3 / 2, size - thickness * 3 / 2);

      //outer blue (chord)
      ctx.strokeStyle = classicChordColour;
      ctx.strokeRect(rawX + thickness * 1 / 4, rawY + thickness * 1 / 4, size - thickness * 1 / 2, size - thickness * 1 / 2);
      return;
    }

    if (this.explore.classicChord && !this.explore.classicDig) {
      //Draw chord only
      ctx.lineWidth = thickness;

      //blue
      ctx.strokeStyle = classicChordColour;
      ctx.strokeRect(rawX + thickness * 1 / 2, rawY + thickness * 1 / 2, size - thickness, size - thickness);
      return;
    }

    if (!this.explore.classicChord && this.explore.classicDig) {
      //Draw dig only
      ctx.lineWidth = thickness;

      //grey
      ctx.strokeStyle = classicDigColour;
      ctx.strokeRect(rawX + thickness * 1 / 2, rawY + thickness * 1 / 2, size - thickness, size - thickness);
      return;
    }
  }
  */

  drawIncludingAnalysis(rawX, rawY, size) {
    //This both draws the tile state, and also draws anything needed by zini explorer

    if (!this.explore.classicDig && !this.explore.classicChord && !this.ziniDelta.gain && !this.ziniDelta.loss) {
      //Just draw normally
      this.draw(rawX, rawY, size);
    } else {
      this.drawAnalysisRequiringBackground(rawX, rawY, size)
    }

    //////////////////////////////////
    //premiums
    //////////////////////////////////

    if (this.explore.premium !== null) {
      this.drawPremium(rawX, rawY, size);
    }

    //////////////////////////////////
    //highlighted cells
    //////////////////////////////////

    if (this.explore.highlight) {
      this.drawHighlight(rawX, rawY, size);
    }

    /*DELETE ME
    ctx.drawImage(this.skinManager.getImage('raw_base'), rawX, rawY, size, size);
    */

    /*DELETE ME
    //downsize slightly
    const downsizeFactor = 0.94; //Note that the square for opened tiles are slightly offset
    const shiftFactor = 0.06;
    const squareX = rawX + size * shiftFactor;
    const squareY = rawY + size * shiftFactor;
    const squareSize = size * downsizeFactor;
    */

    /*DELETE ME
    //Draw both

    //blue (chord) - triangle in bottom right
    ctx.fillStyle = classicChordColour;
    ctx.fillRect(squareX, squareY, squareSize, squareSize);

    //yellow (dig) - triangle in top left
    ctx.fillStyle = classicDigColour;
    ctx.beginPath();
    ctx.moveTo(squareX, squareY);
    ctx.lineTo(squareX + squareSize, squareY);
    ctx.lineTo(squareX, squareY + squareSize);
    ctx.closePath();
    ctx.fill();
    */

    /*DELETE ME
    //Draw chord only

    //blue
    ctx.fillStyle = classicChordColour;
    ctx.fillRect(squareX, squareY, squareSize, squareSize);
    */

    /*DELETE ME
      //Draw dig only

      //yellow
      ctx.fillStyle = classicDigColour;
      ctx.fillRect(squareX, squareY, squareSize, squareSize);
    */

    /*DELETE ME
    ctx.drawImage(this.skinManager.getImage('raw_' + this.state), rawX, rawY, size, size);
    */
  }

  //Click loss/gain or clicks/chords in zini explorer that need a background colour behind the number
  drawAnalysisRequiringBackground(rawX, rawY, size) {
    if ((this.explore.classicDig || this.explore.classicChord) && (this.ziniDelta.gain || this.ziniDelta.loss)) {
      throw new Error('Cannot have zini loss/gain at the same time as having zini explorer annotations');
    }

    //////////////////////////////////
    //zini explore annotations
    //////////////////////////////////

    const classicDigColour = this.skinManager.getClassicDigColour();
    const classicChordColour = this.skinManager.getClassicChordColour();

    if (this.explore.classicChord && this.explore.classicDig) {
      this.drawStateWithBackgroundColors(rawX, rawY, size, true, classicChordColour, classicDigColour);
    }

    if (this.explore.classicChord && !this.explore.classicDig) {
      this.drawStateWithBackgroundColors(rawX, rawY, size, true, classicChordColour);
    }

    if (!this.explore.classicChord && this.explore.classicDig) {
      this.drawStateWithBackgroundColors(rawX, rawY, size, true, classicDigColour);
    }

    //////////////////////////////////
    //click loss/gain annotations
    //////////////////////////////////

    const gainColour = this.skinManager.getClickGainColour();
    const lossColour = this.skinManager.getClickLossColour();

    const isOpen = this.state !== CONSTANTS.FLAG; //flag needs closed background instead of open one

    if (this.ziniDelta.gain && this.ziniDelta.loss) {
      this.drawStateWithBackgroundColors(rawX, rawY, size, isOpen, gainColour, lossColour);
    }

    if (this.ziniDelta.gain && !this.ziniDelta.loss) {
      this.drawStateWithBackgroundColors(rawX, rawY, size, isOpen, gainColour);
    }

    if (!this.ziniDelta.gain && this.ziniDelta.loss) {
      this.drawStateWithBackgroundColors(rawX, rawY, size, isOpen, lossColour);
    }
  }

  drawStateWithBackgroundColors(rawX, rawY, size, useOpenbackground, col1, col2 = null) {
    const ctx = this.refs.mainCanvas.value.getContext("2d");

    if (useOpenbackground) {
      //Draw tile base (same image as a zero tile)
      ctx.drawImage(this.skinManager.getImage('raw_open'), rawX, rawY, size, size);
    } else {
      //Draw tile base (same image as a closed tile)
      ctx.drawImage(this.skinManager.getImage('raw_closed'), rawX, rawY, size, size);
    }

    //downsize slightly
    let downsizeFactor;
    let shiftFactor;
    let squareX;
    let squareY;
    let squareSize;

    if (useOpenbackground) {
      downsizeFactor = 0.94; //Note that the square for opened tiles are slightly offset
      shiftFactor = 0.06;
      squareX = rawX + size * shiftFactor;
      squareY = rawY + size * shiftFactor;
      squareSize = size * downsizeFactor;
    } else {
      downsizeFactor = 0.76;
      shiftFactor = 0.12;
      squareX = rawX + size * shiftFactor;
      squareY = rawY + size * shiftFactor;
      squareSize = size * downsizeFactor;
    }

    if (col2) {
      //Draw both colours

      //col1 - triangle in bottom right
      ctx.fillStyle = col1;
      ctx.fillRect(squareX, squareY, squareSize, squareSize);

      //col2 - triangle in top left
      ctx.fillStyle = col2;
      ctx.beginPath();
      ctx.moveTo(squareX, squareY);
      ctx.lineTo(squareX + squareSize, squareY);
      ctx.lineTo(squareX, squareY + squareSize);
      ctx.closePath();
      ctx.fill();
    } else {
      //Just draw col1
      ctx.fillStyle = col1;
      ctx.fillRect(squareX, squareY, squareSize, squareSize);
    }

    //Draw number/icon on top
    ctx.drawImage(this.skinManager.getImage('raw_' + this.state), rawX, rawY, size, size);
  }

  drawPremium(rawX, rawY, size) {
    const ctx = this.refs.mainCanvas.value.getContext("2d");

    const textScale = 0.4 * size;
    const maxWidth = 1.5 * textScale;
    let xText = rawX + 0.02 * size; //was 0.15
    let yText = rawY + 0.02 * size; //was 0.15

    //Box background to improve visibility
    if (window.box) {
      yText -= 0.01 * size;

      ctx.fillStyle = 'white'
      ctx.fillRect(
        rawX,
        rawY,
        this.explore.premium.toString().length === 2 ? 0.52 * size : 0.27 * size,
        0.35 * size
      )
    }


    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = `${textScale}px monospace`;
    ctx.fillStyle = this.skinManager.getPremiumColour();

    ctx.fillText(this.explore.premium, xText, yText, maxWidth);
  }

  drawHighlight(rawX, rawY, size) {
    const ctx = this.refs.mainCanvas.value.getContext("2d");

    const highlightColour = this.skinManager.getHighlightColour();

    const thickness = 0.08 * size;

    //green
    ctx.lineWidth = thickness;
    ctx.strokeStyle = highlightColour;
    ctx.strokeRect(rawX + thickness * 1 / 2, rawY + thickness * 1 / 2, size - thickness, size - thickness);
  }

  addZiniDelta(isGain) {
    if (isGain) {
      this.ziniDelta.gain = true;
    } else {
      this.ziniDelta.loss = true;
    }
  }

  addClassicDig() {
    this.explore.classicDig = true
  }

  addClassicChord() {
    this.explore.classicChord = true
  }

  addPremium(premium) {
    this.explore.premium = premium
  }

  addHighlight() {
    this.explore.highlight = true;
  }
}

export default Tile;