import Algorithms from "src/classes/Algorithms";
import BoardStats from "src/classes/BoardStats";
import BoardGenerator from "src/classes/BoardGenerator";
import Utils from "src/classes/Utils";
import RawVF from "src/classes/RawVF";

import { toBlob, toCanvas } from "html-to-image";

import { Dialog, Notify, copyToClipboard, exportFile, Dark } from "quasar"

import {
  statsObject,
  variant,
} from "src/composables/useSettings";

class BoardImportExport {
  constructor(board) {
    this.board = board;
  }

  sendToBoardEditor() {
    //Button on stats window for copying a board from somewhere to the board editor
    if (this.board.variant === "board editor") {
      //Already on board editor, do nothing
      return;
    }

    this.board.boardEditorMines = this.board.mines;
    variant.value = "board editor";
    this.board.editingEditBoard = true;

    this.board.resetBoard(true); //full reset as needed for variant change.
  }

  sendToZiniExplorer() {
    //Button on stats window for copying a board from somewhere to the zini explorer
    if (this.board.variant === "zini explorer") {
      //Already on zini explorer, do nothing
      return;
    }

    this.board.ziniExplorerMines = this.board.mines;
    this.board.ziniExplore.clearCurrentPath();
    variant.value = "zini explorer";

    let pathWithoutWasted = this.board.stats.clicks.filter(
      (click) => !click.type.includes("wasted")
    );

    if (this.board.variant === "mean openings") {
      //Remove flags which were place on mean mines
      pathWithoutWasted = pathWithoutWasted.filter((c) => {
        if (c.type === "right" && this.board.meanOpenings.meanMineStates[c.x][c.y].isMine) {
          return false;
        } else {
          return true;
        }
      });
    }

    //If it was a loss, also remove the final dig/chord
    if (this.board.stats.isWin === false) {
      pathWithoutWasted.pop();
    }

    this.board.resetBoard(true); //full reset as needed for variant change.
    this.board.ziniExplore.classicPath = structuredClone(pathWithoutWasted);
    this.board.switchToAnalyseMode();
  }

  sendToPttCalculator() {
    if (this.board.variant === "zini explorer") {
      //Need to compute pttaLink. Kinda hacky for zini explorer...
      let tempBoardStats = new BoardStats(this.board.mines, null);
      window.open(tempBoardStats.getPttaLink(), "_blank").focus();
    } else {
      window.open(statsObject.value.pttaLink, "_blank").focus();
    }
  }

  sendToMsCoach() {
    let msCoachParams = Algorithms.getCompressedData(
      this.board.tilesArray,
      this.board.mines
    );

    let msCoachUrl = `https://davidnhill.github.io/JSMinesweeper/index.html?board=${msCoachParams.width}x${msCoachParams.height}x${msCoachParams.mineCount}&analysis=${msCoachParams.analysis}`;

    window.open(msCoachUrl, "_blank").focus();
  }

  sendToMbfDialogue() {
    //Dialogue that lets you either copy the mbf as a string for make_board, or
    //or it lets you download as a .mbf file
    Dialog.create({
      title: "Send to MBF",
      message:
        'Copy hex string for <a href="https://mzrg.com/js/mine/make_board.html" target="blank">make_board</a> or download .mbf board file?',
      html: true,
      options: {
        model: "copy", // the field in returned payload
        type: "radio",
        items: [
          { label: "Copy MBF hex string", value: "copy" },
          { label: "Download MBF file", value: "download" },
        ],
      },
      cancel: true,
      persistent: true,
    })
      .onOk((data) => {
        // data is 'copy' or 'download'
        console.log(data);
        if (data === "copy") {
          //Copy hex string for make_board
          const mbfHexString = Algorithms.getMbfAsHexString(this.board.mines);

          copyToClipboard(mbfHexString);
          Notify.create({
            message: "Copied.",
            color: "purple",
            timeout: 700,
          });
        } else {
          //Download .mbf file
          const mbfUintArray = Algorithms.getMbfBinaryData(this.board.mines);

          const now = new Date();

          //Get current time. Then convert to desired format, hacky way is with ISOString
          //e.g. 2011-10-05T14:48:00.000Z -> 20111005_144800
          const exportTimestamp = now
            .toISOString()
            .replace("T", "_")
            .replace(/\.\d{3}Z/, "")
            .replaceAll(":", "")
            .replaceAll("-", "");

          const fileName = `board_${this.board.width}x${this.board.height}_${this.board.mineCount}-${exportTimestamp}.mbf`;

          const status = exportFile(fileName, mbfUintArray);

          if (status !== true) {
            console.error("Download failed or was prevented:", status);
          }
        }
      })
      .onCancel(() => {
        // user cancelled
      });
  }

  sendToStrangeDust() {
    if (this.board.stats) {
      RawVF.sendToStrangeDust(this.board.stats);
    }
  }

  importPttaBoard(pttaUrl) {
    if (this.board.variant !== "board editor" && this.board.variant !== "zini explorer") {
      return false;
    }

    let pttMines = BoardGenerator.readFromPtta(pttaUrl);

    if (this.board.variant === "board editor") {
      this.board.boardEditorMines = pttMines;
    } else if (this.board.variant === "zini explorer") {
      this.board.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.board.ziniExplorerMines = pttMines;
      this.board.ziniExplore.clearCurrentPath();
    }

    this.board.revertUnappliedWidthHeightSetting();

    this.board.switchToEditMode();

    return true;
  }

  async importMbfBoard(mbfStringToImport, mbfFileToImport) {
    if (this.board.variant !== "board editor" && this.board.variant !== "zini explorer") {
      return false;
    }

    let mbfMines;

    if (mbfStringToImport.trim() !== "") {
      mbfMines = BoardGenerator.readFromMbfString(mbfStringToImport);
    } else if (mbfFileToImport) {
      mbfMines = await BoardGenerator.readFromMbfFile(mbfFileToImport);
    } else {
      Dialog.create({
        title: "Alert",
        message: "Please provide either a MBF Hex string or file to import",
      });
      return false;
    }

    if (this.board.variant === "board editor") {
      this.board.boardEditorMines = mbfMines;
    } else if (this.board.variant === "zini explorer") {
      this.board.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.board.ziniExplorerMines = mbfMines;
      this.board.ziniExplore.clearCurrentPath();
    }

    this.board.revertUnappliedWidthHeightSetting();

    this.board.switchToEditMode();

    return true;
  }

  downloadRawVf() {
    if (this.board.stats) {
      Dialog.create({
        title: "Download Started",
        message:
          "Please note that RawVF output is intended for compatibility with StrangeDust's Replay Analyser and may not work with other viewers.",
      });
      RawVF.downloadRawVf(this.board.stats);
    }
  }

  copyBoardLink() {
    //Copy the current URL to clipboard
    let urlVariant = Utils.variantToRouteName(variant.value);

    if (variant.value === "zini explorer") {
      //Without click path
      let query = {
        b: Algorithms.getPttaDimensionString(this.board.ziniExplorerMines),
        m: Algorithms.getPttaMinesString(this.board.ziniExplorerMines),
      };

      let href = this.board.router.resolve({
        name: "play",
        params: { variant: urlVariant },
        query: query,
      }).href;

      let fullUrl = window.location.origin + "/" + href;

      if (this.board.ziniExplore.classicPath.length === 0) {
        //If there is no click path, then just copy link without clickpath
        copyToClipboard(fullUrl);
        Notify.create({
          message: "Copied.",
          color: "purple",
          timeout: 700,
        });
        return;
      }

      //With click path
      let clickString = Algorithms.encodeClicks(
        this.board.ziniExplore.classicPath,
        this.board.ziniExplorerMines.length,
        this.board.ziniExplorerMines[0].length
      );

      query.c = clickString;

      let hrefWithClickString = this.board.router.resolve({
        name: "play",
        params: { variant: urlVariant },
        query: query,
      }).href;

      let fullUrlWithClickpath =
        window.location.origin + "/" + hrefWithClickString;

      Dialog.create({
        title: "Copy Board Link",
        options: {
          type: "checkbox",
          model: [],
          // inline: true
          items: [
            {
              label: "Include click path",
              value: "click-path",
              color: "secondary",
            },
          ],
        },
        cancel: true,
        persistent: true,
      }).onOk((data) => {
        if (data.includes("click-path")) {
          copyToClipboard(fullUrlWithClickpath);
        } else {
          copyToClipboard(fullUrl);
        }
        Notify.create({
          message: "Copied.",
          color: "purple",
          timeout: 700,
        });
      });
    } else if (variant.value === "board editor") {
      let query = {
        b: Algorithms.getPttaDimensionString(this.board.boardEditorMines),
        m: Algorithms.getPttaMinesString(this.board.boardEditorMines),
      };

      let href = this.board.router.resolve({
        name: "play",
        params: { variant: urlVariant },
        query: query,
      }).href;

      let fullUrl = window.location.origin + "/" + href;

      copyToClipboard(fullUrl);
      Notify.create({
        message: "Copied.",
        color: "purple",
        timeout: 700,
      });
    } else {
      throw new Error("Copying URL not implemented for this variant");
    }
  }


  showExportScreenshotDialogue() {
    Dialog.create({
      title: "Screenshot Export",
      message: "Choose an option:",
      options: {
        type: "radio",
        model: "copy-with-stats",
        items: [
          { label: "Copy Board With Stats Panel", value: "copy-with-stats" },
          { label: "Copy Board Only", value: "copy-board" },
          {
            label: "Download Board With Stats Panel",
            value: "download-with-stats",
          },
          { label: "Download Board Only", value: "download-board" },
        ],
      },
      cancel: true,
      persistent: true,
    }).onOk((data) => {
      this.exportBoardScreenshot(data);
    });
  }

  async exportBoardScreenshot(exportOption) {
    const screenshotIncludesStats = exportOption.endsWith("with-stats");
    const screenshotIsCopied = exportOption.startsWith("copy");
    const blob = await this.getScreenshotBlob(screenshotIncludesStats);

    if (!blob) {
      Notify.create({
        message: "Export failed.",
        color: "negative",
        timeout: 1500,
      });
      return;
    }

    if (screenshotIsCopied) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        Notify.create({ message: "Copied.", color: "purple", timeout: 700 });
      } catch (e) {
        Notify.create({
          message: "Copy failed.",
          color: "negative",
          timeout: 1500,
        });
      }
    } else {
      const now = new Date();

      //Get current time. Then convert to desired format, hacky way is with ISOString
      //e.g. 2011-10-05T14:48:00.000Z -> 20111005_144800
      const exportTimestamp = now
        .toISOString()
        .replace("T", "_")
        .replace(/\.\d{3}Z/, "")
        .replaceAll(":", "")
        .replaceAll("-", "");

      const fileName = `screenshot_${this.board.width}x${this.board.height}_${this.board.mineCount}-${exportTimestamp}.png`;

      const status = exportFile(fileName, blob, "image/png");

      if (status !== true) {
        Notify.create({
          message: "Download failed.",
          color: "negative",
          timeout: 1500,
        });
      }
    }
  }

  async getScreenshotBlob(includeStats) {
    //Easy case, only copy the board. Early return
    if (!includeStats) {
      const blob = await toBlob(this.board.mainCanvas.value); //Using html-to-image here as this.board.mainCanvas.value.toBlob() would miss css filters applied to canvas.

      return blob;
    } else {
      //Hard case, copy the board with stats and format it nicely, including a footer

      const element =
        document.getElementById("stats-block") ??
        document.getElementById("zini-explorer-analyse-block");

      if (!element) {
        window.alert("missing side panel");
        throw new Error("missing side panel");
      }

      element.classList.add("screenshot-active"); //Add a class when screenshotting element as this hides certain things we don't want in screenshot

      let sidePanelCanvas;
      try {
        sidePanelCanvas = await toCanvas(element);
      } finally {
        element.classList.remove("screenshot-active");
      }

      const boardCanvas = await toCanvas(this.board.mainCanvas.value); //Using html-to-image here as this.board.mainCanvas.value would miss css filters applied to canvas.

      const gap = 15; //Gap between main canvas and side panel
      const padding = 15; //Padding around the whole image

      const footerHeight = 32;
      const footerFont = `500 19px "Roboto", "-apple-system", "Helvetica Neue", Helvetica, Arial, sans-serif`;
      const footerTextHorizontalMargin = 10;

      const width =
        boardCanvas.width + gap + sidePanelCanvas.width + 2 * padding;
      const height =
        Math.max(boardCanvas.height, sidePanelCanvas.height) +
        footerHeight +
        2 * padding;

      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;

      const outCtx = out.getContext("2d");
      outCtx.fillStyle = Dark.isActive ? "#121212" : "#E8E6DE";

      outCtx.fillRect(0, 0, width, height); //Background
      outCtx.drawImage(boardCanvas, padding, padding);
      outCtx.drawImage(
        sidePanelCanvas,
        boardCanvas.width + gap + padding,
        padding
      );

      //footer
      outCtx.fillStyle = Dark.isActive ? "#1976D2" : "#1976D2";
      outCtx.fillRect(0, height - footerHeight, width, footerHeight);
      outCtx.fillStyle = Dark.isActive ? "#ffffff" : "#ffffff";
      outCtx.font = footerFont;
      outCtx.textBaseline = "middle";
      outCtx.textAlign = "left";

      const textVariant = `mode=${this.board.variant}`;
      const textBoard = `board=${this.board.width}x${this.board.height}/${this.board.mineCount}`;
      const textWebsite = "llamasweeper.com";
      const space = "    ";
      let footerTextLeft = `${textVariant}${space}${textBoard}`;
      let footerTextRight = textWebsite;

      //Test if we have enough space with footerLeft + footerRight + some space in middle
      if (
        outCtx.measureText(`${footerTextLeft}${space}${footerTextRight}`)
          .width >
        width - 2 * footerTextHorizontalMargin
      ) {
        //Not enough space, remove website
        footerTextRight = "";
      }

      //Test if we have enough space to show only left footer
      if (
        outCtx.measureText(footerTextLeft).width >
        width - 2 * footerTextHorizontalMargin
      ) {
        //Not enough space, only show mode
        //We assume this will always fit, as the stats panel is wide enough to show this
        footerTextLeft = textVariant;
      }

      //draw left footer text
      outCtx.fillText(
        footerTextLeft,
        footerTextHorizontalMargin,
        height - footerHeight / 2
      );

      //draw right footer text
      if (footerTextRight.length > 0) {
        outCtx.textAlign = "right";
        outCtx.fillText(
          footerTextRight,
          width - footerTextHorizontalMargin,
          height - footerHeight / 2
        );
      }

      const blob = await new Promise((resolve) => out.toBlob(resolve));

      return blob;
    }
  }
}

export default BoardImportExport;