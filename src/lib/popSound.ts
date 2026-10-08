// The default notification sound: a short, soft "pop", made with the browser's own audio engine so no sound file
// (or extra package) is needed.

let context: AudioContext | null = null;

function getContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

// Browsers keep audio silent until the person has clicked or typed on the page once. Call this from such an event.
export function unlockPopSound() {
  try {
    if (getContext().state === "suspended") void getContext().resume();
  } catch {
    // No audio support: the sound is a nicety, so stay quiet
  }
}

export function playPop() {
  try {
    const audio = getContext();
    if (audio.state === "suspended") void audio.resume();

    const start = audio.currentTime;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();

    // A quick drop in pitch with a fast fade is what makes a tone sound like a "pop"
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, start);
    oscillator.frequency.exponentialRampToValueAtTime(320, start + 0.12);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  } catch {
    // Blocked or unsupported: stay quiet
  }
}
