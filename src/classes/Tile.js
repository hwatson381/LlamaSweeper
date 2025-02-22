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

  addZiniDelta(isGain) {
    if (isGain) {
      this.ziniDelta.gain = true;
    } else {
      this.ziniDelta.loss = true;
    }
  }
}

export default Tile;