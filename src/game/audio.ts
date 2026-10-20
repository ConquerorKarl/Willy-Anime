// Tiny WebAudio FX engine — no assets, all synthesized.
import { MusicPlayer, type ThemeId } from "./music";
export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.3;
    this.music.setMuted(m);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    vol = 0.3,
    slide = 0,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  private noise(dur: number, vol = 0.25, filterFreq = 1200) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }

  pong() { this.tone(880, 0.07, "square", 0.16, -300); }
  hit() { this.tone(300, 0.08, "sawtooth", 0.18, -140); }
  kill() { this.noise(0.25, 0.3, 900); this.tone(160, 0.22, "triangle", 0.2, -90); }
  pickup() { this.tone(660, 0.09, "triangle", 0.25); setTimeout(() => this.tone(990, 0.12, "triangle", 0.25), 70); }
  upgrade() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, "square", 0.2), i * 60)); }
  hurt() { this.noise(0.2, 0.35, 500); this.tone(180, 0.18, "sawtooth", 0.2, -110); }
  smash() { this.noise(0.18, 0.4, 2500); this.tone(420, 0.14, "square", 0.22, -200); }
  blip() { this.tone(1200, 0.05, "sine", 0.14); }
  /** Deep, dread-filled horn for a boss arrival. */
  bossHorn() {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime;
    [55, 82.5, 110].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i === 2 ? "square" : "sawtooth";
      o.frequency.setValueAtTime(f, t0);
      o.frequency.linearRampToValueAtTime(f * 1.06, t0 + 1.6);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.25);
      g.gain.setValueAtTime(0.22, t0 + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
      const f1 = ctx.createBiquadFilter();
      f1.type = "lowpass"; f1.frequency.value = 900;
      o.connect(f1); f1.connect(g); g.connect(this.master!);
      o.start(t0); o.stop(t0 + 2);
    });
    this.noise(1.4, 0.16, 350);
    setTimeout(() => { this.tone(146, 0.5, "sawtooth", 0.2, -40); }, 900);
  }

  /** Enormous, cinematic arrival for the level 25/50/75/100 bosses. */
  milestoneBoss() {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime;
    // sub-bass impact
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(140, t0);
    sub.frequency.exponentialRampToValueAtTime(28, t0 + 1.4);
    sg.gain.setValueAtTime(0.5, t0);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    sub.connect(sg); sg.connect(this.master); sub.start(t0); sub.stop(t0 + 2);
    this.noise(1.8, 0.34, 600);
    // ominous minor choir-ish stack
    [49, 58.3, 73.4, 98].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
      o.type = i % 2 ? "sawtooth" : "square";
      o.frequency.setValueAtTime(f, t0 + 0.3);
      o.frequency.linearRampToValueAtTime(f * 1.03, t0 + 3.4);
      fl.type = "lowpass"; fl.frequency.value = 760;
      g.gain.setValueAtTime(0.0001, t0 + 0.3);
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.9);
      g.gain.setValueAtTime(0.2, t0 + 2.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
      o.connect(fl); fl.connect(g); g.connect(this.master!);
      o.start(t0 + 0.3); o.stop(t0 + 3.7);
    });
    // three descending gong hits
    [0, 700, 1400].forEach((ms, i) => setTimeout(() => {
      this.tone(196 / (1 + i * 0.22), 0.9, "triangle", 0.26, -40);
      this.noise(0.5, 0.2, 1400);
    }, 600 + ms));
    // shrieking riser into the reveal
    setTimeout(() => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(160, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 1.2);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3);
      o.connect(g); g.connect(this.master!);
      o.start(); o.stop(ctx.currentTime + 1.35);
    }, 2600);
  }

  /** Rising stinger when the escort breaks and the boss is exposed. */
  bossExposed() {
    [220, 330, 440, 660].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "square", 0.2), i * 90));
    setTimeout(() => this.noise(0.4, 0.3, 2000), 380);
  }

  /** Heavy impact for boss slams. */
  bossSlam() {
    this.noise(0.5, 0.42, 420);
    this.tone(70, 0.45, "sawtooth", 0.3, -25);
  }

  bossDie() {
    this.noise(1.1, 0.4, 700);
    [330, 262, 196, 131, 98].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.22), i * 130));
    setTimeout(() => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "triangle", 0.2), i * 110)), 700);
  }

  /** Metallic sword draw + thunderclap for the samurai. */
  iaiSlash() {
    this.noise(0.18, 0.3, 6000);
    this.tone(2400, 0.1, "sawtooth", 0.14, -1400);
    setTimeout(() => { this.noise(0.5, 0.4, 900); this.tone(90, 0.5, "sawtooth", 0.26, -40); }, 150);
  }
  /** Rapid-fire machine gun burst. */
  machineGun() {
    for (let i = 0; i < 6; i++) setTimeout(() => {
      this.noise(0.05, 0.16, 3200);
      this.tone(220 + Math.random() * 60, 0.04, "square", 0.1, -80);
    }, i * 55);
  }
  /** Dragon's roaring flame breath. */
  dragonRoar() {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t0);
    o.frequency.linearRampToValueAtTime(42, t0 + 1.3);
    f.type = "lowpass"; f.frequency.setValueAtTime(1600, t0);
    f.frequency.exponentialRampToValueAtTime(300, t0 + 1.3);
    g.gain.setValueAtTime(0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 1.5);
    this.noise(1.2, 0.3, 2200);
  }
  /** Colossal fist impact. */
  titanFist() {
    this.noise(0.7, 0.45, 300);
    this.tone(52, 0.7, "sine", 0.4, -18);
    setTimeout(() => this.tone(110, 0.3, "triangle", 0.2, -50), 90);
  }
  /** Temple bell toll. */
  bell() {
    [1047, 1568, 2093].forEach((f, i) =>
      setTimeout(() => this.tone(f, 1.6, "sine", 0.12 - i * 0.03), i * 25));
    this.tone(262, 2.2, "triangle", 0.16);
  }

  // ================= BOSS MUSIC =================
  // Delegated to MusicPlayer: uses real MP3/OGG files when TRACKS are
  // configured in music.ts, otherwise runs the built-in sequencer.
  music = new MusicPlayer();

  startBossMusic(theme: ThemeId) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.music.attach(ctx, this.master);
    this.music.play(theme);
  }

  stopBossMusic() { this.music.stop(); }
  setMusicVolume(v: number) { this.music.setVolume(v); }

  /** Click as each item passes the marker. */
  reelTick() { this.tone(1500, 0.03, "square", 0.07); }
  /** Win chime, pitched by rarity. */
  reelLand(rarity: number) {
    const sets = [[523, 659], [523, 659, 784], [523, 659, 784, 1047], [659, 784, 1047, 1319, 1568]];
    (sets[rarity] || sets[0]).forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.3, "triangle", 0.2), i * 80));
    if (rarity >= 2) this.noise(0.5, 0.2, 3000);
  }

  /** Bright little fanfare when your fighter leaps into frame. */
  heroEntrance() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.22, "square", 0.16), i * 95));
    setTimeout(() => this.tone(1319, 0.45, "triangle", 0.15), 420);
  }

  /** Low wooden knock as the elder arrives. */
  sageArrive() {
    this.tone(196, 0.5, "triangle", 0.2, -40);
    this.noise(0.3, 0.12, 700);
    setTimeout(() => this.tone(262, 0.6, "sine", 0.14), 160);
  }

  /** Rising shimmer as the element binds to you. */
  infuse(hz = 440) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(hz * 0.5, t0);
    o.frequency.exponentialRampToValueAtTime(hz * 3, t0 + 1.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 1.7);
    this.noise(1.2, 0.14, 4200);
    setTimeout(() => [784, 1047, 1319, 1568].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.3, "triangle", 0.16), i * 85)), 1100);
  }

  win() { [523, 659, 784, 1047, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, "triangle", 0.22), i * 110)); }
  lose() { [440, 370, 294, 220].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sawtooth", 0.18), i * 150)); }
}

export const sfx = new Sfx();
