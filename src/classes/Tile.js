import CONSTANTS from "src/includes/Constants";

class Tile {
  constructor(state, refs, skinManager) {
    this.refs = refs
    this.skinManager = skinManager

    this.state = state; //Possible values are numbers (e.g. 0, 1, 2... and stuff like CONSTANTS.UNREVEALED etc)
    this.depressed = false;
    this.paintColour = null; //values such as red, green, orange, white
    this.paintDots = 0; //values can be 0, 1, 2
  }

  draw(rawX, rawY, size) {
    const ctx = this.refs.mainCanvas.value.getContext("2d");

    //Depressed squares get drawn as an open tile
    const toDraw =
      this.state === CONSTANTS.UNREVEALED && this.depressed ? 0 : this.state;

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
}

export default Tile;