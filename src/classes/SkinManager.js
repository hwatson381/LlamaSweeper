import CONSTANTS from "src/includes/Constants";

class SkinManager {
  constructor() {
    const keyImageMapping = [
      [0, "/img/tiles/type0.svg"],
      [1, "/img/tiles/type1.svg"],
      [2, "/img/tiles/type2.svg"],
      [3, "/img/tiles/type3.svg"],
      [4, "/img/tiles/type4.svg"],
      [5, "/img/tiles/type5.svg"],
      [6, "/img/tiles/type6.svg"],
      [7, "/img/tiles/type7.svg"],
      [8, "/img/tiles/type8.svg"],
      [CONSTANTS.UNREVEALED, "/img/tiles/closed.svg"],
      [CONSTANTS.FLAG, "/img/tiles/flag.svg"],
      [CONSTANTS.MINE, "/img/tiles/mine.svg"],
      [CONSTANTS.MINERED, "/img/tiles/mine_red.svg"],
      [CONSTANTS.MINEWRONG, "/img/tiles/mine_wrong.svg"],
      ['tr_flag', '/img/tiles_transparent/flag.svg'],
      ['tr_mine', '/img/tiles_transparent/mine.svg'],
      ['tr_0', '/img/tiles_transparent/type0.svg'],
      ['tr_1', '/img/tiles_transparent/type1.svg'],
      ['tr_2', '/img/tiles_transparent/type2.svg'],
      ['tr_3', '/img/tiles_transparent/type3.svg'],
      ['tr_4', '/img/tiles_transparent/type4.svg'],
      ['tr_5', '/img/tiles_transparent/type5.svg'],
      ['tr_6', '/img/tiles_transparent/type6.svg'],
      ['tr_7', '/img/tiles_transparent/type7.svg'],
      ['tr_8', '/img/tiles_transparent/type8.svg'],
      ['tr2_mine', '/img/tiles_transparent2/mine.svg'],
      ['tr2_0', '/img/tiles_transparent2/type0.svg'],
      ['tr2_1', '/img/tiles_transparent2/type1.svg'],
      ['tr2_2', '/img/tiles_transparent2/type2.svg'],
      ['tr2_3', '/img/tiles_transparent2/type3.svg'],
      ['tr2_4', '/img/tiles_transparent2/type4.svg'],
      ['tr2_5', '/img/tiles_transparent2/type5.svg'],
      ['tr2_6', '/img/tiles_transparent2/type6.svg'],
      ['tr2_7', '/img/tiles_transparent2/type7.svg'],
      ['tr2_8', '/img/tiles_transparent2/type8.svg'],
      ['cl_mine', '/img/tiles_closed/mine.svg'],
      ['cl_0', '/img/tiles_closed/type0.svg'],
      ['cl_1', '/img/tiles_closed/type1.svg'],
      ['cl_2', '/img/tiles_closed/type2.svg'],
      ['cl_3', '/img/tiles_closed/type3.svg'],
      ['cl_4', '/img/tiles_closed/type4.svg'],
      ['cl_5', '/img/tiles_closed/type5.svg'],
      ['cl_6', '/img/tiles_closed/type6.svg'],
      ['cl_7', '/img/tiles_closed/type7.svg'],
      ['cl_8', '/img/tiles_closed/type8.svg'],
      ['dm_mine', '/img/tiles_dimmed/mine.svg'],
      ['dm_0', '/img/tiles_dimmed/type0.svg'],
      ['dm_1', '/img/tiles_dimmed/type1.svg'],
      ['dm_2', '/img/tiles_dimmed/type2.svg'],
      ['dm_3', '/img/tiles_dimmed/type3.svg'],
      ['dm_4', '/img/tiles_dimmed/type4.svg'],
      ['dm_5', '/img/tiles_dimmed/type5.svg'],
      ['dm_6', '/img/tiles_dimmed/type6.svg'],
      ['dm_7', '/img/tiles_dimmed/type7.svg'],
      ['dm_8', '/img/tiles_dimmed/type8.svg'],
      ['raw_open', '/img/raw/open.svg'],
      ['raw_closed', '/img/raw/closed.svg'],
      ['raw_0', '/img/raw/type0.svg'], // this is empty image, as zero tiles have no number
      ['raw_1', '/img/raw/type1.svg'],
      ['raw_2', '/img/raw/type2.svg'],
      ['raw_3', '/img/raw/type3.svg'],
      ['raw_4', '/img/raw/type4.svg'],
      ['raw_5', '/img/raw/type5.svg'],
      ['raw_6', '/img/raw/type6.svg'],
      ['raw_7', '/img/raw/type7.svg'],
      ['raw_8', '/img/raw/type8.svg'],
      ['raw_flag', '/img/raw/flag.svg'],
      ["b_hor", "/img/borders/border_hor_2x.png"],
      ["b_vert", "/img/borders/border_vert_2x.png"],
      ["b_c_bot_left", "/img/borders/corner_bottom_left_2x.png"],
      ["b_c_bot_right", "/img/borders/corner_bottom_right_2x.png"],
      ["b_c_up_left", "/img/borders/corner_up_left_2x.png"],
      ["b_c_up_right", "/img/borders/corner_up_right_2x.png"],
      ["t_left", "/img/borders/t_left_2x.png"],
      ["t_right", "/img/borders/t_right_2x.png"],
      ["f_unpressed", "/img/borders/face_unpressed.svg"],
      ["cursor", "/img/other/cursor.svg"],
    ];
    this.imagesLoadedCount = 0;
    this.imagesToLoadCount = keyImageMapping.length;
    this.images = {};
    keyImageMapping.forEach((el) => this.addImage(el[0], el[1]));
  }

  addImage(key, src) {
    let img = new Image();
    img.src = src;
    if (img.complete) {
      this.incrementImagesLoaded();
    } else {
      img.addEventListener("load", () => {
        this.incrementImagesLoaded();
      });
    }

    this.images[key] = img;
  }

  incrementImagesLoaded() {
    this.imagesLoadedCount++;

    if (this.imagesLoadedCount === this.imagesToLoadCount) {
      if (typeof this.callback === "function") {
        this.callback();
      }
    }
  }

  addCallbackWhenAllLoaded(callback) {
    if (this.imagesLoadedCount === this.imagesToLoadCount) {
      callback();
    } else {
      this.callback = callback;
    }
  }

  getImage(value) {
    if (this.images.hasOwnProperty(value)) {
      return this.images[value];
    } else {
      return this.images.MINERED;
    }
  }

  getTopPanelColour() {
    return "#c0c0c0";
  }

  getMineTimerTextColour() {
    return "#000000";
  }

  getCoordTextColour() {
    return "#000000";
  }

  getRedCounterTextColour() {
    return "red";
  }

  getOrangeCounterTextColour() {
    return "#000000" /*"#8f5600"*/;
  }

  getDotsCounterTextColour() {
    return "#000000";
  }

  getDotMainColour() {
    return "white";
  }

  getDotSecondaryColour() {
    return "black";
  }

  getClickGainColour() {
    return '#C3FFA0'; //previously 'green'
  }

  getClickLossColour() {
    return '#FF777A'; //previous 'red'
  }

  getClickNeutralColour() {
    return 'yellow';
  }

  getClassicDigColour() {
    return '#E5FFA5'; //light yellow
  }

  getClassicChordColour() {
    return '#A3D1FF'; //light blue
  }

  getPremiumColour() {
    return 'black';
  }

  getHighlightColour() {
    return '#2FEF00';
  }
}

export default SkinManager;