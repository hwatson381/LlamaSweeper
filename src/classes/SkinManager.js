import CONSTANTS from "src/includes/Constants";

class SkinManager {
  constructor(refs) {
    this.refs = refs;

    this.createMissingTextureImage();

    //Skins have multiple variants (e.g. light/dark)
    const skinImageMapping = [
      [0, "/tiles/type0.svg"],
      [1, "/tiles/type1.svg"],
      [2, "/tiles/type2.svg"],
      [3, "/tiles/type3.svg"],
      [4, "/tiles/type4.svg"],
      [5, "/tiles/type5.svg"],
      [6, "/tiles/type6.svg"],
      [7, "/tiles/type7.svg"],
      [8, "/tiles/type8.svg"],
      [CONSTANTS.UNREVEALED, "/tiles/closed.svg"],
      [CONSTANTS.FLAG, "/tiles/flag.svg"],
      [CONSTANTS.MINE, "/tiles/mine.svg"],
      [CONSTANTS.MINERED, "/tiles/mine_red.svg"],
      [CONSTANTS.MINEWRONG, "/tiles/mine_wrong.svg"],
      ['tr_flag', '/tiles_transparent/flag.svg'],
      ['tr_mine', '/tiles_transparent/mine.svg'],
      ['tr_0', '/tiles_transparent/type0.svg'],
      ['tr_1', '/tiles_transparent/type1.svg'],
      ['tr_2', '/tiles_transparent/type2.svg'],
      ['tr_3', '/tiles_transparent/type3.svg'],
      ['tr_4', '/tiles_transparent/type4.svg'],
      ['tr_5', '/tiles_transparent/type5.svg'],
      ['tr_6', '/tiles_transparent/type6.svg'],
      ['tr_7', '/tiles_transparent/type7.svg'],
      ['tr_8', '/tiles_transparent/type8.svg'],
      ['tr2_mine', '/tiles_transparent2/mine.svg'],
      ['tr2_0', '/tiles_transparent2/type0.svg'],
      ['tr2_1', '/tiles_transparent2/type1.svg'],
      ['tr2_2', '/tiles_transparent2/type2.svg'],
      ['tr2_3', '/tiles_transparent2/type3.svg'],
      ['tr2_4', '/tiles_transparent2/type4.svg'],
      ['tr2_5', '/tiles_transparent2/type5.svg'],
      ['tr2_6', '/tiles_transparent2/type6.svg'],
      ['tr2_7', '/tiles_transparent2/type7.svg'],
      ['tr2_8', '/tiles_transparent2/type8.svg'],
      ['cl_mine', '/tiles_closed/mine.svg'],
      ['cl_0', '/tiles_closed/type0.svg'],
      ['cl_1', '/tiles_closed/type1.svg'],
      ['cl_2', '/tiles_closed/type2.svg'],
      ['cl_3', '/tiles_closed/type3.svg'],
      ['cl_4', '/tiles_closed/type4.svg'],
      ['cl_5', '/tiles_closed/type5.svg'],
      ['cl_6', '/tiles_closed/type6.svg'],
      ['cl_7', '/tiles_closed/type7.svg'],
      ['cl_8', '/tiles_closed/type8.svg'],
      ['dm_mine', '/tiles_dimmed/mine.svg'],
      ['dm_0', '/tiles_dimmed/type0.svg'],
      ['dm_1', '/tiles_dimmed/type1.svg'],
      ['dm_2', '/tiles_dimmed/type2.svg'],
      ['dm_3', '/tiles_dimmed/type3.svg'],
      ['dm_4', '/tiles_dimmed/type4.svg'],
      ['dm_5', '/tiles_dimmed/type5.svg'],
      ['dm_6', '/tiles_dimmed/type6.svg'],
      ['dm_7', '/tiles_dimmed/type7.svg'],
      ['dm_8', '/tiles_dimmed/type8.svg'],
      ['raw_open', '/raw/open.svg'],
      ['raw_closed', '/raw/closed.svg'],
      ['raw_0', '/raw/type0.svg'], // this is empty image, as zero tiles have no number
      ['raw_1', '/raw/type1.svg'],
      ['raw_2', '/raw/type2.svg'],
      ['raw_3', '/raw/type3.svg'],
      ['raw_4', '/raw/type4.svg'],
      ['raw_5', '/raw/type5.svg'],
      ['raw_6', '/raw/type6.svg'],
      ['raw_7', '/raw/type7.svg'],
      ['raw_8', '/raw/type8.svg'],
      ['raw_flag', '/raw/flag.svg'],
      ["b_hor", "/borders/border_hor_2x.png"],
      ["b_vert", "/borders/border_vert_2x.png"],
      ["b_c_bot_left", "/borders/corner_bottom_left_2x.png"],
      ["b_c_bot_right", "/borders/corner_bottom_right_2x.png"],
      ["b_c_up_left", "/borders/corner_up_left_2x.png"],
      ["b_c_up_right", "/borders/corner_up_right_2x.png"],
      ["t_left", "/borders/t_left_2x.png"],
      ["t_right", "/borders/t_right_2x.png"],
      ["f_unpressed", "/borders/face_unpressed.svg"],
    ];

    //General images are consistent across all skins (e.g. cursor)
    const generalImageMapping = [
      ["cursor", "/img/other/cursor.svg"],
    ];

    let themePaths = {
      light: "/img/light",
      dark: "/img/dark",
    }

    //Figure out how many images are priority images
    let numberOfPriorityImages = 0;

    let priorityPathStarts = [
      '/tiles/',
      '/raw/',
      '/borders/',
      '/img/other/',
    ];

    switch (refs.analyseHiddenStyle.value) {
      case "mines":
        priorityPathStarts.push('/tiles_closed/mine.svg'); // More specific path as just closed mine is used here
        break;
      case "transparent":
        priorityPathStarts.push('/tiles_transparent/')
        break;
      case "transparent2":
        priorityPathStarts.push('/tiles_transparent/')
        priorityPathStarts.push('/tiles_closed/mine.svg');
        break;
      case "transparent3":
        priorityPathStarts.push('/tiles_transparent2/')
        break;
      case "dimmed":
        priorityPathStarts.push('/tiles_dimmed/')
        break;
    }

    switch (refs.replayShowHidden.value) {
      case "mines":
        priorityPathStarts.push('/tiles_closed/mine.svg'); // More specific path as just closed mine is used here
        break;
      case "transparent":
        priorityPathStarts.push('/tiles_transparent/')
        break;
      case "transparent2":
        priorityPathStarts.push('/tiles_transparent/')
        priorityPathStarts.push('/tiles_closed/mine.svg');
        break;
      case "transparent3":
        priorityPathStarts.push('/tiles_transparent2/')
        break;
      case "dimmed":
        priorityPathStarts.push('/tiles_dimmed/')
        break;
    }

    // Count how many images with a skin are priority images
    numberOfPriorityImages += skinImageMapping.filter(skin => {
      return priorityPathStarts.some(prefix => skin[1].startsWith(prefix));
    }).length;

    // Count how many general images are priority images
    numberOfPriorityImages += generalImageMapping.filter(generalImage => {
      return priorityPathStarts.some(prefix => generalImage[1].startsWith(prefix));
    }).length;

    this.imagesLoadedCount = 0;
    this.imagesToLoadCount = numberOfPriorityImages;

    //Now loop through again, this time loading the images
    this.images = {};
    this.images.skins = {};
    this.images.general = {};

    //Themed images
    for (let theme in themePaths) {
      this.images.skins[theme] = {};

      for (let img of skinImageMapping) {
        //Check if the image is a priority

        let isPriority = false;

        if (theme === this.refs.boardSkin.value) {
          //If on the chosen theme, then check for priority images
          if (priorityPathStarts.some(prefix => img[1].startsWith(prefix))) {
            isPriority = true
          }
        }

        //Add the image to the correct theme
        this.addImage(img[0], themePaths[theme] + img[1], this.images.skins[theme], isPriority);
      }
    }

    //General images
    for (let img of generalImageMapping) {
      const isPriority = true; // All general images are priority images
      this.addImage(img[0], img[1], this.images.general, isPriority);
    }

    this.colours = {};

    this.colours.light = {
      topPanel: "#c0c0c0",
      mineTimerText: "#000000",
      coordText: "#000000",
      redCounterText: "red",
      orangeCounterText: "#000000", //"#8f5600"
      dotsCounterText: "#000000",
      dotMain: "white",
      dotSecondary: "black",
      clickGain: '#C3FFA0', //previously 'green'
      clickLoss: '#FF777A', //previous 'red'
      clickNeutral: 'yellow',
      classicDig: '#E5FFA5', //light yellow
      classicChord: '#A3D1FF', //light blue
      premium: 'black',
      highlight: '#2FEF00',
    };

    this.colours.dark = {
      topPanel: "#444c54",
      mineTimerText: "#000000",
      coordText: "#000000",
      redCounterText: "red",
      orangeCounterText: "#000000", //"#8f5600"
      dotsCounterText: "#000000",
      dotMain: "white",
      dotSecondary: "black",
      clickGain: '#346B3E', //previously 'green'
      clickLoss: '#7C3D3D', //previous 'red'
      clickNeutral: '#757439', //yellow
      classicDig: '#f0ff78', //light yellow
      classicChord: '#0056ac', //light blue (closer to purple for dark scheme)
      premium: 'white',
      highlight: '#2FEF00',
    }

    window.darkscheme = this.colours.dark;
  }

  addImage(key, src, parentObject = false, isPriority = false) {
    //throw new Error("New features unimplemented, see plan below");
    /* 
      -  All images should start with the missing texture
      Only priority should trigger the "incrementing" callback
      Also, if not priority, then do setTimeout to delay loading
      Callback should add the image to the parentObject
    */

    // Image starts off as the missing texture
    parentObject[key] = this.missingTexture;

    const timeout = isPriority ? 0 : 1000; // wait either 0s or 1s depending on priority

    setTimeout(() => {
      let img = new Image();
      img.src = src;
      if (img.complete) {
        isPriority && this.incrementImagesLoaded();
        this.singleImageLoadedCallback && this.singleImageLoadedCallback();
        parentObject[key] = img;
      } else {
        img.addEventListener("load", () => {
          isPriority && this.incrementImagesLoaded();
          this.singleImageLoadedCallback && this.singleImageLoadedCallback();
          parentObject[key] = img;
        });
      }
    }, timeout);


  }

  incrementImagesLoaded() {
    this.imagesLoadedCount++;

    if (this.imagesLoadedCount === this.imagesToLoadCount) {
      if (typeof this.callback === "function") {
        this.callback();
      }
    }
  }

  addCallbackWhenAllPriorityLoaded(callback) {
    if (this.imagesLoadedCount === this.imagesToLoadCount) {
      callback();
    } else {
      this.callback = callback;
    }
  }

  addCallbackWhenSingleImageLoaded(callback) {
    this.singleImageLoadedCallback = callback;
  }

  getImage(value) {
    //First check if the image is a skin image
    //Then check if it's a general image
    //Otherwise return the missing texture

    if (this.images.skins[this.refs.boardSkin.value].hasOwnProperty(value)) {
      return this.images.skins[this.refs.boardSkin.value][value];
    } else if (this.images.general.hasOwnProperty(value)) {
      return this.images.general[value];
    } else {
      return this.missingTexture;
    }
  }

  createMissingTextureImage() {
    const missingTexture = document.createElement("canvas");
    missingTexture.width = 32;
    missingTexture.height = 32;
    const ctx = missingTexture.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "pink";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);

    this.missingTexture = missingTexture;
  }

  getTopPanelColour() {
    return this.colours[this.refs.boardSkin.value].topPanel;
  }

  getMineTimerTextColour() {
    return this.colours[this.refs.boardSkin.value].mineTimerText;
  }

  getCoordTextColour() {
    return this.colours[this.refs.boardSkin.value].coordText;
  }

  getRedCounterTextColour() {
    return this.colours[this.refs.boardSkin.value].redCounterText;
  }

  getOrangeCounterTextColour() {
    return this.colours[this.refs.boardSkin.value].orangeCounterText;
  }

  getDotsCounterTextColour() {
    return this.colours[this.refs.boardSkin.value].dotsCounterText;
  }

  getDotMainColour() {
    return this.colours[this.refs.boardSkin.value].dotMain;
  }

  getDotSecondaryColour() {
    return this.colours[this.refs.boardSkin.value].dotSecondary;
  }

  getClickGainColour() {
    return this.colours[this.refs.boardSkin.value].clickGain;
  }

  getClickLossColour() {
    return this.colours[this.refs.boardSkin.value].clickLoss;
  }

  getClickNeutralColour() {
    return this.colours[this.refs.boardSkin.value].clickNeutral;
  }

  getClassicDigColour() {
    return this.colours[this.refs.boardSkin.value].classicDig;
  }

  getClassicChordColour() {
    return this.colours[this.refs.boardSkin.value].classicChord;
  }

  getPremiumColour() {
    return this.colours[this.refs.boardSkin.value].premium;
  }

  getHighlightColour() {
    return this.colours[this.refs.boardSkin.value].highlight;
  }
}

export default SkinManager;