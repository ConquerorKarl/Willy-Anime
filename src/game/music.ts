// ============================================================================
// Boss music.
//
// Two sources, in priority order:
//   1. Real audio files (MP3/OGG) if you supply them — see TRACKS below.
//   2. A built-in multi-track sequencer that composes the theme live.
//
// The project bundles to a SINGLE html file (vite-plugin-singlefile), so audio
// files are NOT inlined. Supply them as absolute URLs, or drop them in
// `public/music/` and serve the app as a normal multi-file build.
// ============================================================================

export type ThemeId = "samurai" | "yakuza" | "dragon" | "titan" | "normal";

/**
 * Point these at real audio to override the synthesised themes.
 * Any entry left empty falls back to the sequencer automatically.
 *
 *   TRACKS.samurai = "/music/raiden.mp3";
 *   TRACKS.titan   = "https://cdn.example.com/titan-theme.mp3";
 */
const DEFAULT_TRACKS: Record<ThemeId, string> = {
  samurai: "",
  yakuza: "",
  dragon: "",
  titan: "",
  normal: "",
};

const LS_KEY = "willy-tracks-v1";

/** Live track table. Edits made in the in-game Music panel persist here. */
export const TRACKS: Record<ThemeId, string> = (() => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_TRACKS, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return { ...DEFAULT_TRACKS };
})();

export function setTrack(theme: ThemeId, url: string) {
  TRACKS[theme] = url.trim();
  try { localStorage.setItem(LS_KEY, JSON.stringify(TRACKS)); } catch { /* noop */ }
}

export function clearTracks() {
  for (const k of Object.keys(TRACKS) as ThemeId[]) TRACKS[k] = DEFAULT_TRACKS[k];
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

/** Reject anything that clearly isn't a direct audio file. */
export function validateTrackUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (/youtube\.com|youtu\.be|soundcloud\.com|spotify\.com/i.test(u))
    return "Streaming-site links can't be used — they serve a player page, not an audio file. Use a direct .mp3/.ogg URL.";
  if (!/^https?:\/\//i.test(u) && !u.startsWith("/"))
    return "Must be a full https:// URL or a path starting with /";
  if (!/\.(mp3|ogg|wav|m4a|webm|opus)(\?|$)/i.test(u))
    return "URL should point at an audio file (.mp3, .ogg, .wav, .m4a, .opus)";
  return null;
}

// ---------------------------------------------------------------- composition
/** Semitone offsets from the theme root. `-99` is a rest. */
const R = -99;

interface Theme {
  root: number;          // Hz of the tonic
  bpm: number;
  lead: OscillatorType;
  bass: OscillatorType;
  /** 16-step patterns, repeated. Multiple bars are cycled in order. */
  melody: number[][];
  bassLine: number[];
  /** 1 = kick, 2 = snare, 3 = hat, 0 = rest */
  drums: number[];
  /** sustained chord roots, one per bar */
  pad: number[];
  swing: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  // Driving taiko + minor pentatonic — a duel at the temple gate.
  samurai: {
    root: 110, bpm: 152, lead: "square", bass: "triangle", swing: 0.06,
    melody: [
      [0, R, 3, R, 7, R, 3, R, 10, R, 7, R, 3, R, 0, R],
      [0, R, 3, 5, 7, R, 10, R, 12, R, 10, 7, 5, R, 3, R],
      [7, R, 7, R, 10, R, 12, R, 15, R, 12, R, 10, 7, 3, R],
      [0, 3, 7, 10, 12, 10, 7, 3, 0, R, R, R, 0, R, 0, R],
    ],
    bassLine: [0, 0, R, 0, R, 0, 0, R, -5, -5, R, -5, R, -5, 0, R],
    drums:    [1, 0, 3, 0, 2, 0, 3, 1, 1, 0, 3, 0, 2, 0, 3, 3],
    pad: [0, -5, -3, 0],
  },

  // Noir half-step menace — smoky, patient, dangerous.
  yakuza: {
    root: 98, bpm: 126, lead: "sawtooth", bass: "square", swing: 0.14,
    melody: [
      [0, R, R, 1, R, 0, R, R, 5, R, R, 3, R, 1, R, 0],
      [R, 0, R, 1, 3, R, 1, R, 0, R, R, R, -2, R, 0, R],
      [7, R, 5, R, 3, R, 1, R, 0, R, 1, 3, R, 1, 0, R],
      [0, R, R, R, 8, R, 7, R, 5, R, 3, R, 1, R, 0, R],
    ],
    bassLine: [0, R, 0, R, R, 0, R, 0, 1, R, 1, R, R, 1, R, R],
    drums:    [1, 0, 0, 3, 2, 0, 3, 0, 1, 0, 1, 3, 2, 0, 3, 0],
    pad: [0, 0, 1, -4],
  },

  // Whole-tone dread, no resolution — something vast and burning.
  dragon: {
    root: 87, bpm: 140, lead: "sawtooth", bass: "sawtooth", swing: 0,
    melody: [
      [0, R, 2, R, 4, R, 6, R, 8, R, 6, R, 4, R, 2, R],
      [12, R, 10, R, 8, R, 6, R, 4, 6, 8, 10, 12, R, R, R],
      [0, 0, R, 4, 4, R, 8, 8, R, 6, R, 4, R, 2, R, 0],
      [8, R, R, 10, R, R, 12, R, 14, R, 12, 10, 8, 6, 4, 2],
    ],
    bassLine: [0, 0, 0, R, 0, 0, R, 0, -4, -4, -4, R, -4, R, 0, 0],
    drums:    [1, 3, 0, 3, 2, 3, 0, 3, 1, 3, 1, 3, 2, 3, 2, 3],
    pad: [0, -4, 2, -2],
  },

  // Slow, monumental, temple-bell cadence. Enormous and unhurried.
  titan: {
    root: 73, bpm: 100, lead: "triangle", bass: "sine", swing: 0,
    melody: [
      [0, R, R, R, 7, R, R, R, 3, R, R, R, 7, R, R, R],
      [0, R, R, 3, R, R, 7, R, R, 9, R, R, 7, R, 3, R],
      [12, R, R, R, 9, R, R, R, 7, R, R, R, 3, R, R, R],
      [0, R, 3, R, 7, R, 9, R, 12, R, R, R, R, R, R, R],
    ],
    bassLine: [0, R, R, R, R, R, R, R, -5, R, R, R, R, R, R, R],
    drums:    [1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 2, 0, 0, 3],
    pad: [0, 0, -5, -3],
  },

  // Standard mid-boss: urgent, punchy, pentatonic.
  normal: {
    root: 104, bpm: 144, lead: "square", bass: "triangle", swing: 0.04,
    melody: [
      [0, R, 3, R, 5, R, 7, R, 5, R, 3, R, 0, R, R, R],
      [7, R, 5, R, 3, R, 0, R, 3, R, 5, R, 7, R, 10, R],
      [0, 0, R, 3, 3, R, 5, R, 7, R, 5, 3, 0, R, R, R],
      [10, R, 7, R, 5, R, 3, R, 0, R, R, R, 0, R, 0, R],
    ],
    bassLine: [0, R, 0, R, -5, R, -5, R, -3, R, -3, R, 0, R, 0, R],
    drums:    [1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 1, 2, 0, 3, 3],
    pad: [0, -5, -3, -5],
  },
};

// ---------------------------------------------------------------- the player
export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: number | null = null;
  private el: HTMLAudioElement | null = null;
  private step = 0;
  private bar = 0;
  volume = 0.42;
  muted = false;
  current: ThemeId | null = null;

  attach(ctx: AudioContext, master: GainNode) {
    this.ctx = ctx;
    this.master = master;
  }

  /** True when a real audio file is configured for this theme. */
  hasTrack(theme: ThemeId) { return !!TRACKS[theme]; }

  play(theme: ThemeId) {
    this.stop();
    if (this.muted) return;
    this.current = theme;
    const url = TRACKS[theme];
    if (url) { this.playFile(url); return; }
    this.playSynth(theme);
  }

  // ---- source 1: a real audio file ----
  private playFile(url: string) {
    const el = new Audio(url);
    el.loop = true;
    el.volume = 0;
    this.el = el;
    el.play().then(() => {
      // fade in so it doesn't slam on top of the arrival stinger
      const target = this.volume;
      let v = 0;
      const id = window.setInterval(() => {
        v = Math.min(target, v + target / 25);
        el.volume = v;
        if (v >= target) clearInterval(id);
      }, 40);
    }).catch(() => {
      // autoplay refused or file missing — fall back to the sequencer
      this.el = null;
      if (this.current) this.playSynth(this.current);
    });
  }

  // ---- source 2: the built-in sequencer ----
  private playSynth(theme: ThemeId) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const T = THEMES[theme];
    const bus = ctx.createGain();
    bus.gain.value = 0.0001;
    bus.gain.exponentialRampToValueAtTime(this.volume, ctx.currentTime + 1.4);
    bus.connect(this.master);
    this.bus = bus;
    this.step = 0;
    this.bar = 0;

    const beat = 60 / T.bpm;
    const stepDur = beat * 0.5;

    const note = (
      semi: number, dur: number, type: OscillatorType, vol: number,
      detune = 0, filter?: number,
    ) => {
      if (semi === R) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = T.root * Math.pow(2, semi / 12);
      o.detune.value = detune;
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let tail: AudioNode = g;
      if (filter) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = filter;
        g.connect(f);
        tail = f;
      }
      o.connect(g);
      tail.connect(bus);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    };

    const perc = (kind: number) => {
      const t0 = ctx.currentTime;
      if (kind === 1) {                       // kick
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(150, t0);
        o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
        g.gain.setValueAtTime(0.5, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + 0.25);
        return;
      }
      // snare / hat from filtered noise
      const dur = kind === 2 ? 0.16 : 0.05;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = kind === 2 ? "bandpass" : "highpass";
      f.frequency.value = kind === 2 ? 1900 : 7200;
      const g = ctx.createGain();
      g.gain.value = kind === 2 ? 0.26 : 0.1;
      src.connect(f); f.connect(g); g.connect(bus);
      src.start(t0);
    };

    const tick = () => {
      const s = this.step % 16;
      if (s === 0) this.bar = (this.bar + 1) % T.melody.length;

      // bass
      note(T.bassLine[s] - 12, beat * 0.85, T.bass, 0.3, 0, 520);
      // drums
      const dr = T.drums[s];
      if (dr) perc(dr);
      // lead melody, doubled an octave up with slight detune for width
      const m = T.melody[this.bar][s];
      if (m !== R) {
        note(m + 12, beat * 0.62, T.lead, 0.11, -6);
        note(m + 24, beat * 0.4, T.lead, 0.035, 7);
      }
      // sustained pad once per bar
      if (s === 0) {
        note(T.pad[this.bar] - 24, beat * 7.6, T.bass, 0.14, 0, 380);
        note(T.pad[this.bar] - 12, beat * 7.6, "triangle", 0.05, 4, 700);
      }
      this.step++;
    };

    tick();
    // swing: alternate step length slightly for groove
    const run = () => {
      tick();
      const sw = (this.step % 2 ? 1 + T.swing : 1 - T.swing);
      this.timer = window.setTimeout(run, stepDur * 1000 * sw);
    };
    this.timer = window.setTimeout(run, stepDur * 1000);
  }

  stop() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    if (this.el) {
      const el = this.el;
      let v = el.volume;
      const id = window.setInterval(() => {
        v -= 0.08;
        if (v <= 0) { clearInterval(id); el.pause(); el.src = ""; }
        else el.volume = v;
      }, 40);
      this.el = null;
    }
    if (this.bus && this.ctx) {
      const g = this.bus;
      try {
        g.gain.cancelScheduledValues(this.ctx.currentTime);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.7);
      } catch { /* noop */ }
      setTimeout(() => { try { g.disconnect(); } catch { /* noop */ } }, 800);
      this.bus = null;
    }
    this.current = null;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.el) this.el.volume = this.volume;
    if (this.bus && this.ctx) {
      try { this.bus.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1); } catch { /* noop */ }
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) { const c = this.current; this.stop(); this.current = c; }
  }
}
