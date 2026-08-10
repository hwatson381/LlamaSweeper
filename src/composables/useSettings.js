//See useCoordssettings, but put EVERYTHING in here.

import { ref, computed, watchEffect } from "vue";
import { useLocalStorage } from "@vueuse/core";
import Utils from "src/classes/Utils";
import { isWasmAvailable, wasmReadySettled } from "src/classes/RustWasm";

//Whether the Rust/WASM module is usable. Authoritative by the time the UI is
//interactive (the app boot waits for wasm init to settle before mounting), but
//kept reactive so the no-guess / hint controls can disable themselves and
//other code paths can handle this situation
const wasmAvailable = ref(isWasmAvailable());
wasmReadySettled.then((ok) => {
  wasmAvailable.value = ok;
});

let showStatsBlock = ref(false);
let statsObject = ref({
  isWonGame: null, //Affects whether we show estimate stats
  time: null,
  estTime: null,
  solved3bv: null,
  total3bv: null,
  bbbvs: null,
  eff: null,
  maxEff: null,
  deepMaxEff: null,
  clicks: {
    total: null,
    effective: null,
    wasted: null,
    left: null,
    leftWasted: null,
    chord: null,
    chordWasted: null,
    right: null,
    rightWasted: null,
    clicksPerSecond: null,
    effectiveClicksPerSecond: null,
  },
  eightZini: null,
  chainZini: null,
  womZini: null,
  womHzini: null,
  cWomZini: null,
  cWomHzini: null, //not really used
  bestZini: null,
  pttaLink: null,
  deepZini: null,
  stnb: null,
  thrp: null,
  rqp: null,
  corr: null,
  attributes: {
    //Maybe another name would work for this or maybe need to restructure it?
    noGuess: false,
    hintsUsed: false,
  },
});
let statsShow8Way = useLocalStorage("ls_statsShow8Way", true);
let statsShowChain = useLocalStorage("ls_statsShowChain", true);
let statsShowWomZini = useLocalStorage("ls_statsShowWomZini", true);
let statsShowWomZiniFix = useLocalStorage("ls_statsShowWomZiniFix", true);
let statsShowMaxEff = useLocalStorage("ls_statsShowMaxEff", true);
let statsRunDeepChain = useLocalStorage("ls_statsRunDeepChain", "eff win");
let statsShowStnb = useLocalStorage("ls_statsShowStnb", true);
let statsShowThrp = useLocalStorage("ls_statsShowThrp", true);
let statsShowRqp = useLocalStorage("ls_statsShowRqp", true);
let statsShowCorr = useLocalStorage("ls_statsShowCorr", true);

let settingsModal = ref(false);
let filtersModal = ref(false);
let variantsHelpModal = ref(false);
let tileSizeSlider = useLocalStorage("ls_tileSizeSlider", 25);
let gamePositioning = useLocalStorage("ls_gamePositioning", "centre");
let gameLeftPadding = useLocalStorage("ls_gameLeftPadding", 30);
let gameCentrePadding = ref(0); //Add margin to left side of board to centre it
let gameCalculatedMarginLeft = computed(() => {
  return gamePositioning.value === "left"
    ? gameLeftPadding.value + 16 + "px"
    : gameCentrePadding.value + "px";
});
let gameVerticalPadding = useLocalStorage("ls_gameVerticalPadding", "16px"); //Note we call this padding but it is implemented as margin.
let gameTopPadding = useLocalStorage("ls_gameTopPadding", 16); //Note we call this padding but it is implemented as margin.
let gameBottomPadding = useLocalStorage("ls_gameBottomPadding", 16); //Note we call this padding but it is implemented as margin.
let centreInterface = useLocalStorage("ls_centreInterface", true);
let showBorders = useLocalStorage("ls_showBorders", true);
let showTimer = useLocalStorage("ls_showTimer", true);
let showMineCount = useLocalStorage("ls_showMineCount", true);
let showCoords = useLocalStorage("ls_showCoords", false);
let boardSkin = useLocalStorage("ls_boardSkin", "light");

let coordsModal = ref(false);
let coordsUseLetters = useLocalStorage("ls_coordsUseLetters", true);
let coordsUseInvertedY = useLocalStorage("ls_coordsUseInvertedY", true);
let coordsUseZeroIndexing = useLocalStorage("ls_coordsUseZeroIndexing", false);

//Dimensions for border
let boardHorizontalPadding = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value / 2) : 0;
});
let boardTopPadding = computed(() => {
  const topPanelTopAndBottomBorder = Math.floor(tileSizeSlider.value / 2);
  const topPanelHeight = Math.floor(tileSizeSlider.value * 2);
  return showBorders.value
    ? topPanelHeight + 2 * topPanelTopAndBottomBorder
    : 0; //Around 3 * tileSize, but may be less if values are non-integer to prevent gaps
});
let boardBottomPadding = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value / 2) : 0;
});
//More dimensions for top panel
let topPanelTopAndBottomBorder = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value / 2) : 0;
});
let topPanelHeight = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value * 2) : 0;
});

let boardSizePreset = useLocalStorage("ls_boardSizePreset", "beg"); //beg/int/exp. Mainly just used for showing correct thing in dropdown
let customWidth = useLocalStorage("ls_customWidth", 8);
let customHeight = useLocalStorage("ls_customHeight", 8);
let customMines = useLocalStorage("ls_customMines", 10);
let boardWidth = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 9;
    case "int":
      return 16;
    case "exp":
      return verticalExpert.value ? 16 : 30;
    case "custom":
      return Math.floor(Utils.clamp(customWidth.value, 1, 100));
    default:
      throw new Error("Disallowed preset");
  }
});
let boardHeight = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 9;
    case "int":
      return 16;
    case "exp":
      return verticalExpert.value ? 30 : 16;
    case "custom":
      return Math.floor(Utils.clamp(customHeight.value, 1, 100));
    default:
      throw new Error("Disallowed preset");
  }
});
let boardMines = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 10;
    case "int":
      return 40;
    case "exp":
      return 99;
    case "custom":
      if (customMines.value >= customWidth.value * customHeight.value) {
        return Math.floor(
          Utils.clamp(customWidth.value * customHeight.value - 1, 0, 2500)
        );
      }
      return Math.floor(Utils.clamp(customMines.value, 0, 2500));
    default:
      throw new Error("Disallowed preset");
  }
});
let customWarning = computed(() => {
  if (customMines.value > customWidth.value * customHeight.value - 1) {
    return "Too many mines!";
  }
  if (customWidth.value * customHeight.value >= 900) {
    return "Large board! May be laggy - sorry! Hope to fix eventually...";
  }
  return "";
});

let variant = ref("normal"); //Declare to safe value here, but in PlayPage.vue we initialise it based on the route

let chordingButtons = useLocalStorage("ls_chordingButtons", "l");
let zeroStart = useLocalStorage("ls_zeroStart", true);
let noGuessing = useLocalStorage("ls_noGuessing", false);
let noGuessingMaxAttempts = useLocalStorage("ls_noGuessingMaxAttempts", 10000);
let autoHintCriteria = useLocalStorage("ls_autoHintCriteria", "time"); //never|always|time. Criteria for when to automatically use a hint on lost games
let autoHintTime = useLocalStorage("ls_autoHintTime", 5);
let autoHintDelay = useLocalStorage("ls_autoHintDelay", 0); //ms to linger on mines before showing hint. 0 = instant (sync)
let autoHintVariants = useLocalStorage("ls_autoHintVariants", "not eff boards");
let autoHintBackdrop = useLocalStorage("ls_autoHintBackdrop", "no mines"); //numbers, mines, no mines, minimal

let begEffPreset = useLocalStorage("ls_begEffPreset", 200);
let begEffOptions = Object.freeze([200, 210, 225, "custom"]);
let begEffCustom = useLocalStorage("ls_begEffCustom", 235);
const begEffSlowGenPoint = 210;
let intEffPreset = useLocalStorage("ls_intEffPreset", 160);
let intEffOptions = Object.freeze([160, 170, 180, "custom"]);
let intEffCustom = useLocalStorage("ls_intEffCustom", 190);
const intEffSlowGenPoint = 180;
let expEffPreset = useLocalStorage("ls_expEffPreset", 150);
let expEffOptions = Object.freeze([150, 160, 170, "custom"]);
let expEffCustom = useLocalStorage("ls_expEffCustom", 180);
const expEffSlowGenPoint = 170;
let customEffCustom = useLocalStorage("ls_customEffCustom", 150);
let generateEffBoardsInBackground = useLocalStorage("ls_generateEffBoardsInBackground", false);
let effWebWorkerCount = useLocalStorage("ls_effWebWorkerCount", 1);
let browserSupportsWebWorkers = window.Worker ? true : false;
let browserSupportsConcurrency =
  browserSupportsWebWorkers && window.navigator.hardwareConcurrency > 2;
let effBoardsImplementation = ref(Utils.isWasmSupported() ? "wasm" : "js");
let effBoardsBenchmarkModal = ref(false);
let effBoardsHiddenSettingsModal = ref(false);
let effBoardsStoredDisplayCount = ref(0);
let effBoardsMaxStoredCount = useLocalStorage("ls_effBoardsMaxStoredCount", 40);
let effBoardsStoredFirstClickDisplay = ref("random");
let effFirstClickType = useLocalStorage("ls_effFirstClickType", "same");
let minimumEff = computed(() => {
  let minEff = 0;
  switch (boardSizePreset.value) {
    case "beg":
      minEff =
        begEffPreset.value === "custom"
          ? begEffCustom.value
          : begEffPreset.value;
      break;
    case "int":
      minEff =
        intEffPreset.value === "custom"
          ? intEffCustom.value
          : intEffPreset.value;
      break;
    case "exp":
      minEff =
        expEffPreset.value === "custom"
          ? expEffCustom.value
          : expEffPreset.value;
      break;
    case "custom":
      minEff = customEffCustom.value;
      break;
    default:
      throw new Error("Disallowed preset");
  }

  if (typeof minEff !== "number") {
    return 100;
  }

  return Utils.clamp(minEff, 100, 340);
});
let effBoardShowSlowGenerationWarning = computed(() => {
  //Whether we show a warning that generating the target eff on eff boards variant may be slow
  if (variant.value === "eff boards") {
    if (!window.Worker) {
      return false; //No point suggesting background generation if their device can't use web workers
    }
    switch (boardSizePreset.value) {
      case "beg":
        if (minimumEff.value >= begEffSlowGenPoint) {
          return true;
        }
        break;
      case "int":
        if (minimumEff.value >= intEffSlowGenPoint) {
          return true;
        }
        break;
      case "exp":
        if (minimumEff.value >= expEffSlowGenPoint) {
          return true;
        }
        break;
      case "custom":
        //Don't show warning for this as too complicated to figure out when it is slow
        break;
      default:
        throw new Error("Disallowed preset");
    }
  }
  return false;
});
//excellent eff affects whether we show eff stat in purple for eff boards.
let excellentEff = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return statsObject.value.eff >= 300;
    case "int":
      return statsObject.value.eff >= 215;
    case "exp":
      return statsObject.value.eff >= 170;
    case "custom":
      return false;
    default:
      throw new Error("Disallowed preset");
  }
});
let effWebWorkerCountOptions = [];
if (typeof window.navigator.hardwareConcurrency === "number") {
  for (let i = 1; i <= window.navigator.hardwareConcurrency; i = i * 2) {
    effWebWorkerCountOptions.push(i);
  }

  if (
    !effWebWorkerCountOptions.includes(window.navigator.hardwareConcurrency)
  ) {
    effWebWorkerCountOptions.push(window.navigator.hardwareConcurrency);
  }
} else {
  effWebWorkerCountOptions = [1];
}

let showQuickPaintOptions = ref(false);
let quickPaintModeDisplay = ref("Guess");
let quickPaintClearable = ref("guesses");
let quickPaintInitialOnlyMines = useLocalStorage(
  "ls_quickPaintInitialOnlyMines",
  true
);
let quickPaintMinimalMode = useLocalStorage("ls_quickPaintMinimalMode", true);
let quickPaintOnlyTrivialLogic = useLocalStorage(
  "ls_quickPaintOnlyTrivialLogic",
  false
);
let quickPaintHelpModal = ref(false);

let editBoardUnappliedWidth = ref(9);
let editBoardUnappliedHeight = ref(9);
let pttaImportModal = ref(false);
let mbfImportModal = ref(false);
let isCurrentlyEditModeDisplay = ref(true); //Lines up with game.board.gameStage = 'edit' - consider making ...gameStage a ref instead.

let flagToggleActive = ref(false); //Whether to swap left and right mouse buttons
let flagToggleShowReset = ref(false); //Shows after blast/game win to allow easier reset on mobile
let flagToggleLocationClass = useLocalStorage(
  "ls_flagToggleLocationClass",
  "toggle-bot-right"
);
let flagToggleSizeClass = useLocalStorage(
  "ls_flagToggleSizeClass",
  "toggle-normal"
);
let flagToggleSwitchAfterStart = useLocalStorage(
  "ls_flagToggleSwitchAfterStart",
  false
);
let mobileModeEnabled = useLocalStorage(
  "ls_mobileModeEnabled",
  Utils.isMobile()
); //Flag toggle starts enabled on mobile, disabled on desktop
let mobileScrollSetting = useLocalStorage("ls_mobileScrollSetting", "enable"); //Affects whether touches can trigger scroll
let mobileEnclosedScrollLetThrough = useLocalStorage(
  "ls_mobileEnclosedScrollLetThrough",
  true
); //Whether clicks can still affect the board on enclosed setting (typically placing flags)
let scrollLetThroughActive = computed(
  () =>
    (mobileScrollSetting.value === "enclosed nf" ||
      mobileScrollSetting.value === "enclosed flag") &&
    mobileEnclosedScrollLetThrough.value
);
let mobileDelayForEnableScroll = useLocalStorage(
  "ls_mobileDelayForEnableScroll",
  300
); //Delay on zero/interior settings after squares get revealed before scroll is enabled. Meant to stop accidental scrolls from revealing surprise openings.
let touchRevealLocation = useLocalStorage("ls_touchRevealLocation", "start"); //Whether we use the location of the touch at the start of it or the end of it
let touchRevealTiming = useLocalStorage("ls_touchRevealTiming", "end"); //Does it reveal the tile on finger up or finger down
let touchLongPressTime = useLocalStorage("ls_touchLongPressTime", 250); //When does long press = flag (or dig) get triggered
let touchLongPressDisabled = useLocalStorage(
  "ls_touchLongPressDisabled",
  false
);
let touchMaxTime = useLocalStorage("ls_touchMaxTime", 1000); //When do long touches get cancelled (maybe these become scrolls?)
let touchScrollDistance = useLocalStorage("ls_touchScrollDistance", 3); //When do touches that move a lot unlock the scroll
let verticalExpert = useLocalStorage("ls_verticalExpert", false);
let touchActionOverride = useLocalStorage("ls_touchActionOverride", "ignore");
let showQuickStats = useLocalStorage("ls_showQuickStats", false);
let quickStatsFontSize = useLocalStorage("ls_quickStatsFontSize", "14px");
let faceHitbox = useLocalStorage("ls_faceHitbox", "bar"); //Hitbox for when the face is click to trigger a reset
let soundEffectsEnabled = useLocalStorage(
  "ls_soundEffectsEnabled",
  Utils.isMobile()
);

let meanOpeningMineDensity = useLocalStorage("ls_meanOpeningMineDensity", 0.3); //mean opening settings
let meanOpeningFlagDensity = useLocalStorage("ls_meanOpeningFlagDensity", 1);
let meanMineClickBehaviour = useLocalStorage(
  "ls_meanMineClickBehaviour",
  "shield"
); //flag, blast, shield for 0.5 seconds, ignore

let replayProgress = ref(-1);
let replayProgressRounded = ref("-1.000"); //Same as replayProgress, but only to 3 d.p.
let replayIsPlaying = ref(false);
let replayBarStartValue = ref(0); //First value that can be jumped to on replay bar
let replayBarLastValue = ref(100); //Last value that can be jumped to on replay bar
let replayTypeForceSteppy = ref(false);
let replayType = ref("accurate");
let replayIsShown = ref(false);
let replaySpeedMultiplier = ref(1);
let replayIsPanning = ref(false);
let replayIsInputting = ref(false);
let reorderZini = useLocalStorage("ls_reorderZini", false);
let replayShowHidden = useLocalStorage("ls_replayShowHidden", "transparent3");

let analyseDisplayMode = useLocalStorage("ls_analyseDisplayMode", "classic");
let analyseAlgorithm = ref("incexzini");
let analyseAlgorithmScope = ref("beginning");
let analyseIterations = ref(100);
let analyseHistoryRewrite = ref(true);
let analyseDeepType = ref("separate");
let analyseDeepIterations = ref(5);
let analyseVisualise = ref(true);
let analyseForbid = ref(false);
let classicPathBreakdown = ref({
  lefts: 0,
  rights: 0,
  chords: 0,
  remaining3bv: 0,
});
let analyseZiniTotal = ref(0);
let analyse3bv = ref(0);
let analyseEff = ref(0);
let analyseShowPremiums = useLocalStorage("ls_analyseShowPremiums", "none");
let analyseHiddenStyle = useLocalStorage("ls_analyseHiddenStyle", "transparent3");
let analyseAlgorithmScopeOptions = computed(() => {
  const withCurrentOpts = [
    {
      label: "From beginning",
      value: "beginning",
    },
    { label: "From current", value: "current" },
  ];
  const basicOpts = [
    {
      label: "From beginning",
      value: "beginning",
    },
  ];
  if (
    analyseAlgorithm.value === "8 way" ||
    analyseAlgorithm.value === "chainzini" ||
    analyseAlgorithm.value === "incexzini"
  ) {
    return withCurrentOpts;
  } else {
    return basicOpts;
  }
});
watchEffect(() => {
  if (
    analyseAlgorithm.value === "8 way" ||
    analyseAlgorithm.value === "chainzini" ||
    analyseAlgorithm.value === "incexzini"
  ) {
    //Do nothing
  } else {
    //Change scope to beginning if it's a disallowed value
    if (analyseAlgorithmScope.value !== "beginning") {
      analyseAlgorithmScope.value = "beginning";
    }
  }
});
let runZiniAlgorithmModal = ref(false);
let ziniRunnerActive = ref(false);
let synchronousZiniActive = ref(false);
let ziniRunnerExpectedDuration = ref("calculating...");
let ziniRunnerExpectedFinishTime = ref("calculating...");
let ziniRunnerIterationsDisplay = ref("");
let ziniRunnerPercentageProgress = ref("0%");

let keyboardClickOpenOnKeyDown = useLocalStorage(
  "ls_keyboardClickOpenOnKeyDown",
  false
);
let keyboardClickDigKey = useLocalStorage("ls_keyboardClickDigKey", "z");
let keyboardClickFlagKey = useLocalStorage("ls_keyboardClickFlagKey", "x");

let enableFilters = useLocalStorage("ls_enableFilters", false);
let enableFilterBlur = useLocalStorage("ls_enableFilterBlur", false);
let enableFilterBrightness = useLocalStorage(
  "ls_enableFilterBrightness",
  false
);
let enableFilterContrast = useLocalStorage("ls_enableFilterContrast", false);
let enableFilterGrayscale = useLocalStorage("ls_enableFilterGrayscale", false);
let enableFilterHueRotate = useLocalStorage("ls_enableFilterHueRotate", false);
let enableFilterInvert = useLocalStorage("ls_enableFilterInvert", false);
let enableFilterSaturate = useLocalStorage("ls_enableFilterSaturate", false);
let filterBlurValue = useLocalStorage("ls_filterBlurValue", 2);
let filterBrightnessValue = useLocalStorage("ls_filterBrightnessValue", 0.5);
let filterContrastValue = useLocalStorage("ls_filterContrastValue", 1.5);
let filterGrayscaleValue = useLocalStorage("ls_filterGrayscaleValue", 1);
let filterHueRotateValue = useLocalStorage("ls_filterHueRotateValue", 45);
let filterInvertValue = useLocalStorage("ls_filterInvertValue", 1);
let filterSaturateValue = useLocalStorage("ls_filterSaturateValue", 2);

let filterStyleProperty = computed(() => {
  if (!enableFilters.value) {
    return "none";
  }

  let filters = [];

  enableFilterInvert.value &&
    filters.push(`invert(${filterInvertValue.value})`);
  enableFilterHueRotate.value &&
    filters.push(`hue-rotate(${filterHueRotateValue.value}deg)`);
  enableFilterSaturate.value &&
    filters.push(`saturate(${filterSaturateValue.value})`);
  enableFilterGrayscale.value &&
    filters.push(`grayscale(${filterGrayscaleValue.value})`);
  enableFilterContrast.value &&
    filters.push(`contrast(${filterContrastValue.value})`);
  enableFilterBrightness.value &&
    filters.push(`brightness(${filterBrightnessValue.value})`);
  enableFilterBlur.value && filters.push(`blur(${filterBlurValue.value}px)`);

  return filters.length > 0 ? filters.join(" ") : "none";
});

function resetTransientSettings() {
  //This gets called when PlayPage mounts to reset some refs.
  //This is needed now that useSettings is a singleton module,
  //because otherwise refs might get stuck on navigating away to back
  //to the variants page

  //Reset modals
  settingsModal.value = false;
  filtersModal.value = false;
  variantsHelpModal.value = false;
  coordsModal.value = false;
  effBoardsBenchmarkModal.value = false;
  effBoardsHiddenSettingsModal.value = false;
  quickPaintHelpModal.value = false;
  pttaImportModal.value = false;
  mbfImportModal.value = false;
  runZiniAlgorithmModal.value = false;

  //Stats panel
  showStatsBlock.value = false;
  //statsObject.value = <default shape goes here> //Is it bad to leave this as is? Other it's messy to reset

  //QuickPaint UI
  showQuickPaintOptions.value = false;
  quickPaintModeDisplay.value = "Guess";
  quickPaintClearable.value = "guesses";

  //Replay state
  replayIsShown.value = false;
  replayIsPlaying.value = false;
  replayProgress.value = -1;
  replayProgressRounded.value = "-1.000"
  replayBarStartValue.value = 0
  replayBarLastValue.value = 100
  replayTypeForceSteppy.value = false
  replayType.value = "accurate"
  replaySpeedMultiplier.value = 1
  replayIsPanning.value = false
  replayIsInputting.value = false

  //ZiNi stuff
  classicPathBreakdown.value = {
    lefts: 0,
    rights: 0,
    chords: 0,
    remaining3bv: 0,
  };
  analyseZiniTotal.value = 0
  analyse3bv.value = 0
  analyseEff.value = 0

  ziniRunnerActive.value = false
  synchronousZiniActive.value = false
  ziniRunnerExpectedDuration.value = "calculating..."
  ziniRunnerExpectedFinishTime.value = "calculating..."
  ziniRunnerIterationsDisplay.value = ""
  ziniRunnerPercentageProgress.value = "0%"
}

export {
  wasmAvailable,
  showStatsBlock,
  statsObject,
  statsShow8Way,
  statsShowChain,
  statsShowWomZini,
  statsShowWomZiniFix,
  statsShowMaxEff,
  statsRunDeepChain,
  statsShowStnb,
  statsShowThrp,
  statsShowRqp,
  statsShowCorr,
  settingsModal,
  filtersModal,
  variantsHelpModal,
  tileSizeSlider,
  gamePositioning,
  gameLeftPadding,
  gameCentrePadding,
  gameCalculatedMarginLeft,
  gameVerticalPadding,
  gameTopPadding,
  gameBottomPadding,
  centreInterface,
  showBorders,
  showTimer,
  showMineCount,
  showCoords,
  boardSkin,
  coordsModal,
  coordsUseLetters,
  coordsUseInvertedY,
  coordsUseZeroIndexing,
  boardHorizontalPadding,
  boardTopPadding,
  boardBottomPadding,
  topPanelTopAndBottomBorder,
  topPanelHeight,
  boardSizePreset,
  customWidth,
  customHeight,
  customMines,
  boardWidth,
  boardHeight,
  boardMines,
  customWarning,
  variant,
  chordingButtons,
  zeroStart,
  noGuessing,
  noGuessingMaxAttempts,
  autoHintCriteria,
  autoHintTime,
  autoHintDelay,
  autoHintVariants,
  autoHintBackdrop,
  begEffPreset,
  begEffOptions,
  begEffCustom,
  begEffSlowGenPoint,
  intEffPreset,
  intEffOptions,
  intEffCustom,
  intEffSlowGenPoint,
  expEffPreset,
  expEffOptions,
  expEffCustom,
  expEffSlowGenPoint,
  customEffCustom,
  generateEffBoardsInBackground,
  effWebWorkerCount,
  browserSupportsWebWorkers,
  browserSupportsConcurrency,
  effBoardsImplementation,
  effBoardsBenchmarkModal,
  effBoardsHiddenSettingsModal,
  effBoardsStoredDisplayCount,
  effBoardsMaxStoredCount,
  effBoardsStoredFirstClickDisplay,
  effFirstClickType,
  minimumEff,
  effBoardShowSlowGenerationWarning,
  excellentEff,
  effWebWorkerCountOptions,
  showQuickPaintOptions,
  quickPaintModeDisplay,
  quickPaintClearable,
  quickPaintInitialOnlyMines,
  quickPaintMinimalMode,
  quickPaintOnlyTrivialLogic,
  quickPaintHelpModal,
  editBoardUnappliedWidth,
  editBoardUnappliedHeight,
  pttaImportModal,
  mbfImportModal,
  isCurrentlyEditModeDisplay,
  flagToggleActive,
  flagToggleShowReset,
  flagToggleLocationClass,
  flagToggleSizeClass,
  flagToggleSwitchAfterStart,
  mobileModeEnabled,
  mobileScrollSetting,
  mobileEnclosedScrollLetThrough,
  scrollLetThroughActive,
  mobileDelayForEnableScroll,
  touchRevealLocation,
  touchRevealTiming,
  touchLongPressTime,
  touchLongPressDisabled,
  touchMaxTime,
  touchScrollDistance,
  verticalExpert,
  touchActionOverride,
  showQuickStats,
  quickStatsFontSize,
  faceHitbox,
  soundEffectsEnabled,
  meanOpeningMineDensity,
  meanOpeningFlagDensity,
  meanMineClickBehaviour,
  replayProgress,
  replayProgressRounded,
  replayIsPlaying,
  replayBarStartValue,
  replayBarLastValue,
  replayTypeForceSteppy,
  replayType,
  replayIsShown,
  replaySpeedMultiplier,
  replayIsPanning,
  replayIsInputting,
  reorderZini,
  replayShowHidden,
  analyseDisplayMode,
  analyseAlgorithm,
  analyseAlgorithmScope,
  analyseIterations,
  analyseHistoryRewrite,
  analyseDeepType,
  analyseDeepIterations,
  analyseVisualise,
  analyseForbid,
  classicPathBreakdown,
  analyseZiniTotal,
  analyse3bv,
  analyseEff,
  analyseShowPremiums,
  analyseHiddenStyle,
  analyseAlgorithmScopeOptions,
  runZiniAlgorithmModal,
  ziniRunnerActive,
  synchronousZiniActive,
  ziniRunnerExpectedDuration,
  ziniRunnerExpectedFinishTime,
  ziniRunnerIterationsDisplay,
  ziniRunnerPercentageProgress,
  keyboardClickOpenOnKeyDown,
  keyboardClickDigKey,
  keyboardClickFlagKey,
  enableFilters,
  enableFilterBlur,
  enableFilterBrightness,
  enableFilterContrast,
  enableFilterGrayscale,
  enableFilterHueRotate,
  enableFilterInvert,
  enableFilterSaturate,
  filterBlurValue,
  filterBrightnessValue,
  filterContrastValue,
  filterGrayscaleValue,
  filterHueRotateValue,
  filterInvertValue,
  filterSaturateValue,
  filterStyleProperty,
  resetTransientSettings
};