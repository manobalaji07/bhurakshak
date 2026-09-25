// Web Audio API Synthesizer matching MAX98357A hardware speaker tones
let audioCtx: AudioContext | null = null;
let activeOscillator: OscillatorNode | null = null;
let isMuted: boolean = false;
let currentMode: 'NONE' | 'WARNING' | 'DANGER' = 'NONE';
let loopInterval: any = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSingleBeep(frequencyHz: number, durationMs: number) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000.0);
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export function startSpeakerAlert(mode: 'WARNING' | 'DANGER') {
  if (currentMode === mode && loopInterval) return;
  stopSpeakerAlert();
  currentMode = mode;

  const playSequence = () => {
    if (mode === 'WARNING') {
      // Slow double beep at 900 Hz matching MAX98357A warningBeep()
      playSingleBeep(900, 250);
      setTimeout(() => playSingleBeep(900, 250), 300);
    } else if (mode === 'DANGER') {
      // Fast triple beep at 1500 Hz matching MAX98357A dangerBeep()
      playSingleBeep(1500, 150);
      setTimeout(() => playSingleBeep(1500, 150), 200);
      setTimeout(() => playSingleBeep(1500, 150), 400);
    }
  };

  playSequence();
  loopInterval = setInterval(playSequence, mode === 'DANGER' ? 1200 : 2500);
}

export function stopSpeakerAlert() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  currentMode = 'NONE';
}

export function toggleAudioMute(): boolean {
  isMuted = !isMuted;
  if (isMuted) {
    stopSpeakerAlert();
  }
  return isMuted;
}

export function getAudioMuted(): boolean {
  return isMuted;
}
