const audioCtx = new AudioContext();

let soundsMap = {
  'dig': { url: '/sounds/dig.mp3', buffer: null },
  'flag': { url: '/sounds/flag.wav', buffer: null },
  'chord': { url: '/sounds/chord.wav', buffer: null },
  'lose': { url: '/sounds/small-explosion.mp3', buffer: null },
  'win': { url: '/sounds/new-notification-7.mp3', buffer: null }
}

async function getFile(filepath) {
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

//Save sound buffers
for (let sound in soundsMap) {
  getFile(soundsMap[sound].url).then((buffer) => { soundsMap[sound].buffer = buffer; });
}

function playSound(sound) {
  if (!soundsMap[sound].buffer) {
    console.log('sound not yet loaded');
    return;
  }

  const audioSource = audioCtx.createBufferSource();
  audioSource.buffer = soundsMap[sound].buffer;

  //Make quieter so sounds don't clip as much when overlapping
  const makeQuieter = audioCtx.createGain();
  makeQuieter.gain.value = 0.6;

  audioSource.connect(makeQuieter);
  makeQuieter.connect(audioCtx.destination)

  //audioSource.connect(audioCtx.destination);

  audioSource.start(0);
}

//Test out different win/loss sound effects
let testSoundList = [
  "error-5.mp3",
  "explosion-sfx.mp3",
  "firecracker.mp3",
  "fuse-and-small-explosion.mp3",
  "new-notification-7.mp3",
  "small-explosion.mp3",
  "success2.mp3",
];

window.changeWinLossSound = function (isWin, idx) {
  let thisSound = soundsMap[isWin ? 'win' : 'lose'];
  thisSound.url = `/sounds/test/${testSoundList[idx]}`;
  getFile(thisSound.url).then((buffer) => { thisSound.buffer = buffer; console.log('updated') });
}

export default playSound;