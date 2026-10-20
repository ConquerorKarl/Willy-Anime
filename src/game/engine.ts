import { sfx } from "./audio";
import {
  ACTIVE_BY_ID, ACTIVES, ACTS, BOONS, BOON_BY_ID, LEGEND_CARDS, legendCardsForTier,
  MASTERY_BY_ID, masteriesFor, ELITES, ELITE_BY_ID, ELITE_CHANCE, GUNS, GUN_BY_ID, GUN_SKILLS, gunsForTier, CHAMPIONS, GAUNTLET, endlessWave, bossForLevel, isActBoss, EFFECT_INFO, ITEM_BASE_IDS, ITEM_BASE_STATS, ITEM_TIERS,
  ITEM_VARIANT_STATS, MODS, MOD_BY_ID, MAX_LEVEL, UNIQUE_BY_ID, uniquesFor, MAX_WEAPON_LEVEL, META_UPGRADES, PASSIVES, PASSIVE_BY_ID,
  CHAR_BY_ID, ELEMENTS, QUEST_TEMPLATES, SUPERS, SUPER_CHANCE, SUPER_LEVEL, TIERS, WAIFUS, WAIFU_BY_ID, WAIFU_GATES,
  WEAPONS, WEAPON_BY_ID, baseStats, rollItemEffect, rollItemTier, rollItemVariant, rollRole, weaponStats,
  type ActDef, type BossDef, type CharacterDef, type Element, type ElementPath, type ItemEffect, type RoleDef,
  type Stats, type StatMods, type WaifuDef, type WeaponDef,
} from "./content";
import { ITEM_BASES, ITEM_VARIANTS, drawSprite } from "./pixel";
import { PORTRAIT_PALETTES } from "./portraits";

function uniqueProc(id: string) { return UNIQUE_BY_ID[id]?.proc; }
import {
  CELL, DISTRICTS, GRID, WORLD, doorPoint, generateWorld, isBuildingCell,
  type Building, type District, type WorldData,
} from "./world";

export type GameState = "menu" | "playing" | "paused" | "levelup" | "waifu" | "shop" | "loot" | "roll" | "hub" | "spoils" | "boon" | "legend" | "gun" | "defeat" | "gameover" | "win";

const TAU = Math.PI * 2;
/** Minimum seconds between repeats of the same boss mechanic. Keeps
 *  disruptive abilities (teleports, screen-wide bursts) from dominating. */
const MECH_COOLDOWN: Record<string, number> = {
  blink: 9, iai: 8, skyfall: 11, cloneslash: 10, kneedive: 7, palmcone: 7,
  bellyflop: 8, groundpound: 9, fistbarrage: 10, pillarquake: 11,
  crossbeam: 9, ringwall: 8, meteorstorm: 9, quakegrid: 10, spinlaser: 12,
  shockwave: 9, pillars: 12, homingorbs: 7, adds: 14, raisedead: 16,
  sever: 16, bulletstorm: 8, grenades: 6, suppress: 11, dashcombo: 8, flurry: 5,
  cleavefan: 5, daggerfan: 4, servestorm: 6, foxfire: 6, spikeserve: 4,
  elementalpe: 7, firewall: 10, flamebreath: 8,
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const d2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// ---------------- persistent meta ----------------
export interface MetaSave { coins: number; levels: Record<string, number>; best: HighScore[] }
export interface HighScore { name: string; level: number; kills: number; time: number; coins: number; date: string }
const META_KEY = "willy-chiba-meta-v2";

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as MetaSave;
      return { coins: m.coins || 0, levels: m.levels || {}, best: m.best || [] };
    }
  } catch { /* noop */ }
  return { coins: 0, levels: {}, best: [] };
}
export function saveMeta(m: MetaSave) {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* noop */ }
}

// ---------------- UI-facing types ----------------
export interface OwnedWeapon { id: string; level: number }
export interface OwnedItem {
  base: string; variant: string; name: string; jp: string;
  tier: number; effect: ItemEffect;
  /** Set when this is one of the hand-authored class uniques. */
  uniqueId?: string;
}
export interface Choice {
  key: string; type: "weapon" | "passive" | "item" | "heal" | "coins" | "endless" | "mod" | "mastery" | "gunskill" | "elite";
  id: string; variant?: string; tier?: number; level: number; name: string; jp: string; desc: string;
  icon: string; rarity: 0 | 1 | 2 | 3; isNew: boolean; isSuper?: boolean; element?: string;
}
export interface QuestState {
  id: number; kind: string; title: string; jp: string; desc: string;
  progress: number; goal: number; x: number; y: number; radius: number;
  reward: string; rewardIcon: string; timer: number;
}
export interface HudState {
  state: GameState;
  level: number; xp: number; xpNeed: number;
  hp: number; maxHp: number; coins: number; kills: number; time: number;
  weapons: OwnedWeapon[]; passives: OwnedWeapon[]; items: OwnedItem[];
  actives: { id: string; cd: number; max: number }[];
  waifu: { id: string; level: number } | null;
  elementPath: ElementPath | null;
  quest: QuestState | null;
  bosses: { name: string; jp: string; hp: number; maxHp: number; guard: number; guardMax: number; milestone: boolean }[];
  /** Non-null when a milestone wall is blocking further levelling. */
  gate: { level: number; stage: "clear" | "fight"; remaining: number } | null;
  act: { id: string; name: string; jp: string; index: number; total: number; from: number; to: number };
  actCleared: boolean;
  statPoints: number;
  spent: Record<string, number>;
  procs: { id: string; name: string; icon: string; cd: number; max: number }[];
  arena: { active: boolean; round: number; best: number; label: string; jp: string; endless: boolean } | null;
  boons: string[]; legends: string[]; rampStacks: number; apexKills: number; rezT: number;
  masteries: Record<string, number>;
  guns: { id: string; ammo: number; mag: number; reloadT: number; reloadMax: number }[];
  primaryGun: string | null;
  shieldHp: number; empowerT: number; leechLock: number; elites: string[];
  nearShop: boolean; district: string; districtJp: string;
  dps: number; enemies: number;
}

// ---------------- entities ----------------
interface Enemy {
  id: number; x: number; y: number; vx: number; vy: number; r: number;
  hp: number; maxHp: number; tier: number; speed: number; dmg: number; xp: number;
  flash: number; slow: number; burn: number; burnDmg: number; shock: number;
  attackTimer: number; ranged: boolean; bob: number; face: number; knock: number; stun?: number; dead?: boolean;
  wallT?: number; wallDir?: number; marked?: number;
  /** Elemental status tracking. */
  chill?: number; frozen?: number; static?: number; displaced?: number; windCd?: number;
  decay?: number; decayDmg?: number;
  boss?: BossDef; bossScale?: number; phase?: number; charge?: number; elite?: boolean;
  role?: RoleDef; windup?: number; lunge?: number; milestone?: boolean; offT?: number; invisible?: boolean; exposed?: number;
  mechT?: number; mechIdx?: number; enraged?: boolean; dashes?: number; shieldT2?: number;
  mechCd?: Record<string, number>;
  /** Boss only: kills still needed from the escort horde before its guard breaks. */
  guard?: number; guardMax?: number; telegraph?: number;
}
interface Bullet {
  x: number; y: number; vx: number; vy: number; r: number; dmg: number; life: number;
  pierce: number; hits: Set<number>; color: string; element: Element; hostile: boolean;
  bounce: number; homing: number; target: number; boomerang: number; spin: number;
  born: number; crit: boolean; explode: number; split: number;
  /** Fraction of target max HP dealt instead of flat damage. */
  pctHealth?: number;
}
interface Zone {
  kind: "nova" | "boom" | "hole" | "beam" | "warn" | "mine" | "decoy" | "aura" | "cone" | "swipe" | "decay";
  x: number; y: number; r: number; maxR: number; life: number; maxLife: number;
  dmg: number; color: string; element: Element; hits: Set<number>; angle: number;
  tick: number; hp?: number; data?: number; arc?: number; knock?: number;
  /** true = your own AoE (rendered green), false/undefined = enemy AoE (red). */
  friendly?: boolean;
}
interface Turret { x: number; y: number; life: number; cd: number; dmg: number; color: string; shots: number }
interface Orbital { angle: number; r: number; size: number; dmg: number; color: string; element: Element; hitCd: Map<number, number> }
interface Gem { x: number; y: number; v: number; vx: number; vy: number; kind: "xp" | "coin" | "hp" | "item" | "chest"; item?: OwnedItem; t: number }
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number;
  color: string; kind: "spark" | "ring" | "text" | "smoke" | "heart" | "star" | "bolt";
  text?: string; x2?: number; y2?: number;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1; vw = 800; vh = 600; zoom = 1;

  state: GameState = "menu";
  onUi: (h: HudState) => void = () => {};
  onChoices: (c: Choice[]) => void = () => {};
  onWaifuGate: (opts: { def: WaifuDef; upgrade: boolean }[]) => void = () => {};
  onEnd: (won: boolean) => void = () => {};
  onToast: (msg: string, icon: string) => void = () => {};
  onBossAlert: (b: { name: string; jp: string; title: string; milestone: boolean; level: number; intro?: [string, string] } | null) => void = () => {};
  onLoot: (item: OwnedItem | null) => void = () => {};
  /** Chest roulette: a reel of candidates plus the index that wins. */
  onRoll: (r: { reel: OwnedItem[]; winIndex: number } | null) => void = () => {};
  onSpoils: (open: boolean) => void = () => {};
  onDefeat: (name: string | null) => void = () => {};
  onGun: (opts: { id: string; name: string; jp: string; icon: string; desc: string; perk: string; mag: number; reload: number }[] | null) => void = () => {};
  onBoon: (opts: { id: string; name: string; jp: string; icon: string; desc: string }[] | null) => void = () => {};
  onLegend: (opts: { id: string; name: string; jp: string; icon: string; desc: string; flavour: string }[] | null) => void = () => {};
  onRecruit: (w: { id: string; level: number; upgrade: boolean } | null) => void = () => {};

  world!: WorldData;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  zones: Zone[] = [];
  turrets: Turret[] = [];
  gems: Gem[] = [];
  particles: Particle[] = [];
  orbitals: Map<string, Orbital[]> = new Map();
  chests: { x: number; y: number; open: boolean; t: number }[] = [];
  chestTimer = 0;
  nextId = 1;

  // player
  px = 0; py = 0; pvx = 0; pvy = 0; pr = 16;
  hp = 100; aim = 0; face = 0; bob = 0; invuln = 0; shieldT = 0;
  level = 1; xp = 0; coins = 0; kills = 0; time = 0; runCoins = 0;
  stats: Stats = baseStats();
  weapons: OwnedWeapon[] = [];
  passives: OwnedWeapon[] = [];
  items: OwnedItem[] = [];
  effects: Map<ItemEffect, number> = new Map();
  momentum = 0;
  /** Repeatable minor stat boosts taken once everything else is maxed. */
  endless: Record<string, number> = {};
  /** Stacking combat modifiers chosen during the run. */
  mods: Record<string, number> = {};
  comboStacks = 0; comboT = 0;
  frenzy = 0; frenzyT = 0;
  /** Timestamp + direction of the last melee strike, for sprite animation. */
  meleeFx = 0; meleeDir = 0; meleeAlt = 1;
  /** Chain-reaction budget: caps how many cascading kills may happen per frame
   *  so explode-on-kill builds cannot lock the game up. */
  killBudget = 0;
  fxBudget = 14;
  /** >0 while a boss has suppressed your healing. */
  leechLock = 0;
  /** Reused across frames so batching allocates nothing. */
  private fxBatch = new Map<string, Particle[]>();
  /** Act boss elements flow into the whole zone (act 4 burns). */
  /** Coin value for this act. Gold is deliberately scarce — a full 1-100
   *  run yields roughly 900g, and a 10-level Konbini line costs 2,500g,
   *  so permanent upgrades take about three runs each to max. */
  get coinValue() {
    const v = [1, 2, 3, 4][clamp(this.actIndex, 0, 3)] ?? 4;
    return Math.max(1, Math.round(v * this.stats.coinGain));
  }

  get zoneElement(): Element { return this.act.ablaze ? "fire" : "none"; }

  /** Incremented every run; delayed callbacks from an old run are discarded. */
  runToken = 0;
  private timers = new Set<number>();

  /** setTimeout that is automatically cancelled by a restart or teardown.
   *  Boss mechanics schedule a lot of delayed damage — without this, a stale
   *  callback from a previous run can fire into a fresh game. */
  later(fn: () => void, ms: number) {
    const tk = this.runToken;
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (tk !== this.runToken || !this.running) return;
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }
  mod(id: string) { return this.mods[id] || 0; }
  get knockback() { return this.mod("m_knock"); }
  actives: { id: string; cd: number }[] = [];
  waifu: { id: string; level: number } | null = null;
  /** Once you take an elemental weapon you are committed to that path. */
  elementPath: ElementPath | null = null;
  charId = "willy";
  /** Current act (zone). Advances at 25 / 50 / 75 via the hub. */
  actIndex = 0;
  get act(): ActDef { return ACTS[clamp(this.actIndex, 0, ACTS.length - 1)]; }
  /** Unspent stat points — 3 at the start, 3 more each act. */
  statPoints = 0;
  spent: Record<string, number> = {};
  /** True while standing in the between-acts hub. */
  inHub = false;
  actCleared = false;
  /** Endless Colosseum state. */
  arenaRound = 0;
  arenaBest = 0;
  arenaIdle = 0;
  arenaPendingAfter: string | null = null;
  get inArena() { return this.act.id === "colosseum"; }
  tunnel: { x: number; y: number; t: number; armed: number } | null = null;
  get char(): CharacterDef { return CHAR_BY_ID[this.charId] || CHAR_BY_ID.willy; }
  /** Andy's dog. */
  dog = { x: 0, y: 0, cd: 0, t: 0, face: 0, vx: 0, vy: 0,
          lungeT: 0, lungeCd: 0, barkCd: 0, howlCd: 0, shotCd: 0, hits: new Set<number>() };
  dogHowlT = 0;
  waifuX = 0; waifuY = 0; waifuTimer = 0; waifuAnim = 0;
  waifuSideTimer = 0; waifuMeleeTimer = 0; waifuCastTimer = 0;
  waifuSwing = 0; waifuSwingDir = 1; waifuCastFx = 0; waifuFace = 0; waifuHaste = 0;
  auraT = 0; auraFx = 0; waifuCritT = 0; waifuArmorT = 0; waifuSpeedT = 0;
  waifuClones: { x: number; y: number; life: number; cd: number }[] = [];
  rallyMark = 0;
  recruitFx = 0; recruitHue = 0;
  /** Gear waiting on the player's acknowledgement, shown on a pause screen. */
  lootQueue: OwnedItem[] = [];
  pendingLoot: OwnedItem | null = null;
  pendingRoll: OwnedItem | null = null;
  /** Set when the act is cleared; fires once all loot screens are dismissed. */
  pendingActAdvance = false;
  /** Survival mode: drop into the Colosseum once level-up picks are spent. */
  survivalPending = false;
  pendingBoon = false;
  pendingLegendTier = 0;
  /** Live cooldown per equipped proc, keyed by unique id. */
  procCd: Record<string, number> = {};
  /** Temporary buffs granted by procs. */
  empowerT = 0; empowerMul = 1; shieldHp = 0; procHaste = 0;
  procOrbits: { angle: number; r: number; life: number; dmg: number; color: string }[] = [];
  usedRevive = false; usedLegendRez = false;
  /** Level-1 starting boons, and the run-defining legendary cards. */
  boons: string[] = [];
  legends: string[] = [];
  rampStacks = 0; rampT = 0; legendRezT = 0; apexKills = 0; bulwarkT = 0;
  masteries: Record<string, number> = {};
  elites: string[] = [];
  hasElite(id: string) { return this.elites.includes(id); }
  eliteT = 0;
  stillT = 0;
  /** Shared cooldown for enemy-pulling singularities. */
  pullCd = 0;
  mast(id: string) { return this.masteries[id] || 0; }
  /** Multiplier on all mastery effects (Eye of the Storm / Avatar). */
  get mastK() { return this.legends.includes("L_avatar") ? 3 : this.legends.includes("L_storm") ? 2 : 1; }
  hitCounter = 0;
  /** Joe's arsenal: owned guns, each with its own magazine and reload. */
  guns: { id: string; ammo: number; cd: number; reloadT: number }[] = [];
  primaryGun: string | null = null;
  gunSkills: Record<string, number> = {};
  reloadBuffT = 0;
  pendingGunTier = -1;
  /** Firearm chosen during the opening ceremony, granted on start. */
  introGun: string | null = null;
  /** Name shown on the "<X> DEFEATED" card after a floor boss falls. */
  bossDefeatName: string | null = null;
  gunQueue: number[] = [];
  legendQueue: number[] = [];
  get isGunner() { return !!this.char.gunner; }
  weaponTimers: Record<string, number> = {};
  gateQueue: number[] = [];
  pendingLevels = 0;
  revives = 0;
  slowMoT = 0;

  // meta
  meta: MetaSave = loadMeta();
  shopBuilding: Building | null = null;

  // quest
  quest: QuestState | null = null;
  questCooldown = 12;
  questSeq = 1;

  // director
  spawnTimer = 0; bossSpawnedFor = 0; bossRest = 0; waveTimer = 20; bossIntro = 0;
  cineT = 0; cineX = 0; cineY = 0; cineHue = 0;
  milestoneBossPending = false; pendingMilestoneLevel = 0; gateWarn = 0;
  /** Bosses are tracked by querying the live entity list, so a stale pointer
   *  can never leave a phantom health bar behind or block the next spawn. */
  get bosses(): Enemy[] { return this.enemies.filter((e) => e.boss && e.hp > 0); }
  get bossActive(): Enemy | null { return this.bosses[0] || null; }

  // camera / juice
  camx = 0; camy = 0; shake = 0; sx = 0; sy = 0; hitStop = 0;
  flashA = 0; flashC = "#fff"; hurtFlash = 0;
  dmgAccum = 0; dpsWindow = 0; dps = 0;

  // input
  keys: Record<string, boolean> = {};
  touch = false;
  stick = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  aimStick = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  mouseX = 0; mouseY = 0; hasMouse = false;

  raf = 0; last = 0; uiT = 0; running = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.world = generateWorld("dojo");
    this.resize();
    this.bind();
    this.camx = WORLD / 2; this.camy = WORLD / 2;
    this.loop = this.loop.bind(this);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    this.runToken++;
    this.clearTimers();
    sfx.stopBossMusic();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
  }

  // ================= input =================
  onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (this.keys[k]) return;
    this.keys[k] = true;
    // NOTE: each branch returns, otherwise opening the shop with E would be
    // immediately undone by the shop-close handler in the same keypress.
    if (this.state === "shop") {
      if (k === "e" || k === "escape" || k === "p") this.closeShop();
      return;
    }
    if (this.state === "playing") {
      if (k === " " || k === "q") { this.useActive(0); return; }
      if (k === "e" || k === "1") { this.interactOrActive(1); return; }
      if (k === "r" || k === "2") { this.useActive(2); return; }
    }
    if (k === "p" || k === "escape") this.togglePause();
  };
  onKeyUp = (e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; };
  onResize = () => this.resize();

  bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    const c = this.canvas;
    c.style.touchAction = "none";
    c.addEventListener("pointerdown", (e) => {
      sfx.ensure();
      c.setPointerCapture(e.pointerId);
      if (e.pointerType === "mouse") { this.hasMouse = true; this.mouseX = e.offsetX; this.mouseY = e.offsetY; return; }
      this.touch = true;
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      // left half drives movement, right half aims your shots
      if (x < r.width * 0.5 && !this.stick.active) {
        this.stick = { active: true, id: e.pointerId, ox: x, oy: y, x, y };
      } else if (!this.aimStick.active) {
        this.aimStick = { active: true, id: e.pointerId, ox: x, oy: y, x, y };
      }
    });
    c.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") { this.mouseX = e.offsetX; this.mouseY = e.offsetY; this.hasMouse = true; return; }
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (this.stick.active && this.stick.id === e.pointerId) { this.stick.x = x; this.stick.y = y; }
      if (this.aimStick.active && this.aimStick.id === e.pointerId) { this.aimStick.x = x; this.aimStick.y = y; }
    });
    const up = (e: PointerEvent) => {
      if (this.stick.id === e.pointerId) this.stick.active = false;
      if (this.aimStick.id === e.pointerId) this.aimStick.active = false;
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.vw = Math.max(320, r.width); this.vh = Math.max(320, r.height);
    this.canvas.width = Math.floor(this.vw * this.dpr);
    this.canvas.height = Math.floor(this.vh * this.dpr);
    this.zoom = clamp(Math.min(this.vw, this.vh) / 700, 0.55, 1.1);
  }

  // ================= stats =================
  /** Per-mod cooldown clocks for the elemental on-kill procs. */
  elemCd: Record<string, number> = {};

  /** Levels 1-5 are cooldown-gated (10s, -1s per level). At max rank the
   *  cooldown is dropped entirely and it becomes a flat chance on every
   *  kill instead — far more frequent in a dense crowd, but never a
   *  permanent field. Storm doubles the rate either way. */
  elemProcReady(id: string, lv: number, maxLv = 6) {
    if (lv <= 0) return false;
    const stormK = this.legends.includes("L_storm") ? 2 : 1;
    if (lv >= maxLv) return Math.random() < 0.04 * stormK;
    if ((this.elemCd[id] || 0) > 0) return false;
    this.elemCd[id] = Math.max(1, (10 - (lv - 1)) / stormK);
    return true;
  }

  /** `amount` is a CHANCE now, not a guaranteed extra projectile. */
  get bonusShots() {
    const a = this.stats.amount;
    let n = Math.floor(a);                 // whole points are guaranteed
    if (Math.random() < a - n) n++;        // the remainder is a roll
    return n;
  }

  /** Live attack-speed multiplier including temporary companion buffs. */
  get hasteNow() {
    let h = this.stats.haste * (this.waifuHaste > 0 ? 1.45 : 1) * (this.procHaste > 0 ? 1.35 : 1);
    if (this.legends.includes("L_ramp")) h *= 1 + 0.002 * this.rampStacks;
    if (this.legendRezT > 0) h *= 3;          // resurrection surge
    return h;
  }

  applyMods(s: Stats, m: StatMods, mult = 1) {
    for (const k in m) {
      const key = k as keyof Stats;
      (s[key] as number) += (m[key] as number) * mult;
    }
  }

  /** Sharp Eye maxed converts every hit into a crit at reduced multiplier. */
  get alwaysCrit() { return (this.passives.find((p) => p.id === "p_crit")?.level || 0) >= 6; }

  recalcStats() {
    this._procCache = null;          // inventory may have changed
    const s = baseStats();
    this.applyMods(s, this.char.mods, 1);
    const EM: Record<string, StatMods> = {
      e_hp: { maxHp: 18 }, e_armor: { armor: 1.5 }, e_speed: { moveSpeed: 0.04 },
      e_dmg: { damage: 0.06 }, e_steal: { lifesteal: 0.1 }, e_magnet: { magnet: 0.18 },
      e_haste: { haste: 0.05 }, e_regen: { regen: 0.3 },
    };
    for (const k in this.endless) if (EM[k]) this.applyMods(s, EM[k], this.endless[k]);
    // hub stat points
    const SP: Record<string, StatMods> = {
      sp_hp: { maxHp: 25 }, sp_armor: { armor: 2 }, sp_dmg: { damage: 0.08 },
      sp_haste: { haste: 0.06 }, sp_speed: { moveSpeed: 0.05 }, sp_luck: { luck: 0.06, magnet: 0.15 },
    };
    for (const k in this.spent) if (SP[k]) this.applyMods(s, SP[k], this.spent[k]);
    // class modifiers that act like stats
    const kf2 = this.mods["k_fist"] || 0;      if (kf2) s.area += 0.1 * kf2;
    const ad = this.mods["a_draw"] || 0;       if (ad) s.projSpeed += 0.15 * ad;
    const jr = this.mods["j_recoil"] || 0;     if (jr) s.haste += 0.12 * jr;
    const db = this.mods["d_butcher"] || 0;    if (db) s.crit += 0.1 * db;
    const dr = this.mods["d_reach"] || 0;      if (dr) s.area += 0.2 * dr;
    const df = this.mods["d_frenzy"] || 0;     if (df) s.haste += 0.05 * df * Math.min(this.frenzy, 8);
    const ws = this.mods["w_spin"] || 0;       if (ws) s.projSpeed += 0.12 * ws;
    for (const k of ["w_edge", "a_aim", "j_head", "d_prime", "k_pressure"])
      if (this.mods[k]) s.critDmg += 0.30 * this.mods[k];
    const ag = this.mods["a_dog"] || 0;        if (ag) s.duration += 0.06 * ag;
    for (const mu of META_UPGRADES) {
      const lv = this.meta.levels[mu.id] || 0;
      if (lv) this.applyMods(s, mu.mods, lv);
    }
    for (const p of this.passives) {
      const def = PASSIVE_BY_ID[p.id];
      if (def) this.applyMods(s, def.mods, p.level);
    }
    this.effects.clear();
    for (const it of this.items) {
      if (it.uniqueId) {
        // uniques carry hand-tuned stats; their power is in the proc
        const u = UNIQUE_BY_ID[it.uniqueId];
        if (u) this.applyMods(s, u.mods, 1);
        continue;
      }
      const scale = itemScale(it);
      this.applyMods(s, ITEM_BASE_STATS[it.base].mods, scale);
      this.applyMods(s, ITEM_VARIANT_STATS[it.variant] || {}, scale);
      if (it.effect && it.effect !== "none") this.effects.set(it.effect, (this.effects.get(it.effect) || 0) + 1);
    }
    if (this.effects.has("scholar")) s.magnet += 4;
    if (this.effects.has("swift")) s.haste += 0.10 * this.momentum * this.effects.get("swift")!;
    if (this.effects.has("berserk") && this.hp < s.maxHp * 0.5) s.damage += 0.15 * this.effects.get("berserk")!;
    if (this.effects.has("guardian") && this.hp < s.maxHp * 0.3) s.armor += 3 * this.effects.get("guardian")!;
    if (this.waifu) {
      const w = WAIFU_BY_ID[this.waifu.id];
      // Levelling a partner is meant to feel like a real investment, so the
      // buff scales 1x / 2.4x / 4.2x / 6.4x rather than flat per level.
      const k = [0, 1, 2.4, 4.2, 6.4][Math.min(4, this.waifu.level)] ?? 1;
      this.applyMods(s, w.buff, k);
      if (this.waifuCritT > 0) s.critDmg += 0.3;
      if (this.waifuArmorT > 0) s.armor += 6;
      if (this.waifuSpeedT > 0) s.moveSpeed += 0.25;
    }
    // ---- starting boons ----
    if (this.boons.includes("b_vamp")) { s.lifesteal += 0.5; }
    if (this.boons.includes("b_guard")) { s.armor += 6; }
    // ---- legendary modifier cards: stat packages ----
    for (const id of this.legends) {
      const c = LEGEND_CARDS.find((x) => x.id === id);
      if (c) this.applyMods(s, c.mods, 1);
    }
    // ---- their dynamic parts ----
    if (this.legends.includes("L_ramp")) s.damage += 0.005 * this.rampStacks;
    if (this.legends.includes("L_apex")) {
      s.damage += 0.005 * this.apexKills;
      s.maxHp *= 1 + 0.003 * this.apexKills;
    }
    if (this.legends.includes("L_berserk") && this.hp < s.maxHp * 0.5) s.damage += 1.0;
    // ---- elite capstones ----
    if (this.hasElite("e_glasscannon") && this.hp >= this.stats.maxHp * 0.99) s.damage += 0.6;
    if (this.hasElite("e_momentum")) s.haste += 0.4 * this.momentum;
    // Sustain has a price. Heavy lifesteal cuts your damage, so staying
    // alive by leeching means killing slower — you have to kite, not facetank.
    if (s.lifesteal > 0) s.damage *= 1 - Math.min(0.35, s.lifesteal * 0.22);
    s.cdr = clamp(s.cdr, 0.3, 2);
    // Area has diminishing returns past +100% — AoE should be a viable build,
    // not one that covers the entire screen in instant-kill zones.
    if (s.area > 2) s.area = 2 + (s.area - 2) * 0.4;
    const oldMax = this.stats.maxHp;
    this.stats = s;
    if (s.maxHp > oldMax) this.hp += s.maxHp - oldMax;
    this.hp = Math.min(this.hp, s.maxHp);
  }

  // ================= run lifecycle =================
  start(charId = "willy", element: ElementPath | null = null, survival = false) {
    sfx.stopBossMusic();
    this.runToken++;
    this.clearTimers();
    this.charId = CHAR_BY_ID[charId] ? charId : "willy";
    this.world = generateWorld("dojo");
    this.enemies = []; this.bullets = []; this.zones = []; this.turrets = [];
    this.gems = []; this.particles = []; this.orbitals.clear(); this.chests = [];
    this.weapons = this.char.gunner ? [] : [{ id: this.char.weapon, level: 1 }];
    if (this.char.pet) this.weapons.push({ id: "dogpoop", level: 1 });
    this.passives = []; this.items = []; this.actives = [];
    this.waifu = null; this.gateQueue = []; this.pendingLevels = 0;
    this.waifuSideTimer = 0; this.waifuMeleeTimer = 0; this.waifuCastTimer = 6; this.waifuHaste = 0;
    this.auraT = 0; this.auraFx = 0; this.waifuCritT = 0; this.waifuArmorT = 0; this.waifuSpeedT = 0;
    this.waifuSwing = 0; this.waifuCastFx = 0; this.waifuClones = []; this.rallyMark = 0;
    this.lootQueue = []; this.pendingLoot = null; this.pendingRoll = null; this.recruitFx = 0;
    this.pendingActAdvance = false; this.survivalPending = false;
    this.pendingBoon = false; this.pendingLegendTier = 0; this.bossDefeatName = null;
    this.boons = []; this.legends = []; this.usedLegendRez = false; this.masteries = {}; this.hitCounter = 0; this.elites = []; this.eliteT = 0; this.elemCd = {};
    this.guns = []; this.primaryGun = null; this.gunSkills = {}; this.reloadBuffT = 0;
    this.pendingGunTier = -1; this.gunQueue = []; this.legendQueue = [];
    this.rampStacks = 0; this.rampT = 0; this.legendRezT = 0; this.apexKills = 0;
    this.procCd = {}; this.empowerT = 0; this.empowerMul = 1; this.shieldHp = 0;
    this.procHaste = 0; this.procOrbits = []; this.usedRevive = false;
    this.actIndex = 0; this.inHub = false; this.actCleared = false; this.tunnel = null;
    this.statPoints = 3; this.spent = {};
    this.elementPath = element; this.effects.clear(); this.momentum = 0; this.endless = {}; this.mods = {}; this.comboStacks = 0; this.comboT = 0;
    this.level = 1; this.xp = 0; this.kills = 0; this.time = 0; this.runCoins = 0;
    this.weaponTimers = {}; for (const w of this.weapons) this.weaponTimers[w.id] = 0;
    this.bossSpawnedFor = 0; this.bossRest = 0; this.waveTimer = 18; this.bossIntro = 0; this.cineT = 0;
    this.milestoneBossPending = false; this.pendingMilestoneLevel = 0; this.gateWarn = 0;
    this.quest = null; this.questCooldown = 10; this.questSeq = 1;
    this.spawnTimer = 0.5; this.slowMoT = 0; this.invuln = 1.5; this.shieldT = 0; this.shake = 0;
    this.stats = baseStats();
    this.recalcStats();
    this.dog = { x: 0, y: 0, cd: 0, t: 0, face: 0, vx: 0, vy: 0,
      lungeT: 0, lungeCd: 0, barkCd: 0, howlCd: 0, shotCd: 0, hits: new Set<number>() };
    this.dogHowlT = 0;
    this.hp = this.stats.maxHp;
    this.revives = this.stats.revives;

    // start in a road cell near map centre
    const s = this.roadPoint(WORLD / 2, WORLD / 2, 380);
    this.px = s.x; this.py = s.y;
    this.camx = this.px; this.camy = this.py;
    this.waifuX = this.px; this.waifuY = this.py;

    this.chestTimer = 30;

    for (let i = 0; i < 6; i++) this.spawnEnemy(true);
    this.state = "playing";
    if (this.isGunner) {
      // The opening ceremony already issued a primary — don't ask twice.
      if (this.introGun) { this.addGun(this.introGun, true); this.introGun = null; }
      else this.pendingGunTier = 0;
    }
    this.pendingBoon = true;             // choose a starting boon right away
    this.openNextPanel();
    if (survival) this.beginSurvival();
    this.pushUi();
  }

  /** TEST / SURVIVAL MODE — level 100, 40 random items, straight to the arena.
   *  You still pick every level-up, so builds can be exercised quickly. */
  beginSurvival() {
    // Move to the Colosseum act immediately. Standing in a campaign act at
    // level 100 makes the spawn director flood 340 enemies in one second.
    const ci = ACTS.findIndex((a) => a.id === "colosseum");
    if (ci >= 0) this.actIndex = ci;
    this.world = generateWorld("colosseum");
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.zones.length = 0;
    this.gems.length = 0;
    this.chests.length = 0;
    this.px = WORLD / 2; this.py = WORLD / 2 + 160;
    this.camx = this.px; this.camy = this.py;
    this.waifuX = this.px; this.waifuY = this.py;
    this.dog.x = this.px; this.dog.y = this.py;
    this.arenaRound = 0;
    this.arenaIdle = 0;
    this.invuln = 5;

    // 40 items rolled exactly as if you had opened 40 chests — the normal
    // 40/30/20/10 tier weighting, no thumb on the scale.
    this.level = MAX_LEVEL;           // set first so drop tiers roll at cap
    for (let i = 0; i < 40; i++) {
      const it = this.makeItem();
      if (!it) break;
      this.addItem(it);
    }
    // A full campaign's worth of choices: every level from 1 to 100.
    this.xp = 0;
    this.pendingLevels = MAX_LEVEL - 1;
    this.gateQueue = [25, 50, 75, 100];
    for (let t = 1; t <= 4; t++) this.legendQueue.push(t);
    if (this.isGunner) {
      if (!this.guns.length) this.pendingGunTier = 0;
      this.gunQueue = [25, 50, 75, 100];
    }
    this.statPoints = 15;
    this.coins += 1200;
    this.recalcStats();
    this.hp = this.stats.maxHp;
    this.survivalPending = true;      // enter the arena once picks are done
    this.openNextPanel();
  }

  togglePause() {
    if (this.state === "playing") { this.state = "paused"; sfx.stopBossMusic(); }
    else if (this.state === "paused") {
      this.state = "playing";
      // resume the battle theme if a boss is still out there
      const b = this.bossActive;
      if (b) {
        const T: Record<string, "samurai" | "yakuza" | "dragon" | "titan"> = {
          samurai: "samurai", oyabun: "yakuza", wyrm: "dragon", priest: "titan",
        };
        sfx.startBossMusic(b.milestone ? (T[b.boss!.shape] || "titan") : "normal");
      }
    }
    else return;
    this.pushUi();
  }

  roadPoint(nearX = WORLD / 2, nearY = WORLD / 2, radius = WORLD): { x: number; y: number } {
    for (let i = 0; i < 300; i++) {
      const a = Math.random() * TAU, d = Math.random() * radius;
      const x = clamp(nearX + Math.cos(a) * d, 80, WORLD - 80);
      const y = clamp(nearY + Math.sin(a) * d, 80, WORLD - 80);
      if (!this.solidAt(x, y)) return { x, y };
    }
    return { x: WORLD / 2, y: WORLD / 2 };
  }

  // ================= collision =================
  buildingAt(x: number, y: number): Building | null {
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return null;
    return this.world.grid[gy * GRID + gx];
  }

  solidAt(x: number, y: number) {
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = gx + i, cy = gy + j;
      if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
      const b = this.world.grid[cy * GRID + cx];
      if (b) for (const r of b.rects)
        if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
      for (const p of this.world.propGrid[cy * GRID + cx])
        if (p.solid && d2(p.x, p.y, x, y) < p.r * p.r) return true;
    }
    return false;
  }

  resolve(x: number, y: number, r: number) {
    let nx = x, ny = y;
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = gx + i, cy = gy + j;
      if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
      const b = this.world.grid[cy * GRID + cx];
      if (b) for (const rc of b.rects) {
        const qx = clamp(nx, rc.x, rc.x + rc.w), qy = clamp(ny, rc.y, rc.y + rc.h);
        const dx = nx - qx, dy = ny - qy, d = Math.hypot(dx, dy);
        if (d < r) {
          if (d > 0.001) { nx = qx + (dx / d) * r; ny = qy + (dy / d) * r; }
          else {
            const l = nx - rc.x, rr = rc.x + rc.w - nx, t = ny - rc.y, bt = rc.y + rc.h - ny;
            const m = Math.min(l, rr, t, bt);
            if (m === l) nx = rc.x - r; else if (m === rr) nx = rc.x + rc.w + r;
            else if (m === t) ny = rc.y - r; else ny = rc.y + rc.h + r;
          }
        }
      }
      for (const p of this.world.propGrid[cy * GRID + cx]) {
        if (!p.solid) continue;
        const dx = nx - p.x, dy = ny - p.y, d = Math.hypot(dx, dy), min = r + p.r * 0.7;
        if (d < min && d > 0.001) { nx = p.x + (dx / d) * min; ny = p.y + (dy / d) * min; }
      }
    }
    return { x: clamp(nx, r, WORLD - r), y: clamp(ny, r, WORLD - r) };
  }

  districtAt(x: number, y: number): District {
    const gx = clamp(Math.floor(x / CELL), 0, GRID - 1), gy = clamp(Math.floor(y / CELL), 0, GRID - 1);
    return this.world.districtOf[gy * GRID + gx];
  }

  /** Shops now live only in the between-acts hub, never on the map. */
  inSafeZone(): Building | null { return null; }

  /** Hard ceilings. Without these a big explode-on-kill build can spawn
   *  thousands of zones in one frame and stall the renderer. */
  static MAX_ZONES = 150;
  static MAX_BULLETS = 420;

  /** Push a zone, evicting the oldest short-lived one if we're at capacity. */
  private zonesLocked = false;

  addZone(z: Zone) {
    if (this.zones.length >= Game.MAX_ZONES) {
      // Mark the oldest transient zone dead rather than splicing — splicing
      // mid-iteration shifts indices and crashes updateZones().
      const victim = this.zones.find((o) =>
        o.life > 0 && (o.kind === "boom" || o.kind === "cone" || o.kind === "swipe")) ?? this.zones[0];
      if (victim) victim.life = -1;
      if (!this.zonesLocked) {
        const i = this.zones.indexOf(victim);
        if (i >= 0) this.zones.splice(i, 1);
      }
    }
    this.zones.push(z);
  }

  // ================= juice =================
  /** Screen shake is disabled — it made the action hard to track.
   *  Impacts are sold with flashes, hit-stop and particles instead. */
  addShake(_a: number) { /* intentionally no-op */ }
  flash(c: string, a = 0.35) { this.flashC = c; this.flashA = Math.max(this.flashA, a); }
  burst(x: number, y: number, n: number, color: string, speed = 220, kind: Particle["kind"] = "spark") {
    if (this.particles.length > 560) n = Math.max(2, n >> 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(speed * 0.3, speed);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.2, 0.6), max: 0.6, size: rand(2, 5), color, kind });
    }
  }
  ring(x: number, y: number, color: string, size = 12) {
    if (this.particles.length > Game.MAX_PARTICLES) return;
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.34, max: 0.34, size, color, kind: "ring" });
  }
  txt(x: number, y: number, text: string, color = "#fff", size = 15) {
    if (this.particles.length > 520) return;
    this.particles.push({ x, y, vx: rand(-14, 14), vy: -66, life: 0.85, max: 0.85, size, color, kind: "text", text });
  }
  bolt(x: number, y: number, x2: number, y2: number, color: string) {
    if (this.particles.length > Game.MAX_PARTICLES) return;
    this.particles.push({ x, y, x2, y2, vx: 0, vy: 0, life: 0.18, max: 0.18, size: 3, color, kind: "bolt" });
  }

  // ================= progression =================
  xpNeeded() { return 14 + this.level * 10 + this.level * this.level * 0.42; }

  /** Scatter XP on the ground — it is never granted directly. */
  dropXp(x: number, y: number, total: number, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = rand(40, 190);
      this.gems.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v: total / n, kind: "xp", t: 0 });
    }
  }

  /** Milestone levels are hard walls: you cannot pass one until the
   *  arena is clear and the milestone boss itself has been put down. */
  /** True from the moment a trial is pending until the floor is cleared.
   *  Nothing grants XP during this window, so banked gems can't dump a
   *  dozen levels at once the instant the gate releases. */
  get xpSealed() {
    return this.milestoneBossPending || this.actCleared
      || (this.level + 1) % 25 === 0 && this.bosses.length > 0;
  }

  get milestoneGate(): { level: number; stage: "clear" | "fight" } | null {
    const next = this.level + 1;
    if (next % 25 !== 0) return null;
    // Stage 1: lingering bosses from 5/10/15/20 must die before 25 triggers.
    if (this.bosses.length > 0) return { level: next, stage: "clear" };
    // Stage 2: the milestone boss has spawned and must be defeated.
    if (this.milestoneBossPending) return { level: next, stage: "fight" };
    return null;
  }

  gainXp(v: number) {
    if (this.level >= MAX_LEVEL) return;
    if (this.xpSealed) return;            // trial in progress — no progress
    this.xp += v * this.stats.xpGain;
    let guard = 0;
    while (this.xp >= this.xpNeeded() && this.level < MAX_LEVEL && guard++ < 50) {
      // ---- milestone wall ----
      const gate = this.milestoneGate;
      if (gate) {
        this.xp = this.xpNeeded() - 1;             // bank right below the threshold
        if (this.gateWarn <= 0) {
          this.gateWarn = 6;
          if (gate.stage === "clear") {
            this.onToast(`Clear all bosses to reach Lv${gate.level}!`, "🚧");
            // force the stragglers onto you so the wall can actually be cleared
            for (const b of this.bosses) this.warpBossToPlayer(b, 340);
          } else {
            this.onToast(`Defeat the Lv${gate.level} boss to continue!`, "💀");
          }
          sfx.bossExposed();
        }
        break;
      }
      // if we are about to step onto a milestone, summon its boss and hold here
      if ((this.level + 1) % 25 === 0 && !this.milestoneBossPending && this.bosses.length === 0) {
        this.xp = this.xpNeeded() - 1;
        this.milestoneBossPending = true;
        this.bossSpawnedFor = this.level + 1;
        this.pendingMilestoneLevel = this.level + 1;
        this.spawnBoss(this.level + 1);
        break;
      }

      this.xp -= this.xpNeeded();
      this.level++;
      this.pendingLevels++;
      this.flash("#9fe8ff", 0.25);
      this.ring(this.px, this.py, "#9fe8ff", 40);
      this.txt(this.px, this.py - 50, `LEVEL ${this.level}!`, "#9fe8ff", 20);
      sfx.upgrade();
      if (this.level % 5 === 0 && this.level % 25 !== 0 && this.level > this.bossSpawnedFor) {
        this.bossSpawnedFor = this.level;
        const already = this.bosses.length;
        this.spawnBoss();
        if (already > 0) this.onToast(`${already + 1} BOSSES ON THE STREET!`, "💀");
      }
      if (WAIFU_GATES.includes(this.level)) this.gateQueue.push(this.level);
    }
    if (this.level >= MAX_LEVEL && this.xp > 0) this.xp = 0;
    this.openNextPanel();
  }

  /** Called when the milestone boss finally dies — releases the level wall. */
  clearMilestoneGate() {
    if (!this.milestoneBossPending) return;
    this.milestoneBossPending = false;
    const lv = this.pendingMilestoneLevel;
    this.pendingMilestoneLevel = 0;
    this.xp = 0;
    this.level = Math.max(this.level + 1, lv);
    this.pendingLevels++;
    this.flash("#ffe066", 0.5);
    this.ring(this.px, this.py, "#ffe066", 70);
    this.txt(this.px, this.py - 56, `LEVEL ${this.level}!`, "#ffe066", 26);
    this.onToast(`Trial complete — Level ${this.level}!`, "🏆");
    if (WAIFU_GATES.includes(this.level)) this.gateQueue.push(this.level);
    sfx.win();
    this.openNextPanel();
    this.pushUi();
  }

  /** Drag a wandering boss back into the fight. */
  warpBossToPlayer(b: Enemy, dist = 400) {
    const a = Math.atan2(b.y - this.py, b.x - this.px);
    const nx = this.px + Math.cos(a) * dist, ny = this.py + Math.sin(a) * dist;
    this.burst(b.x, b.y, 22, `hsl(${b.boss!.hue},90%,60%)`, 320, "smoke");
    const p = this.solidAt(nx, ny) ? this.roadPoint(this.px, this.py, dist) : { x: nx, y: ny };
    b.x = clamp(p.x, 60, WORLD - 60); b.y = clamp(p.y, 60, WORLD - 60);
    this.ring(b.x, b.y, `hsl(${b.boss!.hue},95%,62%)`, 70);
    this.burst(b.x, b.y, 26, `hsl(${b.boss!.hue},95%,65%)`, 340);
  }

  openNextPanel() {
    if (this.state !== "playing") return;
    if (this.bossDefeatName) {
      const n = this.bossDefeatName;
      this.bossDefeatName = null;
      this.state = "defeat";
      this.onDefeat(n);
      this.pushUi();
      return;
    }
    if (this.pendingGunTier < 0 && this.gunQueue.length) this.pendingGunTier = this.gunQueue.shift()!;
    if (this.pendingLegendTier === 0 && this.legendQueue.length) this.pendingLegendTier = this.legendQueue.shift()!;
    if (this.pendingGunTier >= 0) {
      const t = this.pendingGunTier;
      this.pendingGunTier = -1;
      const opts = this.gunOptions(t);
      if (opts.length) {
        this.state = "gun";
        this.onGun(opts);
        this.pushUi();
        return;
      }
    }
    if (this.pendingBoon) {
      this.pendingBoon = false;
      this.state = "boon";
      this.onBoon(this.boonOptions());
      this.pushUi();
      return;
    }
    if (this.pendingLegendTier > 0) {
      const t = this.pendingLegendTier;
      this.pendingLegendTier = 0;
      this.state = "legend";
      this.onLegend(legendCardsForTier(t).filter((c) => !this.legends.includes(c.id)));
      this.pushUi();
      return;
    }
    if (this.gateQueue.length > 0) {
      this.gateQueue.shift();
      this.state = "waifu";
      this.onWaifuGate(this.waifuOptions());
      this.pushUi();
      return;
    }
    if (this.pendingLevels > 0) {
      this.pendingLevels--;
      this.state = "levelup";
      this.onChoices(this.rollChoices());
      this.pushUi();
      return;
    }
    if (this.lootQueue.length > 0) {
      this.pendingLoot = this.lootQueue.shift()!;
      this.state = "loot";
      this.onLoot(this.pendingLoot);
      this.pushUi();
      return;
    }
    if (this.pendingActAdvance) {
      this.pendingActAdvance = false;
      this.enterHub();
      return;
    }
    if (this.survivalPending) {
      this.survivalPending = false;
      this.enterArena();
    }
  }


  /** Build a roulette reel that lands on `prize`, and hand it to the UI. */
  startRoll(prize: OwnedItem) {
    const owned = new Set(this.items.map((i) => i.base));
    const free = ITEM_BASE_IDS.filter((b) => !owned.has(b) && b !== prize.base);
    const reel: OwnedItem[] = [];
    const LEN = 44;                       // long enough to feel like a real spin
    const WIN = LEN - 6;                  // winner sits near the end
    for (let i = 0; i < LEN; i++) {
      if (i === WIN) { reel.push(prize); continue; }
      // decoys: mostly commons so a legendary landing actually feels rare
      const base = free.length ? pick(free) : prize.base;
      const r = Math.random();
      const tier = r < 0.58 ? 0 : r < 0.84 ? 1 : r < 0.96 ? 2 : 3;
      const variant = rollItemVariant(tier);
      reel.push({
        base, variant, tier, effect: rollItemEffect(tier),
        name: itemName(base, variant, tier), jp: itemJp(base, variant, tier),
      });
    }
    this.pendingRoll = prize;
    this.state = "roll";
    this.onRoll({ reel, winIndex: WIN });
    this.pushUi();
  }

  /** Reel finished — hand the prize to the normal loot confirm screen. */
  finishRoll() {
    const p = this.pendingRoll;
    this.pendingRoll = null;
    this.onRoll(null);
    this.state = "playing";
    if (p) {
      const res = this.addItem(p);
      if (res) { this.lootQueue.push(res.item); sfx.upgrade(); }
      else { this.coins += 10; this.runCoins += 10; }
    }
    this.openNextPanel();
    this.pushUi();
  }

  /** Starting boons: your element's enhancement, plus two universal picks. */
  boonOptions() {
    return BOONS.map((b) => ({ id: b.id, name: b.name, jp: b.jp, icon: b.icon, desc: b.desc }));
  }

  takeBoon(id: string) {
    if (!this.boons.includes(id)) this.boons.push(id);
    const b = BOON_BY_ID[id];
    if (b) this.onToast(`${b.name}`, b.icon);
    this.recalcStats();
    this.hp = this.stats.maxHp;
    this.onBoon(null);
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  takeLegend(id: string) {
    if (!this.legends.includes(id)) this.legends.push(id);
    const c = LEGEND_CARDS.find((x) => x.id === id);
    if (c) {
      this.onToast(`★ ${c.name}`, c.icon);
      this.flash("#ffe066", 0.6);
    }
    if (id === "L_gambler") {
      // re-roll every owned item up to at least Rare
      for (const it of this.items) {
        if (it.uniqueId) continue;
        it.tier = Math.max(2, rollItemTier(this.level, this.stats.luck + 0.5));
        it.variant = rollItemVariant(it.tier);
        it.effect = rollItemEffect(it.tier);
        it.name = itemName(it.base, it.variant, it.tier);
        it.jp = itemJp(it.base, it.variant, it.tier);
      }
    }
    this.recalcStats();
    this.hp = this.stats.maxHp;
    this.onLegend(null);
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  hasLegend(id: string) { return this.legends.includes(id); }
  hasBoon(id: string) { return this.boons.includes(id); }

  /** Dismiss the "<X> DEFEATED" card. */
  confirmDefeat() {
    this.onDefeat(null);
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  /** Player dismissed the recruitment cutscene. */
  confirmRecruit() {
    this.onRecruit(null);
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  /** Player acknowledged the loot screen. */
  confirmLoot() {
    this.pendingLoot = null;
    this.onLoot(null);
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  waifuOptions() {
    const tier = this.waifu ? Math.min(4, WAIFU_BY_ID[this.waifu.id].tier + 1) : 1;
    const gateTier = (this.level >= 100 ? 4 : this.level >= 75 ? 3 : this.level >= 50 ? 2 : 1) as 1 | 2 | 3 | 4;
    const t = Math.max(tier, gateTier) as 1 | 2 | 3 | 4;
    const opts = WAIFUS.filter((w) => w.tier === Math.min(4, t)).map((def) => ({ def, upgrade: false }));
    if (this.waifu) {
      const cur = WAIFU_BY_ID[this.waifu.id];
      if (this.waifu.level < cur.maxLevel) opts.unshift({ def: cur, upgrade: true });
    }
    return opts;
  }

  chooseWaifu(idx: number) {
    const opts = this.waifuOptions();
    const o = opts[idx];
    if (!o) return;
    if (o.upgrade && this.waifu) this.waifu.level++;
    else {
      this.waifu = { id: o.def.id, level: 1 };
      this.waifuX = this.px; this.waifuY = this.py;
    }
    this.recalcStats();
    this.flash("#ff8fd0", 0.45);
    for (let i = 0; i < 26; i++)
      this.particles.push({ x: this.px, y: this.py, vx: rand(-180, 180), vy: rand(-220, -40), life: rand(0.6, 1.2), max: 1.2, size: rand(9, 16), color: `hsl(${o.def.hue},90%,70%)`, kind: "heart" });
    sfx.win();
    // play the recruitment cutscene before handing control back
    this.state = "waifu";
    this.recruitFx = 3.2;
    this.recruitHue = o.def.hue;
    this.onRecruit({ id: o.def.id, level: this.waifu!.level, upgrade: o.upgrade });
    this.pushUi();
  }

  // ---------- level-up choices ----------
  rollChoices(): Choice[] {
    const out: Choice[] = [];
    const used = new Set<string>();
    const pool: (() => Choice | null)[] = [];

    for (const w of this.weapons) {
      const def = WEAPON_BY_ID[w.id];
      if (w.level >= SUPER_LEVEL) continue;
      if (w.level >= MAX_WEAPON_LEVEL) {
        // maxed: only a 25% chance per level-up that the evolution is offered
        if (Math.random() > SUPER_CHANCE) continue;
        const sup = SUPERS[w.id];
        if (!sup) continue;
        pool.push(() => ({
          key: `s_${w.id}`, type: "weapon", id: w.id, level: SUPER_LEVEL,
          name: sup.name, jp: sup.jp, desc: `★ EVOLUTION of ${def.name} — ${sup.desc}`,
          icon: sup.icon, rarity: 3, isNew: false, isSuper: true,
        }));
        continue;
      }
      pool.push(() => ({
        key: `w_${w.id}`, type: "weapon", id: w.id, level: w.level + 1, name: def.name, jp: def.jp,
        desc: def.desc, icon: def.icon, rarity: 1, isNew: false,
      }));
    }
    if (this.weapons.length < 6) {
      for (const def of WEAPONS) {
        if (this.weapons.some((w) => w.id === def.id)) continue;
        if ((def.minLevel || 1) > this.level) continue;
        // Character theming: Andy never sees ping pong, Willy never sees bows.
        if (def.chars && !def.chars.includes(this.charId as never)) continue;
        // Gun-class gating: never offer a skill tied to a firearm Joe
        // hasn't actually unlocked yet.
        if (def.needsGun && !def.needsGun.some((gid) => this.guns.some((g) => g.id === gid))) continue;
        // Elemental discipline: you may only build one path. Neutral gear is
        // always fair game; a rival element never appears once you've committed.
        if (def.element !== "none") {
          if (this.elementPath && def.element !== this.elementPath) continue;
          if (!this.elementPath && def.path) continue; // deeper path gear needs the commitment first
        }
        const el = def.element !== "none" ? ELEMENTS[def.element as ElementPath] : null;
        const commits = !!el && !this.elementPath;
        pool.push(() => ({
          key: `w_${def.id}`, type: "weapon", id: def.id, level: 1, name: def.name, jp: def.jp,
          desc: commits ? `${def.desc}  ⚑ Commits you to the ${el!.name} path.` : def.desc,
          icon: def.icon, rarity: commits ? 3 : 2, isNew: true, element: def.element,
        }));
      }
    }
    // ---- elite capstones: rare, single-level, run-defining ----
    if (Math.random() < ELITE_CHANCE) {
      const avail = ELITES.filter((e) =>
        !this.elites.includes(e.id)
        && (!e.path || e.path === this.elementPath)
        && (!e.chars || e.chars.includes(this.charId as never)));
      if (avail.length) {
        const el = pick(avail);
        pool.push(() => ({
          key: `E_${el.id}`, type: "elite", id: el.id, level: 1,
          name: el.name, jp: el.jp, desc: el.desc, icon: el.icon,
          rarity: 3, isNew: true,
        }));
      }
    }
    // ---- elemental mastery (your path only) ----
    for (const def of masteriesFor(this.elementPath)) {
      const lv = this.masteries[def.id] || 0;
      if (lv >= def.maxLevel) continue;
      if ((def.minLevel || 1) > this.level) continue;
      pool.push(() => ({
        key: `y_${def.id}`, type: "mastery", id: def.id, level: lv + 1,
        name: def.name, jp: def.jp, desc: def.desc, icon: def.icon,
        rarity: 2, isNew: !lv,
      }));
    }
    // ---- Joe's weapon-handling skills ----
    if (this.isGunner) {
      for (const def of GUN_SKILLS) {
        const lv = this.gunSkills[def.id] || 0;
        if (lv >= def.maxLevel) continue;
        pool.push(() => ({
          key: `g_${def.id}`, type: "gunskill", id: def.id, level: lv + 1,
          name: def.name, jp: def.jp, desc: def.desc, icon: def.icon,
          rarity: 1, isNew: !lv,
        }));
      }
    }
    // ---- modifier skills ----
    for (const def of MODS) {
      const lv = this.mods[def.id] || 0;
      if (lv >= def.maxLevel) continue;
      if (def.chars && !def.chars.includes(this.charId as never)) continue;
      if (def.path && def.path !== this.elementPath) continue;
      pool.push(() => ({
        key: `m_${def.id}`, type: "mod", id: def.id, level: lv + 1, name: def.name, jp: def.jp,
        desc: def.desc, icon: def.icon, rarity: def.path ? 2 : 1, isNew: !lv,
      }));
    }
    for (const def of PASSIVES) {
      const owned = this.passives.find((p) => p.id === def.id);
      if (owned && owned.level >= def.maxLevel) continue;
      if (!owned && this.passives.length >= 8) continue;
      pool.push(() => ({
        key: `p_${def.id}`, type: "passive", id: def.id, level: (owned?.level || 0) + 1, name: def.name, jp: def.jp,
        desc: def.desc, icon: def.icon, rarity: 0, isNew: !owned,
      }));
    }

    // supers always surface first when they roll — they are the highlight
    // Supers and elites are the headline picks — they jump the queue so a
    // 3% roll actually means 3% of level-ups, not 3% x shuffle luck.
    const isTop = (f: () => Choice | null) => {
      const k = (f() as Choice)?.key;
      return !!k && (k.startsWith("s_") || k.startsWith("E_"));
    };
    const supers = pool.filter(isTop);
    const rest = pool.filter((f) => !isTop(f)).sort(() => Math.random() - 0.5);
    for (const f of [...supers, ...rest]) {
      if (out.length >= 4) break;
      const c = f();
      if (!c || used.has(c.key)) continue;
      used.add(c.key);
      out.push(c);
    }
    // Endless fallbacks so the menu is never thin, even at level 100 with
    // everything maxed: permanent minor stat boosts you can take forever.
    const ENDLESS: { id: string; name: string; jp: string; icon: string; desc: string }[] = [
      { id: "e_hp",    name: "Hardened Body",  jp: "鍛錬",   icon: "❤️", desc: "+18 max HP, permanently" },
      { id: "e_armor", name: "Scar Tissue",    jp: "古傷",   icon: "🛡️", desc: "+1.5 armor, permanently" },
      { id: "e_speed", name: "Lighter Step",   jp: "軽業",   icon: "👟", desc: "+4% move speed" },
      { id: "e_dmg",   name: "Killer Instinct",jp: "闘志",   icon: "💥", desc: "+6% damage" },
      { id: "e_steal", name: "Blood Rite",     jp: "血の儀", icon: "🦇", desc: "+0.3 HP per hit" },
      { id: "e_magnet",name: "Wider Pull",     jp: "引力",   icon: "🧲", desc: "+18% pickup range" },
      { id: "e_haste", name: "Quicker Hands",  jp: "早業",   icon: "⏩", desc: "+5% attack speed" },
      { id: "e_regen", name: "Second Lung",    jp: "息継ぎ", icon: "🫧", desc: "+0.3 HP/sec" },
    ];
    const extras = [...ENDLESS].sort(() => Math.random() - 0.5);
    let ei = 0;
    while (out.length < 4 && ei < extras.length) {
      const x = extras[ei++];
      if (used.has(x.id)) continue;
      used.add(x.id);
      out.push({ key: x.id, type: "endless", id: x.id, level: (this.endless[x.id] || 0) + 1,
        name: x.name, jp: x.jp, desc: x.desc, icon: x.icon, rarity: 0, isNew: !this.endless[x.id] });
    }
    return out;
  }

  takeChoice(c: Choice) {
    if (c.type === "weapon") {
      const w = this.weapons.find((x) => x.id === c.id);
      if (w) w.level = c.level;
      else { this.weapons.push({ id: c.id, level: 1 }); this.weaponTimers[c.id] = 0; }
      const def = WEAPON_BY_ID[c.id];
      if (!this.elementPath && def.element !== "none") {
        this.elementPath = def.element as ElementPath;
        const el = ELEMENTS[this.elementPath];
        this.onToast(`${el.icon} ${el.name} path unlocked!`, el.icon);
        this.flash(el.color, 0.4);
        this.addShake(10);
        this.burst(this.px, this.py, 36, el.color, 380, "star");
      }
      if (c.isSuper) {
        this.onToast(`★ ${c.name} — ${def.name} evolved!`, c.icon);
        this.flash("#ffe066", 0.5);
        this.addShake(12);
        this.burst(this.px, this.py, 40, "#ffe066", 420, "star");
        sfx.win();
      } else this.onToast(`${def.name} Lv${w ? w.level : 1}`, def.icon);
    } else if (c.type === "passive") {
      const p = this.passives.find((x) => x.id === c.id);
      if (p) p.level++; else this.passives.push({ id: c.id, level: 1 });
      const def = PASSIVE_BY_ID[c.id];
      this.onToast(`${def.name} Lv${p ? p.level : 1}`, def.icon);
    } else if (c.type === "gunskill") {
      this.gunSkills[c.id] = (this.gunSkills[c.id] || 0) + 1;
      const d = GUN_SKILLS.find((x) => x.id === c.id)!;
      this.onToast(`${d.name} Lv${this.gunSkills[c.id]}`, d.icon);
      // top magazines up so the change is felt immediately
      for (const g of this.guns) { const gd = GUN_BY_ID[g.id]; if (gd) g.ammo = this.gunStat(gd).mag; }
    } else if (c.type === "elite") {
      if (!this.elites.includes(c.id)) this.elites.push(c.id);
      const d = ELITE_BY_ID[c.id];
      this.onToast(`★ ${d.name}`, d.icon);
      this.flash("#ffe066", 0.45);
    } else if (c.type === "mastery") {
      this.masteries[c.id] = (this.masteries[c.id] || 0) + 1;
      const d = MASTERY_BY_ID[c.id];
      this.onToast(`${d.name} Lv${this.masteries[c.id]}`, d.icon);
    } else if (c.type === "mod") {
      this.mods[c.id] = (this.mods[c.id] || 0) + 1;
      const d = MOD_BY_ID[c.id];
      this.onToast(`${d.name} Lv${this.mods[c.id]}`, d.icon);
    } else if (c.type === "endless") {
      this.endless[c.id] = (this.endless[c.id] || 0) + 1;
      this.onToast(`${c.name} ×${this.endless[c.id]}`, c.icon);
    } else if (c.type === "coins") {
      this.coins += 25; this.runCoins += 25;
      this.onToast("+25 coins", "💴");
    }
    this.recalcStats();
    // every level-up fully restores you
    this.hp = this.stats.maxHp;
    this.ring(this.px, this.py, "#7dffb8", 34);
    sfx.pickup();
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  // ================= gear =================
  /** Build a piece of gear you don't already own. Tiers roll 40/30/20/10.
   *  Every item is unique, so as the collection fills you naturally end up
   *  rolling into the rarer leftovers. Returns null once everything is owned. */
  makeItem(): OwnedItem | null {
    const tier = rollItemTier(this.level, this.stats.luck);
    // Epic / Legendary rolls pull from this character's hand-authored uniques
    // first — those are the chase items, and each carries a triggered proc.
    if (tier >= 2) {
      const have = new Set(this.items.map((i) => i.uniqueId).filter(Boolean));
      const pool = uniquesFor(this.charId).filter((u) => !have.has(u.id) && u.tier === tier);
      const any = pool.length ? pool : uniquesFor(this.charId).filter((u) => !have.has(u.id));
      if (any.length) {
        const u = pick(any);
        return { base: u.base, variant: u.variant, tier: u.tier, effect: "none",
                 name: u.name, jp: u.jp, uniqueId: u.id };
      }
    }
    const owned = new Set(this.items.filter((i) => !i.uniqueId).map((i) => i.base));
    const free = ITEM_BASE_IDS.filter((b) => !owned.has(b));
    if (!free.length) return null;
    const base = pick(free);
    const variant = rollItemVariant(tier);
    return {
      base, variant, tier, effect: rollItemEffect(tier),
      name: itemName(base, variant, tier), jp: itemJp(base, variant, tier),
    };
  }

  /** Items are unique one-offs: you either gain it, or (if somehow duplicated)
   *  it is swapped for whatever is still missing from the collection. */
  addItem(it: OwnedItem | null): { item: OwnedItem } | null {
    if (!it) return null;
    const dupe = it;
    const isDupe = dupe.uniqueId
      ? this.items.some((x) => x.uniqueId === dupe.uniqueId)
      : this.items.some((x) => x.base === dupe.base && !x.uniqueId);
    if (isDupe) {
      const alt = this.makeItem();
      if (!alt) return null;
      it = alt;
    }
    this.items.push(it);
    this.recalcStats();
    return { item: it };
  }

  /** Best item occupying each visual slot, so we can draw gear on the sprite. */
  gearBySlot(): Record<string, OwnedItem> {
    const out: Record<string, OwnedItem> = {};
    for (const it of this.items) {
      const slot = ITEM_BASE_STATS[it.base].slot;
      if (!out[slot] || itemScale(it) > itemScale(out[slot])) out[slot] = it;
    }
    return out;
  }


  // ================= ACTS =================
  /** Act boss defeated: grant a Legendary, sweep up loot, advance instance. */
  finishAct(e: Enemy) {
    // Clearing a floor wipes every remaining mob so you can't farm the act
    // after the cap.
    for (const o of this.enemies) {
      if (o === e) continue;
      this.burst(o.x, o.y, 8, "#ffffff", 280);
      this.ring(o.x, o.y, "#ffe066", 14);
    }
    this.enemies.length = 0;
    this.bullets = this.bullets.filter((b) => !b.hostile);
    this.zones = this.zones.filter((z) => z.friendly !== false);
    this.flash("#ffffff", 0.6);
    this.onToast("The floor falls silent.", "✨");

    // Guaranteed Legendary, granted directly — no walking over to collect it.
    const loot = this.makeItem();
    if (loot) {
      loot.tier = ITEM_TIERS.length - 1;
      if (!loot.uniqueId) {
        loot.variant = rollItemVariant(loot.tier);
        loot.effect = rollItemEffect(loot.tier);
        loot.name = itemName(loot.base, loot.variant, loot.tier);
        loot.jp = itemJp(loot.base, loot.variant, loot.tier);
      }
      const res = this.addItem(loot);
      if (res) this.lootQueue.push(res.item);
    }
    this.coins += 40; this.runCoins += 40;

    // Vacuum every loose pickup into the player so nothing is stranded.
    for (const g of this.gems) {
      // XP gems are discarded, never banked — collecting a floor's worth of
      // leftovers used to jump the player a dozen levels in one frame.
      if (g.kind === "xp") { /* intentionally dropped */ }
      else if (g.kind === "coin") { this.coins += g.v; this.runCoins += g.v; }
      else if (g.kind === "hp") this.hp = Math.min(this.stats.maxHp, this.hp + g.v);
      else if (g.kind === "item" && g.item) {
        const r2 = this.addItem(g.item);
        if (r2) this.lootQueue.push(r2.item);
      }
    }
    this.gems.length = 0;

    this.actCleared = true;
    this.tunnel = null;
    // Show the loot screens, then move straight to the next instance.
    this.pendingActAdvance = true;
    this.openNextPanel();
    this.pushUi();
  }

  /** Enter the between-acts hub. */
  /** Fixed progression. Beating an act always leads to exactly one place. */
  static ACT_CHAIN: Record<string, string> = {
    dojo: "streets", streets: "school", school: "inferno", inferno: "colosseum",
  };

  enterHub() {
    // The Colosseum is entered directly, never through the hub.
    if (Game.ACT_CHAIN[this.act.id] === "colosseum") {
      this.onToast("The campaign is over. The Colosseum awaits.", "🏛️");
      this.later(() => this.enterArena(), 800);
      return;
    }
    this.inHub = true;
    this.actCleared = false;
    this.tunnel = null;
    this.statPoints += 3;
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.zones.length = 0;
    this.state = "hub";
    sfx.stopBossMusic();
    sfx.win();
    this.pushUi();
  }

  /** Leave the hub and generate the next act's map. */
  startNextAct() {
    this.usedLegendRez = false;          // Resurrection recharges each act
    const nextId = Game.ACT_CHAIN[this.act.id];
    const idx = ACTS.findIndex((a) => a.id === nextId);
    if (nextId === "colosseum" || idx < 0) { this.enterArena(); return; }
    this.actIndex = idx;
    this.inHub = false;
    this.world = generateWorld(this.act.id);
    this.enemies = []; this.bullets = []; this.zones = []; this.gems = [];
    this.turrets = []; this.chests = []; this.quest = null;
    const sp = this.roadPoint(WORLD / 2, WORLD / 2, 420);
    this.px = sp.x; this.py = sp.y;
    this.camx = this.px; this.camy = this.py;
    this.waifuX = this.px; this.waifuY = this.py;
    this.dog.x = this.px; this.dog.y = this.py;
    this.chestTimer = 30;
    this.hp = this.stats.maxHp;
    this.invuln = 2.5;
    this.state = "playing";
    this.onToast(`${this.act.name} — ${this.act.jp}`, "🗺️");
    for (let i = 0; i < 8; i++) this.spawnEnemy();
    this.pushUi();
  }

  /** Spend a stat point in the hub. */
  spendPoint(id: string) {
    if (this.statPoints <= 0) return false;
    this.statPoints--;
    this.spent[id] = (this.spent[id] || 0) + 1;
    this.recalcStats();
    sfx.upgrade();
    this.pushUi();
    return true;
  }


  // ================= ITEM PROCS =================
  /** Every equipped unique with a proc, resolved once per frame. */
  private _procCache: { id: string; def: NonNullable<ReturnType<typeof uniqueProc>> }[] | null = null;
  get procs() {
    if (this._procCache) return this._procCache;
    const out: { id: string; def: NonNullable<ReturnType<typeof uniqueProc>> }[] = [];
    for (const it of this.items) {
      if (!it.uniqueId) continue;
      const u = UNIQUE_BY_ID[it.uniqueId];
      if (u?.proc) out.push({ id: it.uniqueId, def: u.proc });
    }
    this._procCache = out;
    return out;
  }

  updateProcs(dt: number) {
    for (const k in this.procCd) this.procCd[k] = Math.max(0, this.procCd[k] - dt);
    this.empowerT = Math.max(0, this.empowerT - dt);
    if (this.empowerT <= 0) this.empowerMul = 1;
    this.procHaste = Math.max(0, this.procHaste - dt);

    // temporary orbital blades granted by procs
    for (let i = this.procOrbits.length - 1; i >= 0; i--) {
      const o = this.procOrbits[i];
      o.life -= dt;
      if (o.life <= 0) { this.procOrbits.splice(i, 1); continue; }
      o.angle += dt * 2.6;
      const ox = this.px + Math.cos(o.angle) * o.r, oy = this.py + Math.sin(o.angle) * o.r;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (Math.abs(e.x - ox) > 40 || Math.abs(e.y - oy) > 40) continue;
        if (d2(e.x, e.y, ox, oy) < (e.r + 16) ** 2) {
          this.hitEnemy(e, o.dmg * dt * 4, "none", o.angle, 60, false, false);
        }
      }
    }

    // cooldown-triggered procs
    for (const p of this.procs) {
      if (p.def.trigger !== "cooldown") continue;
      if ((this.procCd[p.id] || 0) > 0) continue;
      this.procCd[p.id] = p.def.cd;
      this.fireProc(p.id, p.def);
    }
    // low-hp triggers
    if (this.hp < this.stats.maxHp * 0.35) {
      for (const p of this.procs) {
        if (p.def.trigger !== "lowHp") continue;
        if ((this.procCd[p.id] || 0) > 0) continue;
        this.procCd[p.id] = p.def.cd;
        this.fireProc(p.id, p.def);
      }
    }
  }

  /** Run every proc matching a trigger, respecting its cooldown. */
  triggerProcs(trigger: string) {
    for (const p of this.procs) {
      if (p.def.trigger !== trigger) continue;
      if ((this.procCd[p.id] || 0) > 0) continue;
      this.procCd[p.id] = p.def.cd;
      this.fireProc(p.id, p.def);
    }
  }

  fireProc(id: string, d: { kind: string; power: number; dur?: number; name: string }) {
    const u = UNIQUE_BY_ID[id];
    const col = u ? ITEM_VARIANTS[u.variant].pal.a : "#ffe066";
    const base = 26 + this.level * 2.2;        // proc damage baseline
    const nova = (c: string, el: Element, mul: number) => {
      this.addZone({ kind: "nova", x: this.px, y: this.py, r: 10, maxR: 130 + this.stats.area * 50,
        life: 0.5, maxLife: 0.5, dmg: base * mul, color: c, element: el,
        hits: new Set(), angle: 0, tick: 0, friendly: true });
      this.ring(this.px, this.py, c, 40);
    };
    switch (d.kind) {
      case "shield":
        this.shieldHp = Math.max(this.shieldHp, this.stats.maxHp * d.power);
        this.ring(this.px, this.py, "#9fd7ff", 36);
        break;
      case "empower":
        this.empowerMul = Math.max(this.empowerMul, d.power);
        this.empowerT = d.dur || 5;
        this.txt(this.px, this.py - 46, d.name.toUpperCase(), "#ffe066", 15);
        break;
      case "hasteSurge":
        this.procHaste = d.dur || 4;
        break;
      case "heal":
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * d.power);
        this.txt(this.px, this.py - 40, "+HP", "#7dffb8", 14);
        break;
      case "summon":
        for (let i = 0; i < d.power; i++) {
          const a = Math.random() * TAU;
          this.turrets.push({ x: this.px + Math.cos(a) * 50, y: this.py + Math.sin(a) * 50,
            life: d.dur || 10, cd: 0, dmg: base * 0.5, color: col, shots: 0 });
        }
        break;
      case "orbit":
        for (let i = 0; i < d.power; i++)
          this.procOrbits.push({ angle: (i / d.power) * TAU, r: 72 * this.stats.area,
            life: d.dur || 7, dmg: base * 0.5, color: col });
        break;
      case "novaFire":  nova("#ff7a2f", "fire", d.power); break;
      case "novaIce":   nova("#79dcff", "ice", d.power); break;
      case "novaShock": nova("#ffe14d", "shock", d.power); break;
      case "novaVoid":  nova("#a86bff", "void", d.power); break;
      case "novaWind":  nova("#8ef5c0", "wind", d.power); break;
      case "chainBolt": {
        let prev: { x: number; y: number } = { x: this.px, y: this.py };
        const hit = new Set<number>();
        for (let i = 0; i < 3; i++) {
          let best: Enemy | null = null, bd = 300 * 300;
          for (const e of this.enemies) {
            if (e.hp <= 0 || hit.has(e.id)) continue;
            const dd = d2(e.x, e.y, prev.x, prev.y);
            if (dd < bd) { bd = dd; best = e; }
          }
          if (!best) break;
          hit.add(best.id);
          this.bolt(prev.x, prev.y, best.x, best.y, "#ffe14d");
          this.hitEnemy(best, base * d.power, "shock", 0, 0, false, false);
          prev = best;
        }
        break;
      }
      case "thornBurst":
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (d2(e.x, e.y, this.px, this.py) < 150 * 150)
            this.hitEnemy(e, d.power, "none", Math.atan2(e.y - this.py, e.x - this.px), 220, false, false);
        }
        this.ring(this.px, this.py, "#ff6b81", 30);
        break;
      case "slowField":
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (d2(e.x, e.y, this.px, this.py) < d.power * d.power) e.slow = Math.max(e.slow, d.dur || 3);
        }
        this.ring(this.px, this.py, "#79dcff", d.power * 0.4);
        break;
      case "volley": {
        const n = Math.round(d.power);
        const off = Math.random() * TAU;
        for (let i = 0; i < n; i++)
          this.spawnBullet(this.px, this.py, off + (i / n) * TAU, 620, base * 0.45, 5, col,
            (this.elementPath as Element) || "none", 1);
        break;
      }
      case "mark":
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (d2(e.x, e.y, this.px, this.py) < 340 * 340) e.marked = d.dur || 5;
        }
        break;
      case "magnetPulse":
        for (const g of this.gems) {
          const dx = this.px - g.x, dy = this.py - g.y, dd = Math.hypot(dx, dy) || 1;
          g.vx += (dx / dd) * 700; g.vy += (dy / dd) * 700;
        }
        this.ring(this.px, this.py, "#54f0ff", 50);
        break;
      case "decoy":
        this.addZone({ kind: "decoy", x: this.px, y: this.py, r: 22, maxR: 22, life: 7, maxLife: 7,
          dmg: base, color: col, element: "fire", hits: new Set(), angle: 0, tick: 0, hp: 60, friendly: true });
        break;
    }
    this.burst(this.px, this.py, 10, col, 220, "star");
  }


  // ================= ENDLESS COLOSSEUM =================
  /** Transition into the arena once the campaign is beaten. */
  enterArena() {
    this.actIndex = ACTS.findIndex((a) => a.id === "colosseum");
    this.inHub = false;
    this.actCleared = false;
    this.tunnel = null;
    this.arenaRound = 0;
    this.arenaIdle = 0;
    this.arenaPendingAfter = null;
    this.world = generateWorld("colosseum");
    this.enemies = []; this.bullets = []; this.zones = []; this.gems = [];
    this.turrets = []; this.chests = []; this.quest = null;
    this.px = WORLD / 2; this.py = WORLD / 2 + 160;
    this.camx = this.px; this.camy = this.py;
    this.waifuX = this.px; this.waifuY = this.py;
    this.dog.x = this.px; this.dog.y = this.py;
    this.hp = this.stats.maxHp;
    this.invuln = 3;
    this.state = "playing";
    this.onToast("THE COLOSSEUM — survive as long as you can", "🏛️");
    this.later(() => this.startArenaWave(), 2200);
    this.pushUi();
  }

  /** Spawn one named champion. Everything in the arena comes through here. */
  spawnChampion(def: BossDef, hpOverride?: number, dmgMul = 1, idx = 0, total = 1) {
    const ang = (idx / Math.max(1, total)) * TAU + rand(-0.3, 0.3);
    const dist = total > 1 ? 330 : 300;
    const x = clamp(WORLD / 2 + Math.cos(ang) * dist, 120, WORLD - 120);
    const y = clamp(WORLD / 2 + Math.sin(ang) * dist, 120, WORLD - 120);
    const hp = hpOverride ?? def.hp;
    const e: Enemy = {
      id: this.nextId++, x, y, vx: 0, vy: 0, r: def.radius,
      hp, maxHp: hp, tier: TIERS.length - 1,
      speed: def.speed, dmg: def.dmg * dmgMul, xp: 0,
      flash: 0, slow: 0, burn: 0, burnDmg: 0, shock: 0,
      attackTimer: 1.6 + idx * 0.4, ranged: true, bob: 0, face: 0, knock: 0,
      boss: def, bossScale: 1, phase: 0, charge: 0,
      guard: 0, guardMax: 0, telegraph: 0, milestone: true, mechCd: {},
    };
    this.enemies.push(e);
    this.ring(x, y, `hsl(${def.hue},95%,62%)`, 70);
    for (let i = 0; i < 26; i++) {
      const aa = Math.random() * TAU;
      this.particles.push({ x, y, vx: Math.cos(aa) * rand(120, 300), vy: Math.sin(aa) * rand(120, 300),
        life: rand(0.4, 1), max: 1, size: rand(3, 6), color: `hsl(${def.hue},95%,65%)`, kind: "spark" });
    }
    return e;
  }

  /** Begin the next gauntlet wave, or an endless wave once it's complete. */
  startArenaWave() {
    this.arenaRound++;
    this.arenaBest = Math.max(this.arenaBest, this.arenaRound);
    this.arenaPendingAfter = null;
    const g = GAUNTLET[this.arenaRound - 1];

    if (g) {
      // ---- fixed gauntlet wave ----
      g.ids.forEach((id, i) => {
        const def = CHAMPIONS[id];
        if (def) this.spawnChampion(def, undefined, 1, i, g.ids.length);
      });
      if (g.after) this.arenaPendingAfter = g.after;
      const final = this.arenaRound === GAUNTLET.length;
      this.flash(final ? "#ffd166" : "#ffcf5c", final ? 0.7 : 0.45);
      this.onBossAlert({
        name: final ? CHAMPIONS.emperor.name : `WAVE ${g.wave}`,
        jp: final ? CHAMPIONS.emperor.jp : g.jp,
        title: final ? CHAMPIONS.emperor.title : g.title,
        milestone: true, level: 100 + this.arenaRound,
        intro: final ? CHAMPIONS.emperor.intro : ["「闘技場」", `${g.ids.length} champions enter the sand.`],
      });
      this.later(() => this.onBossAlert(null), final ? 5200 : 3800);
      sfx.milestoneBoss();
      this.later(() => { if (this.bosses.length) sfx.startBossMusic(final ? "titan" : "samurai"); },
                 final ? 3400 : 2600);
    } else {
      // ---- endless phase: nameless gladiators only ----
      const n = this.arenaRound - GAUNTLET.length;
      const w = endlessWave(n);
      for (let i = 0; i < w.count; i++)
        this.spawnChampion(CHAMPIONS.gladiator, w.hp, w.dmgMul, i, w.count);
      this.flash("#ffcf5c", 0.5);
      this.onBossAlert({
        name: `ENDLESS ${n}`, jp: "無限", title: `${w.count} gladiator${w.count > 1 ? "s" : ""}`,
        milestone: true, level: 100 + this.arenaRound,
        intro: ["「無限」", `${w.count} enter. The gate will open again.`],
      });
      this.later(() => this.onBossAlert(null), 3600);
      sfx.milestoneBoss();
      this.later(() => { if (this.bosses.length) sfx.startBossMusic("titan"); }, 2600);
    }
    this.pushUi();
  }

  /** Champion defeated — clear the sand and offer spoils. */
  arenaVictory(e: Enemy) {
    // Some waves summon a finisher once the main group falls.
    if (this.arenaPendingAfter && this.bosses.filter((b) => b !== e).length === 0) {
      const id = this.arenaPendingAfter;
      this.arenaPendingAfter = null;
      const def = CHAMPIONS[id];
      if (def) {
        this.later(() => {
          if (!this.running || !this.inArena) return;
          this.spawnChampion(def);
          this.flash(`hsl(${def.hue},95%,60%)`, 0.6);
          this.onBossAlert({ name: def.name, jp: def.jp, title: def.title,
            milestone: true, level: 100 + this.arenaRound,
            intro: ["「咆哮」", "Something else was waiting beneath the sand."] });
          this.later(() => this.onBossAlert(null), 3800);
          sfx.milestoneBoss();
        }, 1800);
        this.onToast("The gate beneath the arena opens…", "⚠️");
        return;
      }
    }
    // wave only ends when every champion is down
    if (this.bosses.filter((b) => b !== e).length > 0) return;

    for (const o of this.enemies) {
      if (o === e) continue;
      this.burst(o.x, o.y, 8, "#ffffff", 260);
    }
    this.enemies.length = 0;
    this.bullets = this.bullets.filter((b) => !b.hostile);
    this.zones = this.zones.filter((z) => z.friendly !== false);
    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.3);
    sfx.stopBossMusic();
    this.state = "spoils";
    this.onSpoils(true);
    this.pushUi();
  }

  /** Player picked their reward; the next gate opens. */
  takeSpoil(kind: string) {
    const give = (tier: number) => {
      const it = this.makeItem();
      if (!it) { this.coins += 40; this.runCoins += 40; return; }
      it.tier = Math.max(it.tier, tier);
      if (!it.uniqueId) {
        it.variant = rollItemVariant(it.tier);
        it.effect = rollItemEffect(it.tier);
        it.name = itemName(it.base, it.variant, it.tier);
        it.jp = itemJp(it.base, it.variant, it.tier);
      }
      const res = this.addItem(it);
      if (res) this.lootQueue.push(res.item);
    };
    if (kind === "legendary") give(3);
    else if (kind === "epic2") { give(2); give(2); }
    else if (kind === "random3") { give(0); give(0); give(0); }
    else if (kind === "stats3") {
      const pool = ["e_hp", "e_armor", "e_speed", "e_dmg", "e_haste", "e_magnet", "e_regen", "e_steal"];
      for (let i = 0; i < 3; i++) {
        const k = pick(pool);
        this.endless[k] = (this.endless[k] || 0) + 1;
      }
      this.recalcStats();
      this.onToast("Three boons taken", "💪");
    }
    this.onSpoils(false);
    this.state = "playing";
    this.openNextPanel();
    // next champion enters after a short breather
    this.later(() => { if (this.inArena && !this.bosses.length) this.startArenaWave(); }, 3500);
    this.pushUi();
  }


  // ================= JOE'S ARSENAL =================
  gunStat(g: typeof GUNS[number]) {
    const magK = 1 + 0.4 * (this.gunSkills["gs_mag"] || 0);
    const relK = (1 - 0.18 * (this.gunSkills["gs_reload"] || 0))
               * (1 + 0.15 * (this.gunSkills["gs_tradeoff"] || 0));
    const dmgK = 1 + 0.25 * (this.gunSkills["gs_tradeoff"] || 0);
    return {
      mag: Math.max(1, Math.round(g.mag * magK)),
      reload: Math.max(0.3, g.reload * Math.max(0.25, relK)),
      dmg: g.dmg * dmgK,
    };
  }

  addGun(id: string, primary = false) {
    if (this.guns.some((x) => x.id === id)) return;
    const def = GUN_BY_ID[id];
    if (!def) return;
    const st = this.gunStat(def);
    this.guns.push({ id, ammo: st.mag, cd: 0, reloadT: 0 });
    if (primary || !this.primaryGun) this.primaryGun = id;
    this.onToast(`${def.name} acquired`, def.icon);
  }

  gunOptions(tier: number) {
    return gunsForTier(tier, this.guns.map((g) => g.id), this.primaryGun)
      .map((g) => ({ id: g.id, name: g.name, jp: g.jp, icon: g.icon,
                     desc: g.desc, perk: g.perk, mag: g.mag, reload: g.reload }));
  }

  takeGun(id: string) {
    this.addGun(id, this.guns.length === 0);
    this.onGun(null);
    this.state = "playing";
    this.openNextPanel();
    this.pushUi();
  }

  /** Drives every owned firearm: ammo, reloads and bespoke targeting. */
  updateGuns(dt: number) {
    if (!this.isGunner || !this.guns.length) return;
    this.reloadBuffT = Math.max(0, this.reloadBuffT - dt);

    for (const g of this.guns) {
      const def = GUN_BY_ID[g.id];
      if (!def) continue;
      const st = this.gunStat(def);

      // passive pieces (shield) never fire
      if (def.cd <= 0) continue;

      if (g.reloadT > 0) {
        g.reloadT -= dt;
        if (g.reloadT <= 0) {
          g.ammo = st.mag;
          if (this.gunSkills["gs_quick"]) this.reloadBuffT = 3;
        }
        continue;
      }
      g.cd -= dt * this.hasteNow * (this.reloadBuffT > 0 ? 1.3 : 1);
      if (g.cd > 0) continue;
      g.cd = def.cd;

      // ---- pick a target per this weapon's doctrine ----
      let ax = this.aim;
      let have = false;
      const pickTarget = (): Enemy | null => {
        const live = this.enemies.filter((e) => e.hp > 0);
        if (!live.length) return null;
        switch (def.target) {
          case "nearest": return this.nearestEnemy(this.px, this.py, 1200);
          case "lowest": return live.reduce((p, c) => (c.hp < p.hp ? c : p), live[0]);
          case "random": {
            const near = live.filter((e) => d2(e.x, e.y, this.px, this.py) < 700 * 700);
            return near.length ? pick(near) : null;
          }
          default: return null;
        }
      };
      if (def.target === "aim") { ax = this.aim; have = true; }
      else if (def.target === "around") { ax = Math.random() * TAU; have = true; }
      else if (def.target === "cone" || def.target === "self") { ax = this.aim; have = true; }
      else {
        const t = pickTarget();
        if (t) { ax = Math.atan2(t.y - this.py, t.x - this.px); have = true; }
      }
      if (!have) { g.cd = 0.1; continue; }

      const dmg = st.dmg * this.stats.damage;
      const projArea = 1 + (this.stats.area - 1) * 0.25;
      const el = (this.elementPath as Element) || "none";

      // ---- fire ----
      if (def.target === "cone") {
        this.addZone({ kind: "cone", x: this.px, y: this.py, r: def.radius * this.stats.area,
          maxR: def.radius * this.stats.area, life: 0.18, maxLife: 0.18, dmg,
          color: def.color, element: el, hits: new Set(), angle: this.aim, tick: 0,
          friendly: true, arc: 0.8, knock: 180 });
      } else if (def.target === "self" && def.id === "g_mine") {
        this.addZone({ kind: "mine", x: this.px + rand(-26, 26), y: this.py + rand(-26, 26),
          r: 12, maxR: def.radius * this.stats.area, life: 14, maxLife: 14, dmg,
          color: def.color, element: el, hits: new Set(), angle: 0, tick: 0, friendly: true });
      } else if (def.radius > 40 && def.speed === 0) {
        // lobbed ordnance lands as a telegraphed blast
        for (let i = 0; i < def.count; i++) {
          const t2 = pickTarget();
          const lx = t2 ? t2.x + rand(-40, 40) : this.px + rand(-200, 200);
          const ly = t2 ? t2.y + rand(-40, 40) : this.py + rand(-200, 200);
          this.addZone({ kind: "warn", x: lx, y: ly, r: def.radius * this.stats.area,
            maxR: def.radius * this.stats.area, life: 0.55, maxLife: 0.55, dmg,
            color: "#6dff9a", element: el, hits: new Set(), angle: 0, tick: 0, friendly: true });
        }
      } else {
        const n = def.count + (def.count > 1 ? this.bonusShots : 0);
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i - (n - 1) / 2) * def.spread : rand(-def.spread, def.spread);
          let p = def.pierce + (this.char.basePierce ?? 0);
          if (def.id === "g_sniper") p = 99;
          this.spawnBullet(this.px, this.py, ax + spread, def.speed * this.stats.projSpeed,
            dmg, def.radius * projArea, def.color, el, p,
            {
              ...(def.explode ? { explode: def.explode * this.stats.area } : {}),
              ...(def.pctHealth ? { pctHealth: def.pctHealth } : {}),
            });
        }
      }
      sfx.pong();

      // ---- ammo ----
      if (st.mag > 0) {
        g.ammo--;
        if (g.ammo <= 0) { g.reloadT = st.reload; sfx.blip(); }
      }
    }
  }

  // ================= shop =================
  shopPrices() {
    let mul = 1;
    if (this.waifu) {
      const w = WAIFU_BY_ID[this.waifu.id];
      if (w.id === "kaede") mul *= 0.75;
      if (w.id === "chiyo") mul *= 0.8;
    }
    return mul;
  }
  metaCost(id: string) {
    const def = META_UPGRADES.find((m) => m.id === id)!;
    const lv = this.meta.levels[id] || 0;
    return Math.round(def.cost * Math.pow(def.costMul, lv) * this.shopPrices());
  }
  buyMeta(id: string) {
    const def = META_UPGRADES.find((m) => m.id === id);
    if (!def) return false;
    const lv = this.meta.levels[id] || 0;
    if (lv >= def.max) return false;
    const cost = this.metaCost(id);
    if (this.coins < cost) return false;
    this.coins -= cost;
    this.meta.levels[id] = lv + 1;
    this.meta.coins = this.coins;
    saveMeta(this.meta);
    this.recalcStats();
    sfx.upgrade();
    this.onToast(`${def.name} Lv${lv + 1}`, def.icon);
    this.pushUi();
    return true;
  }
  buyService(kind: string) {
    const costs: Record<string, number> = { heal: 40, shield: 55, refill: 25 };
    const cost = Math.round((costs[kind] || 40) * this.shopPrices());
    if (this.coins < cost) return false;
    this.coins -= cost;
    if (kind === "heal") { this.hp = this.stats.maxHp; this.flash("#7dffb8", 0.3); }
    if (kind === "shield") { this.shieldT = 14; }
    if (kind === "refill") { this.actives.forEach((a) => (a.cd = 0)); }
    sfx.upgrade();
    this.pushUi();
    return true;
  }
  openShop() {
    const b = this.inSafeZone();
    if (!b) return;
    this.shopBuilding = b;
    this.state = "shop";
    this.pushUi();
  }
  closeShop() { this.state = "playing"; this.pushUi(); }

  // ================= actives =================
  interactOrActive(slot: number) {
    if (this.inSafeZone()) { this.openShop(); return; }
    const chest = this.chests.find((c) => !c.open && d2(c.x, c.y, this.px, this.py) < 52 * 52);
    if (chest) { this.openChest(chest); return; }
    this.useActive(slot);
  }

  useActive(slot: number) {
    const a = this.actives[slot];
    if (!a || a.cd > 0) return;
    const def = ACTIVE_BY_ID[a.id];
    a.cd = def.cd * this.stats.cdr;
    switch (a.id) {
      case "dash": {
        let ax = this.inputX(), ay = this.inputY();
        if (!ax && !ay) { ax = Math.cos(this.aim); ay = Math.sin(this.aim); }
        const m = Math.hypot(ax, ay) || 1;
        this.pvx = (ax / m) * 1100; this.pvy = (ay / m) * 1100;
        this.invuln = Math.max(this.invuln, 0.35);
        this.burst(this.px, this.py, 14, "#9fd7ff", 240, "smoke");
        this.ring(this.px, this.py, "#9fd7ff", 22);
        sfx.blip();
        break;
      }
      case "heal":
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.45);
        this.txt(this.px, this.py - 40, "+HEAL", "#7dffb8", 18);
        this.ring(this.px, this.py, "#7dffb8", 36);
        this.flash("#7dffb8", 0.22);
        sfx.upgrade();
        break;
      case "nuke": {
        this.addZone({ kind: "nova", x: this.px, y: this.py, r: 10, maxR: 900, life: 0.75, maxLife: 0.75, dmg: 160 * this.stats.damage, color: "#ffe066", element: "none", hits: new Set(), angle: 0, tick: 0, friendly: true });
        this.flash("#fff", 0.6); this.addShake(20); sfx.smash();
        break;
      }
      case "slow":
        this.slowMoT = 5;
        this.flash("#9fe8ff", 0.3);
        this.onToast("Bullet Time!", "⏱️");
        sfx.blip();
        break;
      case "shield":
        this.shieldT = 4;
        this.ring(this.px, this.py, "#ffd166", 40);
        sfx.upgrade();
        break;
      case "decoy":
        this.addZone({ kind: "decoy", x: this.px, y: this.py, r: 22, maxR: 22, life: 8, maxLife: 8, dmg: 120 * this.stats.damage, color: "#ff9f43", element: "fire", hits: new Set(), angle: 0, tick: 0, hp: 60 });
        sfx.pickup();
        break;
    }
    this.pushUi();
  }

  grantActive(id: string) {
    if (this.actives.some((a) => a.id === id)) {
      // duplicate → reduce cooldowns instead
      this.coins += 60; this.runCoins += 60;
      this.onToast("Duplicate skill → +60 coins", "💴");
      return;
    }
    if (this.actives.length >= 3) this.actives.pop();
    this.actives.unshift({ id, cd: 0 });
    const def = ACTIVE_BY_ID[id];
    this.onToast(`Skill unlocked: ${def.name}`, def.icon);
    sfx.win();
  }

  // ================= quests =================
  makeQuest() {
    const t = pick(QUEST_TEMPLATES);
    const p = this.roadPoint(this.px, this.py, 620);
    const n = t.kind === "hunt" ? 12 + this.level * 2 : t.kind === "survive" ? 20 + Math.floor(this.level / 4) : 1;
    const unowned = ACTIVES.filter((a) => !this.actives.some((x) => x.id === a.id));
    const rewardSkill = unowned.length ? pick(unowned) : pick(ACTIVES);
    const rewardIsSkill = unowned.length > 0 && Math.random() < 0.75;
    this.quest = {
      id: this.questSeq++, kind: t.kind, title: t.title, jp: t.jp,
      desc: t.desc.replace("{n}", String(n)),
      progress: 0, goal: n, x: p.x, y: p.y, radius: t.kind === "survive" ? 170 : 70,
      reward: rewardIsSkill ? rewardSkill.name : "Rare gear + coins",
      rewardIcon: rewardIsSkill ? rewardSkill.icon : "🎁",
      timer: t.kind === "hunt" ? 999 : t.kind === "survive" ? n : 999,
    };
    (this.quest as QuestState & { skill?: string }).skill = rewardIsSkill ? rewardSkill.id : "";
    this.onToast(`New quest: ${t.title}`, "📍");
    sfx.blip();
  }

  completeQuest() {
    const q = this.quest as (QuestState & { skill?: string }) | null;
    if (!q) return;
    this.flash("#ffe066", 0.4);
    this.addShake(10);
    this.burst(this.px, this.py, 30, "#ffe066", 360, "star");
    // Every quest: a piece of gear + a guaranteed level, plus a skill when one is owed.
    // Quests reward coins + a skill, not gear — gear is boss/chest only.
    this.coins += 12; this.runCoins += 12;
    this.onToast("Quest complete — +12 coins", "💴");
    if (q.skill) this.grantActive(q.skill);
    this.coins += 80; this.runCoins += 80;
    this.dropXp(this.px, this.py, this.xpNeeded() - this.xp + 1, 12); // guaranteed level, still must be collected
    this.quest = null;
    this.questCooldown = rand(30, 50);
    sfx.win();
    this.pushUi();
  }

  // ================= spawning =================
  tierForLevel() {
    const base = Math.min(TIERS.length - 1, Math.floor(this.level / 9));
    const roll = Math.random();
    let t = base;
    if (roll > 0.88) t = Math.min(TIERS.length - 1, base + 1);
    if (roll < 0.22) t = Math.max(0, base - 1);
    return t;
  }

  spawnEnemy(near = false) {
    const ang = Math.random() * TAU;
    const d = near ? rand(260, 340) : rand(380, 560);
    let x = this.px + Math.cos(ang) * d, y = this.py + Math.sin(ang) * d;
    for (let i = 0; i < 10 && (this.solidAt(x, y) || this.buildingAt(x, y)); i++) {
      const a = Math.random() * TAU;
      x = this.px + Math.cos(a) * d; y = this.py + Math.sin(a) * d;
    }
    if (this.solidAt(x, y) || this.buildingAt(x, y)) return;
    x = clamp(x, 40, WORLD - 40); y = clamp(y, 40, WORLD - 40);
    const tier = this.tierForLevel();
    const lvl = this.inArena ? this.level + this.arenaRound * 6 : this.level;
    const role = rollRole(lvl, this.act.roles);
    const elite = Math.random() < 0.04 + lvl * 0.0012;
    // Low flat base so starting mobs pop in one serve; the tier term carries
    // the scaling so mid/late-game toughness is unchanged.
    const hp = (12 + tier * 38) * 2.5 * role.hp * (1 + lvl * 0.115) * (elite ? 3.2 : 1);
    this.enemies.push({
      id: this.nextId++, x, y, vx: 0, vy: 0,
      r: (14 + tier * 0.9) * role.size * (elite ? 1.4 : 1),
      hp, maxHp: hp, tier,
      speed: (112 + tier * 6) * role.speed * (elite ? 0.9 : 1) * (1 + lvl * 0.0035),
      dmg: (7 + tier * 2.2) * role.dmg * (1 + lvl * 0.02) * (elite ? 1.5 : 1),
      // ~30% of the old rate so levels are earned, not handed out
      xp: (0.9 + tier * 0.66) * (elite ? 5 : 1) * (1 + lvl * 0.085) * (role.hp > 2 ? 1.8 : 1),
      flash: 0, slow: 0, burn: 0, burnDmg: 0, shock: 0,
      attackTimer: rand(0.4, 1.8), ranged: role.weapon === "pistol",
      bob: Math.random() * 6, face: 0, knock: 0, elite, role, windup: 0, lunge: 0,
    });
  }

  spawnBoss(forLevel?: number) {
    const lvl = forLevel ?? this.level;
    const milestone = isActBoss(lvl);
    const def = bossForLevel(lvl);
    if (!def) return;                       // no boss defined for this level
    const scale = 1 + lvl * 0.012;          // the schedule already scales HP
    const p = this.roadPoint(this.px, this.py, 400);
    const hp = def.hp * scale;
    // From level 20 the boss arrives behind an escort you must carve through first.
    let guardMax = lvl >= 20 ? Math.round(6 + (lvl - 20) * 0.55) : 0;
    if (milestone) guardMax = 0;   // milestone bosses arrive alone, in person
    const e: Enemy = {
      id: this.nextId++, x: p.x, y: p.y, vx: 0, vy: 0, r: def.radius,
      hp, maxHp: hp, tier: TIERS.length - 1,
      speed: def.speed * 0.72, dmg: def.dmg * (1 + lvl * 0.02),
      // A boss is worth exactly one level, never a cascade of them.
      xp: milestone ? 0 : this.xpNeeded() * 0.95,
      flash: 0, slow: 0, burn: 0, burnDmg: 0, shock: 0,
      attackTimer: 2.2, ranged: true, bob: 0, face: 0, knock: 0,
      boss: def, bossScale: scale, phase: 0, charge: 0, milestone,
      guard: guardMax, guardMax, telegraph: 0,
    };
    if (milestone) {
      // ---- ARENA WIPE: everything on the street is annihilated to clear the stage
      for (const other of this.enemies) {
        this.burst(other.x, other.y, 10, "#ffffff", 320);
        this.ring(other.x, other.y, `hsl(${def.hue},95%,65%)`, 18);
      }
      this.enemies.length = 0;
      this.bullets.length = 0;
      this.zones.length = 0;
      // boss lands right in front of you rather than somewhere on the map
      const la = this.aim;
      const lp = this.roadPoint(this.px + Math.cos(la) * 330, this.py + Math.sin(la) * 330, 220);
      p.x = lp.x; p.y = lp.y;
      e.x = lp.x; e.y = lp.y;
      e.hp *= 1.6; e.maxHp *= 1.6;          // milestone bosses are genuinely monstrous
      e.dmg *= 1.25;
      e.r *= 1.35;
      this.cineT = 4.6;
      this.cineX = lp.x; this.cineY = lp.y; this.cineHue = def.hue;
      this.slowMoT = Math.max(this.slowMoT, 2.6);
      this.invuln = Math.max(this.invuln, 4.6);
      this.flash("#ffffff", 0.95);
      // impact crater + expanding shockwaves
      for (let w = 0; w < 4; w++) {
        this.later(() => {
          if (this.state === "menu") return;
          this.addZone({ kind: "nova", x: lp.x, y: lp.y, r: 10, maxR: 520 + w * 130,
            life: 0.8, maxLife: 0.8, dmg: 0, color: `hsl(${def.hue},95%,65%)`, element: "none",
            hits: new Set(), angle: 0, tick: 0, friendly: false });
          sfx.bossSlam();
        }, 380 + w * 260);
      }
      // pillar of embers
      for (let i = 0; i < 120; i++) {
        const a = Math.random() * TAU, rr = rand(0, 150);
        this.particles.push({
          x: lp.x + Math.cos(a) * rr, y: lp.y + Math.sin(a) * rr,
          vx: Math.cos(a) * rand(30, 120), vy: rand(-520, -180),
          life: rand(0.9, 2.1), max: 2.1, size: rand(3, 9),
          color: `hsl(${(def.hue + rand(-20, 30)) % 360},100%,${55 + Math.random() * 25}%)`, kind: "spark",
        });
      }
      for (let r = 0; r < 5; r++) this.ring(lp.x, lp.y, `hsl(${def.hue},100%,68%)`, 40 + r * 34);
    }

    this.enemies.push(e);
    // demi-boss squads (Knife Boys, Spike Sisters) spawn as a group
    if (def.squad && def.squad > 1) {
      for (let i = 1; i < def.squad; i++) {
        const a = (i / def.squad) * TAU;
        const sp = this.roadPoint(p.x + Math.cos(a) * 180, p.y + Math.sin(a) * 180, 160);
        this.enemies.push({ ...e, id: this.nextId++, x: sp.x, y: sp.y,
          hits: undefined as never, hp: e.maxHp, phase: 0, mechT: rand(2, 5) } as Enemy);
      }
    }
    this.flash("#ff2e4d", 0.55);
    this.bossIntro = 3.4;
    // shockwave of embers announcing the arrival
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU;
      this.particles.push({
        x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40,
        vx: Math.cos(a) * rand(140, 320), vy: Math.sin(a) * rand(140, 320),
        life: rand(0.5, 1.1), max: 1.1, size: rand(3, 7),
        color: `hsl(${def.hue},90%,${55 + Math.random() * 20}%)`, kind: "spark",
      });
    }
    this.ring(p.x, p.y, `hsl(${def.hue},95%,62%)`, 90);
    if (!milestone) for (let i = 0; i < Math.min(14, 4 + Math.floor(lvl / 6)); i++) this.spawnEnemy(true);
    this.onBossAlert({ name: def.name, jp: def.jp, title: def.title, milestone, level: lvl, intro: def.intro });
    this.later(() => this.onBossAlert(null), milestone ? 5200 : 3600);
    if (!milestone) {
      this.onToast(guardMax > 0 ? `Break the escort! (${guardMax} left)` : `${def.name} — ${def.title}`, "💀");
      sfx.bossHorn();
      this.later(() => { if (this.bosses.length) sfx.startBossMusic("normal"); }, 1200);
    } else {
      sfx.milestoneBoss();
      const THEME: Record<string, "samurai" | "yakuza" | "dragon" | "titan"> = {
        samurai: "samurai", oyabun: "yakuza", wyrm: "dragon", priest: "titan",
      };
      const th = THEME[def.shape] || "titan";
      this.later(() => { if (this.bosses.length) sfx.startBossMusic(th); }, 3400);
      const stinger: Record<string, () => void> = {
        samurai: () => sfx.iaiSlash(), oyabun: () => sfx.machineGun(),
        wyrm: () => sfx.dragonRoar(), priest: () => sfx.bell(),
      };
      this.later(() => stinger[def.shape]?.(), 2900);
      // escort waves only start after the stare-down ends
      this.later(() => { for (let i = 0; i < 10; i++) this.spawnEnemy(); }, 5200);
    }
    this.pushUi();
  }

  // ================= combat =================
  /** `primary` is false for procs, ricochets, DoTs, secondary guns and
   *  companion damage. Only primary hits can leech — otherwise a build with
   *  a dozen damage sources heals faster than anything can hurt it. */
  hitEnemy(e: Enemy, dmg: number, element: Element, angle: number, knock: number, showText = true, primary = true) {
    // At Sharp Eye 6 every strike crits, but the multiplier is cut to 75%
    // of its normal value — consistent damage instead of spiky damage.
    const always = this.alwaysCrit;
    const crit = always || Math.random() < this.stats.crit;
    let critMul = always ? 1 + (this.stats.critDmg - 1) * 0.75 : this.stats.critDmg;
    if (this.legends.includes("L_glass")) critMul *= 2;
    let d = dmg * (crit ? critMul : 1) * this.empowerMul * (this.legendRezT > 0 ? 5 : 1);
    if (this.legends.includes("L_exec") && e.hp < e.maxHp * 0.4) d *= 1.9;
    if (e.boss) {
      if (this.legends.includes("L_boss")) d *= 2.5;
      if (this.legends.includes("L_titan")) d *= 3.5;
    }
    if (e.shock > 0) d *= 1.25;
    if ((e.marked || 0) > 0) d *= 1.3;         // companion "rally" mark
    // ---- class modifiers ----
    const kf = this.mod("k_fist");
    if (kf) d *= 1 + 0.18 * kf;
    const kc = this.mod("k_combo");
    if (kc) {
      d *= 1 + 0.08 * kc * Math.min(this.comboStacks, 10);
      this.comboStacks = Math.min(this.comboStacks + 1, 10);
      this.comboT = 2.4;
    }
    if (this.mod("d_butcher")) { d *= 1.04; e.burn = Math.max(e.burn, 1.6); e.burnDmg = Math.max(e.burnDmg, d * 0.1); }
    if (this.guns.some((g) => g.id === "g_ar") && e.role?.id === "shielder") d *= 1.4;
    if (e.role?.id === "shielder") {
      const front = Math.cos(angle - e.face) < -0.3;   // hitting the shield face
      if (front) { d *= 0.45; if (showText && Math.random() < 0.3) this.txt(e.x, e.y - e.r - 8, "BLOCK", "#9fb8ff", 12); }
    }
    // Trial bosses resist burst damage so the fight lasts long enough to
    // actually play out its mechanics instead of melting in two seconds.
    if (e.invisible) return;    // airborne, untargetable
    // Aurelius sheds health packs as you wear him down, so the fight is
    // survivable without a healing build.
    if (e.boss && this.legends.includes("L_titan") && Math.random() < 0.05) {
      this.gems.push({ x: e.x + rand(-40, 40), y: e.y + rand(-40, 40), vx: 0, vy: 0,
        v: this.stats.maxHp * 0.08, kind: "hp", t: 0 });
    }
    if (e.boss?.id === "c_emperor" && Math.random() < 0.06) {
      this.gems.push({ x: e.x + rand(-40, 40), y: e.y + rand(-40, 40), vx: 0, vy: 0,
        v: this.stats.maxHp * 0.12, kind: "hp", t: 0 });
    }
    if ((e.exposed || 0) > 0) { d *= 1.6; if (showText && Math.random() < 0.3) this.txt(e.x, e.y - e.r - 8, "EXPOSED!", "#ffe066", 14); }
    if ((e.shieldT2 || 0) > 0) { d *= 0.3; if (showText && Math.random() < 0.3) this.txt(e.x, e.y - e.r - 8, "GUARD", "#9fb8ff", 12); }
    if (e.milestone) d *= 0.78;
    // A guarded boss only takes chip damage until its escort is wiped out.
    if (e.boss && (e.guard || 0) > 0) {
      d *= 0.15;
      if (showText && Math.random() < 0.25) this.txt(e.x, e.y - e.r - 10, "GUARDED", "#9fb8ff", 13);
    }
    e.hp -= d;
    e.flash = 0.1;
    this.dmgAccum += d;
    if (knock && !e.boss) { e.vx += Math.cos(angle) * knock; e.vy += Math.sin(angle) * knock; e.knock = 0.12; }
    if (element === "fire") { e.burn = Math.max(e.burn, 2.4 * this.stats.duration); e.burnDmg = Math.max(e.burnDmg, dmg * 0.22); }
    if (element === "ice") e.slow = Math.max(e.slow, 1.6 * this.stats.duration);
    if (element === "shock") e.shock = Math.max(e.shock, 1.6 * this.stats.duration);
    if (element === "void") { e.slow = Math.max(e.slow, 0.8); e.vx *= 0.4; e.vy *= 0.4; }
    // Leech only from real, primary hits — and never while suppressed.
    if (primary && this.stats.lifesteal > 0 && this.leechLock <= 0 && !e.boss)
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.lifesteal);
    else if (primary && this.stats.lifesteal > 0 && this.leechLock <= 0 && e.boss)
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.lifesteal * 0.35);
    // ---- modifier: Concussion (stagger) ----
    const stag = this.mod("m_stagger");
    if (stag) e.stun = Math.max(e.stun || 0, 0.07 * stag);
    // ---- modifier: Tar Hands (slow) ----
    if (this.mod("m_slowfoe")) e.slow = Math.max(e.slow, 0.3 * this.mod("m_slowfoe"));
    // ---- modifier: Overflow (arc to a neighbour) ----
    if (this.mod("m_chain") && Math.random() < 0.3) {
      let o2: Enemy | null = null, bd = 220 * 220;
      for (const o of this.enemies) {
        if (o === e || o.hp <= 0) continue;
        const dd = d2(o.x, o.y, e.x, e.y);
        if (dd < bd) { bd = dd; o2 = o; }
      }
      if (o2) {
        this.bolt(e.x, e.y, o2.x, o2.y, "#9fe8ff");
        o2.hp -= d * 0.4 * this.mod("m_chain");
        if (o2.hp <= 0) this.killEnemy(o2, 3);
      }
    }
    // ---- modifier: Execution ----
    if (!e.boss && this.mod("d_butchery") && e.hp > 0 && e.hp < e.maxHp * (0.06 * this.mod("d_butchery"))) {
      this.txt(e.x, e.y - e.r - 12, "BUTCHERED", "#ff5e7a", 15);
      e.hp = 0;
    }
    // Execution scales 5/10/15/20/25% then jumps to 50% at max rank.
    const exLv = this.mod("m_execute");
    const exThreshold = (exLv >= 6 ? 0.5 : exLv * 0.05) * (this.hasElite("e_executioner") ? 2 : 1);
    if (!e.boss && exLv > 0 && e.hp > 0 && e.hp < e.maxHp * exThreshold) {
      this.txt(e.x, e.y - e.r - 12, "EXECUTE", "#ff3b53", 15);
      e.hp = 0;
    }
    // ================= ELEMENTAL IDENTITY =================
    // Always-on. Your element is how you hit things, from level 1.
    if (this.elementPath) {
      const K = this.mastK;
      const force = this.boons.includes("b_force") ? 1.6 : 1;
      const durK = (this.boons.includes("b_force") ? 1.5 : 1) * this.stats.duration;
      const apps = this.legends.includes("L_elem2") ? 2 : 1;

      for (let ap = 0; ap < apps; ap++) {
        switch (this.elementPath) {
          case "fire": {
            const fuel = 1 + 0.4 * this.mast("mf_fuel") * K;
            e.burn = Math.max(e.burn, (2.2 + this.mast("mf_fuel") * 0.5) * durK);
            e.burnDmg = Math.max(e.burnDmg, d * 0.16 * fuel * force);
            break;
          }
          case "ice": {
            // chills stack; three chills freeze solid
            const rate = 1 + 0.5 * this.mast("mi_deep") * K;
            e.chill = Math.min(3, (e.chill || 0) + rate);
            e.slow = Math.max(e.slow, 1.3 * durK);
            if ((e.chill || 0) >= 3 && this.hasElite("e_shatter") && !e.boss) {
              e.chill = 0;
              this.txt(e.x, e.y - e.r - 10, "SHATTERED", "#b8f1ff", 15);
              this.burst(e.x, e.y, 10, "#b8f1ff", 280);
              e.hp = 0;
              break;
            }
            if ((e.chill || 0) >= 3 && (e.frozen || 0) <= 0) {
              e.frozen = (1.4 + this.mast("mi_deep") * 0.4 * K) * durK;
              e.chill = 0;
              e.stun = Math.max(e.stun || 0, e.frozen);
              this.ring(e.x, e.y, "#b8f1ff", 22);
              this.txt(e.x, e.y - e.r - 10, "FROZEN", "#b8f1ff", 13);
            }
            break;
          }
          case "shock": {
            // static builds toward a stun
            const gain = (0.34 + 0.3 * this.mast("ms_charge") * K) * force;
            e.static = (e.static || 0) + gain;
            e.shock = Math.max(e.shock, 1.6 * durK);
            if ((e.static || 0) >= 1) {
              e.static = 0;
              e.stun = Math.max(e.stun || 0, 0.55 + this.mast("ms_charge") * 0.1 * K);
              this.ring(e.x, e.y, "#ffe14d", 20);
              // Thunderhead: stunning calls down a strike
              const th = this.mast("ms_storm");
              if (th) {
                this.bolt(e.x, e.y - 340, e.x, e.y, "#ffe14d");
                this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 70 + th * 18,
                  life: 0.26, maxLife: 0.26, dmg: d * (0.8 + th * 0.3) * K, color: "#ffe14d",
                  element: "shock", hits: new Set(), angle: 0, tick: 0, friendly: true });
              }
              // Arc Conductor: chain off the stun
              const arc = this.mast("ms_arc");
              if (arc) {
                let prev = e; const hit = new Set<number>([e.id]);
                for (let i = 0; i < 2 + arc; i++) {
                  let nx: Enemy | null = null, bd = (200 + arc * 40) ** 2;
                  for (const o of this.enemies) {
                    if (o.hp <= 0 || hit.has(o.id)) continue;
                    const dd = d2(o.x, o.y, prev.x, prev.y);
                    if (dd < bd) { bd = dd; nx = o; }
                  }
                  if (!nx) break;
                  hit.add(nx.id);
                  this.bolt(prev.x, prev.y, nx.x, nx.y, "#ffe14d");
                  nx.hp -= d * 0.35 * arc * K;
                  nx.static = (nx.static || 0) + 0.3;
                  if (nx.hp <= 0) this.killEnemy(nx, 2);
                  prev = nx;
                }
              }
            }
            break;
          }
          case "wind": {
            if (!e.boss) {
              // Per-enemy knockback cooldown. Without it a fast weapon shoves
              // the same target every single frame, which turns Gale into an
              // impassable force field instead of a displacement effect.
              if ((e.windCd || 0) <= 0) {
                e.windCd = 0.8;
                const push = 190 * force;        // flat — mastery adds damage, not shove
                const a2 = Math.atan2(e.y - this.py, e.x - this.px);
                e.vx += Math.cos(a2) * push; e.vy += Math.sin(a2) * push;
                e.displaced = 0.6;
                if (this.mast("mw_cyclone")) e.marked = Math.max(e.marked || 0, 1.5);
              }
              // the damage bonus still applies on every hit
              if (this.mast("mw_gust")) d += d * 0.12 * this.mast("mw_gust") * K;
            }
            break;
          }
          case "void": {
            const rot = 1 + 0.45 * this.mast("mv_rot") * K;
            e.decay = Math.max(e.decay || 0, (2.6 + this.mast("mv_rot") * 0.6) * durK);
            e.decayDmg = Math.max(e.decayDmg || 0, d * 0.14 * rot * force);
            break;
          }
        }
      }

      // --- mastery damage amplifiers ---
      if (e.burn > 0 && this.mast("mf_tender")) d *= 1 + 0.12 * this.mast("mf_tender") * K;
      if ((e.frozen || 0) > 0 && this.mast("mi_shatter")) d *= 1 + 0.35 * this.mast("mi_shatter") * K;
      if ((e.chill || 0) > 0 && this.mast("mi_brittle")) d *= 1 + 0.10 * (e.chill || 0) * this.mast("mi_brittle") * K;
      if (e.shock > 0 && this.mast("ms_amp")) d *= 1 + 0.15 * this.mast("ms_amp") * K;
      if ((e.displaced || 0) > 0 && this.mast("mw_cyclone")) d *= 1 + 0.2 * this.mast("mw_cyclone") * K;

      // Elemental Surge: splash the effect onto a neighbour
      if (this.legends.includes("L_elem2")) {
        let o2: Enemy | null = null, bd = 190 * 190;
        for (const o of this.enemies) {
          if (o === e || o.hp <= 0) continue;
          const dd = d2(o.x, o.y, e.x, e.y);
          if (dd < bd) { bd = dd; o2 = o; }
        }
        if (o2) {
          if (this.elementPath === "fire") { o2.burn = Math.max(o2.burn, 2); o2.burnDmg = Math.max(o2.burnDmg, d * 0.1); }
          else if (this.elementPath === "ice") o2.chill = Math.min(3, (o2.chill || 0) + 1);
          else if (this.elementPath === "shock") o2.static = (o2.static || 0) + 0.4;
          else if (this.elementPath === "void") { o2.decay = Math.max(o2.decay || 0, 2.4); o2.decayDmg = Math.max(o2.decayDmg || 0, d * 0.1); }
        }
      }
    }
    // Temporal Edge: every 10th hit always crits
    if (this.legends.includes("L_time")) {
      this.hitCounter++;
      if (this.hitCounter % 10 === 0) d *= this.stats.critDmg;
    }
    // ---- legend: ramping fury ----
    if (this.legends.includes("L_ramp")) {
      this.rampStacks = Math.min(120, this.rampStacks + 1);
      this.rampT = 4;
    }
    if (crit) this.triggerProcs("onCrit");
    if (crit && this.effects.has("critchain")) {
      let arc: Enemy | null = null, bd = 240 * 240;
      for (const o of this.enemies) {
        if (o === e || o.hp <= 0) continue;
        const dd = d2(o.x, o.y, e.x, e.y);
        if (dd < bd) { bd = dd; arc = o; }
      }
      if (arc) { this.bolt(e.x, e.y, arc.x, arc.y, "#ffe14d"); arc.hp -= d * 0.5; if (arc.hp <= 0) this.killEnemy(arc, 3); }
    }
    if (showText && (crit || this.enemies.length < 90 || Math.random() < 0.3))
      this.txt(e.x + rand(-6, 6), e.y - e.r - 4, `${Math.round(d)}`, crit ? "#ffe066" : "#ffd9d9", crit ? 19 : 13);
    if (this.particles.length < 300) this.burst(e.x, e.y, crit ? 5 : 2, crit ? "#ffe066" : "#ff8f8f", 200);
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e: Enemy, depth = 0) {
    if (e.dead) return;          // never process the same corpse twice
    e.dead = true;
    e.hp = -1;
    this.kills++;
    const boss = !!e.boss;
    // ================= on-kill modifiers =================
    // Cascading effects are budgeted and depth-limited; past the limit an
    // enemy still dies and drops loot, it just stops chain-reacting.
    const canCascade = depth < 3 && this.killBudget > 0;
    if (canCascade) this.killBudget--;
    if (!boss && canCascade) {
      // On-kill AoE is deliberately NOT scaled by your damage multiplier —
      // that was the runaway term. It instead scales off the dead enemy's own
      // max HP (so it stays relevant all game) but is hard-capped so a corpse
      // explosion can never one-shot a healthy enemy of the same tier.
      // Pure percentage of the dead enemy's own max HP. This self-balances at
      // every level and, with the multipliers below, can never exceed ~20% of a
      // same-tier enemy — so chains always fizzle instead of clearing the screen.
      const dmgBase = e.maxHp * 0.22 * (this.legends.includes("L_storm") ? 1.6 : 1);
      // Detonate — generic corpse explosion that chains through crowds
      const det = this.mod("m_explode");
      if (det) {
        this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 46 + det * 16, life: 0.26, maxLife: 0.26,
          dmg: dmgBase * (0.35 + det * 0.14), color: "#ffb703", element: "none",
          hits: new Set(), angle: 0, tick: 0, friendly: true });
      }
      // Sanguine — flat heal on kill
      this.triggerProcs("onKill");
      if (this.boons.includes("b_vamp"))
        this.hp = Math.min(this.stats.maxHp, this.hp + 2 + this.level * 0.08);
      if (this.legends.includes("L_apex")) { this.apexKills++; if (this.apexKills % 25 === 0) this.recalcStats(); }
      if (this.mod("d_frenzy")) { this.frenzy = Math.min(this.frenzy + 1, 8); this.frenzyT = 3; }
      if (this.mod("d_butchery") && Math.random() < 0.2 * this.mod("d_butchery")) {
        this.gems.push({ x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60),
          v: this.stats.maxHp * 0.02, kind: "hp", t: 0 });
      }
      // ================= ELEMENTAL MASTERY ON KILL =================
      const K = this.mastK;
      const avatar = this.legends.includes("L_avatar");

      // FIRE — Combustion: ignited corpses detonate
      const comb = this.mast("mf_blast");
      if ((comb || avatar) && e.burn > 0) {
        const p = comb || 1;
        this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 80 + p * 26, life: 0.28, maxLife: 0.28,
          dmg: e.maxHp * (0.1 + p * 0.05) * K, color: "#ff7a2f", element: "fire",
          hits: new Set(), angle: 0, tick: 0, friendly: true });
        this.burst(e.x, e.y, 14, "#ff9f43", 300);
      }
      // FIRE — Wildfire: spread the burn outward
      const wild = this.mast("mf_spread");
      if (wild && e.burn > 0) {
        const lim = 130 + wild * 40;
        let spread = 0;
        for (const o of this.enemies) {
          if (spread >= 4 + wild) break;                 // bounded work
          if (o.hp <= 0 || o === e) continue;
          if (Math.abs(o.x - e.x) > lim || Math.abs(o.y - e.y) > lim) continue;
          if (d2(o.x, o.y, e.x, e.y) < lim * lim) {
            o.burn = Math.max(o.burn, e.burn * 0.8);
            o.burnDmg = Math.max(o.burnDmg, e.burnDmg * 0.8);
            spread++;
          }
        }
      }
      // ICE — Shatterpoint: frozen corpses explode in shards
      const shat = this.mast("mi_shatter");
      if ((shat || avatar) && ((e.frozen || 0) > 0 || (e.chill || 0) > 0)) {
        const p = shat || 1;
        // Shards are real projectiles, so cap how many can exist at once —
        // a frozen crowd dying together used to spawn hundreds in one frame.
        const room = Math.max(0, Game.MAX_BULLETS - 80 - this.bullets.length);
        const n = Math.min(4 + p * 2, room);
        for (let i = 0; i < n; i++)
          this.spawnBullet(e.x, e.y, Math.random() * TAU, 520,
            e.maxHp * 0.05 * p * K, 5, "#b8f1ff", "ice", 1);
        if (this.particles.length < 450) this.burst(e.x, e.y, 8, "#b8f1ff", 300);
      }
      // ICE — Permafrost: leave a freezing patch
      const perma = this.mast("mi_field");
      if (perma && (e.frozen || 0) > 0) {
        this.addZone({ kind: "decay", x: e.x, y: e.y, r: 54 + perma * 14, maxR: 54 + perma * 14,
          life: 3 + perma, maxLife: 3 + perma, dmg: e.maxHp * 0.03 * K,
          color: "#79dcff", element: "ice", hits: new Set(), angle: 0, tick: 0, friendly: true });
      }
      // VOID — Contagion: decay jumps to everything nearby
      const cont = this.mast("mv_spread");
      if ((cont || avatar) && (e.decay || 0) > 0) {
        const p = cont || 1;
        let spread = 0;
        const lim2 = 150 + p * 45;
        for (const o of this.enemies) {
          if (spread >= 2 + p) break;                    // bounded work
          if (o.hp <= 0 || o === e) continue;
          if (Math.abs(o.x - e.x) > lim2 || Math.abs(o.y - e.y) > lim2) continue;
          if (d2(o.x, o.y, e.x, e.y) < lim2 * lim2) {
            o.decay = Math.max(o.decay || 0, (e.decay || 0) * 0.9);
            o.decayDmg = Math.max(o.decayDmg || 0, (e.decayDmg || 0) * 0.9);
            this.bolt(e.x, e.y, o.x, o.y, "#a86bff");
            spread++;
          }
        }
      }
      // VOID — Collapse: implode and crush
      const coll = this.mast("mv_collapse");
      if (coll && (e.decay || 0) > 0 && this.pullCd <= 0) {
        this.pullCd = Math.max(2.5, 5 - coll * 0.5);
        this.addZone({ kind: "hole", x: e.x, y: e.y, r: 90 + coll * 22, maxR: 90 + coll * 22,
          life: 1.6, maxLife: 1.6, dmg: e.maxHp * 0.04 * K, color: "#a86bff",
          element: "void", hits: new Set(), angle: 0, tick: 0, friendly: true });
      }
      // WIND — Vortex: pull everything in
      const vort = this.mast("mw_vortex");
      if (vort && this.pullCd <= 0) {
        this.pullCd = Math.max(2.5, 5 - vort * 0.5);
        this.addZone({ kind: "hole", x: e.x, y: e.y, r: 110 + vort * 26, maxR: 110 + vort * 26,
          life: 1.3, maxLife: 1.3, dmg: e.maxHp * 0.035 * K, color: "#8ef5c0",
          element: "wind", hits: new Set(), angle: 0, tick: 0, friendly: true });
      }
      // Avatar: your element always detonates
      if (avatar) {
        const col = ELEMENTS[this.elementPath as ElementPath]?.color || "#fff";
        this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 110, life: 0.3, maxLife: 0.3,
          dmg: e.maxHp * 0.16, color: col, element: (this.elementPath as Element) || "none",
          hits: new Set(), angle: 0, tick: 0, friendly: true });
      }
      // Blood Frenzy heal
      if (this.legends.includes("L_berserk"))
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.03);
      // Executioner corpse blast
      if (this.legends.includes("L_exec"))
        this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 70, life: 0.24, maxLife: 0.24,
          dmg: e.maxHp * 0.18, color: "#ffb703", element: "none",
          hits: new Set(), angle: 0, tick: 0, friendly: true });

      const vmp = this.mod("m_vamp");
      if (vmp) this.hp = Math.min(this.stats.maxHp, this.hp + 0.5 * vmp);

      // ---- element-reactive detonations ----
      const xf = this.mod("x_fire");
      if (xf && e.burn > 0 && this.elemProcReady("x_fire", xf)) {
        this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 56 + xf * 18, life: 0.3, maxLife: 0.3,
          dmg: dmgBase * (0.45 + xf * 0.16), color: "#ff7a2f", element: "fire",
          hits: new Set(), angle: 0, tick: 0, friendly: true });
        this.burst(e.x, e.y, 14, "#ff9f43", 300);
      }
      const xi = this.mod("x_ice");
      if (xi && e.slow > 0 && this.elemProcReady("x_ice", xi)) {
        for (let i = 0; i < 4 + xi * 2; i++) {
          const a = Math.random() * TAU;
          this.spawnBullet(e.x, e.y, a, 520, dmgBase * 0.10 * xi, 5, "#b8f1ff", "ice", 1);
        }
        this.burst(e.x, e.y, 12, "#b8f1ff", 280);
      }
      const xs = this.mod("x_shock");
      if (xs && e.shock > 0 && this.elemProcReady("x_shock", xs)) {
        let prev = e;
        const hit = new Set<number>([e.id]);
        for (let i = 0; i < 2 + xs; i++) {
          let nx2: Enemy | null = null, bd = 280 * 280;
          for (const o of this.enemies) {
            if (o.hp <= 0 || hit.has(o.id)) continue;
            const dd = d2(o.x, o.y, prev.x, prev.y);
            if (dd < bd) { bd = dd; nx2 = o; }
          }
          if (!nx2) break;
          hit.add(nx2.id);
          this.bolt(prev.x, prev.y, nx2.x, nx2.y, "#ffe14d");
          nx2.hp -= dmgBase * (0.3 + xs * 0.1);
          if (nx2.hp <= 0) this.killEnemy(nx2, depth + 1);
          prev = nx2;
        }
      }
      // Vacuum: cooldown-gated so it reliably fires and reads as a real
      // event, rather than a coin-flip you never notice.
      const xw = this.mod("x_wind");
      if (xw && this.elemProcReady("x_wind", xw)) {
        const lim = 170 + xw * 30;
        for (const o of this.enemies) {
          if (o.hp <= 0 || o.boss) continue;
          const dd = Math.hypot(o.x - e.x, o.y - e.y);
          if (dd < lim && dd > 1) {
            o.vx -= ((o.x - e.x) / dd) * 340;
            o.vy -= ((o.y - e.y) / dd) * 340;
          }
        }
        this.ring(e.x, e.y, "#8ef5c0", 34);
        this.burst(e.x, e.y, 8, "#8ef5c0", 200);
      }
      const xv = this.mod("x_void");
      if (xv && this.elemProcReady("x_void", xv)) {
        // Pool of Decay — a corroding patch left where they fell
        this.addZone({ kind: "decay", x: e.x, y: e.y, r: 52 + xv * 14, maxR: 52 + xv * 14,
          life: 3 + xv * 0.8, maxLife: 3 + xv * 0.8, dmg: dmgBase * (0.07 + xv * 0.025),
          color: "#a86bff", element: "void", hits: new Set(), angle: 0, tick: 0, friendly: true });
      }
    }
    if (this.effects.has("bloom") && !boss) {
      const bloomDmg = e.maxHp * 0.22 * 0.3 * this.effects.get("bloom")!;
      this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 56, life: 0.25, maxLife: 0.25,
        dmg: bloomDmg, color: "#6dff9a", element: "none",
        hits: new Set(), angle: 0, tick: 0, friendly: true });
    }
    if (this.effects.has("coinburst") && Math.random() < 0.18) {
      this.gems.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-80, 80),
        v: this.coinValue, kind: "coin", t: 0 });
    }
    this.burst(e.x, e.y, boss ? 70 : this.enemies.length > 120 ? 4 : 10, boss ? "#ffe066" : "#ff4757", boss ? 520 : 300);
    this.ring(e.x, e.y, boss ? "#ffe066" : "#ff6b81", boss ? 60 : 16);
    this.addShake(boss ? 22 : 3);
    if (boss) {
      this.hitStop = 0.14; this.flash("#fff", 0.5);
      this.bossRest = this.bosses.length > 1 ? 0 : 14;   // no lull while another boss lives
      if (this.inArena) { this.arenaVictory(e); }
      else if (e.milestone) {
        // Milestone rewards: a legendary card, a partner gate, and — for the
        // gunner — a new firearm recovered from the body.
        const tier = clamp(Math.floor(this.level / 25) + 1, 1, 4);
        this.pendingLegendTier = tier;
        if (this.isGunner) this.pendingGunTier = tier * 25;
        this.bossDefeatName = e.boss!.name;
        this.clearMilestoneGate();
        this.finishAct(e);
      }
      this.onToast("Boss down — the street goes quiet…", "🏆");
      if (this.bosses.length === 0) sfx.stopBossMusic();
      sfx.bossDie();
    }
    else {
      sfx.kill();
      // chip away at the boss escort
      for (const b of this.bosses) {
        if ((b.guard || 0) <= 0) continue;
        b.guard = (b.guard || 0) - 1;
        if (b.guard <= 0) {
          this.flash("#ffe066", 0.45);
          this.addShake(14);
          this.ring(b.x, b.y, "#ffe066", 70);
          this.txt(b.x, b.y - b.r - 30, "GUARD BROKEN!", "#ffe066", 22);
          this.onToast(`${b.boss!.name} is exposed!`, "⚔️");
          sfx.bossExposed();
        }
      }
    }

    // drops
    // No experience at all during a trial — not from the boss, not from adds.
    if (this.xpSealed) e.xp = 0;
    const gemCount = boss ? 14 : e.elite ? 3 : 1;
    if (this.gems.length > 500) {
      // too much loot on the floor — fold this drop into the nearest gem
      const near = this.gems.find((g) => g.kind === "xp" && d2(g.x, g.y, e.x, e.y) < 200 * 200);
      if (near) { near.v += e.xp; this.afterKill(e, boss); return; }
    }
    if (e.xp > 0) {
      for (let i = 0; i < gemCount; i++) {
        const a = Math.random() * TAU, s = rand(20, 110);
        this.gems.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, v: e.xp / gemCount, kind: "xp", t: 0 });
      }
    }
    if (boss || Math.random() < 0.004 + this.stats.luck * 0.02) {
      // bosses pay a lump sum; trash pays a trickle
      const bossPay = [5, 8, 12, 18][clamp(this.actIndex, 0, 3)] ?? 18;
      const n = boss ? 5 : 1;
      const each = boss ? Math.max(1, Math.round(bossPay / 5 * this.stats.coinGain)) : this.coinValue;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = rand(30, 130);
        this.gems.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, v: each, kind: "coin", t: 0 });
      }
    }
    if (Math.random() < 0.035) this.gems.push({ x: e.x, y: e.y, vx: 0, vy: 0, v: this.stats.maxHp * 0.22, kind: "hp", t: 0 });
    // Gear comes ONLY from bosses (1 each) and chests. Never from regular mobs.
    if (boss) {
      const it = this.makeItem();
      if (it) this.gems.push({ x: e.x, y: e.y + 26, vx: 0, vy: 0, v: 0, kind: "item", t: 0, item: it });
    }

    this.afterKill(e, boss);
  }

  afterKill(_e: Enemy, _boss: boolean) {
    if (this.quest && this.quest.kind === "hunt") {
      this.quest.progress++;
      if (this.quest.progress >= this.quest.goal) this.completeQuest();
    }
  }

  hurt(dmg: number) {
    if (this.invuln > 0 || this.shieldT > 0) return;
    if (this.guns.some((g) => g.id === "g_shield") && Math.random() < 0.25) {
      this.txt(this.px, this.py - 34, "BLOCKED", "#9fb8d8", 14);
      this.ring(this.px, this.py, "#9fb8d8", 26);
      this.invuln = 0.25;
      return;
    }
    const dodge = (this.effects.get("dodge") || 0) * 0.07;
    if (dodge > 0 && Math.random() < Math.min(0.45, dodge)) {
      this.txt(this.px, this.py - 34, "MISS", "#9fe8ff", 15);
      this.invuln = 0.2;
      return;
    }
    const thorns = this.effects.get("thorns") || 0;
    if (thorns) {
      for (const e of this.enemies) {
        if (e.hp > 0 && d2(e.x, e.y, this.px, this.py) < 120 * 120) this.hitEnemy(e, 12 * thorns, "none", 0, 0, false, false);
      }
    }
    let red = dmg * (1 - clamp(this.stats.armor / (this.stats.armor + 28), 0, 0.72));
    if (this.boons.includes("b_guard")) red *= 0.85;      // Aegis: -15% taken
    if (this.legends.includes("L_glass")) red *= 1.25;    // Glass Edge drawback
    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, red);
      this.shieldHp -= absorbed;
      red -= absorbed;
      this.txt(this.px, this.py - 36, "ABSORB", "#9fd7ff", 13);
      this.ring(this.px, this.py, "#9fd7ff", 28);
    }
    this.triggerProcs("onHurt");
    if (red <= 0) { this.invuln = 0.3; this.pushUi(); return; }
    this.hp -= Math.max(1, red);
    this.invuln = 0.55;
    this.hurtFlash = 0.5;
    this.addShake(9);
    this.flash("#ff2e4d", 0.25);
    this.burst(this.px, this.py, 10, "#ff4757", 240);
    sfx.hurt();
    if (this.hp <= 0) {
      if (this.legends.includes("L_rez") && !this.usedLegendRez) {
        this.usedLegendRez = true;
        this.hp = 1;
        this.invuln = 2.2;
        this.legendRezT = 5;                 // 5s of overwhelming power
        this.flash("#ffe066", 0.9);
        this.onToast("RESURRECTION — tear them apart!", "🕊️");
        this.addZone({ kind: "nova", x: this.px, y: this.py, r: 10, maxR: 520,
          life: 0.8, maxLife: 0.8, dmg: this.stats.maxHp * 2, color: "#ffe066",
          element: "none", hits: new Set(), angle: 0, tick: 0, friendly: true });
        sfx.win();
        this.pushUi();
        return;
      }
      const hasRevive = this.procs.some((p) => p.def.kind === "revive");
      if (hasRevive && !this.usedRevive) {
        this.usedRevive = true;
        this.hp = this.stats.maxHp * 0.6;
        this.invuln = 3;
        this.shieldHp = this.stats.maxHp * 0.3;
        this.flash("#ffe066", 0.8);
        this.onToast("Your gear refuses to let you fall!", "🕊️");
        sfx.win();
        this.pushUi();
        return;
      }
      if (this.revives > 0) {
        this.revives--;
        this.hp = this.stats.maxHp;
        this.invuln = 2.5;
        this.addZone({ kind: "nova", x: this.px, y: this.py, r: 10, maxR: 700, life: 0.7, maxLife: 0.7, dmg: 400, color: "#ffffff", element: "none", hits: new Set(), angle: 0, tick: 0, friendly: true });
        this.flash("#fff", 0.8); this.addShake(24);
        this.onToast("SECOND WIND!", "🕊️");
        sfx.win();
      } else {
        this.hp = 0;
        this.endRun(false);
      }
    }
    this.pushUi();
  }

  endRun(won: boolean) {
    sfx.stopBossMusic();
    // Clear every queued panel so nothing can reopen over the death screen.
    this.pendingBoon = false;
    this.pendingLegendTier = 0;
    this.pendingGunTier = -1;
    this.gunQueue = [];
    this.legendQueue = [];
    this.gateQueue = [];
    this.lootQueue = [];
    this.pendingLoot = null;
    this.pendingRoll = null;
    this.pendingLevels = 0;
    this.pendingActAdvance = false;
    this.survivalPending = false;
    this.onBoon(null); this.onLegend(null); this.onGun(null); this.onDefeat(null);
    this.onChoices([]); this.onLoot(null); this.onRoll(null);
    this.onWaifuGate([]); this.onSpoils(false); this.onRecruit(null);
    if (this.arenaBest > 0) {
      const prev = Number(localStorage.getItem("willy-arena-best") || 0);
      if (this.arenaBest > prev) localStorage.setItem("willy-arena-best", String(this.arenaBest));
    }
    this.state = won ? "win" : "gameover";
    this.meta.coins = this.coins;
    this.meta.best = [...this.meta.best, {
      name: localStorage.getItem("willy-name") || "WILLY",
      level: this.level, kills: this.kills, time: this.time, coins: this.runCoins,
      date: new Date().toLocaleDateString(),
    }].sort((a, b) => b.level - a.level || b.kills - a.kills).slice(0, 10);
    saveMeta(this.meta);
    if (!won) { this.addShake(24); sfx.lose(); }
    this.onEnd(won);
    this.pushUi();
  }

  // ================= weapons firing =================
  nearestEnemy(x: number, y: number, maxD = 900): Enemy | null {
    let best: Enemy | null = null, bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = d2(e.x, e.y, x, y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  spawnBullet(x: number, y: number, a: number, speed: number, dmg: number, r: number, color: string, el: Element, pierce: number, extra: Partial<Bullet> = {}) {
    // apply global projectile modifiers
    // Fast Draw is Andy's dedicated pierce line — one extra target per level.
    if (this.charId === "andy") pierce += this.mod("a_draw");
    pierce += this.char.basePierce ?? 0;                    // class identity
    const mp = this.mod("m_pierce");
    if (mp >= 4) pierce += 1;                               // maxed = always
    else if (mp && Math.random() < 0.3 * mp) pierce += 1;   // otherwise a chance
    const ms = this.mod("m_split");
    const mb = this.mod("m_bounce");
    const mg = this.mod("m_giant");
    if (mg) r *= 1 + 0.2 * mg;
    if (ms && !extra.split) extra = { ...extra, split: 2 };
    if (mb) extra = { ...extra, bounce: (extra.bounce || 0) + mb };
    if (this.bullets.length >= Game.MAX_BULLETS) this.bullets.shift();
    this.bullets.push({
      // hard ceiling so late-game projectiles never swallow the screen
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: Math.min(r, 13), dmg, life: 2.2 * this.stats.duration,
      pierce, hits: new Set(), color, element: el, hostile: false, bounce: 0, homing: 0, target: -1,
      boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0, pctHealth: 0, ...extra,
    });
  }

  /** Signature weapons are elementally neutral until you pick a path,
   *  then they adopt it so every character scales with their spec. */
  elementalise(def: WeaponDef): WeaponDef {
    if (def.element !== "none" || !this.elementPath) return def;
    const melee = def.behavior === "cone" || def.behavior === "swipe" || def.behavior === "lunge";
    // Melee classes are *defined* by elemental weapons — Blade Infusion (or
    // simply being Karl) carries the element through every strike.
    const infused = melee && (this.mod("d_infuse") > 0 || this.charId === "karl" || this.charId === "aidan");
    const sig = [this.char.weapon, "dogpoop"].includes(def.id);
    if (!sig && !infused) return def;
    const E = ELEMENTS[this.elementPath];
    if (!E) return def;                       // guard against an invalid path
    return { ...def, element: this.elementPath, color: E.color };
  }

  fireWeapon(rawDef: WeaponDef, level: number, origin?: { x: number; y: number }, dmgMul = 1, colorOverride?: string) {
    const def = this.elementalise(rawDef);
    // Good Boy — the dog's output scales hard with its own skill line
    const dogMod = this.mod("a_dog");
    if (dogMod && (def.id === "dogpoop" || def.id === "dogbite" || def.id === "dogpack")) dmgMul *= 1 + 0.3 * dogMod;
    const st = weaponStats(def, level);
    const dmg = st.dmg * this.stats.damage * dmgMul;
    const area = this.stats.area;
    const projArea = 1 + (this.stats.area - 1) * 0.25;   // bullets barely grow
    const melee = def.behavior === "cone" || def.behavior === "swipe" || def.behavior === "lunge";
    const count = st.count + (melee || def.behavior === "aura" || def.behavior === "nova" || def.behavior === "beam" ? 0 : this.bonusShots);
    const speed = st.speed * this.stats.projSpeed;
    const color = colorOverride || def.color;
    const ox = origin?.x ?? this.px, oy = origin?.y ?? this.py;
    const target = this.nearestEnemy(ox, oy, 1000);
    // Weapons you hold fire exactly where you point; allies still auto-target.
    const manual = !origin;
    const aimA = manual
      ? this.aim
      : target ? Math.atan2(target.y - oy, target.x - ox) : this.aim;
    const sup = st.super;

    switch (def.behavior) {
      case "serve": {
        for (let i = 0; i < count; i++) {
          const a = aimA + (i - (count - 1) / 2) * 0.1 + rand(-0.02, 0.02);
          this.spawnBullet(ox, oy, a, speed, dmg, st.radius * projArea, color, def.element, st.pierce,
            sup ? { split: 3, explode: 0 } : {});
        }
        sfx.pong();
        break;
      }
      case "spread": {
        const spread = 0.16;
        for (let i = 0; i < count; i++) {
          const a = aimA + (i - (count - 1) / 2) * spread;
          this.spawnBullet(ox, oy, a, speed, dmg, st.radius * projArea, color, def.element, st.pierce,
            sup ? { explode: 58 * area } : {});
        }
        sfx.pong();
        break;
      }
      case "shuriken": {
        for (let i = 0; i < count; i++) {
          const a = aimA + (i - (count - 1) / 2) * 0.5;
          this.spawnBullet(ox, oy, a, speed, dmg, st.radius * projArea, color, def.element, st.pierce,
            { bounce: sup ? 12 : 3, spin: 1, explode: sup ? 54 * area : 0 });
        }
        sfx.pong();
        break;
      }
      case "homing": {
        for (let i = 0; i < count; i++) {
          const a = aimA + rand(-1, 1);
          this.spawnBullet(ox, oy, a, speed * 0.8, dmg, st.radius * projArea, color, def.element, 0,
            { homing: 4.5, explode: 46 * area, split: sup ? 2 : 0 });
        }
        sfx.pong();
        break;
      }
      case "boomerang": {
        for (let i = 0; i < count; i++) {
          const a = aimA + (i - (count - 1) / 2) * 0.55;
          this.spawnBullet(ox, oy, a, speed, dmg, st.radius * projArea, color, def.element, 99,
            { boomerang: 1, spin: 1, life: 2.4 * this.stats.duration, split: sup ? 2 : 0 });
        }
        sfx.smash();
        break;
      }
      case "chain": {
        if (!target) break;
        let cur = target, prevX = ox, prevY = oy;
        const jumps = (count + st.pierce) * (sup ? 2 : 1);
        const hit = new Set<number>();
        for (let i = 0; i < jumps; i++) {
          this.bolt(prevX, prevY, cur.x, cur.y, color);
          this.hitEnemy(cur, dmg * Math.pow(sup ? 0.95 : 0.88, i), def.element, Math.atan2(cur.y - prevY, cur.x - prevX), 0, true, false);
          if (sup) cur.stun = Math.max(cur.stun || 0, 0.5);
          hit.add(cur.id);
          prevX = cur.x; prevY = cur.y;
          let next: Enemy | null = null, bd = 260 * 260 * area;
          for (const e of this.enemies) {
            if (e.hp <= 0 || hit.has(e.id)) continue;
            const d = d2(e.x, e.y, prevX, prevY);
            if (d < bd) { bd = d; next = e; }
          }
          if (!next) break;
          cur = next;
        }
        this.addShake(2);
        sfx.hit();
        break;
      }
      case "orbit": {
        break; // handled continuously
      }
      case "aura": {
        this.addZone({ kind: "aura", x: ox, y: oy, r: st.radius * area, maxR: st.radius * area, life: st.cd + 0.06, maxLife: st.cd + 0.06, dmg, color, element: def.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
        break;
      }
      case "nova": {
        for (let i = 0; i < count; i++) {
          this.later(() => {
            if (this.state !== "playing") return;
            this.addZone({ kind: "nova", x: this.px, y: this.py, r: 14, maxR: st.radius * area * 2.4, life: 0.55, maxLife: 0.55, dmg, color, element: def.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
          }, i * 140);
        }
        this.addShake(4);
        sfx.smash();
        break;
      }
      case "mine": {
        for (let i = 0; i < count; i++)
          this.addZone({ kind: "mine", x: ox + rand(-24, 24), y: oy + rand(-24, 24), r: 12, maxR: st.radius * area, life: 9 * this.stats.duration, maxLife: 9, dmg, color, element: def.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
        break;
      }
      case "meteor": {
        for (let i = 0; i < count; i++) {
          // "aimed" meteors (e.g. Karl's axe kick) land where you're facing
          let tx: number, ty: number;
          if (def.aimed) {
            const reach = st.radius * area * 1.5;
            const spread = count > 1 ? (i - (count - 1) / 2) * 0.35 : 0;
            tx = ox + Math.cos(aimA + spread) * reach;
            ty = oy + Math.sin(aimA + spread) * reach;
          } else {
            const t = this.enemies.length ? pick(this.enemies) : null;
            tx = t ? t.x + rand(-60, 60) : ox + rand(-220, 220);
            ty = t ? t.y + rand(-60, 60) : oy + rand(-220, 220);
          }
          this.addZone({ kind: "warn", x: tx, y: ty, r: st.radius * area, maxR: st.radius * area, life: 0.65, maxLife: 0.65, dmg, color: "#6dff9a", element: def.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
        }
        break;
      }
      case "blackhole": {
        const t = target || { x: ox + Math.cos(this.aim) * 200, y: oy + Math.sin(this.aim) * 200 };
        this.addZone({ kind: "hole", x: t.x, y: t.y, r: st.radius * area, maxR: st.radius * area, life: 3.4 * this.stats.duration, maxLife: 3.4, dmg, color, element: def.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
        this.addShake(6);
        sfx.smash();
        break;
      }
      case "beam": {
        for (let i = 0; i < count; i++)
          this.addZone({ kind: "beam", x: ox, y: oy, r: st.radius * area, maxR: 900, life: 0.5 * this.stats.duration, maxLife: 0.5, dmg, color, element: def.element, hits: new Set(), angle: aimA + i * 0.9, tick: 0, friendly: true });
        this.addShake(5);
        sfx.smash();
        break;
      }
      case "cone": {
        // A punch/thrust you must aim. Area makes it LONGER and WIDER.
        const reach = st.radius * area;
        const arc = (0.62 + this.stats.area * 0.14) * (def.id === "shockpalm" ? 0.55 : 1);
        this.addZone({ kind: "cone", x: ox, y: oy, r: reach, maxR: reach, life: 0.2, maxLife: 0.2,
          dmg, color, element: def.element, hits: new Set(), angle: aimA, tick: 0,
          friendly: true, arc, knock: 260 + this.knockback * 140 });
        this.meleeFx = 0.2; this.meleeDir = aimA; this.meleeAlt *= -1;
        sfx.smash();
        break;
      }
      case "swipe": {
        // Sweeping arc — wide, but still a direction you choose.
        const reach = st.radius * area;
        const arc = def.id === "spinkick" ? TAU : 1.9 + this.stats.area * 0.25;
        this.addZone({ kind: "swipe", x: ox, y: oy, r: reach, maxR: reach, life: 0.3, maxLife: 0.3,
          dmg, color, element: def.element, hits: new Set(), angle: aimA, tick: 0,
          friendly: true, arc, knock: 300 + this.knockback * 150 });
        this.meleeFx = 0.3; this.meleeDir = aimA; this.meleeAlt *= -1;
        const fol = this.mod("d_cleaveall");
        if (fol) this.later(() => {
          if (!this.running) return;
          this.addZone({ kind: "swipe", x: this.px, y: this.py, r: reach * 0.9, maxR: reach * 0.9,
            life: 0.28, maxLife: 0.28, dmg: dmg * 0.4 * fol, color, element: def.element,
            hits: new Set(), angle: aimA + 0.5, tick: 0, friendly: true, arc, knock: 200 });
        }, 180);
        sfx.smash();
        break;
      }
      case "lunge": {
        // Dash through the crowd. One immediate sweep along the path beats
        // spawning a trail of zones — far cheaper and lands instantly.
        const dist = st.radius * 4 * (0.8 + area * 0.2);
        this.pvx = Math.cos(aimA) * speed;
        this.pvy = Math.sin(aimA) * speed;
        this.invuln = Math.max(this.invuln, 0.3);
        const hw = st.radius * area * 0.9;                 // corridor half-width
        const cos = Math.cos(aimA), sin = Math.sin(aimA);
        for (const en of this.enemies) {
          if (en.hp <= 0) continue;
          const rx = en.x - ox, ry = en.y - oy;
          const along = rx * cos + ry * sin;               // projection onto the dash
          if (along < -en.r || along > dist + en.r) continue;
          const perp = Math.abs(-rx * sin + ry * cos);     // distance from the line
          if (perp > hw + en.r) continue;
          this.hitEnemy(en, dmg, def.element, aimA, 320 + this.knockback * 160);
        }
        this.meleeFx = 0.25; this.meleeDir = aimA; this.meleeAlt *= -1;
        // a few visual pops along the path (no collision cost)
        for (let i = 1; i <= 4; i++) {
          const lx = ox + cos * (dist / 4) * i, ly = oy + sin * (dist / 4) * i;
          this.ring(lx, ly, color, hw * 0.5);
        }
        this.burst(ox, oy, 10, color, 260, "smoke");
        sfx.smash();
        break;
      }
      case "radial": {
        // Every direction at once.
        const n = count;
        const off = Math.random() * TAU;
        for (let i = 0; i < n; i++) {
          this.spawnBullet(ox, oy, off + (i / n) * TAU, speed, dmg, st.radius * projArea,
            color, def.element, st.pierce, sup ? { split: 2 } : {});
        }
        sfx.pong();
        break;
      }
      case "turret": {
        for (let i = 0; i < count; i++)
          this.turrets.push({ x: ox + rand(-36, 36), y: oy + rand(-36, 36), life: 11 * this.stats.duration, cd: 0, dmg, color, shots: 0 });
        sfx.pickup();
        break;
      }
    }
  }

  updateOrbitals(dt: number) {
    // player orbit weapon
    const list: { key: string; def: WeaponDef; level: number; dmgMul: number; color?: string }[] = [];
    const ow = this.weapons.find((w) => WEAPON_BY_ID[w.id].behavior === "orbit");
    if (ow) list.push({ key: ow.id, def: WEAPON_BY_ID[ow.id], level: ow.level, dmgMul: 1 });
    if (this.waifu) {
      const wd = WAIFU_BY_ID[this.waifu.id];
      if (wd.behavior === "orbit") list.push({ key: `waifu_${wd.id}`, def: waifuAsWeapon(wd), level: this.waifu.level, dmgMul: 1, color: wd.color });
    }
    const keep = new Set(list.map((l) => l.key));
    for (const k of Array.from(this.orbitals.keys())) if (!keep.has(k)) this.orbitals.delete(k);

    for (const l of list) {
      const st = weaponStats(l.def, l.level);
      const n = st.count + this.bonusShots;
      let arr = this.orbitals.get(l.key);
      if (!arr || arr.length !== n) {
        arr = Array.from({ length: n }, (_, i) => ({
          angle: (i / n) * TAU, r: st.radius * this.stats.area, size: 15 + l.level,
          dmg: st.dmg * this.stats.damage * l.dmgMul, color: l.color || l.def.color, element: l.def.element, hitCd: new Map<number, number>(),
        }));
        this.orbitals.set(l.key, arr);
      }
      const spin = l.def.speed * (1 + this.hasteNow * 0.12) * dt;
      for (const o of arr) {
        o.angle += spin;
        o.r = st.radius * this.stats.area;
        o.dmg = st.dmg * this.stats.damage * l.dmgMul;
        const ox = this.px + Math.cos(o.angle) * o.r, oy = this.py + Math.sin(o.angle) * o.r;
        for (const [k, v] of o.hitCd) { const nv = v - dt; if (nv <= 0) o.hitCd.delete(k); else o.hitCd.set(k, nv); }
        for (const e of this.enemies) {
          if (e.hp <= 0 || o.hitCd.has(e.id)) continue;
          if (d2(e.x, e.y, ox, oy) < (e.r + o.size) ** 2) {
            o.hitCd.set(e.id, 0.35);
            this.hitEnemy(e, o.dmg, o.element, Math.atan2(e.y - this.py, e.x - this.px), 160, true, false);
          }
        }
      }
    }
  }

  // ================= update =================
  inputX() {
    let x = 0;
    if (this.keys["a"] || this.keys["arrowleft"]) x -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) x += 1;
    if (this.stick.active) x += clamp((this.stick.x - this.stick.ox) / 50, -1, 1);
    return clamp(x, -1, 1);
  }
  inputY() {
    let y = 0;
    if (this.keys["w"] || this.keys["arrowup"]) y -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) y += 1;
    if (this.stick.active) y += clamp((this.stick.y - this.stick.oy) / 50, -1, 1);
    return clamp(y, -1, 1);
  }

  loop(now: number) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.2; }
    if (this.state === "playing") this.update(dt);
    else {
      this.updateParticles(dt);
      this.shake = 0; this.flashA *= 0.9;
      if (this.state === "menu") {
        this.time += dt;
        this.camx = WORLD / 2 + Math.cos(this.time * 0.07) * 900;
        this.camy = WORLD / 2 + Math.sin(this.time * 0.09) * 900;
      }
    }
    this.render();
    this.uiT += dt;
    if (this.uiT > 0.08) { this.uiT = 0; if (this.state === "playing") this.pushUi(); }
  }

  update(dt: number) {
    this.time += dt;
    this.invuln -= dt;
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.2);
    this.slowMoT = Math.max(0, this.slowMoT - dt);
    this.bossIntro = Math.max(0, this.bossIntro - dt);
    this.cineT = Math.max(0, this.cineT - dt);
    this.gateWarn = Math.max(0, this.gateWarn - dt);
    this.recruitFx = Math.max(0, this.recruitFx - dt);
    this.dpsWindow += dt;
    if (this.dpsWindow > 0.5) { this.dps = this.dmgAccum / this.dpsWindow; this.dmgAccum = 0; this.dpsWindow = 0; }

    if (this.hp < this.stats.maxHp) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);
    for (const a of this.actives) a.cd = Math.max(0, a.cd - dt);

    // movement
    const ix = this.inputX(), iy = this.inputY();
    const m = Math.hypot(ix, iy);
    const sp = 232 * this.stats.moveSpeed;
    if (m > 0.08) {
      this.pvx = lerp(this.pvx, (ix / m) * sp * Math.min(1, m), 1 - Math.pow(0.0006, dt));
      this.pvy = lerp(this.pvy, (iy / m) * sp * Math.min(1, m), 1 - Math.pow(0.0006, dt));
      this.bob += dt * 13;
      this.face = Math.atan2(iy, ix);
    } else {
      this.pvx *= Math.pow(0.0012, dt); this.pvy *= Math.pow(0.0012, dt);
    }
    const nx = this.px + this.pvx * dt, ny = this.py + this.pvy * dt;
    const rp = this.resolve(nx, ny, this.pr);
    if (rp.x !== nx) this.pvx *= 0.25;
    if (rp.y !== ny) this.pvy *= 0.25;
    this.px = rp.x; this.py = rp.y;

    // Manual aim: you shoot wherever the cursor is. No auto-targeting.
    if (this.aimStick.active) {
      const dx = this.aimStick.x - this.aimStick.ox, dy = this.aimStick.y - this.aimStick.oy;
      if (Math.hypot(dx, dy) > 8) this.aim = Math.atan2(dy, dx);
    } else if (this.hasMouse && !this.touch) {
      const wx = this.camx + (this.mouseX - this.vw / 2) / this.zoom;
      const wy = this.camy + (this.mouseY - this.vh / 2) / this.zoom;
      this.aim = Math.atan2(wy - this.py, wx - this.px);
    } else if (m > 0.1) this.aim = this.face;

    // momentum (Item effect "swift")
    this.momentum = clamp(this.momentum + (m > 0.1 ? dt * 0.7 : -dt * 2), 0, 1);
    this.comboT = Math.max(0, this.comboT - dt);
    this.meleeFx = Math.max(0, this.meleeFx - dt);
    this.killBudget = 40;        // per-frame cascade allowance
    // Ambient status-effect motes (burn/decay trails) share one small budget
    // so a screen full of DoTs can't each spawn their own particles.
    this.fxBudget = 14;
    this.leechLock = Math.max(0, this.leechLock - dt);
    this.eliteT = Math.max(0, this.eliteT - dt);
    this.pullCd = Math.max(0, this.pullCd - dt);
    for (const k in this.elemCd) this.elemCd[k] = Math.max(0, this.elemCd[k] - dt);
    if (this.hasElite("e_adrenaline") && this.eliteT <= 0 && this.hp < this.stats.maxHp * 0.3) {
      this.eliteT = 60;
      this.hp = this.stats.maxHp;
      this.flash("#7dffb8", 0.5);
      this.onToast("ADRENALINE — full recovery", "💉");
      sfx.upgrade();
    }
    if (this.hasElite("e_fortress")) {
      if (this.momentum < 0.05) {
        this.stillT += dt;
        if (this.stillT > 2) { this.stillT = -4; this.shieldHp = Math.max(this.shieldHp, this.stats.maxHp * 0.25); this.ring(this.px, this.py, "#9fd7ff", 34); }
      } else this.stillT = Math.min(this.stillT, 0);
    }
    this.rampT = Math.max(0, this.rampT - dt);
    if (this.rampT <= 0 && this.rampStacks > 0) { this.rampStacks = 0; this.recalcStats(); }
    this.legendRezT = Math.max(0, this.legendRezT - dt);
    if (this.legends.includes("L_bulwark")) {
      this.bulwarkT -= dt;
      if (this.bulwarkT <= 0) {
        this.bulwarkT = 8;
        this.shieldHp = Math.max(this.shieldHp, this.stats.maxHp * 0.2);
        this.ring(this.px, this.py, "#9fd7ff", 34);
      }
    }
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    if (this.frenzyT <= 0 && this.frenzy > 0) this.frenzy = 0;
    if (this.comboT <= 0) this.comboStacks = 0;
    if (this.effects.has("firetrail") && Math.random() < dt * 6 && m > 0.2) {
      this.addZone({ kind: "mine", x: this.px, y: this.py, r: 10, maxR: 54, life: 2.2, maxLife: 2.2,
        dmg: 10 * this.stats.damage, color: "#ff8f3c", element: "fire", hits: new Set(), angle: 0, tick: 0, friendly: true, data: 9 });
    }
    if (this.effects.has("frostaura")) {
      for (const e of this.enemies) {
        if (e.hp > 0 && d2(e.x, e.y, this.px, this.py) < 110 * 110) e.slow = Math.max(e.slow, 0.5);
      }
    }

    // weapons
    for (const w of this.weapons) {
      const def = WEAPON_BY_ID[w.id];
      if (!def || def.behavior === "orbit") continue;
      if (def.id === "dogpoop" && !this.char.pet) continue;
      const st = weaponStats(def, w.level);
      this.weaponTimers[w.id] = (this.weaponTimers[w.id] ?? 0) - dt * this.hasteNow;
      if (this.weaponTimers[w.id] <= 0) {
        this.weaponTimers[w.id] = st.cd;
        const atDog = def.id === "dogpoop";
        const origin = atDog ? { x: this.dog.x, y: this.dog.y } : undefined;
        this.fireWeapon(def, w.level, origin);
        // Double Tap — a chance to immediately fire again
        if (this.legends.includes("L_echo") && Math.random() < 0.2)
          this.later(() => { if (this.running) this.fireWeapon(def, w.level, origin); }, 70);
        const dbl = this.mod("m_double");
        if (dbl && Math.random() < 0.25 * dbl)
          this.later(() => { if (this.state === "playing") this.fireWeapon(def, w.level, origin); }, 90);
      }
    }
    this.updateOrbitals(dt);

    this.updateProcs(dt);
    this.updateGuns(dt);
    this.updateDog(dt);
    this.updateWaifu(dt);

    this.updateEnemies(dt);
    this.rebuildEnemyHash();
    this.updateBullets(dt);
    this.updateZones(dt);
    this.updateTurrets(dt);
    this.updateGems(dt);
    this.updateParticles(dt);
    this.updateDirector(dt);
    this.updateQuest(dt);
    this.updateChests(dt);

    // camera — during a milestone cinematic it drifts onto the boss
    const k = 1 - Math.pow(0.0001, dt);
    if (this.cineT > 0) {
      const ck = 1 - Math.pow(0.0025, dt);
      this.camx = lerp(this.camx, (this.px + this.cineX * 2) / 3, ck);
      this.camy = lerp(this.camy, (this.py + this.cineY * 2) / 3, ck);
    } else {
      this.camx = lerp(this.camx, this.px + this.pvx * 0.12, k);
      this.camy = lerp(this.camy, this.py + this.pvy * 0.12, k);
    }
    this.shake = 0; this.sx = 0; this.sy = 0;
    this.flashA *= Math.pow(0.003, dt);


  }

  updateDirector(dt: number) {
    // Never spawn while the player still owes level-up / waifu / loot choices.
    if (this.pendingLevels > 0 || this.gateQueue.length > 0
        || this.lootQueue.length > 0 || this.survivalPending) return;
    if (this.inArena) {
      // The Colosseum spawns NO trash mobs — every combatant is a named
      // champion placed by startArenaWave(). This only acts as a watchdog
      // in case a wave somehow fails to populate.
      if (!this.bosses.length && this.state === "playing"
          && !this.pendingActAdvance && !this.arenaPendingAfter) {
        this.arenaIdle += dt;
        if (this.arenaIdle > 4) { this.arenaIdle = 0; this.startArenaWave(); }
      } else this.arenaIdle = 0;
      return;
    }
    if (this.actCleared) return;        // floor cleared — nothing more spawns
    const lvl = this.level;
    this.bossRest = Math.max(0, this.bossRest - dt);
    // Breathing room right after a boss dies, then the grind ramps back up.
    const calm = this.bossRest > 0 ? 2.6 : 1;
    const rate = clamp(0.95 - lvl * 0.009, 0.05, 0.95) * calm;
    const cap = Math.min(340, 34 + lvl * 4.2) / (this.bossRest > 0 ? 2.6 : 1);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = rate * rand(0.7, 1.3);
      if (this.enemies.length < cap) {
        const burst = 3 + Math.floor(lvl / 7) + (Math.random() < 0.16 ? 8 : 0);
        for (let i = 0; i < burst; i++) this.spawnEnemy();
      }
    }
    // periodic pressure waves so it never settles into a lull
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = rand(16, 26);
      if (this.bossRest <= 0 && this.enemies.length < cap * 0.9) {
        const n = 8 + Math.floor(lvl * 0.7);
        for (let i = 0; i < n; i++) this.spawnEnemy(Math.random() < 0.4);
        if (lvl > 10) this.onToast("A mob is closing in!", "⚠️");
      }
    }
    // Late game: keep feeding the escort while a guarded boss is on the field.
    if (this.bosses.some((b) => (b.guard || 0) > 0) && this.enemies.length < cap) {
      if (Math.random() < dt * 2.2) this.spawnEnemy(true);
    }
  }

  updateQuest(dt: number) {
    if (this.inArena) return;          // no quests in the arena
    if (!this.quest) {
      this.questCooldown -= dt;
      if (this.questCooldown <= 0 && this.level >= 2) this.makeQuest();
      return;
    }
    const q = this.quest;
    const inside = d2(this.px, this.py, q.x, q.y) < q.radius * q.radius;
    if (q.kind === "reach") {
      if (inside) this.completeQuest();
    } else if (q.kind === "survive") {
      if (inside) {
        q.progress += dt;
        if (Math.random() < dt * 2.2) this.spawnEnemy(true);
        if (q.progress >= q.goal) this.completeQuest();
      } else q.progress = Math.max(0, q.progress - dt * 0.5);
    }
  }

  /** Negative Andy's dog: trots alongside and returns fire, biologically. */
  updateDog(dt: number) {
    if (!this.char.pet) return;
    const d = this.dog;
    d.t += dt;
    d.lungeT = Math.max(0, (d.lungeT || 0) - dt);
    d.barkCd = Math.max(0, (d.barkCd || 0) - dt);
    d.howlCd = Math.max(0, (d.howlCd || 0) - dt);
    d.shotCd = Math.max(0, (d.shotCd || 0) - dt);
    this.dogHowlT = Math.max(0, this.dogHowlT - dt);

    const bite = this.mod("a_dog");            // Good Boy investment
    const target = this.nearestEnemy(d.x, d.y, 520);

    // ---- movement: lunge at whatever is closest, else heel ----
    if ((d.lungeT || 0) > 0) {
      const r = this.resolve(d.x + d.vx * dt, d.y + d.vy * dt, 10);
      d.x = r.x; d.y = r.y;
      d.vx *= Math.pow(0.08, dt); d.vy *= Math.pow(0.08, dt);
      // maul anything he passes through
      for (const e of this.enemies) {
        if (e.hp <= 0 || d.hits.has(e.id)) continue;
        if (d2(e.x, e.y, d.x, d.y) < (e.r + 22) ** 2) {
          d.hits.add(e.id);
          const maul = this.mod("a_maul");
          this.hitEnemy(e, (26 + this.level * 1.6) * (1 + bite * 0.3 + maul * 0.25) * this.stats.damage,
            (this.elementPath as Element) || "none", Math.atan2(e.y - d.y, e.x - d.x), 260, true, false);
          if (maul) { e.burn = Math.max(e.burn, 2.4); e.burnDmg = Math.max(e.burnDmg, 6 * maul + this.level * 0.4); }
        }
      }
    } else if (target && d2(target.x, target.y, this.px, this.py) < 420 * 420) {
      // close in on the target
      const ang = Math.atan2(target.y - d.y, target.x - d.x);
      const want = 34;
      const dist = Math.hypot(target.x - d.x, target.y - d.y);
      if (dist > want) {
        const sp = 330 * (1 + bite * 0.08);
        const r = this.resolve(d.x + Math.cos(ang) * sp * dt, d.y + Math.sin(ang) * sp * dt, 10);
        d.x = r.x; d.y = r.y;
      }
      d.face = ang;
      // launch a lunge when lined up
      if ((d.lungeCd || 0) <= 0 && dist < 240) {
        d.lungeCd = Math.max(1.1, 2.4 - bite * 0.22);
        d.lungeT = 0.34;
        d.hits = new Set();
        d.vx = Math.cos(ang) * 780; d.vy = Math.sin(ang) * 780;
        this.burst(d.x, d.y, 8, "#f2ece0", 200, "smoke");
      }
    } else {
      // heel beside Andy
      const tx = this.px - Math.cos(this.face) * 46 + Math.cos(d.t * 1.3) * 14;
      const ty = this.py - Math.sin(this.face) * 46 + Math.sin(d.t * 1.1) * 14;
      const dist = Math.hypot(tx - d.x, ty - d.y);
      if (dist > 3) {
        const sp = clamp(dist * 4.6, 0, 520);
        const r = this.resolve(d.x + ((tx - d.x) / dist) * sp * dt, d.y + ((ty - d.y) / dist) * sp * dt, 10);
        d.x = r.x; d.y = r.y;
      }
      if (target) d.face = Math.atan2(target.y - d.y, target.x - d.x);
    }
    d.lungeCd = Math.max(0, (d.lungeCd || 0) - dt);
    if (d2(d.x, d.y, this.px, this.py) > 420 * 420) { d.x = this.px; d.y = this.py; }

    // ---- constant ranged fire, independent of Andy's weapons ----
    if (target) {
      d.shotCd = (d.shotCd || 0);
      if (d.shotCd <= 0) {
        d.shotCd = Math.max(0.22, 0.75 - bite * 0.07) / this.hasteNow;
        const a = Math.atan2(target.y - d.y, target.x - d.x) + rand(-0.06, 0.06);
        this.spawnBullet(d.x, d.y, a, 560,
          (14 + this.level * 0.9) * (1 + bite * 0.3) * this.stats.damage,
          6, "#a98457", (this.elementPath as Element) || "none", 0);
      }
    }

    // ---- BARK: short cone that staggers anything in front ----
    if (this.mod("a_bark") && (d.barkCd || 0) <= 0 && target
        && d2(target.x, target.y, d.x, d.y) < 150 * 150) {
      const lv = this.mod("a_bark");
      d.barkCd = Math.max(2.4, 5 - lv * 0.5);
      this.addZone({ kind: "cone", x: d.x, y: d.y, r: 150, maxR: 150, life: 0.22, maxLife: 0.22,
        dmg: (20 + this.level * 1.2) * lv * this.stats.damage, color: "#ffe9a8",
        element: (this.elementPath as Element) || "none", hits: new Set(),
        angle: d.face, tick: 0, friendly: true, arc: 1.1, knock: 420 });
      for (const e of this.enemies) {
        if (e.hp > 0 && d2(e.x, e.y, d.x, d.y) < 150 * 150) e.stun = Math.max(e.stun || 0, 0.35 + lv * 0.08);
      }
      this.ring(d.x, d.y, "#ffe9a8", 26);
      sfx.hit();
    }

    // ---- HOWL: buffs Andy ----
    if (this.mod("a_howl") && (d.howlCd || 0) <= 0) {
      const lv = this.mod("a_howl");
      d.howlCd = Math.max(8, 16 - lv * 1.4);
      this.dogHowlT = 5 + lv;
      this.procHaste = Math.max(this.procHaste, this.dogHowlT);
      this.empowerMul = Math.max(this.empowerMul, 1 + 0.12 * lv);
      this.empowerT = Math.max(this.empowerT, this.dogHowlT);
      this.onToast("The dog howls — you feel it", "🐺");
      for (let i = 0; i < 3; i++)
        this.later(() => this.ring(d.x, d.y, "#cfe9ff", 30 + i * 22), i * 110);
      sfx.bossExposed();
    }
  }

  // ================= companion =================
  updateWaifu(dt: number) {
    if (!this.waifu) return;
    const wd = WAIFU_BY_ID[this.waifu.id];
    const lv = this.waifu.level;
    const power = 1 + (lv - 1) * 0.3;          // she scales with her own level
    this.waifuAnim += dt;
    this.waifuSwing = Math.max(0, this.waifuSwing - dt);
    this.waifuCastFx = Math.max(0, this.waifuCastFx - dt);
    this.rallyMark = Math.max(0, this.rallyMark - dt);
    this.waifuHaste = Math.max(0, this.waifuHaste - dt);

    // --- follow, but break off to engage nearby threats
    const threat = this.nearestEnemy(this.waifuX, this.waifuY, 190);
    let tx: number, ty: number;
    if (threat && wd.melee) {
      // step into melee range of the threat, staying near you
      const ang = Math.atan2(threat.y - this.waifuY, threat.x - this.waifuX);
      tx = threat.x - Math.cos(ang) * (wd.melee.range * 0.55);
      ty = threat.y - Math.sin(ang) * (wd.melee.range * 0.55);
      if (d2(tx, ty, this.px, this.py) > 260 * 260) {
        tx = this.px - Math.cos(this.face) * 52; ty = this.py - Math.sin(this.face) * 52;
      }
    } else {
      tx = this.px - Math.cos(this.face) * 52;
      ty = this.py - Math.sin(this.face) * 52;
    }
    const d = Math.hypot(tx - this.waifuX, ty - this.waifuY);
    if (d > 3) {
      const sp = clamp(d * 4.4, 0, 460);
      const wr = this.resolve(this.waifuX + ((tx - this.waifuX) / d) * sp * dt,
                              this.waifuY + ((ty - this.waifuY) / d) * sp * dt, 13);
      this.waifuX = wr.x; this.waifuY = wr.y;
    }
    if (d2(this.waifuX, this.waifuY, this.px, this.py) > 300 * 300) { this.waifuX = this.px; this.waifuY = this.py; }
    const look = threat || this.nearestEnemy(this.waifuX, this.waifuY, 700);
    if (look) this.waifuFace = Math.atan2(look.y - this.waifuY, look.x - this.waifuX);

    // --- main weapon
    if (wd.behavior !== "orbit") {
      this.waifuTimer -= dt * this.hasteNow;
      if (this.waifuTimer <= 0) {
        this.waifuTimer = wd.cd / (1 + (lv - 1) * 0.18);
        this.fireWeapon(waifuAsWeapon(wd), lv, { x: this.waifuX, y: this.waifuY }, 1, wd.color);
      }
    }

    // --- sidearm (a genuine second gun on its own timer)
    if (wd.sidearm) {
      this.waifuSideTimer -= dt * this.hasteNow;
      if (this.waifuSideTimer <= 0) {
        this.waifuSideTimer = wd.sidearm.cd / (1 + (lv - 1) * 0.15);
        const sa = wd.sidearm;
        const def: WeaponDef = {
          id: `side_${wd.id}`, name: sa.name, jp: "", icon: "", desc: "",
          behavior: sa.behavior, element: sa.element, color: sa.color, maxLevel: 5,
          cd: sa.cd, cdPer: 0, dmg: sa.dmg * power, dmgPer: 0,
          count: sa.count, countEvery: 99, speed: sa.speed, radius: 5, pierce: 1, piercePer: 0,
        };
        this.fireWeapon(def, 1, { x: this.waifuX, y: this.waifuY }, 1, sa.color);
      }
    }

    // --- melee swipe when anything is in her face
    if (wd.melee) {
      this.waifuMeleeTimer -= dt;
      if (this.waifuMeleeTimer <= 0) {
        const m = wd.melee;
        const victims = this.enemies.filter((e) =>
          e.hp > 0 && d2(e.x, e.y, this.waifuX, this.waifuY) < (m.range + e.r) ** 2);
        if (victims.length) {
          this.waifuMeleeTimer = m.cd;
          this.waifuSwing = 0.26;
          this.waifuSwingDir *= -1;
          const dmg = m.dmg * power * this.stats.damage * 0.75;
          for (const e of victims) {
            const a = Math.atan2(e.y - this.waifuY, e.x - this.waifuX);
            const diff = Math.abs(((a - this.waifuFace + Math.PI * 3) % TAU) - Math.PI);
            if (m.arc < 6 && diff > m.arc / 2) continue;
            this.hitEnemy(e, dmg, wd.element, a, m.knock, true, false);
          }
          // visual arc
          this.particles.push({
            x: this.waifuX, y: this.waifuY, vx: 0, vy: 0, life: 0.22, max: 0.22,
            size: m.range * 0.5, color: wd.color, kind: "ring",
          });
          sfx.smash();
        } else this.waifuMeleeTimer = 0.18;
      }
    }

    // --- signature cast
    if (wd.cast) {
      this.waifuCastTimer -= dt * (2 - this.stats.cdr);
      if (this.waifuCastTimer <= 0) {
        this.waifuCastTimer = wd.cast.cd / (1 + (lv - 1) * 0.12);
        this.waifuCast(wd, lv, power);
      }
    }

    // --- shadow clones (Aoi)
    for (let i = this.waifuClones.length - 1; i >= 0; i--) {
      const c = this.waifuClones[i];
      c.life -= dt;
      if (c.life <= 0) { this.burst(c.x, c.y, 8, wd.color, 180, "smoke"); this.waifuClones.splice(i, 1); continue; }
      const ca = this.waifuAnim * 1.6 + i * Math.PI;
      const ctx2 = this.px + Math.cos(ca) * 74, cty = this.py + Math.sin(ca) * 74;
      c.x = lerp(c.x, ctx2, 1 - Math.pow(0.004, dt));
      c.y = lerp(c.y, cty, 1 - Math.pow(0.004, dt));
      c.cd -= dt;
      if (c.cd <= 0) {
        const t = this.nearestEnemy(c.x, c.y, 460);
        if (t) {
          c.cd = 0.55;
          const a = Math.atan2(t.y - c.y, t.x - c.x);
          this.spawnBullet(c.x, c.y, a, 640, 26 * power * this.stats.damage, 5, wd.color, wd.element, 1);
        } else c.cd = 0.25;
      }
    }

    // ---- automatic partner aura (no coins, no clicking) ----
    this.auraFx = Math.max(0, this.auraFx - dt);
    this.waifuCritT = Math.max(0, this.waifuCritT - dt);
    this.waifuArmorT = Math.max(0, this.waifuArmorT - dt);
    this.waifuSpeedT = Math.max(0, this.waifuSpeedT - dt);
    this.auraT -= dt;
    if (this.auraT <= 0) {
      // higher partner levels tighten the interval
      this.auraT = wd.aura.every / (1 + (lv - 1) * 0.12);
      this.fireAura(wd, lv);
    }

    // passive trickle heal from Yuki
    if (wd.id === "yuki" && this.hp < this.stats.maxHp)
      this.hp = Math.min(this.stats.maxHp, this.hp + 0.9 * lv * dt);
  }


  /** The partner's signature support aura. Fires on its own timer. */
  fireAura(wd: WaifuDef, lv: number) {
    const k = 1 + (lv - 1) * 0.35;
    this.auraFx = 0.8;
    this.ring(this.waifuX, this.waifuY, wd.color, 40);
    this.ring(this.px, this.py, wd.color, 30);
    switch (wd.id) {
      case "yuki":
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.07 * k);
        this.txt(this.px, this.py - 42, "+HEAL", "#8fe6ff", 14); break;
      case "momo":
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.10 * k);
        this.invuln = Math.max(this.invuln, 0.6);
        this.txt(this.px, this.py - 42, "BLESSED", "#ff8fd0", 15); break;
      case "hina": case "nanami": case "ayaka":
        this.empowerMul = Math.max(this.empowerMul, 1 + (wd.id === "ayaka" ? 0.40 : wd.id === "nanami" ? 0.35 : 0.25) * k);
        this.empowerT = Math.max(this.empowerT, 6); break;
      case "chiyo":
        this.procHaste = Math.max(this.procHaste, 5);
        this.waifuHaste = Math.max(this.waifuHaste, 5); break;
      case "aoi":
        this.waifuCritT = 6; break;
      case "mio":
        this.waifuArmorT = 6; break;
      case "sakura":
        this.shieldHp = Math.max(this.shieldHp, this.stats.maxHp * 0.14 * k); break;
      case "rin":
        this.waifuSpeedT = 6;
        this.shieldHp = Math.max(this.shieldHp, this.stats.maxHp * 0.12 * k); break;
      case "rei":
        for (const e of this.enemies)
          if (e.hp > 0 && d2(e.x, e.y, this.px, this.py) < 360 * 360) e.marked = 6; break;
      case "kaede":
        for (const e of this.enemies) {
          if (e.hp <= 0 || d2(e.x, e.y, this.px, this.py) > 200 * 200) continue;
          e.burn = Math.max(e.burn, 3); e.burnDmg = Math.max(e.burnDmg, 10 + this.level * 0.8);
        } break;
    }
    this.onToast(`${wd.name}: ${wd.aura.name}`, wd.icon);
    sfx.upgrade();
  }

  /** Her big signature ability. Each companion's is mechanically distinct. */
  waifuCast(wd: WaifuDef, _lv: number, power: number) {
    const c = wd.cast!;
    this.waifuCastFx = 0.9;
    this.onToast(`${wd.name}: ${c.name}!`, wd.icon);
    this.ring(this.waifuX, this.waifuY, wd.color, 46);
    this.burst(this.waifuX, this.waifuY, 24, wd.color, 300, "star");
    const dmgOf = (n: number) => n * power * this.stats.damage;

    switch (c.kind) {
      case "heal":
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.25);
        this.txt(this.px, this.py - 42, "+HEAL", "#7dffb8", 18);
        this.flash("#7dffb8", 0.18);
        sfx.upgrade();
        break;
      case "haste":
        this.waifuHaste = 6;
        this.txt(this.px, this.py - 42, "ENCORE!", "#ff7fc8", 19);
        sfx.win();
        break;
      case "rally":
        this.rallyMark = 6;
        for (const e of this.enemies) if (d2(e.x, e.y, this.px, this.py) < 420 * 420) e.marked = 6;
        this.flash("#ff6b6b", 0.16);
        sfx.bossExposed();
        break;
      case "shield":
        this.shieldT = Math.max(this.shieldT, 5);
        this.ring(this.px, this.py, "#ffd166", 42);
        sfx.upgrade();
        break;
      case "freeze":
        for (const e of this.enemies) { e.stun = Math.max(e.stun || 0, 3); e.slow = Math.max(e.slow, 4); }
        this.flash("#c08bff", 0.3);
        sfx.bossExposed();
        break;
      case "lightning": {
        const pool = this.enemies.filter((e) => e.hp > 0).slice(0, 60);
        for (let i = 0; i < 8; i++) {
          const t = pool.length ? pick(pool) : null;
          const tx = t ? t.x : this.px + rand(-300, 300), ty = t ? t.y : this.py + rand(-300, 300);
          this.later(() => {
            if (this.state !== "playing") return;
            this.bolt(tx, ty - 360, tx, ty, "#ffe14d");
            this.addZone({ kind: "boom", x: tx, y: ty, r: 6, maxR: 86, life: 0.26, maxLife: 0.26,
              dmg: dmgOf(70), color: "#ffe14d", element: "shock", hits: new Set(), angle: 0, tick: 0, friendly: true });
            sfx.hit();
          }, i * 110);
        }
        break;
      }
      case "meteor":
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * TAU, r = rand(60, 360);
          this.addZone({ kind: "warn", x: this.px + Math.cos(a) * r, y: this.py + Math.sin(a) * r,
            r: 72, maxR: 72, life: 0.5 + i * 0.05, maxLife: 0.5 + i * 0.05, dmg: dmgOf(60),
            color: "#6dff9a", element: "fire", hits: new Set(), angle: 0, tick: 0, friendly: true });
        }
        break;
      case "turrets":
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          this.turrets.push({ x: this.px + Math.cos(a) * 60, y: this.py + Math.sin(a) * 60,
            life: 12, cd: 0, dmg: dmgOf(26), color: wd.color, shots: 0 });
        }
        sfx.pickup();
        break;
      case "clone":
        this.waifuClones = [0, 1].map((i) => ({
          x: this.px + Math.cos(i * Math.PI) * 60, y: this.py + Math.sin(i * Math.PI) * 60, life: 8, cd: 0.2 * i,
        }));
        break;
      case "revive":
        this.hp = this.stats.maxHp;
        this.invuln = Math.max(this.invuln, 4);
        this.flash("#ff8fd0", 0.4);
        this.txt(this.px, this.py - 46, "DIVINE BLESSING", "#ff8fd0", 20);
        sfx.win();
        break;
      case "blackhole":
        this.addZone({ kind: "hole", x: this.px + Math.cos(this.aim) * 200, y: this.py + Math.sin(this.aim) * 200,
          r: 240, maxR: 240, life: 4.5, maxLife: 4.5, dmg: dmgOf(34), color: "#b07bff",
          element: "void", hits: new Set(), angle: 0, tick: 0, friendly: true });
        sfx.smash();
        break;
      case "dragon": {
        const base = this.waifuFace;
        for (let i = 0; i < 3; i++) {
          this.addZone({ kind: "beam", x: this.waifuX, y: this.waifuY, r: 40, maxR: 1000,
            life: 1.6, maxLife: 1.6, dmg: dmgOf(90), color: "#ff5a2f", element: "fire",
            hits: new Set(), angle: base + (i - 1) * 0.45, tick: 0, friendly: true });
        }
        this.flash("#ff5a2f", 0.28);
        sfx.bossSlam();
        break;
      }
    }
    this.pushUi();
  }

  updateEnemies(dt: number) {
    const slowMul = this.slowMoT > 0 ? 0.33 : 1;
    const safe = this.inSafeZone();
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) { this.enemies.splice(i, 1); continue; }
      e.flash = Math.max(0, e.flash - dt);
      e.slow = Math.max(0, e.slow - dt);
      e.shock = Math.max(0, e.shock - dt);
      if ((e.marked || 0) > 0) e.marked = (e.marked || 0) - dt;
      if ((e.displaced || 0) > 0) e.displaced = (e.displaced || 0) - dt;
      if ((e.windCd || 0) > 0) e.windCd = (e.windCd || 0) - dt;
      if ((e.frozen || 0) > 0) { e.frozen = (e.frozen || 0) - dt; e.stun = Math.max(e.stun || 0, 0.05); }
      if ((e.chill || 0) > 0 && e.slow <= 0) e.chill = Math.max(0, (e.chill || 0) - dt * 0.5);
      if ((e.static || 0) > 0 && e.shock <= 0) e.static = Math.max(0, (e.static || 0) - dt * 0.4);
      if ((e.decay || 0) > 0) {
        e.decay = (e.decay || 0) - dt;
        const dd = (e.decayDmg || 0) * dt;
        e.hp -= dd;
        this.dmgAccum += dd;
        if (this.hasElite("e_parasite") && this.leechLock <= 0)
          this.hp = Math.min(this.stats.maxHp, this.hp + dd * 0.3);
        // only a few decaying enemies emit motes each frame, not all of them
        if (this.fxBudget > 0 && Math.random() < dt * 2.5) {
          this.fxBudget--;
          this.burst(e.x, e.y, 1, "#a86bff", 50);
        }
        if (e.hp <= 0) { this.killEnemy(e); continue; }
      }
      e.knock = Math.max(0, e.knock - dt);
      if ((e.shieldT2 || 0) > 0) e.shieldT2 = (e.shieldT2 || 0) - dt;
      if ((e.exposed || 0) > 0) e.exposed = (e.exposed || 0) - dt;
      if (e.burn > 0) {
        e.burn -= dt;
        e.hp -= e.burnDmg * dt;
        this.dmgAccum += e.burnDmg * dt;
        if (Math.random() < dt * 8) this.burst(e.x, e.y, 1, "#ff8f3c", 60);
        if (e.hp <= 0) { this.killEnemy(e); continue; }
      }
      const dx = this.px - e.x, dy = this.py - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.face = Math.atan2(dy, dx);
      if (dist > 1150 && !e.boss) { this.enemies.splice(i, 1); continue; }
      e.bob += dt * 9;

      if ((e.stun || 0) > 0) { e.stun = (e.stun || 0) - dt; e.vx *= 0.1; e.vy *= 0.1; }
      const mul = (e.slow > 0 ? 0.5 : 1) * slowMul * ((e.stun || 0) > 0 ? 0 : 1);
      let desired = 1;
      if (e.ranged && !e.boss) desired = dist < 230 ? -0.6 : dist > 380 ? 1 : 0;

      if (e.boss) this.bossBehavior(e, dt, dist);

      if (e.knock <= 0) {
        // A boss relentlessly closes the gap — sprinting away is never an escape.
        let sp = e.speed;
        if (e.boss) {
          const chase = clamp((dist - 300) / 700, 0, 1);
          sp = e.speed * (1 + chase * 1.5);              // up to 2.5x when you flee
          if (dist > 1250) sp = Math.max(sp, 560);        // hard floor so it always catches up
        }
        const targetVx = (dx / dist) * sp * desired * mul;
        const targetVy = (dy / dist) * sp * desired * mul;
        e.vx = lerp(e.vx, targetVx, 1 - Math.pow(e.boss ? 0.0015 : 0.004, dt));
        e.vy = lerp(e.vy, targetVy, 1 - Math.pow(e.boss ? 0.0015 : 0.004, dt));
      } else { e.vx *= Math.pow(0.05, dt); e.vy *= Math.pow(0.05, dt); }
      // A boss must never wander off and stall the run. If it leaves the
      // visible area for a moment, it is dragged straight back to you.
      if (e.boss) {
        const halfW = this.vw / (2 * this.zoom), halfH = this.vh / (2 * this.zoom);
        const off = Math.abs(e.x - this.camx) > halfW + e.r || Math.abs(e.y - this.camy) > halfH + e.r;
        e.offT = off ? (e.offT || 0) + dt : 0;
        if ((e.offT || 0) > 2.2 || dist > 820) {
          e.offT = 0;
          this.warpBossToPlayer(e, 340);
          this.onToast(`${e.boss.name} cuts you off!`, "💀");
        }
      }

      // safe-zone repulsion
      if (safe && d2(e.x, e.y, this.px, this.py) < 260 * 260) {
        const b = safe;
        if (e.x > b.x - 30 && e.x < b.x + b.w + 30 && e.y > b.y - 30 && e.y < b.y + b.h + 30) {
          e.vx -= (dx / dist) * 400; e.vy -= (dy / dist) * 400;
          e.hp -= 60 * dt;
          if (Math.random() < dt * 6) this.burst(e.x, e.y, 1, "#7dffb8", 80);
        }
      }

      const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
      // Everyone — bosses included — collides with the city.
      const r = this.resolve(nx, ny, e.r);
      if (e.boss && e.boss.element && e.boss.element !== "none" && Math.random() < dt * 4) {
        // elemental embers trailing the boss
        const ec = ELEMENTS[e.boss.element as ElementPath]?.color || "#fff";
        this.particles.push({ x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r),
          vx: rand(-30, 30), vy: rand(-90, -30), life: rand(0.4, 0.9), max: 0.9,
          size: rand(2, 5), color: ec, kind: "spark" });
      }
      if (e.boss) {
        // a charging boss that slams a wall stops dead instead of grinding through
        if (Math.abs(r.x - nx) > 0.5 || Math.abs(r.y - ny) > 0.5) {
          if (e.knock > 0) {
            e.knock = 0;
            this.addShake(9);
            this.burst(r.x, r.y, 16, "#cbd5e1", 260, "smoke");
            sfx.smash();
          }
          e.vx *= 0.1; e.vy *= 0.1;
        }
      }
      const blockedX = Math.abs(r.x - nx) > 0.4, blockedY = Math.abs(r.y - ny) > 0.4;
      if (!e.boss && (blockedX || blockedY)) {
        // Slide along the obstacle instead of pressing into it, and remember
        // which way we chose so we commit to going around rather than jittering.
        e.wallT = (e.wallT || 0) + dt;
        if (!e.wallDir) e.wallDir = Math.random() < 0.5 ? 1 : -1;
        const perp = e.face + (Math.PI / 2) * e.wallDir;
        e.vx += Math.cos(perp) * e.speed * 1.5 * dt * 6;
        e.vy += Math.sin(perp) * e.speed * 1.5 * dt * 6;
        // badly wedged (usually inside a shop) — teleport out behind the player
        if (e.wallT > 2.6) {
          const p = this.roadPoint(this.px, this.py, 760);
          if (!this.buildingAt(p.x, p.y)) { e.x = p.x; e.y = p.y; }
          e.wallT = 0; e.wallDir = 0;
        }
      } else if ((e.wallT || 0) > 0) {
        e.wallT = Math.max(0, (e.wallT || 0) - dt * 2);
        if (e.wallT === 0) e.wallDir = 0;
      }
      e.x = r.x; e.y = r.y;

      // separation (sampled for perf)
      for (let j = 1; j <= 4; j++) {
        const o = this.enemies[(i + j * 7) % this.enemies.length];
        if (!o || o === e || o.hp <= 0) continue;
        const ddx = o.x - e.x, ddy = o.y - e.y;
        const dd = Math.hypot(ddx, ddy), min = e.r + o.r;
        if (dd < min && dd > 0.01) {
          const push = (min - dd) * 0.4;
          e.x -= (ddx / dd) * push; e.y -= (ddy / dd) * push;
          o.x += (ddx / dd) * push; o.y += (ddy / dd) * push;
        }
      }

      // attack
      e.attackTimer -= dt * slowMul;
      if (!e.boss) this.roleAttack(e, dt, dist);
      else if (dist < e.r + this.pr && (e.knock || 0) > 0) this.hurt(e.dmg * 0.9);
    }
  }

  /** Per-archetype combat so a crowd reads as a mix of distinct threats. */
  roleAttack(e: Enemy, dt: number, dist: number) {
    const role = e.role?.id || "brawler";
    const shootAt = (a: number, speed: number, dmg: number, r: number, color: string) => {
      this.bullets.push({
        x: e.x + Math.cos(a) * (e.r + 4), y: e.y + Math.sin(a) * (e.r + 4),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, life: 2.6,
        pierce: 0, hits: new Set(), color, element: "none", hostile: true,
        bounce: 0, homing: 0, target: -1, boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0,
      });
    };
    if ((e.windup || 0) > 0) {
      e.windup = (e.windup || 0) - dt;
      e.vx *= 0.82; e.vy *= 0.82;
      if ((e.windup || 0) <= 0) {
        if (role === "swordsman") {
          // committed dash-slash you can sidestep
          e.vx = Math.cos(e.face) * 620; e.vy = Math.sin(e.face) * 620;
          e.lunge = 0.3; e.knock = 0.3;
          this.burst(e.x, e.y, 6, "#dfe9ff", 180);
          sfx.hit();
        } else if (role === "bomber") {
          this.addZone({ kind: "boom", x: e.x, y: e.y, r: 6, maxR: 96, life: 0.28, maxLife: 0.28,
            dmg: 0, color: "#ff3b53", element: "none", hits: new Set(), angle: 0, tick: 0, friendly: false });
          if (d2(e.x, e.y, this.px, this.py) < 96 * 96) this.hurt(e.dmg);
          this.burst(e.x, e.y, 20, "#ff8f3c", 300);
          this.addShake(6);
          sfx.smash();
          e.hp = -1; this.killEnemy(e);
          return;
        }
      }
      return;
    }
    if ((e.lunge || 0) > 0) {
      e.lunge = (e.lunge || 0) - dt;
      if (dist < e.r + this.pr + 10) { this.hurt(e.dmg); e.lunge = 0; e.attackTimer = 1.4; }
      return;
    }

    switch (role) {
      case "gunner":
        if (e.attackTimer <= 0 && dist < 540) {
          e.attackTimer = rand(1.5, 2.4);
          shootAt(e.face + rand(-0.05, 0.05), 330, e.dmg, 5, "#ff9f43");
        }
        break;
      case "swordsman":
        if (e.attackTimer <= 0 && dist < 150) {
          e.attackTimer = 2.2;
          e.windup = 0.45;                       // telegraph before the slash
          this.ring(e.x, e.y, "#dfe9ff", 16);
        }
        break;
      case "bomber":
        if (e.attackTimer <= 0 && dist < 110) {
          e.attackTimer = 99;
          e.windup = 0.7;                        // fizzing fuse
          this.ring(e.x, e.y, "#ff3b53", 20);
        }
        break;
      case "shielder":
        // slow and tanky; only hurts on contact but soaks a lot
        if (dist < e.r + this.pr + 4 && e.attackTimer <= 0) { e.attackTimer = 1.1; this.hurt(e.dmg); }
        break;
      case "brute":
        if (dist < e.r + this.pr + 8 && e.attackTimer <= 0) {
          e.attackTimer = 1.3;
          this.hurt(e.dmg);
          this.addShake(5);
        }
        break;
      default: // brawler / rusher
        if (dist < e.r + this.pr + 4 && e.attackTimer <= 0) { e.attackTimer = 0.75; this.hurt(e.dmg); }
    }
  }

  // ================= trial boss mechanics =================
  /** Milestone bosses cycle extra telegraphed set-pieces on top of their
   *  base pattern. Everything is dodgeable and nothing one-shots you. */
  updateTrialMechanics(e: Enemy, dt: number) {
    const def = e.boss!;
    const mechs = def.mechanics;
    if (!mechs || !mechs.length) return;
    const hue = def.hue;
    const frac = e.hp / e.maxHp;

    // --- phase transitions: each one is a burst + permanent speedup
    const phases = def.phases;
    if (phases) {
      const reached = phases.filter((p) => frac < p).length;
      if (reached > (e.phase || 0)) {
        e.phase = reached;
        e.speed *= def.id === "c_emperor" ? 1.18 : 1.12;
        if (def.id === "c_emperor") {
          // staggered: briefly rooted and vulnerable, then angrier
          e.stun = Math.max(e.stun || 0, 2.2);
          e.exposed = 3.4;
          e.dmg *= 1.12;
          this.onToast(`${def.name} staggers — STRIKE NOW!`, "💥");
          for (let i = 0; i < 10; i++) {
            const aa = Math.random() * TAU;
            this.gems.push({ x: e.x + Math.cos(aa) * rand(30, 90), y: e.y + Math.sin(aa) * rand(30, 90),
              vx: 0, vy: 0, v: this.stats.maxHp * 0.1, kind: "hp", t: 0 });
          }
        }
        e.mechT = 0.4;                                  // immediately act again
        this.flash(`hsl(${hue},95%,60%)`, 0.5);
        this.onToast(`${def.name} — PHASE ${reached + 1}!`, "⚠️");
        sfx.bossExposed();
        // retaliation nova so you cannot stand on top of it through a phase
        this.addZone({ kind: "nova", x: e.x, y: e.y, r: 10, maxR: 420, life: 0.8, maxLife: 0.8,
          dmg: def.dmg * 0.8, color: "#ff3b53", element: def.element || "none",
          hits: new Set(), angle: 0, tick: 0, friendly: false });
        for (let i = 0; i < 70; i++) {
          const a = Math.random() * TAU;
          this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * rand(180, 520), vy: Math.sin(a) * rand(180, 520),
            life: rand(0.5, 1.3), max: 1.3, size: rand(3, 8), color: `hsl(${hue},100%,${55 + Math.random() * 25}%)`, kind: "spark" });
        }
      }
    }

    // --- enrage threshold
    if (mechs.includes("enrage") && !e.enraged && frac < 0.35) {
      e.enraged = true;
      e.speed *= 1.35;
      this.flash(`hsl(${hue},95%,55%)`, 0.45);
      this.onToast(`${def.name} is ENRAGED!`, "🔥");
      this.ring(e.x, e.y, `hsl(${hue},100%,65%)`, 90);
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * TAU;
        this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * rand(120, 420), vy: Math.sin(a) * rand(120, 420),
          life: rand(0.5, 1.2), max: 1.2, size: rand(3, 7), color: `hsl(${hue},100%,65%)`, kind: "spark" });
      }
      sfx.bossExposed();
    }

    if (e.mechCd) for (const k in e.mechCd) e.mechCd[k] = Math.max(0, e.mechCd[k] - dt);
    const cycle = mechs.filter((m) => m !== "enrage");
    if (!cycle.length) return;
    e.mechT = (e.mechT ?? rand(3, 5)) - dt * (e.enraged ? 1.45 : 1);
    if (e.mechT > 0) return;
    // phase 2 fires them noticeably faster
    // noticeably relentless: trials should feel like a real fight
    const ph = (e.phase || 0);
    e.mechT = (frac < 0.5 ? rand(2.4, 3.6) : rand(3.8, 5.4)) / (1 + ph * 0.22) / (e.enraged ? 1.5 : 1);
    // Respect per-mechanic cooldowns — pick the next one that is actually
    // ready, so a short rotation can't spam its most disruptive ability.
    e.mechCd = e.mechCd || {};
    let chosen: string | null = null;
    for (let i = 1; i <= cycle.length; i++) {
      const cand = cycle[((e.mechIdx ?? -1) + i) % cycle.length];
      if ((e.mechCd[cand] || 0) <= 0) { chosen = cand; e.mechIdx = ((e.mechIdx ?? -1) + i) % cycle.length; break; }
    }
    if (!chosen) return;                       // everything on cooldown, wait
    e.mechCd[chosen] = MECH_COOLDOWN[chosen] ?? 0;
    this.castTrialMech(e, chosen);
  }

  castTrialMech(e: Enemy, mech: string) {
    const def = e.boss!;
    const hue = def.hue;
    const col = `hsl(${hue},95%,60%)`;
    const dmg = def.dmg;
    const warn = (x: number, y: number, r: number, delay: number, d: number) => {
      this.addZone({ kind: "warn", x, y, r, maxR: r, life: delay, maxLife: delay, dmg: d,
        color: "#ff3b53", element: "none", hits: new Set(), angle: 0, tick: 0, friendly: false });
    };
    const bel = (def.element && def.element !== "none") ? def.element : "none";
    const ecol = bel !== "none" ? ELEMENTS[bel as ElementPath].color : null;
    const shoot = (x: number, y: number, a: number, sp: number, d: number, r = 11, color = "#ff6b81") => {
      this.bullets.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, dmg: d, life: 5,
        pierce: 0, hits: new Set(), color: ecol || color, element: "none", hostile: true,
        bounce: 0, homing: 0, target: -1, boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0,
      });
    };

    switch (mech) {
      case "sever": {
        // Anti-sustain: for a window, leeching simply does not work. Forces
        // lifesteal builds to actually disengage instead of facetanking.
        this.onToast(`${def.name}: SEVERED — healing cut off!`, "🚫");
        this.leechLock = 6;
        this.flash("#8a1020", 0.45);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * TAU;
          this.particles.push({ x: this.px + Math.cos(a) * 60, y: this.py + Math.sin(a) * 60,
            vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.8, max: 0.8,
            size: 4, color: "#ff3b53", kind: "spark" });
        }
        this.ring(this.px, this.py, "#ff3b53", 54);
        sfx.bossExposed();
        break;
      }
      // ---------- colosseum gauntlet ----------
      case "tidalwave": {
        // Sweeping walls of water that march across the arena. Gaps to run.
        this.onToast(`${def.name}: Tidal Surge!`, "🌊");
        const base = Math.atan2(this.py - e.y, this.px - e.x);
        for (let w = 0; w < 3; w++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            const gap = rand(-0.5, 0.5);
            for (let i = -7; i <= 7; i++) {
              if (Math.abs(i * 0.16 - gap) < 0.24) continue;   // the safe lane
              shoot(e.x, e.y, base + i * 0.16, 190, dmg * 0.45, 15, "#4fc8ff");
            }
            sfx.bossSlam();
          }, w * 620);
        }
        break;
      }
      case "javelinvolley": {
        // Alternating left/right spear throws, fast and flat.
        this.onToast(`${def.name}: Javelin Volley!`, "🏹");
        for (let i = 0; i < 8; i++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            const a = Math.atan2(this.py - e.y, this.px - e.x) + (i % 2 ? 0.16 : -0.16);
            shoot(e.x, e.y, a + rand(-0.04, 0.04), 620, dmg * 0.4, 9, "#ffd9a0");
            sfx.hit();
          }, i * 170);
        }
        break;
      }
      case "manticoretriple": {
        // Three rapid rings, each with ONE small safe pocket. Read and move.
        this.onToast(`${def.name}: FIND THE GAP!`, "⭕");
        for (let w = 0; w < 3; w++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            // the safe pocket is drawn so it can actually be read
            const a = Math.random() * TAU;
            const r = rand(130, 260);
            const sx = e.x + Math.cos(a) * r, sy = e.y + Math.sin(a) * r;
            this.addZone({ kind: "warn", x: sx, y: sy, r: 78, maxR: 78, life: 1.0, maxLife: 1.0,
              dmg: 0, color: "#6dff9a", element: "none", hits: new Set(),
              angle: 0, tick: 0, friendly: true, data: 3 });
            this.later(() => {
              if (!this.running || e.hp <= 0) return;
              const safe = d2(sx, sy, this.px, this.py) < 78 * 78;
              // heavy hit — 50-70% of max HP if you are caught outside
              if (!safe) this.hurt(this.stats.maxHp * rand(0.5, 0.7));
              else this.txt(this.px, this.py - 46, "SAFE!", "#6dff9a", 20);
              this.flash(safe ? "#6dff9a" : "#ff3b53", 0.45);
              for (let k = 0; k < 40; k++) {
                const aa = Math.random() * TAU, rr = rand(90, 620);
                this.burst(e.x + Math.cos(aa) * rr, e.y + Math.sin(aa) * rr, 2, "#ff6b81", 180);
              }
              sfx.bossSlam();
            }, 1000);
          }, w * 1500);
        }
        break;
      }
      case "greatcleave": {
        // An enormous telegraphed sweep. Get behind it or get out of range.
        this.onToast(`${def.name}: GREAT CLEAVE!`, "🪓");
        const a0 = Math.atan2(this.py - e.y, this.px - e.x);
        this.addZone({ kind: "warn", x: e.x, y: e.y, r: 36, maxR: 36, life: 1.2, maxLife: 1.2,
          dmg: 0, color: "#ff3b53", element: "none", hits: new Set(), angle: a0, tick: 0, friendly: false, data: 2 });
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          this.addZone({ kind: "swipe", x: e.x, y: e.y, r: 420, maxR: 420, life: 0.55, maxLife: 0.55,
            dmg: dmg * 1.5, color: ecol || "#ff8f3c", element: bel, hits: new Set(),
            angle: a0, tick: 0, friendly: false, arc: 2.6, knock: 700 });
          this.flash("#ff3b53", 0.35);
          sfx.titanFist();
        }, 1200);
        break;
      }
      case "imperialwrath": {
        // Signature: a ring wall, then a converging cross, then a slam.
        this.onToast(`${def.name}: IMPERIAL WRATH`, "👑");
        const n = 20;
        for (let i = 0; i < n; i++) {
          const gap = Math.abs(((i / n) * TAU) - Math.PI);
          if (gap < 0.5) continue;
          shoot(e.x, e.y, (i / n) * TAU, 210, dmg * 0.5, 13, "#ffd166");
        }
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          const b0 = Math.atan2(this.py - e.y, this.px - e.x);
          for (let i = 0; i < 4; i++)
            this.addZone({ kind: "beam", x: e.x, y: e.y, r: 26, maxR: 1200, life: 1.6, maxLife: 1.6,
              dmg: dmg * 0.8, color: "#ffd166", element: "none", hits: new Set(),
              angle: b0 + (i / 4) * TAU, tick: 0, friendly: false });
          sfx.bossSlam();
        }, 1400);
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          warn(this.px, this.py, 210, 1.0, dmg * 1.3);
        }, 3000);
        break;
      }
      // ---------- act 1 / dojo ----------
      case "cleavefan": {
        this.onToast(`${def.name}: Cleave Fan!`, "🌊");
        const base = Math.atan2(this.py - e.y, this.px - e.x);
        for (let i = 0; i < 3; i++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            this.addZone({ kind: "swipe", x: e.x, y: e.y, r: 230, maxR: 230, life: 0.45, maxLife: 0.45,
              dmg: dmg * 0.8, color: ecol || "#dfe9ff", element: bel, hits: new Set(),
              angle: base + (i - 1) * 0.6, tick: 0, friendly: false, arc: 1.8, knock: 300 });
            sfx.iaiSlash();
          }, i * 320);
        }
        break;
      }
      case "blink": {
        this.onToast(`${def.name} vanishes!`, "🌑");
        e.invisible = true;
        this.burst(e.x, e.y, 24, "#b07bff", 300, "smoke");
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          const a = Math.random() * TAU;
          e.x = this.px + Math.cos(a) * 90; e.y = this.py + Math.sin(a) * 90;
          e.invisible = false;
          // Punish-window: after reappearing he is rooted and takes +60%
          // damage, so the teleport is an opening rather than a stall.
          e.stun = Math.max(e.stun || 0, 1.1);
          e.exposed = 2.2;
          this.ring(e.x, e.y, "#b07bff", 40);
          this.burst(e.x, e.y, 20, "#b07bff", 280);
          warn(e.x, e.y, 110, 0.5, dmg * 0.9);
          sfx.iaiSlash();
        }, 380);
        break;
      }
      case "daggerfan": {
        this.onToast(`${def.name}: Dagger Fan!`, "🗡️");
        const base = Math.atan2(this.py - e.y, this.px - e.x);
        for (let w = 0; w < 3; w++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            for (let i = -3; i <= 3; i++) shoot(e.x, e.y, base + i * 0.16, 520, dmg * 0.34, 6, ecol || "#dfe9ff");
          }, w * 260);
        }
        break;
      }
      case "flurry": {
        this.onToast(`${def.name}: Flurry!`, "👊");
        for (let i = 0; i < 7; i++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            const a = Math.atan2(this.py - e.y, this.px - e.x);
            this.addZone({ kind: "cone", x: e.x, y: e.y, r: 150, maxR: 150, life: 0.18, maxLife: 0.18,
              dmg: dmg * 0.4, color: ecol || "#ffd98f", element: bel, hits: new Set(),
              angle: a, tick: 0, friendly: false, arc: 0.8, knock: 140 });
          }, i * 150);
        }
        break;
      }
      case "kneedive": {
        this.onToast(`${def.name}: Knee Dive!`, "🦵");
        const tx = this.px, ty = this.py;
        warn(tx, ty, 140, 0.9, dmg * 1.1);
        e.telegraph = 0.9;
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          e.x = tx; e.y = ty;
          this.addZone({ kind: "nova", x: tx, y: ty, r: 10, maxR: 260, life: 0.6, maxLife: 0.6,
            dmg: dmg * 0.7, color: "#ff3b53", element: bel, hits: new Set(), angle: 0, tick: 0, friendly: false });
          sfx.titanFist();
        }, 900);
        break;
      }
      case "palmcone": {
        this.onToast(`${def.name}: Great Palm!`, "✋");
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        this.addZone({ kind: "warn", x: e.x, y: e.y, r: 30, maxR: 30, life: 1.0, maxLife: 1.0,
          dmg: 0, color: "#ff3b53", element: "none", hits: new Set(), angle: a, tick: 0, friendly: false, data: 2 });
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          this.addZone({ kind: "cone", x: e.x, y: e.y, r: 420, maxR: 420, life: 0.35, maxLife: 0.35,
            dmg: dmg * 1.3, color: ecol || "#ffe9a8", element: bel, hits: new Set(),
            angle: a, tick: 0, friendly: false, arc: 1.0, knock: 560 });
          sfx.titanFist();
        }, 1000);
        break;
      }
      // ---------- act 2 ----------
      case "bellyflop": {
        this.onToast(`${def.name}: BELLY FLOP!`, "💢");
        const tx = this.px, ty = this.py;
        warn(tx, ty, 190, 1.1, dmg * 1.3);
        e.telegraph = 1.1;
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          e.x = tx; e.y = ty;
          for (let w = 0; w < 2; w++)
            this.later(() => this.addZone({ kind: "nova", x: tx, y: ty, r: 10, maxR: 320 + w * 150,
              life: 0.7, maxLife: 0.7, dmg: dmg * 0.6, color: "#ff3b53", element: bel,
              hits: new Set(), angle: 0, tick: 0, friendly: false }), w * 300);
          sfx.titanFist();
        }, 1100);
        break;
      }
      case "shielded": {
        this.onToast(`${def.name} braces!`, "🛡️");
        e.guard = 0;
        e.shieldT2 = 4;
        this.ring(e.x, e.y, "#9fb8ff", 70);
        break;
      }
      // ---------- act 3 ----------
      case "servestorm": {
        this.onToast(`${def.name}: Serve Storm!`, "🏓");
        for (let w = 0; w < 4; w++) {
          this.later(() => {
            if (!this.running || e.hp <= 0) return;
            const base = Math.atan2(this.py - e.y, this.px - e.x) + rand(-0.3, 0.3);
            for (let i = -2; i <= 2; i++) shoot(e.x, e.y, base + i * 0.22, 560, dmg * 0.42, 9, "#fff3c4");
            sfx.pong();
          }, w * 300);
        }
        break;
      }
      case "foxfire": {
        this.onToast(`${def.name}: Foxfire!`, "🦊");
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          this.bullets.push({
            x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
            vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 12, dmg: dmg * 0.7, life: 6,
            pierce: 0, hits: new Set(), color: "#ffa45c", element: "none", hostile: true,
            bounce: 0, homing: 1.2, target: -1, boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0,
          });
        }
        break;
      }
      case "raisedead": {
        this.onToast(`${def.name}: Detention!`, "👻");
        for (let i = 0; i < 12; i++) this.spawnEnemy(true);
        this.ring(e.x, e.y, "#7dffb8", 80);
        sfx.kill();
        break;
      }
      case "spikeserve": {
        this.onToast(`${def.name}: SPIKE!`, "🏐");
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        this.addZone({ kind: "warn", x: e.x, y: e.y, r: 28, maxR: 28, life: 0.7, maxLife: 0.7,
          dmg: 0, color: "#ff3b53", element: "none", hits: new Set(), angle: a, tick: 0, friendly: false, data: 2 });
        this.later(() => {
          if (!this.running || e.hp <= 0) return;
          shoot(e.x, e.y, a, 760, dmg * 1.1, 16, "#ffffff");
          sfx.smash();
        }, 700);
        break;
      }
      case "elementalpe": {
        // the coach cycles through elements, one per cast
        const els: Element[] = ["fire", "ice", "shock", "wind"];
        const el2 = els[(e.phase || 0) % els.length];
        const c2 = ELEMENTS[el2 as ElementPath].color;
        this.onToast(`${def.name}: ${ELEMENTS[el2 as ElementPath].name} Drill!`, ELEMENTS[el2 as ElementPath].icon);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + this.time;
          this.bullets.push({
            x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
            vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 12, dmg: dmg * 0.6, life: 4,
            pierce: 0, hits: new Set(), color: c2, element: "none", hostile: true,
            bounce: 0, homing: 0, target: -1, boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0,
          });
        }
        break;
      }
      // ---------- RAIDEN MASAMUNE (samurai) ----------
      case "iai": {
        // Instant cross-map draw-slash along a telegraphed line.
        this.onToast(`${def.name}: 居合 IAI!`, "⚡");
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        this.addZone({ kind: "warn", x: e.x, y: e.y, r: 30, maxR: 30, life: 1.1, maxLife: 1.1,
          dmg: 0, color: "#9fe8ff", element: "none", hits: new Set(), angle: a, tick: 0, friendly: false, data: 2 });
        this.later(() => {
          if (this.state === "menu" || e.hp <= 0) return;
          sfx.iaiSlash();
          this.flash("#dff4ff", 0.5);
          this.addZone({ kind: "beam", x: e.x, y: e.y, r: 30, maxR: 1400, life: 0.35, maxLife: 0.35,
            dmg: dmg * 1.2, color: "#cfefff", element: "shock", hits: new Set(), angle: a, tick: 0, friendly: false });
          for (let i = 0; i < 40; i++) {
            const t2 = i / 40;
            this.particles.push({ x: e.x + Math.cos(a) * 1400 * t2, y: e.y + Math.sin(a) * 1400 * t2,
              vx: rand(-60, 60), vy: rand(-60, 60), life: rand(0.2, 0.5), max: 0.5, size: rand(2, 5),
              color: "#dff4ff", kind: "spark" });
          }
        }, 1100);
        break;
      }
      case "stormblade": {
        // Lightning pillars chase your footsteps.
        this.onToast(`${def.name}: Storm Blade!`, "🌩️");
        for (let i = 0; i < 9; i++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            const tx = this.px + rand(-40, 40), ty = this.py + rand(-40, 40);
            warn(tx, ty, 72, 0.75, dmg * 0.7);
            this.later(() => this.bolt(tx, ty - 420, tx, ty, "#9fe8ff"), 700);
          }, i * 300);
        }
        break;
      }
      case "cloneslash": {
        // Afterimages ring you; each one slashes inward.
        this.onToast(`${def.name}: Afterimage!`, "👥");
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + Math.random() * 0.3;
          const cx = this.px + Math.cos(a) * 230, cy = this.py + Math.sin(a) * 230;
          this.addZone({ kind: "warn", x: cx, y: cy, r: 28, maxR: 28, life: 1.2, maxLife: 1.2,
            dmg: 0, color: "#9fe8ff", element: "none", hits: new Set(), angle: a + Math.PI, tick: 0, friendly: false, data: 2 });
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            this.addZone({ kind: "beam", x: cx, y: cy, r: 18, maxR: 520, life: 0.3, maxLife: 0.3,
              dmg: dmg * 0.6, color: "#cfefff", element: "shock", hits: new Set(), angle: a + Math.PI, tick: 0, friendly: false });
            sfx.iaiSlash();
          }, 1200 + i * 90);
        }
        break;
      }
      // ---------- GOROU KUROMAKI (oyabun) ----------
      case "bulletstorm": {
        // Sustained dual-MG cone sweeping across your position.
        this.onToast(`${def.name}: Bullet Storm!`, "🔫");
        let shot = 0;
        const base = Math.atan2(this.py - e.y, this.px - e.x) - 0.5;
        const iv = setInterval(() => {
          if (this.state === "menu" || e.hp <= 0 || shot++ > 26) { clearInterval(iv); return; }
          const a = base + (shot / 26) * 1.0;
          shoot(e.x, e.y, a + rand(-0.05, 0.05), 420, dmg * 0.3, 6, "#ffe066");
          shoot(e.x, e.y, a + rand(-0.05, 0.05) + 0.12, 420, dmg * 0.3, 6, "#ffe066");
          if (shot % 6 === 0) sfx.machineGun();
        }, 70);
        break;
      }
      case "grenades": {
        this.onToast(`${def.name}: Grenades!`, "💣");
        for (let i = 0; i < 6; i++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            const a = Math.random() * TAU, r = rand(60, 300);
            warn(this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, 92, 1.2, dmg * 0.85);
          }, i * 220);
        }
        break;
      }
      case "suppress": {
        // Rotating walls of fire — keep moving through the gaps.
        this.onToast(`${def.name}: Suppressing Fire!`, "🚧");
        for (let k = 0; k < 3; k++) {
          this.addZone({ kind: "beam", x: e.x, y: e.y, r: 18, maxR: 900, life: 5, maxLife: 5,
            dmg: dmg * 0.4, color: "#ffb703", element: "fire", hits: new Set(),
            angle: (k / 3) * TAU, tick: 0, friendly: false });
        }
        sfx.machineGun();
        break;
      }
      // ---------- RYŪJIN (wyrm) ----------
      case "flamebreath": {
        // Wide sweeping cone of fire — run around behind it.
        this.onToast(`${def.name}: Flame Breath!`, "🔥");
        const start = Math.atan2(this.py - e.y, this.px - e.x) - 0.6;
        this.addZone({ kind: "warn", x: e.x, y: e.y, r: 30, maxR: 30, life: 1.0, maxLife: 1.0,
          dmg: 0, color: "#ff8f3c", element: "none", hits: new Set(), angle: start, tick: 0, friendly: false, data: 2 });
        this.later(() => {
          if (this.state === "menu" || e.hp <= 0) return;
          sfx.dragonRoar();
          for (let i = 0; i < 16; i++) {
            this.later(() => {
              if (e.hp <= 0) return;
              const a = start + (i / 16) * 1.2;
              for (let r2 = 60; r2 < 620; r2 += 70) {
                const fx = e.x + Math.cos(a) * r2, fy = e.y + Math.sin(a) * r2;
                this.burst(fx, fy, 2, "#ff8f3c", 120);
                if (d2(fx, fy, this.px, this.py) < 54 * 54) this.hurt(dmg * 0.55);
              }
            }, i * 70);
          }
        }, 1000);
        break;
      }
      case "firewall": {
        this.onToast(`${def.name}: Fire Spokes!`, "🌀");
        for (let k = 0; k < 4; k++) {
          this.addZone({ kind: "beam", x: e.x, y: e.y, r: 20, maxR: 820, life: 4.5, maxLife: 4.5,
            dmg: dmg * 0.45, color: "#ff7a2f", element: "fire", hits: new Set(),
            angle: (k / 4) * TAU, tick: 0, friendly: false });
        }
        break;
      }
      case "skyfall": {
        // Leaps off-screen, then crashes down on your position.
        this.onToast(`${def.name} takes flight!`, "🐉");
        e.telegraph = 2.4;
        e.invisible = true;
        sfx.dragonRoar();
        this.later(() => {
          if (this.state === "menu" || e.hp <= 0) return;
          const tx = this.px, ty = this.py;
          warn(tx, ty, 180, 1.1, dmg * 1.4);
          this.later(() => {
            if (e.hp <= 0) return;
            e.invisible = false;
            e.x = tx; e.y = ty;
            this.addZone({ kind: "nova", x: tx, y: ty, r: 10, maxR: 420, life: 0.7, maxLife: 0.7,
              dmg: dmg * 0.8, color: "#ff7a2f", element: "fire", hits: new Set(), angle: 0, tick: 0, friendly: false });
            this.flash("#ff7a2f", 0.4);
            sfx.titanFist();
            for (let i = 0; i < 50; i++) {
              const a = Math.random() * TAU;
              this.particles.push({ x: tx, y: ty, vx: Math.cos(a) * rand(200, 500), vy: Math.sin(a) * rand(200, 500),
                life: rand(0.4, 1), max: 1, size: rand(3, 7), color: "#ff9f43", kind: "spark" });
            }
          }, 1100);
        }, 1300);
        break;
      }
      // ---------- DAIBUTSU GENKAI (priest) ----------
      case "groundpound": {
        this.onToast(`${def.name}: GROUND POUND!`, "👊");
        warn(e.x, e.y, 300, 1.3, dmg * 1.2);
        this.later(() => {
          if (this.state === "menu" || e.hp <= 0) return;
          sfx.titanFist();
          this.flash("#ffd166", 0.4);
          for (let w = 0; w < 3; w++) {
            this.later(() => this.addZone({ kind: "nova", x: e.x, y: e.y, r: 10, maxR: 360 + w * 160,
              life: 0.85, maxLife: 0.85, dmg: dmg * 0.55, color: "#ffd166", element: "none",
              hits: new Set(), angle: 0, tick: 0, friendly: false }), w * 320);
          }
        }, 1300);
        break;
      }
      case "fistbarrage": {
        // Alternating left/right fist slams that walk toward you.
        this.onToast(`${def.name}: Fist Barrage!`, "🥊");
        for (let i = 0; i < 7; i++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            const side = i % 2 ? 1 : -1;
            const a = Math.atan2(this.py - e.y, this.px - e.x) + side * 0.4;
            const r = 120 + i * 60;
            const tx = e.x + Math.cos(a) * r, ty = e.y + Math.sin(a) * r;
            warn(tx, ty, 110, 0.8, dmg * 0.75);
            this.later(() => { if (e.hp > 0) sfx.titanFist(); }, 780);
          }, i * 380);
        }
        break;
      }
      case "pillarquake": {
        // Expanding columns of stone marching outward in a spiral.
        this.onToast(`${def.name}: Pillar Quake!`, "🗿");
        sfx.bell();
        for (let ring = 0; ring < 4; ring++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            const n = 8 + ring * 2;
            const off = ring * 0.4;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU + off;
              const r = 150 + ring * 130;
              warn(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 78, 0.9, dmg * 0.65);
            }
          }, ring * 560);
        }
        break;
      }
      case "crossbeam": {
        // four beams in a cross, telegraphed then fired, rotating slowly
        this.onToast(`${def.name}: Cross Beam!`, "✨");
        const base = Math.atan2(this.py - e.y, this.px - e.x);
        for (let i = 0; i < 4; i++) {
          this.addZone({ kind: "warn", x: e.x, y: e.y, r: 34, maxR: 34, life: 1.3, maxLife: 1.3,
            dmg: 0, color: "#ff2e4d", element: "none", hits: new Set(), angle: base + (i / 4) * TAU, tick: 0, friendly: false, data: 2 });
        }
        this.later(() => {
          if (this.state === "menu" || e.hp <= 0) return;
          for (let i = 0; i < 4; i++) {
            this.addZone({ kind: "beam", x: e.x, y: e.y, r: 26, maxR: 1100, life: 2.2, maxLife: 2.2,
              dmg, color: col, element: "none", hits: new Set(), angle: base + (i / 4) * TAU, tick: 0, friendly: false });
          }
          sfx.bossSlam();
        }, 1300);
        break;
      }
      case "ringwall": {
        // concentric rings with one guaranteed safe gap to run through
        this.onToast(`${def.name}: Ring Wall!`, "⭕");
        for (let w = 0; w < 3; w++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            const gap = Math.random() * TAU;
            const n = 26;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU;
              let diff = Math.abs(((a - gap + Math.PI * 3) % TAU) - Math.PI);
              if (diff < 0.55) continue;                 // the escape corridor
              shoot(e.x, e.y, a, 150, dmg * 0.55, 10, col);
            }
            sfx.smash();
          }, w * 900);
        }
        break;
      }
      case "meteorstorm": {
        this.onToast(`${def.name}: Meteor Storm!`, "☄️");
        for (let i = 0; i < 14; i++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            const a = Math.random() * TAU, r = rand(40, 420);
            warn(this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, 86, 1.0, dmg * 0.75);
          }, i * 170);
        }
        break;
      }
      case "dashcombo": {
        // three telegraphed charges in a row — sidestep each one
        this.onToast(`${def.name}: Triple Charge!`, "💨");
        e.dashes = 3;
        break;
      }
      case "shockwave": {
        // expanding floor rings radiating from the boss
        this.onToast(`${def.name}: Shockwave!`, "🌊");
        for (let w = 0; w < 4; w++) {
          this.later(() => {
            if (this.state === "menu" || e.hp <= 0) return;
            this.addZone({ kind: "nova", x: e.x, y: e.y, r: 10, maxR: 440 + w * 90,
              life: 1.1, maxLife: 1.1, dmg: dmg * 0.6, color: "#ff3b53", element: "none",
              hits: new Set(), angle: 0, tick: 0, friendly: false });
            sfx.bossSlam();
          }, w * 620);
        }
        break;
      }
      case "adds": {
        this.onToast(`${def.name} calls reinforcements!`, "👥");
        for (let i = 0; i < 10; i++) this.spawnEnemy(true);
        this.ring(e.x, e.y, "#7dffb8", 70);
        break;
      }
      case "pillars": {
        // the floor burns except inside three marked safe pillars
        this.onToast(`${def.name}: Purge — find cover!`, "🟢");
        const spots = [0, 1, 2].map(() => {
          const a = Math.random() * TAU, r = rand(120, 320);
          return { x: this.px + Math.cos(a) * r, y: this.py + Math.sin(a) * r };
        });
        for (const sp of spots) {
          this.addZone({ kind: "warn", x: sp.x, y: sp.y, r: 92, maxR: 92, life: 2.6, maxLife: 2.6,
            dmg: 0, color: "#6dff9a", element: "none", hits: new Set(), angle: 0, tick: 0, friendly: true, data: 3 });
        }
        this.later(() => {
          if (this.state === "menu" || e.hp <= 0) return;
          const safe = spots.some((sp) => d2(sp.x, sp.y, this.px, this.py) < 92 * 92);
          this.flash("#ff3b53", 0.4);
          for (let i = 0; i < 40; i++) {
            const a = Math.random() * TAU, r = rand(60, 600);
            this.burst(this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, 2, "#ff6b81", 160);
          }
          if (!safe) this.hurt(dmg * 1.3);
          else this.txt(this.px, this.py - 44, "SAFE!", "#6dff9a", 20);
          sfx.bossSlam();
        }, 2600);
        break;
      }
      case "homingorbs": {
        this.onToast(`${def.name}: Soul Orbs!`, "🔮");
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          this.bullets.push({
            x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
            vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 13, dmg: dmg * 0.8, life: 7,
            pierce: 0, hits: new Set(), color: col, element: "none", hostile: true,
            bounce: 0, homing: 1.1, target: -1, boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0,
          });
        }
        break;
      }
      case "spinlaser": {
        this.onToast(`${def.name}: Sweeping Death!`, "📡");
        for (let i = 0; i < 2; i++) {
          this.addZone({ kind: "beam", x: e.x, y: e.y, r: 22, maxR: 1000, life: 4.5, maxLife: 4.5,
            dmg: dmg * 0.5, color: col, element: "none", hits: new Set(),
            angle: (i / 2) * TAU, tick: 0, friendly: false });
        }
        break;
      }
      case "quakegrid": {
        // checkerboard eruptions — stand on the alternate squares
        this.onToast(`${def.name}: Quake Grid!`, "🟥");
        const cellsz = 150;
        const gx0 = Math.floor((this.px - 380) / cellsz), gy0 = Math.floor((this.py - 380) / cellsz);
        const parity = Math.random() < 0.5 ? 0 : 1;
        for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
          if ((i + j) % 2 !== parity) continue;
          warn((gx0 + i) * cellsz + cellsz / 2, (gy0 + j) * cellsz + cellsz / 2, 74, 1.5, dmg * 0.7);
        }
        break;
      }
    }
  }

  bossBehavior(e: Enemy, dt: number, dist: number) {
    const def = e.boss!;
    if (def.mechanics?.length) this.updateTrialMechanics(e, dt);
    // queued dash-combo charges take priority over the base pattern
    if ((e.dashes || 0) > 0 && (e.telegraph || 0) <= 0 && (e.knock || 0) <= 0) {
      e.dashes = (e.dashes || 0) - 1;
      e.telegraph = 0.6;
      this.addZone({ kind: "warn", x: e.x, y: e.y, r: 34, maxR: 34, life: 0.6, maxLife: 0.6,
        dmg: 0, color: "#ff3b53", element: "none", hits: new Set(), angle: e.face, tick: 0, friendly: false, data: 2 });
      const lock = e.face;
      this.later(() => {
        if (this.state === "menu" || e.hp <= 0) return;
        e.vx = Math.cos(lock) * 700; e.vy = Math.sin(lock) * 700;
        e.knock = 0.6;
        sfx.hit();
      }, 600);
      e.attackTimer = Math.max(e.attackTimer, 1.1);
      return;
    }
    e.attackTimer -= dt;
    const shoot = (a: number, speed: number, dmg: number, r = 8, color = "#ff4d6a") => {
      this.bullets.push({
        x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, life: 3.4,
        pierce: 0, hits: new Set(), color, element: "none", hostile: true,
        bounce: 0, homing: 0, target: -1, boomerang: 0, spin: 0, born: this.time, crit: false, explode: 0, split: 0,
      });
    };
    // Everything a boss does is slow, loud and telegraphed so it can be sidestepped.
    if ((e.telegraph || 0) > 0) { e.telegraph = (e.telegraph || 0) - dt; e.vx *= 0.9; e.vy *= 0.9; }
    switch (def.pattern) {
      case "charge":
        if (e.attackTimer <= 0 && (e.telegraph || 0) <= 0) {
          e.attackTimer = 4.2;
          e.telegraph = 0.85;
          this.addZone({ kind: "warn", x: e.x, y: e.y, r: 34, maxR: 34, life: 0.85, maxLife: 0.85, dmg: 0, color: "#ff8f3c", element: "none", hits: new Set(), angle: e.face, tick: 0, data: 2 });
          const lockAngle = e.face;
          this.later(() => {
            if (this.state !== "playing" || e.hp <= 0) return;
            e.vx = Math.cos(lockAngle) * 560; e.vy = Math.sin(lockAngle) * 560;
            e.knock = 0.75;
            for (let i = -1; i <= 1; i++) shoot(lockAngle + i * 0.38, 250, def.dmg * 0.5, 13);
            this.addShake(7); sfx.hit();
          }, 850);
        }
        break;
      case "ring":
        if (e.attackTimer <= 0) {
          e.attackTimer = 3.6;
          e.telegraph = 0.5;
          const n = 11;
          for (let i = 0; i < n; i++) shoot((i / n) * TAU + (e.phase || 0), 165, def.dmg * 0.45, 15, "#ff7a3c");
          e.phase = (e.phase || 0) + 0.28;
          this.addShake(5); sfx.smash();
        }
        break;
      case "spiral":
        if (e.attackTimer <= 0) {
          e.attackTimer = 0.26;
          e.phase = (e.phase || 0) + 0.5;
          for (let i = 0; i < 2; i++) shoot(e.phase + i * Math.PI, 185, def.dmg * 0.34, 13, "#c08bff");
        }
        break;
      case "summon":
        if (e.attackTimer <= 0) {
          e.attackTimer = 5.5;
          e.telegraph = 0.6;
          for (let i = 0; i < 5; i++) this.spawnEnemy(true);
          this.ring(e.x, e.y, "#7dffb8", 50);
          sfx.kill();
        }
        break;
      case "slam":
        if (e.attackTimer <= 0 && dist < 520) {
          e.attackTimer = 4.0;
          e.telegraph = 1.1;
          // drops where you are *now* — keep walking and it misses
          this.addZone({ kind: "warn", x: this.px, y: this.py, r: 165, maxR: 165, life: 1.1, maxLife: 1.1, dmg: def.dmg * 1.4, color: "#ff4d6a", element: "none", hits: new Set(), angle: 0, tick: 0, data: 1 });
        }
        break;
      case "laser":
        if (e.attackTimer <= 0) {
          e.attackTimer = 4.6;
          e.telegraph = 1.2;
          const a = e.face;
          this.addZone({ kind: "warn", x: e.x, y: e.y, r: 40, maxR: 40, life: 0.9, maxLife: 0.9, dmg: 0, color: "#ff2e4d", element: "none", hits: new Set(), angle: a, tick: 0, data: 2 });
          this.later(() => {
            if (this.state !== "playing" || e.hp <= 0) return;
            const bx = e.x, by = e.y;
            for (let i = 0; i < 70; i++) {
              const px = bx + Math.cos(a) * i * 22, py = by + Math.sin(a) * i * 22;
              if (d2(px, py, this.px, this.py) < 40 * 40) { this.hurt(def.dmg * 1.4); break; }
            }
            this.particles.push({ x: bx, y: by, x2: bx + Math.cos(a) * 1500, y2: by + Math.sin(a) * 1500, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 18, color: "#ff2e4d", kind: "bolt" });
            sfx.bossSlam();
          }, 900);
        }
        break;
    }
  }


  // ================= SPATIAL HASH =================
  // Bullet-vs-enemy was O(bullets x enemies) — 400 bullets against 140
  // enemies is ~56k checks a frame, which is what made Fracture builds
  // stutter. Enemies are bucketed into a coarse grid once per frame so each
  // bullet only tests the handful of enemies actually near it.
  private static CELL_SZ = 110;
  private hashCells = new Map<number, Enemy[]>();
  private hashPool: Enemy[][] = [];
  /** Fragments queued during iteration, spawned after the loop completes. */
  private pendingBullets: { x: number; y: number; a: number; sp: number;
    dmg: number; r: number; color: string; el: Element }[] = [];

  private cellKey(x: number, y: number) {
    // 16-bit pack; the world is far smaller than 65k units per axis
    return (((x / Game.CELL_SZ) | 0) & 0xffff) * 65536 + (((y / Game.CELL_SZ) | 0) & 0xffff);
  }

  rebuildEnemyHash() {
    // recycle the arrays so this allocates nothing after the first frame
    for (const arr of this.hashCells.values()) { arr.length = 0; this.hashPool.push(arr); }
    this.hashCells.clear();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const k = this.cellKey(e.x, e.y);
      let arr = this.hashCells.get(k);
      if (!arr) { arr = this.hashPool.pop() || []; this.hashCells.set(k, arr); }
      arr.push(e);
    }
  }

  updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) { this.bullets.splice(i, 1); continue; }
      if (b.homing > 0) {
        let t = this.enemies.find((e) => e.id === b.target && e.hp > 0);
        if (!t) { t = this.nearestEnemy(b.x, b.y, 700) || undefined; if (t) b.target = t.id; }
        if (t) {
          const want = Math.atan2(t.y - b.y, t.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
          const na = cur + clamp(diff, -b.homing * dt, b.homing * dt);
          const s = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s;
        }
      }
      if (b.boomerang) {
        const age = this.time - b.born;
        if (age > 0.5) {
          const want = Math.atan2(this.py - b.y, this.px - b.x);
          const s = Math.hypot(b.vx, b.vy);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
          const na = cur + clamp(diff, -6 * dt, 6 * dt);
          b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s;
          if (d2(b.x, b.y, this.px, this.py) < 400 && age > 1) { this.bullets.splice(i, 1); continue; }
        }
      }
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (this.solidAt(nx, ny) || nx < 4 || ny < 4 || nx > WORLD - 4 || ny > WORLD - 4) {
        if (b.bounce > 0) {
          b.bounce--;
          if (this.solidAt(nx, b.y) || nx < 4 || nx > WORLD - 4) b.vx *= -1; else b.vy *= -1;
          this.burst(b.x, b.y, 3, b.color, 120);
          continue;
        }
        if (!b.boomerang) {
          this.burst(nx, ny, 4, b.color, 140);
          if (b.explode) this.explode(nx, ny, b.explode, b.dmg, b.color, b.element);
          this.bullets.splice(i, 1);
          continue;
        }
      }
      b.x = nx; b.y = ny;
      if (b.hostile) {
        if (d2(b.x, b.y, this.px, this.py) < (this.pr + b.r) ** 2) {
          this.hurt(b.dmg);
          this.burst(b.x, b.y, 6, b.color, 180);
          this.bullets.splice(i, 1);
        }
        continue;
      }
      let dead = false;
      // Inlined grid walk. A callback here would allocate one closure per
      // bullet per frame (~24k/sec) and the GC churn cost more than the
      // collision test itself.
      const cs = Game.CELL_SZ;
      const rr = b.r + 40;
      const gx0 = ((b.x - rr) / cs) | 0, gx1 = ((b.x + rr) / cs) | 0;
      const gy0 = ((b.y - rr) / cs) | 0, gy1 = ((b.y + rr) / cs) | 0;
      outer:
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let gy = gy0; gy <= gy1; gy++) {
          const cell = this.hashCells.get((gx & 0xffff) * 65536 + (gy & 0xffff));
          if (!cell) continue;
          for (let ci = 0; ci < cell.length; ci++) {
            const e = cell[ci];
            if (e.hp <= 0 || b.hits.has(e.id)) continue;
            if (d2(b.x, b.y, e.x, e.y) >= (e.r + b.r) ** 2) continue;
            b.hits.add(e.id);
            const pct = b.pctHealth || 0;
            const dealt = pct > 0 ? b.dmg + e.maxHp * pct * (e.boss ? 0.35 : 1) : b.dmg;
            this.hitEnemy(e, dealt, b.element, Math.atan2(b.vy, b.vx), 130);
            if (b.split > 0 && this.pendingBullets.length < 48
                && this.bullets.length < Game.MAX_BULLETS - 40) {
              // Queue fragments rather than pushing mid-iteration.
              const base = Math.atan2(b.vy, b.vx);
              for (let k = 0; k < b.split; k++) {
                const ang = base + (k - (b.split - 1) / 2) * 0.7 + rand(-0.1, 0.1);
                this.pendingBullets.push({
                  x: b.x, y: b.y, a: ang, sp: Math.hypot(b.vx, b.vy) * 0.75,
                  dmg: b.dmg * 0.5, r: b.r * 0.7, color: b.color, el: b.element,
                });
              }
            }
            if (b.explode) {
              this.explode(b.x, b.y, b.explode, b.dmg * 0.4, b.color, b.element);
              dead = true; break outer;
            }
            if (b.pierce > 0) { b.pierce--; b.dmg *= 0.86; }
            else { dead = true; break outer; }
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
    // spawn queued fragments now that iteration is finished
    if (this.pendingBullets.length) {
      for (const q of this.pendingBullets) {
        if (this.bullets.length >= Game.MAX_BULLETS) break;
        this.spawnBullet(q.x, q.y, q.a, q.sp, q.dmg, q.r, q.color, q.el, 0, { life: 0.5, split: 0 });
      }
      this.pendingBullets.length = 0;
    }
  }

  explode(x: number, y: number, r: number, dmg: number, color: string, el: Element) {
    this.addZone({ kind: "boom", x, y, r: 6, maxR: r, life: 0.26, maxLife: 0.26, dmg, color, element: el, hits: new Set(), angle: 0, tick: 0, friendly: true });
    this.burst(x, y, 10, color, 280);
    this.addShake(2.5);
  }

  updateZones(dt: number) {
    // Zones may be added (and marked dead) from inside this loop via
    // kill-triggered effects, so iterate defensively and sweep at the end.
    this.zonesLocked = true;
    const n = this.zones.length;
    for (let i = n - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (!z) continue;
      z.life -= dt;
      if (z.kind === "aura" || z.kind === "hole") { z.x = z.kind === "aura" ? this.px : z.x; z.y = z.kind === "aura" ? this.py : z.y; }
      if (z.kind === "nova" || z.kind === "boom") {
        const t = 1 - z.life / z.maxLife;
        z.r = z.maxR * Math.min(1, t * 1.4);
        const lim = z.r + 60;
        for (const e of this.enemies) {
          if (e.hp <= 0 || z.hits.has(e.id)) continue;
          // cheap axis reject before the squared-distance test
          if (Math.abs(e.x - z.x) > lim || Math.abs(e.y - z.y) > lim) continue;
          if (d2(e.x, e.y, z.x, z.y) < (z.r + e.r) ** 2) {
            z.hits.add(e.id);
            this.hitEnemy(e, z.dmg, z.element, Math.atan2(e.y - z.y, e.x - z.x), 320, true, false);
          }
        }
      } else if (z.kind === "cone" || z.kind === "swipe") {
        const sweep = z.kind === "swipe" ? (1 - z.life / z.maxLife) : 0.5;
        const lim = z.r + 60;
        for (const e of this.enemies) {
          if (e.hp <= 0 || z.hits.has(e.id)) continue;
          if (Math.abs(e.x - z.x) > lim || Math.abs(e.y - z.y) > lim) continue;
          const dx = e.x - z.x, dy = e.y - z.y;
          const dd = Math.hypot(dx, dy);
          if (dd > z.r + e.r) continue;
          const arc = z.arc ?? 0.7;
          if (arc < TAU - 0.01) {
            const a = Math.atan2(dy, dx);
            // a swipe's active edge travels across the arc over its lifetime
            const centre = z.kind === "swipe" ? z.angle - arc / 2 + arc * sweep : z.angle;
            const half = z.kind === "swipe" ? arc * 0.3 : arc / 2;
            const diff = Math.abs(((a - centre + Math.PI * 3) % TAU) - Math.PI);
            if (diff > half) continue;
          }
          z.hits.add(e.id);
          this.hitEnemy(e, z.dmg, z.element, Math.atan2(dy, dx), z.knock ?? 240);
        }
      } else if (z.kind === "decay") {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.3;
          const lim = z.r + 60;
          for (const e of this.enemies) {
            if (e.hp <= 0) continue;
            if (Math.abs(e.x - z.x) > lim || Math.abs(e.y - z.y) > lim) continue;
            if (d2(e.x, e.y, z.x, z.y) < (z.r + e.r) ** 2)
              this.hitEnemy(e, z.dmg, "void", 0, 0, false, false);
          }
        }
        if (this.fxBudget > 0 && Math.random() < dt * 5) {
          this.fxBudget--;
          const a = Math.random() * TAU, rr = Math.random() * z.r;
          this.particles.push({ x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr,
            vx: 0, vy: -26, life: 0.6, max: 0.6, size: 3, color: "#a86bff", kind: "spark" });
        }
      } else if (z.kind === "aura") {
        const lim = z.r + 60;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (Math.abs(e.x - z.x) > lim || Math.abs(e.y - z.y) > lim) continue;
          if (d2(e.x, e.y, z.x, z.y) < (z.r + e.r) ** 2) this.hitEnemy(e, z.dmg * 0.7, z.element, Math.atan2(e.y - z.y, e.x - z.x), 20, false, false);
        }
      } else if (z.kind === "hole") {
        z.tick -= dt;
        const tickNow = z.tick <= 0;
        if (tickNow) z.tick = 0.4;
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.boss) continue;
          const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy);
          if (d < z.r && d > 1) {
            e.x += (dx / d) * 150 * dt; e.y += (dy / d) * 150 * dt;
            if (tickNow) this.hitEnemy(e, z.dmg * 0.6, z.element, 0, 0, false, false);
          }
        }
        if (Math.random() < dt * 30) {
          const a = Math.random() * TAU;
          this.particles.push({ x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, vx: -Math.cos(a) * 260, vy: -Math.sin(a) * 260, life: 0.45, max: 0.45, size: 3, color: z.color, kind: "spark" });
        }
      } else if (z.kind === "beam") {
        z.angle += dt * (z.friendly === false ? 0.55 : 1.4);
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.1;
          if (z.friendly === false) {
            const dx = this.px - z.x, dy = this.py - z.y;
            const proj = dx * Math.cos(z.angle) + dy * Math.sin(z.angle);
            const perp = Math.abs(-dx * Math.sin(z.angle) + dy * Math.cos(z.angle));
            if (proj > 0 && proj < z.maxR && perp < z.r + this.pr) this.hurt(z.dmg);
          }
          for (const e of this.enemies) {
            if (e.hp <= 0) continue;
            const dx = e.x - z.x, dy = e.y - z.y;
            const proj = dx * Math.cos(z.angle) + dy * Math.sin(z.angle);
            if (proj < 0 || proj > z.maxR) continue;
            const perp = Math.abs(-dx * Math.sin(z.angle) + dy * Math.cos(z.angle));
            if (perp < z.r + e.r) this.hitEnemy(e, z.dmg * 0.3, z.element, z.angle, 20, false, false);
          }
        }
      } else if (z.kind === "warn") {
        if (z.life <= 0) {
          if (z.data === 2 || z.data === 3) { /* telegraph only */ }
          else if (z.data === 1) {
            if (d2(this.px, this.py, z.x, z.y) < z.r * z.r) this.hurt(z.dmg);
            this.explode(z.x, z.y, z.r, 0, "#ff4d6a", "none");
            sfx.bossSlam();
          } else {
            this.addZone({ kind: "boom", x: z.x, y: z.y, r: 6, maxR: z.r, life: 0.26, maxLife: 0.26, dmg: z.dmg, color: z.color, element: z.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
            this.burst(z.x, z.y, 16, z.color, 320);
            this.addShake(5);
            sfx.smash();
          }
        }
      } else if (z.kind === "mine") {
        let trig = false;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (d2(e.x, e.y, z.x, z.y) < (26 + e.r) ** 2) { trig = true; break; }
        }
        if (trig || z.life <= 0) {
          this.addZone({ kind: "boom", x: z.x, y: z.y, r: 6, maxR: z.maxR, life: 0.26, maxLife: 0.26, dmg: z.dmg, color: z.color, element: z.element, hits: new Set(), angle: 0, tick: 0, friendly: true });
          this.burst(z.x, z.y, 14, z.color, 300);
          this.addShake(4);
          sfx.hit();
          z.life = -1;
        }
      } else if (z.kind === "decoy") {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(z.x - e.x, z.y - e.y);
          if (d < 320 && d > 1) { e.vx += ((z.x - e.x) / d) * 220 * dt; e.vy += ((z.y - e.y) / d) * 220 * dt; }
          if (d < 34) { z.hp = (z.hp || 0) - 60 * dt; }
        }
        if ((z.hp || 0) <= 0 || z.life <= 0) {
          this.addZone({ kind: "boom", x: z.x, y: z.y, r: 6, maxR: 180, life: 0.3, maxLife: 0.3, dmg: z.dmg, color: z.color, element: "fire", hits: new Set(), angle: 0, tick: 0, friendly: true });
          this.addShake(8); sfx.smash();
          z.life = -1;
        }
      }
      // removal happens in the sweep below, never mid-iteration
    }
    this.zonesLocked = false;
    if (this.zones.some((z) => z.life <= 0))
      this.zones = this.zones.filter((z) => z.life > 0);
  }

  updateTurrets(dt: number) {
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      t.life -= dt;
      if (t.life <= 0) { this.burst(t.x, t.y, 8, t.color, 180, "smoke"); this.turrets.splice(i, 1); continue; }
      t.cd -= dt * this.hasteNow;
      if (t.cd <= 0) {
        const e = this.nearestEnemy(t.x, t.y, 520);
        if (e) {
          t.cd = 0.45;
          const a = Math.atan2(e.y - t.y, e.x - t.x);
          this.spawnBullet(t.x, t.y, a, 540, t.dmg, 7, t.color, "none", 0);
        } else t.cd = 0.2;
      }
    }
  }

  updateGems(dt: number) {
    const range = 86 * this.stats.magnet;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.t += dt;
      g.x += g.vx * dt; g.y += g.vy * dt;
      g.vx *= Math.pow(0.02, dt); g.vy *= Math.pow(0.02, dt);
      const d = Math.hypot(this.px - g.x, this.py - g.y);
      const r = g.kind === "item" ? 40 : range;
      if (d < r && d > 1) {
        const pull = clamp((r - d) / r, 0, 1) * 620;
        g.x += ((this.px - g.x) / d) * pull * dt;
        g.y += ((this.py - g.y) / d) * pull * dt;
      }
      if (d < this.pr + 14) {
        this.gems.splice(i, 1);
        if (g.kind === "xp") { this.gainXp(g.v); if (Math.random() < 0.25) sfx.blip(); }
        else if (g.kind === "coin") {
          this.coins += g.v; this.runCoins += g.v;
          if (this.effects.has("greed")) this.gainXp(g.v * 0.6);
          this.txt(this.px, this.py - 30, `+${g.v}¥`, "#ffd166", 13);
          sfx.pickup();
        } else if (g.kind === "hp") {
          const surg = this.hasElite("e_scavenger");
          this.hp = Math.min(this.stats.maxHp, this.hp + g.v * (surg ? 2 : 1));
          if (surg) this.invuln = Math.max(this.invuln, 4);
          this.txt(this.px, this.py - 34, `+${Math.round(g.v)} HP`, "#7dffb8", 14);
          sfx.pickup();
        } else if (g.kind === "item" && g.item) {
          const res = this.addItem(g.item);
          if (res) {
            this.flash("#ffe066", 0.25);
            this.burst(this.px, this.py, 22, "#ffe066", 320, "star");
            sfx.upgrade();
            this.lootQueue.push(res.item);     // shown on a confirm screen
            this.openNextPanel();
          } else { this.coins += 10; this.runCoins += 10; this.txt(this.px, this.py - 30, "+60¥", "#ffd166", 14); }
        }
      }
    }
  }

  /** Keeps 2-3 chests live on the map at all times, preferring room interiors. */
  spawnChest() {
    const rooms = this.world.buildings.filter((b) => b.kind === "room");
    for (let i = 0; i < 40; i++) {
      let x: number, y: number;
      if (rooms.length && Math.random() < 0.7) {
        const b = pick(rooms);
        x = b.x + b.w / 2; y = b.y + b.h / 2;
      } else {
        const p = this.roadPoint(this.px, this.py, 820);
        x = p.x; y = p.y;
      }
      if (this.solidAt(x, y)) continue;
      if (d2(x, y, this.px, this.py) < 260 * 260) continue;
      if (this.chests.some((c) => d2(c.x, c.y, x, y) < 300 * 300)) continue;
      this.chests.push({ x, y, open: false, t: 0 });
      return;
    }
  }

  updateChests(dt: number) {
    if (this.inArena) return;          // arena rewards come from spoils
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const c = this.chests[i];
      c.t += dt;
      if (c.open && c.t > 2) this.chests.splice(i, 1);
    }
    // Strictly one chest at a time, on a 30s timer. Gear should feel earned.
    const live = this.chests.filter((c) => !c.open).length;
    if (live > 0) return;
    this.chestTimer -= dt;
    if (this.chestTimer <= 0) {
      this.chestTimer = 30;
      this.spawnChest();
    }
  }

  openChest(c: { x: number; y: number; open: boolean; t: number }) {
    c.open = true; c.t = 0;
    this.burst(c.x, c.y, 26, "#ffe066", 320, "star");
    this.ring(c.x, c.y, "#ffe066", 26);
    this.flash("#ffe066", 0.3);
    sfx.upgrade();
    // Chests roll their reward on a spinning reel rather than dropping it.
    const prize = this.makeItem();
    if (prize) this.startRoll(prize);
    const amount = Math.round(50 * this.stats.coinGain);
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * TAU;
      this.gems.push({ x: c.x, y: c.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, v: Math.round(amount / 5), kind: "coin", t: 0 });
    }
    this.dropXp(c.x, c.y, this.xpNeeded() * 0.35, 10);
  }

  /** Faint cone preview so melee classes can actually aim their strikes. */
  drawMeleeGuide(ctx: CanvasRenderingContext2D) {
    const w = this.weapons.find((x) => {
      const d = WEAPON_BY_ID[x.id];
      return d && (d.behavior === "cone" || d.behavior === "swipe");
    });
    if (!w) return;
    const def = WEAPON_BY_ID[w.id];
    const st = weaponStats(def, w.level);
    const reach = st.radius * this.stats.area;
    const arc = def.behavior === "swipe"
      ? (def.id === "spinkick" ? TAU : 1.9 + this.stats.area * 0.25)
      : (0.62 + this.stats.area * 0.14) * (def.id === "shockpalm" ? 0.55 : 1);
    const col = this.elementPath ? ELEMENTS[this.elementPath].color : "#ffffff";
    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.rotate(this.aim);
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, -arc / 2, arc / 2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, reach, -arc / 2, arc / 2); ctx.stroke();
    ctx.restore();
  }

  static MAX_PARTICLES = 700;

  updateParticles(dt: number) {
    // Compaction instead of splice(): the old version removed expired
    // particles with splice(i,1) inside a loop, which is O(n^2) once the
    // list is large. Void/ice builds pinned the 700 cap every frame, so this
    // was the single biggest cost in those runs. One pass, zero shifting.
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.kind;
      if (k === "spark" || k === "star") { const f = Math.pow(0.09, dt); p.vx *= f; p.vy *= f; }
      else if (k === "smoke") { const f = Math.pow(0.3, dt); p.vx *= f; p.vy *= f; }
      else if (k === "text") p.vy += 46 * dt;
      else if (k === "heart") p.vy -= 22 * dt;
      ps[w++] = p;
    }
    // drop the oldest overflow in the same pass rather than a second splice
    if (w > Game.MAX_PARTICLES) {
      const over = w - Game.MAX_PARTICLES;
      for (let i = 0; i < Game.MAX_PARTICLES; i++) ps[i] = ps[i + over];
      w = Game.MAX_PARTICLES;
    }
    ps.length = w;
  }

  pushUi() {
    const d = this.districtAt(this.px, this.py);
    const ds = DISTRICTS[d];
    this.onUi({
      state: this.state, level: this.level, xp: this.xp, xpNeed: this.xpNeeded(),
      hp: Math.max(0, Math.round(this.hp)), maxHp: Math.round(this.stats.maxHp),
      coins: Math.round(this.coins), kills: this.kills, time: this.time,
      weapons: this.weapons.map((w) => ({ ...w })),
      passives: this.passives.map((p) => ({ ...p })),
      items: this.items,
      actives: this.actives.map((a) => ({ id: a.id, cd: a.cd, max: ACTIVE_BY_ID[a.id].cd * this.stats.cdr })),
      waifu: this.waifu ? { ...this.waifu } : null,
      elementPath: this.elementPath,
      quest: this.quest,
      bosses: this.bosses.slice(0, 3).map((b) => ({
        name: b.boss!.name, jp: b.boss!.jp,
        hp: Math.max(0, b.hp), maxHp: b.maxHp,
        guard: b.guard || 0, guardMax: b.guardMax || 0, milestone: !!b.milestone,
      })),
      gate: this.milestoneBossPending
        ? { level: this.pendingMilestoneLevel, stage: "fight", remaining: this.bosses.length }
        : (this.level + 1) % 25 === 0 && this.bosses.length > 0
          ? { level: this.level + 1, stage: "clear", remaining: this.bosses.length }
          : null,
      nearShop: !!this.inSafeZone(),
      act: { id: this.act.id, name: this.act.name, jp: this.act.jp, index: this.actIndex,
             total: ACTS.length, from: this.act.from, to: this.act.to },
      actCleared: this.actCleared,
      statPoints: this.statPoints,
      spent: { ...this.spent },
      procs: this.procs.map((p) => ({
        id: p.id, name: p.def.name,
        icon: UNIQUE_BY_ID[p.id] ? ITEM_BASES[UNIQUE_BY_ID[p.id].base] ? "⚡" : "⚡" : "⚡",
        cd: this.procCd[p.id] || 0, max: p.def.cd,
      })),
      shieldHp: Math.round(this.shieldHp), empowerT: this.empowerT,
      leechLock: this.leechLock, elites: [...this.elites],
      boons: [...this.boons], legends: [...this.legends], masteries: { ...this.masteries },
      guns: this.guns.map((g) => {
        const d = GUN_BY_ID[g.id];
        const st = d ? this.gunStat(d) : { mag: 0, reload: 1, dmg: 0 };
        return { id: g.id, ammo: g.ammo, mag: st.mag, reloadT: g.reloadT, reloadMax: st.reload };
      }),
      primaryGun: this.primaryGun,
      rampStacks: this.rampStacks, apexKills: this.apexKills, rezT: this.legendRezT,
      arena: this.inArena ? (() => {
        const g = GAUNTLET[this.arenaRound - 1];
        const endless = !g && this.arenaRound > 0;
        return {
          active: true, round: this.arenaRound, best: this.arenaBest, endless,
          label: g ? g.title : endless ? `Endless ${this.arenaRound - GAUNTLET.length}` : "Entering…",
          jp: g ? g.jp : "無限",
        };
      })() : null,
      district: ds.label, districtJp: ds.jp,
      dps: Math.round(this.dps), enemies: this.enemies.length,
    });
  }

  // ================= rendering =================
  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#07090f";
    ctx.fillRect(0, 0, this.vw, this.vh);
    const cineK = this.cineT > 0 ? 1 + Math.sin(clamp(this.cineT / 4.6, 0, 1) * Math.PI) * 0.22 : 1;
    const z = this.zoom * cineK;
    ctx.save();
    ctx.translate(this.vw / 2 + this.sx, this.vh / 2 + this.sy);
    ctx.scale(z, z);
    ctx.translate(-this.camx, -this.camy);

    const vw = this.vw / z, vh = this.vh / z;
    const L = this.camx - vw / 2 - 80, R = this.camx + vw / 2 + 80;
    const T = this.camy - vh / 2 - 80, B = this.camy + vh / 2 + 200;

    this.drawGround(ctx, L, T, R, B);
    this.drawInteriors(ctx, L, T, R, B);
    this.drawQuestMarker(ctx);
    this.drawZonesUnder(ctx);
    this.drawProps(ctx, L, T, R, B, false);
    this.drawGems(ctx, L, T, R, B);
    this.drawChests(ctx, L, T, R, B);
    this.drawTurrets(ctx);
    this.drawEnemies(ctx, L, T, R, B);
    this.drawDog(ctx);
    this.drawWaifu(ctx);
    if (this.state !== "menu" && this.state !== "gameover") this.drawMeleeGuide(ctx);
    if (this.state !== "menu") this.drawPlayer(ctx);
    this.drawOrbitals(ctx);
    this.drawProcOrbits(ctx);
    this.drawProps(ctx, L, T, R, B, true);
    this.drawBuildings(ctx, L, T, R, B);
    this.drawBullets(ctx);
    this.drawZonesOver(ctx);
    this.drawParticles(ctx);
    ctx.restore();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.flashA > 0.01) {
      ctx.globalAlpha = Math.min(0.85, this.flashA);
      ctx.fillStyle = this.flashC;
      ctx.fillRect(0, 0, this.vw, this.vh);
      ctx.globalAlpha = 1;
    }
    if (this.hurtFlash > 0.01) {
      const g = ctx.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.2, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.7);
      g.addColorStop(0, "rgba(255,0,60,0)");
      g.addColorStop(1, `rgba(255,0,60,${0.6 * this.hurtFlash})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.vw, this.vh);
    }
    if (this.act.ablaze) {
      // heat haze + ember rain over the whole screen
      ctx.fillStyle = `rgba(120,30,8,${0.12 + Math.sin(this.time * 1.6) * 0.03})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
      if (Math.random() < 0.6) {
        this.particles.push({
          x: this.camx + rand(-this.vw / 2, this.vw / 2) / this.zoom,
          y: this.camy - this.vh / 2 / this.zoom - 20,
          vx: rand(-20, 20), vy: rand(60, 170), life: rand(1.2, 2.6), max: 2.6,
          size: rand(2, 4), color: "#ff8f3c", kind: "spark",
        });
      }
    }
    if (this.slowMoT > 0) {
      ctx.fillStyle = `rgba(120,200,255,${0.08 * Math.min(1, this.slowMoT)})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
    const vg = ctx.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.32, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, this.vw, this.vh);
    if (this.cineT > 0) this.drawCinematic(ctx);
    if (this.state === "playing" || this.state === "paused") {
      this.drawGuideArrows(ctx);
      this.drawMinimap(ctx);
      this.drawStick(ctx);
    }
  }

  drawGround(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number) {
    const gx0 = Math.max(0, Math.floor(L / CELL)), gx1 = Math.min(GRID - 1, Math.ceil(R / CELL));
    const gy0 = Math.max(0, Math.floor(T / CELL)), gy1 = Math.min(GRID - 1, Math.ceil(B / CELL));
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const d = this.world.districtOf[gy * GRID + gx];
        const A = this.act;
        const st = { ground: A.ground, road: A.road, mark: A.mark, glow: A.glow,
                     label: DISTRICTS[d].label, jp: DISTRICTS[d].jp };
        const x = gx * CELL, y = gy * CELL;
        const isB = isBuildingCell(gx, gy) && this.world.grid[gy * GRID + gx];
        ctx.fillStyle = isB ? st.ground[0] : (gx + gy) % 2 ? st.road : st.ground[1];
        ctx.fillRect(x, y, CELL, CELL);
        if (!isB && (this.act.id === "dojo" || this.act.id === "inferno")) {
          // raked gravel courtyards framed by stone edging
          const burn = this.act.ablaze;
          ctx.fillStyle = burn ? "#6b3522" : "#cdbb92";
          ctx.fillRect(x + 26, y + 26, CELL - 52, CELL - 52);
          ctx.strokeStyle = burn ? "#3a1a10" : "#8a7a58";
          ctx.lineWidth = 4;
          ctx.strokeRect(x + 26, y + 26, CELL - 52, CELL - 52);
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = burn ? "#ffb07a" : "#ffffff";
          ctx.lineWidth = 2;
          for (let k = 1; k < 7; k++) {
            ctx.beginPath();
            ctx.moveTo(x + 30, y + 26 + k * ((CELL - 52) / 7));
            ctx.lineTo(x + CELL - 30, y + 26 + k * ((CELL - 52) / 7));
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          // vermillion walkway through the middle
          if (gx % 2 === 0 || gy % 2 === 0) {
            ctx.fillStyle = burn ? "#7a2a16" : "#b3412f";
            if (gx % 2 === 0) ctx.fillRect(x + CELL / 2 - 26, y, 52, CELL);
            if (gy % 2 === 0) ctx.fillRect(x, y + CELL / 2 - 26, CELL, 52);
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = burn ? "#ff8f3c" : "#e8b27a";
            if (gx % 2 === 0) for (let k = 0; k < 6; k++) ctx.fillRect(x + CELL / 2 - 26, y + k * (CELL / 6), 52, 3);
            if (gy % 2 === 0) for (let k = 0; k < 6; k++) ctx.fillRect(x + k * (CELL / 6), y + CELL / 2 - 26, 3, 52);
            ctx.globalAlpha = 1;
          }
          // cherry petals drifting over the moss
          if ((gx * 5 + gy * 11) % 3 === 0 && !burn) {
            ctx.globalAlpha = 0.5;
            for (let k = 0; k < 5; k++) {
              const px2 = x + ((k * 83 + gx * 37) % (CELL - 60)) + 30;
              const py2 = y + ((k * 57 + gy * 29) % (CELL - 60)) + 30;
              ctx.fillStyle = "#ffc3dd";
              ctx.beginPath(); ctx.ellipse(px2, py2, 4, 2.6, k * 1.1, 0, TAU); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        } else if (!isB) {
          ctx.strokeStyle = st.mark;
          ctx.lineWidth = 3;
          ctx.setLineDash([24, 28]);
          ctx.beginPath();
          if (gx % 2 === 0) { ctx.moveTo(x + CELL / 2, y); ctx.lineTo(x + CELL / 2, y + CELL); }
          if (gy % 2 === 0) { ctx.moveTo(x, y + CELL / 2); ctx.lineTo(x + CELL, y + CELL / 2); }
          ctx.stroke();
          ctx.setLineDash([]);
          if ((gx * 7 + gy * 13) % 4 === 0) {
            ctx.globalAlpha = 0.09;
            ctx.fillStyle = st.glow;
            ctx.beginPath();
            ctx.ellipse(x + CELL * 0.5, y + CELL * 0.6, 84, 40, 0, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  drawInteriors(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number) {
    for (const b of this.world.buildings) {
      if (b.kind === "solid") continue;
      if (b.x > R || b.x + b.w < L || b.y > B || b.y + b.h < T) continue;
      ctx.fillStyle = b.floor;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(b.x + (b.w / 5) * i, b.y); ctx.lineTo(b.x + (b.w / 5) * i, b.y + b.h); ctx.stroke();
      }
      if (b.kind === "konbini") {
        // door arrow so the entrance is obvious from outside
        const dp = doorPoint(b);
        if (d2(dp.x, dp.y, this.px, this.py) < 300 * 300 && !this.inSafeZone()) {
          ctx.save();
          ctx.globalAlpha = 0.6 + Math.sin(this.time * 5) * 0.25;
          ctx.fillStyle = "#7dffb8";
          ctx.beginPath();
          ctx.moveTo(dp.x, dp.y - 6); ctx.lineTo(dp.x - 9, dp.y - 20); ctx.lineTo(dp.x + 9, dp.y - 20);
          ctx.closePath(); ctx.fill();
          ctx.font = "900 10px system-ui"; ctx.textAlign = "center";
          ctx.fillText("ENTER", dp.x, dp.y - 24);
          ctx.restore();
        }
        ctx.fillStyle = "rgba(120,255,190,0.08)";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // shelves
        ctx.fillStyle = "#3e5a66";
        ctx.fillRect(b.x + 30, b.y + 36, b.w - 60, 14);
        ctx.fillRect(b.x + 30, b.y + 72, b.w - 60, 14);
        // counter + vendor
        const cx = b.x + b.w / 2, cy = b.y + b.h - 54;
        ctx.fillStyle = "#56707d";
        ctx.fillRect(cx - 52, cy, 104, 18);
        this.drawVendor(ctx, cx, cy - 18);
        ctx.save();
        ctx.shadowColor = "#7dffb8"; ctx.shadowBlur = 12;
        ctx.fillStyle = "#7dffb8";
        ctx.font = "bold 13px 'Noto Sans JP',system-ui";
        ctx.textAlign = "center";
        ctx.fillText("SAFE ZONE · 安全", b.x + b.w / 2, b.y + b.h - 14);
        ctx.restore();
      }
    }
  }

  drawVendor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const t = this.time * 2;
    ctx.save();
    ctx.translate(x, y + Math.sin(t) * 1.5);
    ctx.fillStyle = "#e8f4ff";
    ctx.beginPath(); ctx.roundRect(-12, -6, 24, 22, 7); ctx.fill();
    ctx.fillStyle = "#2f8f6a";
    ctx.fillRect(-12, -6, 24, 7);
    ctx.fillStyle = "#f6d6b8";
    ctx.beginPath(); ctx.arc(0, -14, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3a2a20";
    ctx.beginPath(); ctx.arc(0, -16, 10.5, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath(); ctx.arc(-3.5, -13, 1.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -13, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawProps(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number, tall: boolean) {
    for (const p of this.world.props) {
      if (p.x < L || p.x > R || p.y < T || p.y > B) continue;
      const isTall = p.kind === "tree" || p.kind === "vending" || p.kind === "torii" || p.kind === "lamp"
        || p.kind === "sign" || p.kind === "pillar" || p.kind === "totem" || p.kind === "lantern" || p.kind === "goalpost";
      if (isTall !== tall) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      switch (p.kind) {
        case "pillar": {
          const burn = this.act.ablaze;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath(); ctx.ellipse(0, 10, 20, 8, 0, 0, TAU); ctx.fill();
          // lacquered vermillion column
          const pg = ctx.createLinearGradient(-15, 0, 15, 0);
          pg.addColorStop(0, burn ? "#5e1f10" : "#8f2b1e");
          pg.addColorStop(0.42, burn ? "#c4451f" : "#d0453a");
          pg.addColorStop(1, burn ? "#4a1a0c" : "#7a2318");
          ctx.fillStyle = pg;
          ctx.fillRect(-15, -62, 30, 72);
          // gold banding
          ctx.fillStyle = burn ? "#ffb07a" : "#e3b23c";
          ctx.fillRect(-17, -58, 34, 5);
          ctx.fillRect(-17, -10, 34, 5);
          // green-tiled capital and stone base
          ctx.fillStyle = burn ? "#6b3a1f" : "#2f6b4f";
          ctx.fillRect(-21, -74, 42, 12);
          ctx.fillStyle = burn ? "#8a4a28" : "#3f8a66";
          ctx.fillRect(-23, -78, 46, 5);
          ctx.fillStyle = "#7a7468";
          ctx.fillRect(-19, 4, 38, 10);
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          ctx.fillRect(-11, -60, 4, 66);
          if (burn && Math.random() < 0.25)
            this.particles.push({ x: p.x + rand(-14, 14), y: p.y - 60, vx: rand(-14, 14), vy: rand(-70, -30),
              life: rand(0.4, 0.9), max: 0.9, size: rand(2, 5), color: "#ff8f3c", kind: "spark" });
          break;
        }
        case "totem": {
          const burn = this.act.ablaze;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath(); ctx.ellipse(0, 10, 18, 7, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = burn ? "#52291b" : "#6b4a2a";
          ctx.fillRect(-13, -76, 26, 86);
          ctx.fillStyle = burn ? "#7a3a1c" : "#2f6b4f";      // jade cap
          ctx.fillRect(-16, -82, 32, 8);
          for (let i = 0; i < 3; i++) {
            const yy = -66 + i * 26;
            ctx.fillStyle = burn ? "#2a1008" : "#b3412f";     // vermillion panel
            ctx.fillRect(-10, yy, 20, 20);
            ctx.strokeStyle = burn ? "#ff8f3c" : "#e3b23c";   // gold outline
            ctx.lineWidth = 1.4;
            ctx.strokeRect(-10, yy, 20, 20);
            ctx.fillStyle = burn ? "#ffcf5c" : "#ffd98f";
            ctx.fillRect(-7, yy + 5, 5, 4); ctx.fillRect(2, yy + 5, 5, 4);
            ctx.fillRect(-5, yy + 13, 10, 3);
          }
          break;
        }
        case "lantern": {
          const burn = this.act.ablaze;
          ctx.fillStyle = "#2a2318"; ctx.fillRect(-2.5, -52, 5, 56);
          ctx.fillStyle = burn ? "#ff5a2f" : "#d94f3d";
          ctx.beginPath(); ctx.roundRect(-11, -74, 22, 26, 7); ctx.fill();
          ctx.save(); ctx.shadowColor = burn ? "#ff7a2f" : "#ffc46b"; ctx.shadowBlur = 22;
          ctx.fillStyle = burn ? "#ffb07a" : "#ffe9a8";
          ctx.beginPath(); ctx.roundRect(-8, -71, 16, 20, 5); ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 0.08; ctx.fillStyle = burn ? "#ff7a2f" : "#ffe9a8";
          ctx.beginPath(); ctx.ellipse(0, 4, 56, 24, 0, 0, TAU); ctx.fill();
          break;
        }
        case "rack": {
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-16, 6, 32, 6);
          ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-16, -6, 32, 10);
          ctx.fillRect(-14, 2, 4, 10); ctx.fillRect(10, 2, 4, 10);
          // practice weapons leaning in the rack
          for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = i % 2 ? "#cfc0a0" : "#8a7a5a";
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(-12 + i * 8, -6); ctx.lineTo(-16 + i * 8, -40); ctx.stroke();
          }
          break;
        }
        case "brazier": {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath(); ctx.ellipse(0, 10, 15, 6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#3a2a20"; ctx.fillRect(-4, -4, 8, 14);
          ctx.fillStyle = "#5a4436";
          ctx.beginPath(); ctx.ellipse(0, -8, 15, 7, 0, 0, TAU); ctx.fill();
          for (let i = 0; i < 5; i++) {
            const w = Math.sin(this.time * 9 + i * 1.3);
            ctx.globalAlpha = 0.65 + w * 0.2;
            ctx.fillStyle = i % 2 ? "#ffcf5c" : "#ff6a2f";
            ctx.beginPath();
            ctx.ellipse(-8 + i * 4 + w * 2, -18 - Math.abs(w) * 8, 4, 10 + Math.abs(w) * 5, 0, 0, TAU);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (Math.random() < 0.4)
            this.particles.push({ x: p.x + rand(-8, 8), y: p.y - 20, vx: rand(-12, 12), vy: rand(-90, -40),
              life: rand(0.5, 1.1), max: 1.1, size: rand(2, 4), color: "#ff9f43", kind: "spark" });
          break;
        }
        case "bleacher": {
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-32, 10, 64, 6);
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 ? "#3f5a74" : "#4a6a88";
            ctx.fillRect(-30 + i * 4, -6 - i * 9, 60 - i * 8, 10);
          }
          break;
        }
        case "vaultbox": {
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-18, 8, 36, 6);
          ctx.fillStyle = "#b8893f"; ctx.fillRect(-18, -16, 36, 26);
          ctx.fillStyle = "#8a6430";
          for (let i = 0; i < 3; i++) ctx.fillRect(-18, -12 + i * 9, 36, 3);
          ctx.fillStyle = "#e8d9bf"; ctx.fillRect(-18, -20, 36, 6);
          break;
        }
        case "goalpost": {
          ctx.strokeStyle = "#dfe9ff"; ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-26, 10); ctx.lineTo(-26, -34); ctx.lineTo(26, -34); ctx.lineTo(26, 10);
          ctx.stroke();
          ctx.globalAlpha = 0.3; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
          for (let i = -24; i <= 24; i += 8) { ctx.beginPath(); ctx.moveTo(i, -34); ctx.lineTo(i, 8); ctx.stroke(); }
          for (let j = -32; j <= 6; j += 8) { ctx.beginPath(); ctx.moveTo(-26, j); ctx.lineTo(26, j); ctx.stroke(); }
          break;
        }
        case "tree":
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 6, 16, 7, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#5a3a22"; ctx.fillRect(-4, -14, 8, 20);
          ctx.fillStyle = p.seed > 0.7 ? "#ff9fc8" : "#3f8f55";
          ctx.beginPath(); ctx.arc(0, -26, 20, 0, TAU); ctx.fill();
          ctx.fillStyle = p.seed > 0.7 ? "#ffc3dd" : "#58b06c";
          ctx.beginPath(); ctx.arc(-6, -32, 12, 0, TAU); ctx.fill();
          break;
        case "vending":
          ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-14, 6, 28, 7);
          ctx.fillStyle = `hsl(${p.hue},70%,45%)`; ctx.fillRect(-14, -32, 28, 40);
          ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(-10, -28, 20, 22);
          ctx.fillStyle = `hsl(${p.hue},90%,65%)`;
          for (let i = 0; i < 6; i++) ctx.fillRect(-9 + (i % 3) * 7, -27 + Math.floor(i / 3) * 10, 5, 8);
          ctx.save(); ctx.shadowColor = `hsl(${p.hue},90%,60%)`; ctx.shadowBlur = 14;
          ctx.fillStyle = `hsl(${p.hue},90%,70%)`; ctx.fillRect(-14, -34, 28, 3); ctx.restore();
          break;
        case "bench":
          ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-18, -4, 36, 8);
          ctx.fillStyle = "#4a3320"; ctx.fillRect(-18, 4, 5, 6); ctx.fillRect(13, 4, 5, 6);
          break;
        case "torii": {
          const burn2 = this.act.ablaze;
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-26, 8, 52, 6);
          const tc = burn2 ? "#8a2a12" : "#d0362f";
          ctx.fillStyle = tc;
          ctx.fillRect(-24, -52, 9, 60); ctx.fillRect(15, -52, 9, 60);
          ctx.fillStyle = burn2 ? "#2a1008" : "#1f1a18";     // black kasagi
          ctx.beginPath();
          ctx.moveTo(-34, -62); ctx.lineTo(34, -62); ctx.lineTo(30, -52); ctx.lineTo(-30, -52);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = tc;
          ctx.fillRect(-27, -42, 54, 8);
          ctx.fillStyle = burn2 ? "#ffb07a" : "#e3b23c";     // gold plaque
          ctx.fillRect(-8, -50, 16, 10);
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(-22, -50, 3, 56);
          break;
        }
        case "crate":
          ctx.fillStyle = "#7a5a32"; ctx.fillRect(-14, -14, 28, 28);
          ctx.fillStyle = "#9a7342"; ctx.fillRect(-11, -11, 22, 22);
          break;
        case "barrel":
          ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, 10, 13, 5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = `hsl(${p.hue > 180 ? 20 : 200},45%,38%)`;
          ctx.beginPath(); ctx.roundRect(-12, -14, 24, 26, 5); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-12, -6, 24, 3); ctx.fillRect(-12, 3, 24, 3);
          break;
        case "lamp": {
          // tall angular street light with a boxy lantern head — deliberately
          // nothing like the small round XP gems on the floor
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath(); ctx.ellipse(0, 5, 11, 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#39404f"; ctx.fillRect(-5, 0, 10, 5);
          ctx.fillStyle = "#2a2f3c"; ctx.fillRect(-3, -62, 6, 63);
          // arm reaching out to the side
          const dir = p.seed > 0.5 ? 1 : -1;
          ctx.fillRect(0, -64, 20 * dir, 5);
          // lantern housing (trapezoid, warm sodium glow underneath)
          ctx.fillStyle = "#4b5465";
          ctx.beginPath();
          ctx.moveTo(10 * dir, -60); ctx.lineTo(30 * dir, -60);
          ctx.lineTo(26 * dir, -51); ctx.lineTo(14 * dir, -51);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#ffdca0";
          ctx.fillRect(14 * dir - (dir < 0 ? 12 : 0), -52, 12, 3);
          // light cone on the pavement
          ctx.save();
          ctx.globalAlpha = 0.1;
          const lg = ctx.createRadialGradient(20 * dir, 2, 2, 20 * dir, 2, 58);
          lg.addColorStop(0, "#ffdca0");
          lg.addColorStop(1, "rgba(255,220,160,0)");
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.ellipse(20 * dir, 2, 58, 26, 0, 0, TAU); ctx.fill();
          ctx.restore();
          break;
        }
        case "sign":
          ctx.fillStyle = "#1c1c28"; ctx.fillRect(-3, -40, 6, 44);
          ctx.save(); ctx.shadowColor = `hsl(${p.hue},95%,60%)`; ctx.shadowBlur = 18;
          ctx.fillStyle = `hsl(${p.hue},90%,55%)`; ctx.fillRect(-16, -62, 32, 24);
          ctx.fillStyle = "#fff"; ctx.font = "bold 13px 'Noto Sans JP',system-ui"; ctx.textAlign = "center";
          ctx.fillText(p.seed > 0.5 ? "酒" : "麺", 0, -45);
          ctx.restore();
          break;
        case "water":
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#2a6a9a";
          ctx.beginPath(); ctx.ellipse(0, 0, 36, 18, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.25; ctx.fillStyle = "#9fe8ff";
          ctx.beginPath(); ctx.ellipse(Math.sin(this.time + p.seed * 9) * 6, 0, 24, 9, 0, 0, TAU); ctx.fill();
          break;
        case "car":
          ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-24, -12, 48, 28);
          ctx.fillStyle = `hsl(${p.hue},55%,45%)`;
          ctx.beginPath(); ctx.roundRect(-23, -13, 46, 26, 7); ctx.fill();
          ctx.fillStyle = "rgba(180,230,255,0.75)";
          ctx.fillRect(-16, -8, 32, 8);
          ctx.fillStyle = "#11131c";
          ctx.fillRect(-20, 10, 10, 5); ctx.fillRect(10, 10, 10, 5);
          break;
      }
      ctx.restore();
    }
  }

  drawBuildings(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number) {
    for (const b of this.world.buildings) {
      if (b.x > R || b.x + b.w < L || b.y > B || b.y + b.h < T) continue;
      const h = b.height;
      const nearPlayer = this.px > b.x - 40 && this.px < b.x + b.w + 40 && this.py > b.y - h - 60 && this.py < b.y + b.h + 40;
      ctx.save();
      if (nearPlayer) ctx.globalAlpha = b.kind === "solid" ? 0.45 : 0.78;
      if (b.kind === "solid") {
        ctx.fillStyle = b.shade; ctx.fillRect(b.x, b.y - h, b.w, b.h + h);
        ctx.fillStyle = b.top; ctx.fillRect(b.x, b.y - h, b.w, b.h * 0.4);
        ctx.fillStyle = "rgba(255,230,150,0.5)";
        const cols = Math.max(2, Math.floor(b.w / 36)), rows = Math.max(2, Math.floor((b.h + h) / 42));
        const sa = ctx.globalAlpha;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const seed = (r * 31 + c * 17 + Math.floor(b.x) + Math.floor(b.y)) % 11;
          if (seed > 5) continue;
          ctx.globalAlpha = sa * (b.lit ? 0.3 + (seed % 3) * 0.2 : 0.1);
          ctx.fillRect(b.x + 10 + (c * (b.w - 16)) / cols, b.y - h + 10 + (r * (b.h + h - 18)) / rows, 12, 14);
        }
        ctx.globalAlpha = sa;
      } else {
        for (const r of b.rects) {
          ctx.fillStyle = b.shade;
          ctx.fillRect(r.x, r.y - h, r.w, r.h + h);
          ctx.fillStyle = b.top;
          ctx.fillRect(r.x, r.y - h, r.w, Math.min(r.h, 12));
        }
      }
      // sign
      ctx.shadowColor = `hsl(${b.signHue},95%,60%)`;
      ctx.shadowBlur = 18;
      ctx.fillStyle = `hsl(${b.signHue},95%,72%)`;
      ctx.font = "bold 18px 'Noto Sans JP',system-ui";
      ctx.textAlign = "center";
      ctx.fillText(b.sign, b.x + b.w / 2, b.y - h - 6);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  /** Glowing gateway that appears when the act boss falls. */
  drawTunnel(ctx: CanvasRenderingContext2D) {
    const t = this.tunnel;
    if (!t) return;
    const pulse = 1 + Math.sin(t.t * 3) * 0.08;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.globalAlpha = 0.25;
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 150 * pulse);
    g.addColorStop(0, "#ffe066"); g.addColorStop(1, "rgba(255,224,102,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 150 * pulse, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // torii gateway
    ctx.fillStyle = "#d0362f";
    ctx.fillRect(-44, -96, 12, 104); ctx.fillRect(32, -96, 12, 104);
    ctx.fillRect(-58, -108, 116, 15);
    ctx.fillRect(-50, -82, 100, 10);
    // swirling portal
    ctx.save();
    ctx.globalAlpha = 0.85;
    const pg = ctx.createRadialGradient(0, -40, 4, 0, -40, 44);
    pg.addColorStop(0, "#fffbe8"); pg.addColorStop(0.6, "#ffd166"); pg.addColorStop(1, "rgba(255,160,40,0)");
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.ellipse(0, -40, 32 * pulse, 44 * pulse, 0, 0, TAU); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = t.t * 2 + (i / 3) * TAU;
      ctx.fillStyle = "#fff6c4";
      ctx.beginPath(); ctx.arc(Math.cos(a) * 26, -40 + Math.sin(a) * 34, 3, 0, TAU); ctx.fill();
    }
    const waiting = this.gems.some((g) => g.kind === "item");
    ctx.fillStyle = waiting ? "#ff9f9f" : "#ffe066";
    ctx.font = "900 15px system-ui"; ctx.textAlign = "center";
    ctx.fillText(waiting ? "COLLECT YOUR LOOT FIRST" : "ENTER THE PASSAGE", 0, 34);
    ctx.restore();
    if (Math.random() < 0.5)
      this.particles.push({ x: t.x + rand(-30, 30), y: t.y - 10, vx: rand(-10, 10), vy: rand(-70, -20),
        life: rand(0.5, 1.2), max: 1.2, size: rand(2, 5), color: "#ffe066", kind: "spark" });
  }

  drawQuestMarker(ctx: CanvasRenderingContext2D) {
    const q = this.quest;
    if (!q || q.kind === "hunt") return;
    const pulse = 1 + Math.sin(this.time * 3) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath(); ctx.arc(q.x, q.y, q.radius * pulse, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.arc(q.x, q.y, q.radius * pulse, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 16px system-ui"; ctx.textAlign = "center";
    ctx.fillText("📍", q.x, q.y - q.radius - 8);
    ctx.restore();
  }

  drawZonesUnder(ctx: CanvasRenderingContext2D) {
    for (const z of this.zones) {
      if (z.kind === "aura") {
        const g = ctx.createRadialGradient(z.x, z.y, z.r * 0.2, z.x, z.y, z.r);
        g.addColorStop(0, "rgba(255,140,60,0.18)");
        g.addColorStop(1, "rgba(255,80,20,0.02)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      } else if (z.kind === "warn") {
        const t = 1 - z.life / z.maxLife;
        // Green = your own area attacks. Red = incoming enemy danger.
        const col = z.friendly ? "#6dff9a" : "#ff3b53";
        ctx.save();
        ctx.globalAlpha = 0.25 + t * 0.4;
        ctx.strokeStyle = col; ctx.lineWidth = 4;
        if (z.data === 3) {
          // safe pillar — stand inside this
          ctx.globalAlpha = 0.5 + Math.sin(this.time * 6) * 0.15;
          ctx.strokeStyle = "#6dff9a"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = "#6dff9a";
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "#6dff9a";
          ctx.font = "900 13px system-ui"; ctx.textAlign = "center";
          ctx.fillText("SAFE", z.x, z.y + 4);
        } else if (z.data === 2) {
          ctx.beginPath(); ctx.moveTo(z.x, z.y);
          ctx.lineTo(z.x + Math.cos(z.angle) * 1500, z.y + Math.sin(z.angle) * 1500);
          ctx.lineWidth = 10; ctx.stroke();
        } else {
          ctx.setLineDash(z.friendly ? [] : [10, 8]);
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.15 + t * 0.28;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r * t, 0, TAU); ctx.fill();
        }
        ctx.restore();
      } else if (z.kind === "decay") {
        const t = clamp(z.life / z.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.3 * t;
        const dg = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
        dg.addColorStop(0, "#1a0533");
        dg.addColorStop(0.55, "#7b3bd9");
        dg.addColorStop(1, "rgba(120,60,220,0)");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.6 * t;
        ctx.strokeStyle = "#c79bff"; ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.9 + Math.sin(this.time * 4) * 0.05), 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (z.kind === "mine") {
        ctx.save();
        ctx.fillStyle = "#6b4321";
        ctx.beginPath(); ctx.arc(z.x, z.y, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,170,80,${0.5 + Math.sin(this.time * 10) * 0.4})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, 5, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (z.kind === "decoy") {
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.fillStyle = "#ffd9a8";
        ctx.beginPath(); ctx.arc(0, -10, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = "#ff9f43";
        ctx.beginPath(); ctx.roundRect(-11, 0, 22, 18, 6); ctx.fill();
        ctx.restore();
      }
    }
  }

  drawZonesOver(ctx: CanvasRenderingContext2D) {
    for (const z of this.zones) {
      if (z.kind === "cone" || z.kind === "swipe") {
        const t = clamp(z.life / z.maxLife, 0, 1);
        const arc = z.arc ?? 0.7;
        ctx.save();
        ctx.translate(z.x, z.y);
        if (z.kind === "swipe") {
          const sweep = 1 - t;
          const centre = z.angle - arc / 2 + arc * sweep;
          ctx.rotate(centre);
          ctx.globalAlpha = t * 0.9;
          ctx.strokeStyle = z.color;
          ctx.lineWidth = 11 * t + 3;
          ctx.lineCap = "round";
          ctx.shadowColor = z.color; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.arc(0, 0, z.r * 0.82, -arc * 0.3, arc * 0.3); ctx.stroke();
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3 * t + 1;
          ctx.beginPath(); ctx.arc(0, 0, z.r * 0.82, -arc * 0.2, arc * 0.2); ctx.stroke();
        } else {
          ctx.rotate(z.angle);
          // a punch/thrust cone that snaps outward
          const reach = z.r * (0.55 + (1 - t) * 0.45);
          const g = ctx.createLinearGradient(0, 0, reach, 0);
          g.addColorStop(0, z.color);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalAlpha = t;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, reach, -arc / 2, arc / 2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = t * 0.8;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(0, 0, reach, -arc / 2, arc / 2); ctx.stroke();
          // impact knuckle flare at the tip
          ctx.globalAlpha = t;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(reach * 0.82, 0, 6 * t + 2, 0, TAU); ctx.fill();
        }
        ctx.restore();
        continue;
      }
      if (z.kind === "nova" || z.kind === "boom") {
        const t = z.life / z.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, t);
        ctx.strokeStyle = z.friendly === false ? "#ff3b53" : z.color;
        ctx.lineWidth = 8 * t + 2;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = t * 0.22;
        ctx.fillStyle = z.color;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (z.kind === "hole") {
        ctx.save();
        const pulse = 1 + Math.sin(this.time * 8) * 0.05;
        const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r * pulse);
        g.addColorStop(0, "rgba(0,0,0,0.95)");
        g.addColorStop(0.4, "rgba(120,60,220,0.6)");
        g.addColorStop(1, "rgba(120,60,220,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * pulse, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (z.kind === "beam") {
        ctx.save();
        ctx.globalAlpha = clamp(z.life / z.maxLife, 0, 1);
        const bc = z.friendly === false ? "#ff3b53" : z.color;
        ctx.shadowColor = bc; ctx.shadowBlur = 24;
        ctx.strokeStyle = bc;
        ctx.lineWidth = z.r * 2;
        ctx.beginPath(); ctx.moveTo(z.x, z.y);
        ctx.lineTo(z.x + Math.cos(z.angle) * z.maxR, z.y + Math.sin(z.angle) * z.maxR);
        ctx.stroke();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = z.r * 0.6;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawGems(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number) {
    for (const g of this.gems) {
      if (g.x < L || g.x > R || g.y < T || g.y > B) continue;
      const bob = Math.sin(g.t * 5) * 2;
      if (g.kind === "xp") {
        ctx.save();
        ctx.shadowColor = "#54f0ff"; ctx.shadowBlur = 10;
        ctx.fillStyle = g.v > 20 ? "#7dffb8" : g.v > 8 ? "#3ddbff" : "#54f0ff";
        ctx.translate(g.x, g.y + bob);
        ctx.rotate(g.t * 2);
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (g.kind === "coin") {
        ctx.save();
        ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffd166";
        ctx.beginPath(); ctx.ellipse(g.x, g.y + bob, 6 * Math.abs(Math.cos(g.t * 3)) + 2, 7, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (g.kind === "hp") {
        ctx.save();
        ctx.shadowColor = "#7dffb8"; ctx.shadowBlur = 12;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.roundRect(g.x - 9, g.y - 7 + bob, 18, 14, 4); ctx.fill();
        ctx.fillStyle = "#ff5e7a";
        ctx.fillRect(g.x - 2, g.y - 4 + bob, 4, 8); ctx.fillRect(g.x - 5, g.y - 1 + bob, 10, 3);
        ctx.restore();
      } else if (g.kind === "item" && g.item) {
        ctx.save();
        ctx.shadowColor = "#ffe066"; ctx.shadowBlur = 16;
        drawSprite(ctx, g.item.base, g.item.variant, g.x, g.y + bob, 3);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(g.t * 5) * 0.3;
        ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(g.x, g.y + bob, 20, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawChests(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number) {
    for (const c of this.chests) {
      if (c.x < L || c.x > R || c.y < T || c.y > B) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.open) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-16, -4, 32, 16);
      } else {
        ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 14;
        ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-17, -14, 34, 26);
        ctx.fillStyle = "#c98f2e"; ctx.fillRect(-17, -14, 34, 9);
        ctx.fillStyle = "#ffd166"; ctx.fillRect(-4, -6, 8, 9);
        ctx.shadowBlur = 0;
        if (d2(c.x, c.y, this.px, this.py) < 70 * 70) {
          ctx.fillStyle = "#ffe066";
          ctx.font = "bold 11px system-ui"; ctx.textAlign = "center";
          ctx.fillText("E / TAP", 0, -24);
        }
      }
      ctx.restore();
    }
  }

  drawTurrets(ctx: CanvasRenderingContext2D) {
    for (const t of this.turrets) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(0, 8, 14, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#2c3f4a"; ctx.fillRect(-11, -10, 22, 20);
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(0, -4, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(-11, -14 + Math.sin(this.time * 6) * 2, 22, 3);
      ctx.restore();
    }
  }

  drawProcOrbits(ctx: CanvasRenderingContext2D) {
    for (const o of this.procOrbits) {
      const x = this.px + Math.cos(o.angle) * o.r, y = this.py + Math.sin(o.angle) * o.r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.angle * 4);
      ctx.shadowColor = o.color; ctx.shadowBlur = 14;
      ctx.globalAlpha = Math.min(1, o.life);
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.ellipse(-3, -2, 4, 2.4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  drawOrbitals(ctx: CanvasRenderingContext2D) {
    for (const arr of this.orbitals.values()) {
      for (const o of arr) {
        const x = this.px + Math.cos(o.angle) * o.r, y = this.py + Math.sin(o.angle) * o.r;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(o.angle * 3);
        ctx.shadowColor = o.color; ctx.shadowBlur = 14;
        ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.ellipse(0, 0, o.size, o.size * 0.72, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath(); ctx.ellipse(-o.size * 0.25, -o.size * 0.2, o.size * 0.3, o.size * 0.22, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  shadowEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 0.95, r * 0.4, 0, 0, TAU); ctx.fill();
  }

  drawPlayer(ctx: CanvasRenderingContext2D) {
    const x = this.px, y = this.py + Math.sin(this.bob) * 1.5;
    this.shadowEllipse(ctx, x, this.py, this.pr);
    ctx.save();
    if (this.invuln > 0 && Math.floor(this.time * 22) % 2 === 0) ctx.globalAlpha = 0.5;
    if (this.shieldHp > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.time * 7) * 0.12;
      ctx.strokeStyle = "#9fd7ff"; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(x, y - 4, 34, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#9fd7ff";
      ctx.beginPath(); ctx.arc(x, y - 4, 34, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (this.empowerT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.sin(this.time * 12) * 0.2;
      ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y - 2, 27, 0, TAU); ctx.stroke();
      ctx.restore();
      if (Math.random() < 0.4)
        this.particles.push({ x: x + rand(-16, 16), y: y + rand(-10, 14), vx: 0, vy: -70,
          life: 0.4, max: 0.4, size: 3, color: "#ffe066", kind: "spark" });
    }
    if (this.shieldT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 9) * 0.12;
      ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 4, 30, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    const gear = this.gearBySlot();
    const pal = (slot: string, fb: string) => {
      const it = gear[slot];
      return it ? ITEM_VARIANTS[it.variant].pal.a : fb;
    };
    // cape flows out behind you
    if (gear.back) {
      const cp = ITEM_VARIANTS[gear.back.variant].pal;
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.rotate(Math.sin(this.time * 4) * 0.08 - this.aim * 0);
      ctx.fillStyle = cp.a;
      ctx.beginPath();
      ctx.moveTo(-11, -6); ctx.lineTo(11, -6);
      ctx.quadraticCurveTo(15, 14 + Math.sin(this.time * 6) * 2, 0, 20);
      ctx.quadraticCurveTo(-15, 14 - Math.sin(this.time * 6) * 2, -11, -6);
      ctx.fill();
      ctx.fillStyle = cp.c;
      ctx.fillRect(-11, -7, 22, 3);
      ctx.restore();
    }
    // torso (jacket / vest recolours it)
    ctx.fillStyle = pal("body", this.char.colors.top);
    ctx.beginPath(); ctx.roundRect(x - 13, y - 6, 26, 24, 9); ctx.fill();
    if (gear.body) {
      ctx.fillStyle = ITEM_VARIANTS[gear.body.variant].pal.b;
      ctx.fillRect(x - 3, y - 6, 6, 18);
    }
    // legs
    ctx.fillStyle = pal("legs", this.char.colors.bottom); ctx.fillRect(x - 13, y + 10, 26, 8);
    if (this.charId === "karl") { ctx.fillStyle = "#1a1a24"; ctx.fillRect(x - 13, y + 7, 26, 4); }
    if (this.charId === "aidan") { ctx.fillStyle = "#c0392b"; ctx.fillRect(x - 9, y - 4, 18, 14); }
    // shoes
    if (gear.feet) {
      const fp = ITEM_VARIANTS[gear.feet.variant].pal;
      ctx.fillStyle = fp.a;
      ctx.fillRect(x - 13, y + 16, 11, 5); ctx.fillRect(x + 2, y + 16, 11, 5);
      ctx.fillStyle = fp.b;
      ctx.fillRect(x - 13, y + 19, 11, 2); ctx.fillRect(x + 2, y + 19, 11, 2);
    }
    // gloves on the racket hand
    if (gear.hands) {
      ctx.fillStyle = ITEM_VARIANTS[gear.hands.variant].pal.a;
      ctx.beginPath(); ctx.arc(x + Math.cos(this.aim) * 11, y + Math.sin(this.aim) * 11, 4.5, 0, TAU); ctx.fill();
    }
    const CC = this.char.colors;
    // --- head
    ctx.fillStyle = CC.skin;
    ctx.beginPath(); ctx.arc(x, y - 13, 11.5, 0, TAU); ctx.fill();
    // --- per-character head detail
    if (this.charId === "willy") {
      ctx.fillStyle = CC.skin;                       // bald dome
      ctx.beginPath(); ctx.arc(x, y - 15, 11.5, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.ellipse(x - 3, y - 18, 4, 2.4, -0.5, 0, TAU); ctx.fill();
    } else if (this.charId === "andy") {
      ctx.fillStyle = CC.hair;                       // shaggy mop + stubble
      ctx.beginPath(); ctx.arc(x, y - 16, 12, Math.PI, TAU); ctx.fill();
      ctx.fillRect(x - 12, y - 18, 24, 5);
      ctx.fillStyle = "rgba(60,40,20,0.35)";
      ctx.beginPath(); ctx.arc(x, y - 8, 7, 0, Math.PI); ctx.fill();
    } else if (this.charId === "joe") {
      ctx.fillStyle = CC.hair;
      ctx.beginPath(); ctx.arc(x, y - 16, 11.5, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = "#1c242e"; ctx.lineWidth = 3.4;   // headset band
      ctx.beginPath(); ctx.arc(x, y - 14, 12.5, Math.PI * 1.05, TAU * 0.98); ctx.stroke();
      ctx.fillStyle = CC.accent;
      ctx.beginPath(); ctx.roundRect(x - 15, y - 16, 5, 9, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x + 10, y - 16, 5, 9, 2); ctx.fill();
      ctx.fillStyle = "#1c242e";                     // boom mic
      ctx.fillRect(x + 1, y - 8, 9, 1.8);
    } else if (this.charId === "aidan") {
      ctx.fillStyle = CC.hair;
      ctx.beginPath(); ctx.arc(x, y - 16, 11.5, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = "#ffffff";                     // butcher's cap
      ctx.beginPath(); ctx.roundRect(x - 11, y - 25, 22, 9, 4); ctx.fill();
      ctx.fillRect(x - 12, y - 18, 24, 3);
    } else if (this.charId === "karl") {
      ctx.fillStyle = CC.hair;
      ctx.beginPath(); ctx.arc(x, y - 16, 11.5, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = "#ffffff";                     // headband + knot
      ctx.fillRect(x - 12, y - 19, 24, 5);
      ctx.fillStyle = "#e03b3b";
      ctx.beginPath(); ctx.arc(x, y - 16.5, 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 10, y - 17, 5, 12);
    }
    ctx.fillStyle = "#1a1a2a";    // --- signature weapon in hand
    ctx.save();
    ctx.translate(x, y);
    const handAim = (this.meleeFx > 0 ? this.meleeDir : this.aim);
    ctx.rotate(handAim - (this.charId === "karl" ? 0 : 0.2) + Math.sin(this.time * 8) * 0.06);
    const el = this.elementPath ? ELEMENTS[this.elementPath].color : null;
    if (this.charId === "willy") {
      ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(20, 0); ctx.stroke();
      const g = ctx.createLinearGradient(20, -11, 36, 11);
      g.addColorStop(0, el || "#ff3b5c"); g.addColorStop(1, "#c81e3f");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(29, 0, 11, 9.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (this.charId === "andy") {
      ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 3.4;      // bow limbs
      ctx.beginPath(); ctx.arc(12, 0, 17, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = el || "#d8c89a"; ctx.lineWidth = 1.4;  // string
      ctx.beginPath(); ctx.moveTo(12 + Math.cos(-1.25) * 17, Math.sin(-1.25) * 17);
      ctx.lineTo(8, 0); ctx.lineTo(12 + Math.cos(1.25) * 17, Math.sin(1.25) * 17); ctx.stroke();
      ctx.strokeStyle = el || "#f0e6c8"; ctx.lineWidth = 2;    // nocked arrow
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(30, 0); ctx.stroke();
    } else if (this.charId === "joe") {
      ctx.fillStyle = "#2a3340";                               // rifle body
      ctx.beginPath(); ctx.roundRect(8, -4, 26, 8, 2); ctx.fill();
      ctx.fillStyle = "#1c242e";
      ctx.fillRect(12, 3, 6, 7);
      ctx.fillStyle = el || "#6ff5e8";                         // glowing coil
      ctx.fillRect(22, -6, 7, 3);
      ctx.shadowColor = el || "#6ff5e8"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(36, 0, 3.4, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.charId === "aidan") {
      // big butcher's cleaver that swings with the strike
      const sw = this.meleeFx > 0 ? Math.sin((this.meleeFx / 0.3) * Math.PI) : 0;
      ctx.rotate(-sw * 0.9);
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(8, -2.5, 12, 5);
      ctx.fillStyle = "#4a3320";
      ctx.fillRect(8, -2.5, 4, 5);
      const g2 = ctx.createLinearGradient(20, -12, 40, 12);
      g2.addColorStop(0, "#ffffff");
      g2.addColorStop(0.5, el || "#cfe0f5");
      g2.addColorStop(1, el || "#8fa8c8");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(20, -7); ctx.lineTo(40, -13);
      ctx.lineTo(42, 10); ctx.lineTo(20, 7);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";          // honed edge
      ctx.fillRect(20, 5, 22, 2);
      if (el) {                                           // elemental glow
        ctx.save();
        ctx.globalAlpha = 0.45 + sw * 0.4;
        ctx.shadowColor = el; ctx.shadowBlur = 16 + sw * 20;
        ctx.strokeStyle = el; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, -7); ctx.lineTo(40, -13); ctx.lineTo(42, 10); ctx.stroke();
        ctx.restore();
      }
      if (sw > 0.1) {                                     // swing streak
        ctx.globalAlpha = 0.35 * sw;
        ctx.strokeStyle = el || "#ffffff"; ctx.lineWidth = 7; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, 0, 40, -0.9, 0.5); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else if (this.charId === "karl") {
      // bare fists, wrapped — the lead fist thrusts out along the strike
      const punch = this.meleeFx > 0 ? Math.sin((this.meleeFx / 0.3) * Math.PI) : 0;
      const lead = this.meleeAlt > 0 ? -1 : 1;    // alternate left/right fists
      ctx.shadowColor = el || "#fff0c4"; ctx.shadowBlur = 10 + punch * 26;
      // trailing fist stays tucked at the chest
      ctx.fillStyle = el || "#fff0c4";
      ctx.beginPath(); ctx.arc(9, -lead * 8, 5.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(9, -lead * 8, 5.6, 0, TAU); ctx.stroke();
      // lead fist drives forward hard on the strike
      const ext = 13 + punch * 26;
      if (punch > 0.05) {
        ctx.globalAlpha = 0.35 * punch;         // motion streak
        ctx.strokeStyle = el || "#fff0c4";
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(12, lead * 7); ctx.lineTo(ext, lead * 3); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = el || "#fff0c4";
      ctx.beginPath(); ctx.arc(ext, lead * 3, 6.4 + punch * 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ext, lead * 3, 6.4 + punch * 3, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.restore();
    // equipped item glow count
    if (this.items.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y + 2, 24 + Math.sin(this.time * 2) * 1.5, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  drawDog(ctx: CanvasRenderingContext2D) {
    if (!this.char.pet) return;
    const d = this.dog;
    const y = d.y + Math.sin(d.t * 9) * 1.6;
    this.shadowEllipse(ctx, d.x, d.y, 11);
    ctx.save();
    ctx.translate(d.x, y);
    ctx.scale(d.face > Math.PI / 2 || d.face < -Math.PI / 2 ? -1 : 1, 1);
    const lung = (d.lungeT || 0) > 0;
    if (lung) {                                                          // lunge streak
      ctx.save(); ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-22, 2); ctx.lineTo(4, 2); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#f4f1ea";                                           // white coat
    ctx.beginPath(); ctx.roundRect(-11, -4, 20, 12, 5); ctx.fill();     // body
    ctx.fillStyle = "#ddd8cc";
    ctx.fillRect(-8, 7, 4, 5); ctx.fillRect(3, 7, 4, 5);                 // legs
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath(); ctx.arc(11, -6, 7.5, 0, TAU); ctx.fill();           // head
    ctx.beginPath(); ctx.moveTo(7, -12); ctx.lineTo(5, -19); ctx.lineTo(12, -13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -12); ctx.lineTo(18, -19); ctx.lineTo(11, -13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath(); ctx.arc(14, -7, 1.7, 0, TAU); ctx.fill();           // eye
    ctx.beginPath(); ctx.arc(18, -5, 2.1, 0, TAU); ctx.fill();           // snout
    ctx.strokeStyle = "#f4f1ea"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();                                                      // wagging tail
    ctx.moveTo(-11, -2);
    ctx.quadraticCurveTo(-18, -8 + Math.sin(d.t * 14) * 5, -14, -13 + Math.sin(d.t * 14) * 4);
    ctx.stroke();
    ctx.restore();
  }

  drawWaifu(ctx: CanvasRenderingContext2D) {
    if (!this.waifu) return;
    const wd = WAIFU_BY_ID[this.waifu.id];
    const x = this.waifuX, y = this.waifuY + Math.sin(this.waifuAnim * 6) * 2;

    // --- shadow clones
    for (const c of this.waifuClones) {
      ctx.save();
      ctx.globalAlpha = 0.45 * clamp(c.life / 2, 0, 1);
      ctx.translate(c.x, c.y + Math.sin(this.waifuAnim * 7) * 2);
      ctx.fillStyle = `hsl(${wd.hue},70%,45%)`;
      ctx.beginPath(); ctx.moveTo(-12, 17); ctx.lineTo(-7, -4); ctx.lineTo(7, -4); ctx.lineTo(12, 17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -13, 9.5, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // --- cast burst aura
    if (this.waifuCastFx > 0) {
      const t = this.waifuCastFx / 0.9;
      ctx.save();
      ctx.globalAlpha = t * 0.7;
      ctx.strokeStyle = wd.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 50 * (1.6 - t), 0, TAU); ctx.stroke();
      ctx.globalAlpha = t * 0.35;
      ctx.beginPath(); ctx.arc(x, y, 80 * (1.6 - t), 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // --- melee swipe arc
    if (this.waifuSwing > 0 && wd.melee) {
      const m = wd.melee;
      const p = 1 - this.waifuSwing / 0.26;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.waifuFace + (p - 0.5) * m.arc * this.waifuSwingDir);
      ctx.globalAlpha = 0.85 * (1 - p);
      ctx.strokeStyle = wd.color;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.shadowColor = wd.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, m.range * 0.8, -m.arc / 2, m.arc / 2); ctx.stroke();
      // style-specific flourish
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      if (m.style === "claw") {
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.arc(0, 0, m.range * (0.62 + k * 0.1), -m.arc / 2.6, m.arc / 2.6);
          ctx.stroke();
        }
      } else if (m.style === "slash" || m.style === "staff") {
        ctx.beginPath(); ctx.arc(0, 0, m.range * 0.8, -m.arc / 2.4, m.arc / 2.4); ctx.stroke();
      } else if (m.style === "spin") {
        ctx.beginPath(); ctx.arc(0, 0, m.range * 0.72, 0, TAU); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(m.range * 0.3, 0); ctx.lineTo(m.range * 0.85, 0); ctx.stroke();
      }
      ctx.restore();
    }
    this.shadowEllipse(ctx, x, this.waifuY, 15);
    ctx.save();
    ctx.translate(x, y);
    const s = 1 + (this.waifu.level - 1) * 0.08;
    ctx.scale(s, s);
    // aura
    ctx.save();
    ctx.globalAlpha = 0.14 + Math.sin(this.waifuAnim * 3) * 0.05;
    ctx.fillStyle = `hsl(${wd.hue},90%,60%)`;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
    ctx.restore();
    // dress — colours pulled from her portrait palette so she matches
    const pp = PORTRAIT_PALETTES[wd.id] || PORTRAIT_PALETTES.yuki;
    ctx.fillStyle = pp.c;
    ctx.beginPath(); ctx.moveTo(-13, 18); ctx.lineTo(-8, -4); ctx.lineTo(8, -4); ctx.lineTo(13, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pp.C;
    ctx.fillRect(-9, -4, 18, 6);
    ctx.fillStyle = pp.s;
    ctx.beginPath(); ctx.arc(0, -14, 10.5, 0, TAU); ctx.fill();
    ctx.fillStyle = pp.h;
    ctx.beginPath(); ctx.arc(0, -16, 11, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-12, -12, 5.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -12, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = pp.H;
    ctx.fillRect(-11, -22, 22, 3);
    ctx.fillStyle = pp.e;
    ctx.beginPath(); ctx.arc(-3.6, -13, 2.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(3.6, -13, 2.3, 0, TAU); ctx.fill();
    // signature accessory colour flash
    ctx.fillStyle = pp.a;
    ctx.fillRect(-4, -25, 8, 3);
    ctx.fillStyle = "rgba(255,120,160,0.55)";
    ctx.beginPath(); ctx.arc(-6.5, -9, 2.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(6.5, -9, 2.4, 0, TAU); ctx.fill();
    // sidearm held at the ready, pointing at her target
    if (wd.sidearm) {
      ctx.save();
      ctx.rotate(this.waifuFace);
      ctx.fillStyle = "#2b2b38";
      ctx.fillRect(9, -2, 13, 4);
      ctx.fillStyle = wd.sidearm.color;
      ctx.beginPath(); ctx.arc(23, 0, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // level pips
    for (let i = 0; i < this.waifu.level; i++) {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath(); ctx.arc(-6 + i * 4.5, -30, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawEnemies(ctx: CanvasRenderingContext2D, L: number, T: number, R: number, B: number) {
    for (const e of this.enemies) {
      if (e.x < L - 60 || e.x > R + 60 || e.y < T - 60 || e.y > B + 60) continue;
      if (e.boss) { this.drawBoss(ctx, e); continue; }
      const y = e.y + Math.sin(e.bob) * 2;
      this.shadowEllipse(ctx, e.x, e.y, e.r);
      const t = TIERS[Math.min(TIERS.length - 1, e.tier)];
      const s = e.r / 16;
      ctx.save();
      ctx.translate(e.x, y);
      ctx.scale(s, s);
      if (e.elite) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(this.time * 5) * 0.08;
        ctx.fillStyle = "#ff2e4d";
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
        ctx.restore();
      }
      if (e.slow > 0) { ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = "#79dcff"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.restore(); }
      const flash = e.flash > 0;
      ctx.fillStyle = flash ? "#fff" : t.body;
      ctx.beginPath(); ctx.roundRect(-13, -6, 26, 24, 8); ctx.fill();
      ctx.fillStyle = flash ? "#fff" : t.accent;
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = flash ? "#fff" : "#e8b48c";
      ctx.beginPath(); ctx.arc(0, -14, 10.5, 0, TAU); ctx.fill();
      ctx.fillStyle = flash ? "#fff" : t.hair;
      ctx.beginPath(); ctx.arc(0, -16, 11, Math.PI, TAU); ctx.fill();
      // accessory
      if (!flash) {
        if (t.acc === "shades") { ctx.fillStyle = "#0d0d14"; ctx.fillRect(-9, -15, 18, 5); }
        else if (t.acc === "mask") { ctx.fillStyle = "#e8e8f0"; ctx.fillRect(-8, -12, 16, 7); }
        else if (t.acc === "scar") { ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-2, -10); ctx.stroke(); }
        else if (t.acc === "horns") {
          ctx.fillStyle = "#ffd9a0";
          ctx.beginPath(); ctx.moveTo(-9, -21); ctx.lineTo(-12, -30); ctx.lineTo(-5, -23); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(9, -21); ctx.lineTo(12, -30); ctx.lineTo(5, -23); ctx.closePath(); ctx.fill();
        } else if (t.acc === "oni") {
          ctx.fillStyle = "#c0392b";
          ctx.beginPath(); ctx.arc(0, -13, 9, 0, Math.PI); ctx.fill();
          ctx.fillStyle = "#fff";
          for (let i = -2; i <= 2; i++) ctx.fillRect(i * 3 - 1, -9, 2, 3);
        } else if (t.acc === "crown") {
          ctx.fillStyle = "#ffcc3d";
          ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(-10, -30); ctx.lineTo(-5, -25); ctx.lineTo(0, -32);
          ctx.lineTo(5, -25); ctx.lineTo(10, -30); ctx.lineTo(10, -22); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#0d0d14"; ctx.fillRect(-9, -15, 18, 5);
        }
      }
      ctx.restore();
      // role weapon
      ctx.save();
      ctx.translate(e.x, y);
      ctx.rotate(e.face + ((e.windup || 0) > 0 ? -0.9 : (e.lunge || 0) > 0 ? 0.6 : 0));
      const wep = e.role?.weapon || "fist";
      const reach = e.r * 0.7;
      if (wep === "katana") {
        ctx.strokeStyle = "#1a1a24"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(reach, 0); ctx.lineTo(reach + 7, 0); ctx.stroke();
        const g = ctx.createLinearGradient(reach + 7, 0, reach + 40, 0);
        g.addColorStop(0, "#e8f0ff"); g.addColorStop(1, "#9fb8d8");
        ctx.strokeStyle = g; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(reach + 7, 0); ctx.quadraticCurveTo(reach + 26, -4, reach + 40, -9); ctx.stroke();
        if ((e.windup || 0) > 0) {
          ctx.strokeStyle = "rgba(255,90,110,0.65)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, reach + 44, -0.7, 0.7); ctx.stroke();
        }
      } else if (wep === "pistol") {
        ctx.fillStyle = "#2a2a35"; ctx.fillRect(reach, -3, 18, 6);
        ctx.fillRect(reach + 4, 2, 5, 7);
      } else if (wep === "club") {
        ctx.fillStyle = "#6b4a2a"; ctx.fillRect(reach, -4, 22, 8);
        ctx.fillStyle = "#8a6238";
        ctx.beginPath(); ctx.arc(reach + 28, 0, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = "#4a3320";
        for (let k = 0; k < 4; k++) ctx.fillRect(reach + 24 + (k % 2) * 7, -7 + Math.floor(k / 2) * 10, 3, 3);
      } else if (wep === "bomb") {
        const fuse = (e.windup || 0) > 0;
        ctx.fillStyle = fuse ? (Math.floor(this.time * 14) % 2 ? "#ff3b53" : "#2a2a35") : "#2a2a35";
        ctx.beginPath(); ctx.arc(reach + 10, 0, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(reach + 14, -7); ctx.lineTo(reach + 20, -14); ctx.stroke();
        if (fuse) this.burst(e.x + Math.cos(e.face) * (reach + 20), e.y + Math.sin(e.face) * (reach + 20), 1, "#ffe066", 60);
      } else if (wep === "shield") {
        ctx.fillStyle = "#4b5668";
        ctx.beginPath();
        ctx.moveTo(reach + 2, -16); ctx.lineTo(reach + 13, -13);
        ctx.lineTo(reach + 13, 13); ctx.lineTo(reach + 2, 16);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#8ea0bb"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#c9a227";
        ctx.beginPath(); ctx.arc(reach + 8, 0, 3.5, 0, TAU); ctx.fill();
      } else if (wep === "bat") {
        ctx.fillStyle = "#8a6238";
        ctx.beginPath(); ctx.moveTo(reach, -2.5); ctx.lineTo(reach + 24, -5);
        ctx.lineTo(reach + 24, 5); ctx.lineTo(reach, 2.5); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = "#e8b48c";
        ctx.beginPath(); ctx.arc(reach + 5, 0, 4.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (e.burn > 0 && this.fxBudget > 0 && Math.random() < 0.18 && (this.fxBudget--, true))
        this.particles.push({ x: e.x + rand(-6, 6), y: e.y - 6, vx: 0, vy: -50, life: 0.3, max: 0.3, size: 3, color: "#ff8f3c", kind: "spark" });
      if (e.hp < e.maxHp) {
        const w = e.r * 2.1;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(e.x - w / 2, y - e.r - 18, w, 4);
        ctx.fillStyle = e.elite ? "#ffd166" : "#ff5e6c";
        ctx.fillRect(e.x - w / 2, y - e.r - 18, w * clamp(e.hp / e.maxHp, 0, 1), 4);
      }
    }
  }

  drawBoss(ctx: CanvasRenderingContext2D, e: Enemy) {
    const def = e.boss!;
    if (e.invisible) return;   // mid-flight (skyfall)
    const y = e.y + Math.sin(this.time * 3) * 3;
    const guarded = (e.guard || 0) > 0;
    const hue = def.hue;
    this.shadowEllipse(ctx, e.x, e.y, e.r * 1.25);

    // ---- ground scorch ring
    ctx.save();
    ctx.globalAlpha = 0.22;
    const gr = ctx.createRadialGradient(e.x, e.y + e.r * 0.4, e.r * 0.3, e.x, e.y + e.r * 0.4, e.r * 2.1);
    gr.addColorStop(0, `hsla(${hue},95%,55%,0.65)`);
    gr.addColorStop(1, `hsla(${hue},95%,45%,0)`);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.4, e.r * 2.1, e.r * 0.95, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // ---- elemental signature ring (trial bosses only)
    if (e.milestone && def.element && def.element !== "none") {
      const ec = ELEMENTS[def.element as ElementPath].color;
      ctx.save();
      if (def.element === "shock") {
        // crackling lightning cage
        ctx.strokeStyle = ec; ctx.lineWidth = 2;
        ctx.shadowColor = ec; ctx.shadowBlur = 16;
        for (let i = 0; i < 7; i++) {
          const a0 = (i / 7) * TAU + this.time * 1.4;
          ctx.globalAlpha = 0.35 + Math.random() * 0.4;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(a0) * e.r * 1.2, y + Math.sin(a0) * e.r * 1.2);
          for (let k = 1; k <= 3; k++) {
            const a1 = a0 + k * 0.22;
            const rr = e.r * (1.2 + rand(-0.18, 0.18));
            ctx.lineTo(e.x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
          }
          ctx.stroke();
        }
      } else if (def.element === "fire") {
        // roiling heat haze
        for (let i = 0; i < 10; i++) {
          const a0 = (i / 10) * TAU - this.time * 0.8;
          ctx.globalAlpha = 0.18 + Math.sin(this.time * 6 + i) * 0.1;
          ctx.fillStyle = ec;
          ctx.beginPath();
          ctx.arc(e.x + Math.cos(a0) * e.r * 1.3, y + Math.sin(a0) * e.r * 1.3,
            e.r * (0.26 + Math.sin(this.time * 5 + i) * 0.07), 0, TAU);
          ctx.fill();
        }
      } else if (def.element === "void") {
        // orbiting void motes being devoured
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 14; i++) {
          const a0 = (i / 14) * TAU + this.time * 1.1;
          const rr = e.r * (1.5 - ((this.time * 0.5 + i / 14) % 1) * 0.55);
          ctx.fillStyle = ec;
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, 3.4, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = "#000"; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(e.x, y, e.r * 1.1, 0, TAU); ctx.stroke();
      } else if (def.element === "ice") {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = ec; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const a0 = (i / 8) * TAU + this.time * 0.5;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(a0) * e.r * 1.1, y + Math.sin(a0) * e.r * 1.1);
          ctx.lineTo(e.x + Math.cos(a0) * e.r * 1.45, y + Math.sin(a0) * e.r * 1.45);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ---- licking flames around the body
    const flameN = 14;
    ctx.save();
    for (let i = 0; i < flameN; i++) {
      const a = (i / flameN) * TAU + this.time * 0.6;
      const wob = Math.sin(this.time * 7 + i * 1.7);
      const rr = e.r * (1.02 + 0.08 * wob);
      const fx = e.x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr * 0.92;
      const h = e.r * (0.34 + 0.16 * (1 + wob));
      ctx.globalAlpha = 0.5 + 0.22 * wob;
      const fg = ctx.createLinearGradient(fx, fy, fx, fy - h);
      fg.addColorStop(0, `hsla(${hue},95%,62%,0.9)`);
      fg.addColorStop(0.55, `hsla(${(hue + 25) % 360},100%,68%,0.55)`);
      fg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(fx - e.r * 0.14, fy);
      ctx.quadraticCurveTo(fx + wob * 5, fy - h * 0.6, fx, fy - h);
      ctx.quadraticCurveTo(fx - wob * 5, fy - h * 0.6, fx + e.r * 0.14, fy);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (Math.random() < 0.6) {
      const a = Math.random() * TAU;
      this.particles.push({
        x: e.x + Math.cos(a) * e.r, y: y + Math.sin(a) * e.r, vx: rand(-20, 20), vy: rand(-110, -50),
        life: rand(0.4, 0.9), max: 0.9, size: rand(2, 4.5),
        color: `hsl(${(hue + 20) % 360},100%,68%)`, kind: "spark",
      });
    }

    const flash = e.flash > 0;
    ctx.save();
    ctx.translate(e.x, y);
    // double pulsing aura
    ctx.save();
    const p1 = 0.22 + Math.sin(this.time * 4) * 0.07;
    ctx.globalAlpha = p1;
    ctx.fillStyle = `hsl(${hue},90%,55%)`;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.55, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.5 + Math.sin(this.time * 3.2) * 0.2;
    ctx.strokeStyle = guarded ? "rgba(190,210,255,0.9)" : `hsl(${hue},100%,70%)`;
    ctx.lineWidth = 3.5;
    ctx.setLineDash(guarded ? [14, 10] : []);
    ctx.beginPath(); ctx.arc(0, 0, e.r * (1.42 + Math.sin(this.time * 3) * 0.05), 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // heavy silhouette outline so the boss always reads against the crowd
    ctx.shadowColor = `hsl(${hue},100%,60%)`;
    ctx.shadowBlur = 26;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 6;
    const body = flash ? "#fff" : `hsl(${def.hue},55%,45%)`;
    const dark = flash ? "#fff" : `hsl(${def.hue},55%,28%)`;
    ctx.rotate(Math.sin(this.time * 2) * 0.04);
    switch (def.shape) {
      case "pig": {
        // bike
        ctx.fillStyle = "#1c1c26";
        ctx.beginPath(); ctx.arc(-e.r * 0.6, e.r * 0.8, e.r * 0.34, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.6, e.r * 0.8, e.r * 0.34, 0, TAU); ctx.fill();
        ctx.fillStyle = "#b33"; ctx.fillRect(-e.r * 0.8, e.r * 0.3, e.r * 1.6, e.r * 0.4);
        // pig
        ctx.fillStyle = flash ? "#fff" : "#ffb3c8";
        ctx.beginPath(); ctx.ellipse(0, -e.r * 0.1, e.r * 0.8, e.r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#ff8fae";
        ctx.beginPath(); ctx.ellipse(0, e.r * 0.1, e.r * 0.3, e.r * 0.22, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#6b1f2e";
        ctx.beginPath(); ctx.arc(-e.r * 0.1, e.r * 0.08, 2.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.1, e.r * 0.08, 2.5, 0, TAU); ctx.fill();
        // eyes
        ctx.fillStyle = "#200"; ctx.beginPath(); ctx.arc(-e.r * 0.3, -e.r * 0.25, 3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.3, -e.r * 0.25, 3, 0, TAU); ctx.fill();
        // biker hat + shades
        ctx.fillStyle = "#222"; ctx.fillRect(-e.r * 0.75, -e.r * 0.75, e.r * 1.5, e.r * 0.3);
        ctx.fillRect(-e.r * 0.55, -e.r * 0.95, e.r * 1.1, e.r * 0.25);
        ctx.fillStyle = "#111"; ctx.fillRect(-e.r * 0.5, -e.r * 0.38, e.r, e.r * 0.2);
        break;
      }
      case "demon": {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.roundRect(-e.r * 0.7, -e.r * 0.3, e.r * 1.4, e.r * 1.3, e.r * 0.3); ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.6, e.r * 0.6, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#ffd9a0";
        ctx.beginPath(); ctx.moveTo(-e.r * 0.5, -e.r * 0.9); ctx.lineTo(-e.r * 0.8, -e.r * 1.6); ctx.lineTo(-e.r * 0.2, -e.r * 1.05); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(e.r * 0.5, -e.r * 0.9); ctx.lineTo(e.r * 0.8, -e.r * 1.6); ctx.lineTo(e.r * 0.2, -e.r * 1.05); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffe14d";
        ctx.beginPath(); ctx.arc(-e.r * 0.22, -e.r * 0.62, 4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.22, -e.r * 0.62, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff";
        for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5 - 1.5, -e.r * 0.4, 3, 5);
        break;
      }
      case "mech": {
        ctx.fillStyle = dark; ctx.fillRect(-e.r * 0.8, -e.r * 0.2, e.r * 1.6, e.r * 1.1);
        ctx.fillStyle = body; ctx.fillRect(-e.r * 0.6, -e.r * 0.9, e.r * 1.2, e.r * 0.8);
        ctx.fillStyle = "#ff3b5c";
        ctx.fillRect(-e.r * 0.4, -e.r * 0.65, e.r * 0.8, e.r * 0.18);
        ctx.fillStyle = "#8a8aa0";
        ctx.fillRect(-e.r * 1.1, -e.r * 0.1, e.r * 0.3, e.r * 0.7);
        ctx.fillRect(e.r * 0.8, -e.r * 0.1, e.r * 0.3, e.r * 0.7);
        break;
      }
      case "titan": {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.roundRect(-e.r * 0.75, -e.r * 0.4, e.r * 1.5, e.r * 1.4, e.r * 0.25); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#f6cfae";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.75, e.r * 0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : `hsl(${def.hue},70%,70%)`;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.9, e.r * 0.55, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath(); ctx.arc(-e.r * 0.18, -e.r * 0.75, 4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.18, -e.r * 0.75, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#f6cfae";
        ctx.beginPath(); ctx.roundRect(-e.r * 1.15, -e.r * 0.3, e.r * 0.4, e.r * 1.1, 8); ctx.fill();
        ctx.beginPath(); ctx.roundRect(e.r * 0.75, -e.r * 0.3, e.r * 0.4, e.r * 1.1, 8); ctx.fill();
        break;
      }
      case "kaiju": {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.95, e.r * 0.8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = dark;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * e.r * 0.3, -e.r * 0.7);
          ctx.lineTo(i * e.r * 0.3 + e.r * 0.12, -e.r * 1.15);
          ctx.lineTo(i * e.r * 0.3 + e.r * 0.24, -e.r * 0.7);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#ffe14d";
        ctx.beginPath(); ctx.arc(-e.r * 0.3, -e.r * 0.2, 5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.3, -e.r * 0.2, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff";
        for (let i = -3; i <= 3; i++) ctx.fillRect(i * 6 - 2, e.r * 0.2, 4, 6);
        break;
      }
      case "samurai": {
        // Raiden Masamune — armoured swordsman wreathed in lightning
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.roundRect(-e.r * 0.62, -e.r * 0.25, e.r * 1.24, e.r * 1.2, e.r * 0.22); ctx.fill();
        ctx.fillStyle = body;                                   // shoulder plates
        ctx.beginPath(); ctx.roundRect(-e.r * 1.0, -e.r * 0.3, e.r * 0.42, e.r * 0.52, 6); ctx.fill();
        ctx.beginPath(); ctx.roundRect(e.r * 0.58, -e.r * 0.3, e.r * 0.42, e.r * 0.52, 6); ctx.fill();
        ctx.fillStyle = dark;                                   // kabuto
        ctx.beginPath(); ctx.arc(0, -e.r * 0.62, e.r * 0.52, Math.PI, TAU); ctx.fill();
        ctx.fillRect(-e.r * 0.52, -e.r * 0.62, e.r * 1.04, e.r * 0.3);
        ctx.fillStyle = "#ffe14d";                              // crescent crest
        ctx.beginPath();
        ctx.arc(0, -e.r * 0.95, e.r * 0.42, Math.PI * 1.15, Math.PI * 1.85);
        ctx.lineTo(0, -e.r * 0.8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#1a0d06";                              // menpo mask
        ctx.beginPath(); ctx.roundRect(-e.r * 0.34, -e.r * 0.55, e.r * 0.68, e.r * 0.4, 4); ctx.fill();
        ctx.fillStyle = "#9fe8ff";
        ctx.beginPath(); ctx.arc(-e.r * 0.15, -e.r * 0.42, 3.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.15, -e.r * 0.42, 3.4, 0, TAU); ctx.fill();
        // crackling lightning katana
        const bl = this.time * 20;
        ctx.save();
        ctx.rotate(Math.sin(this.time * 2) * 0.25 - 0.5);
        ctx.strokeStyle = "#2a2a35"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(e.r * 0.5, 0); ctx.lineTo(e.r * 0.8, 0); ctx.stroke();
        const bg = ctx.createLinearGradient(e.r * 0.8, 0, e.r * 2.3, -e.r * 0.5);
        bg.addColorStop(0, "#e8f6ff"); bg.addColorStop(1, "#7fd4ff");
        ctx.strokeStyle = bg; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.shadowColor = "#9fe8ff"; ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.moveTo(e.r * 0.8, 0);
        ctx.quadraticCurveTo(e.r * 1.6, -e.r * 0.16, e.r * 2.3, -e.r * 0.5);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.6;        // arcing sparks
        for (let i = 0; i < 4; i++) {
          const p = 0.3 + i * 0.2;
          const bx = e.r * (0.8 + 1.5 * p), by = -e.r * 0.5 * p;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.sin(bl + i) * 11, by + Math.cos(bl + i * 2) * 13);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case "oyabun": {
        // Gorou Kuromaki — suited crime lord with twin machine guns
        ctx.fillStyle = "#14141c";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.68, -e.r * 0.3, e.r * 1.36, e.r * 1.26, e.r * 0.2); ctx.fill();
        ctx.fillStyle = "#e8e8f0";                               // shirt
        ctx.beginPath(); ctx.moveTo(-e.r * 0.16, -e.r * 0.3); ctx.lineTo(e.r * 0.16, -e.r * 0.3);
        ctx.lineTo(0, e.r * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#c0392b";                               // tie
        ctx.beginPath(); ctx.moveTo(-5, -e.r * 0.25); ctx.lineTo(5, -e.r * 0.25);
        ctx.lineTo(2, e.r * 0.3); ctx.lineTo(-2, e.r * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#e8b48c";              // head
        ctx.beginPath(); ctx.arc(0, -e.r * 0.62, e.r * 0.42, 0, TAU); ctx.fill();
        ctx.fillStyle = "#0d0d14";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.7, e.r * 0.44, Math.PI, TAU); ctx.fill();
        ctx.fillRect(-e.r * 0.5, -e.r * 0.78, e.r, e.r * 0.12);  // fedora brim
        ctx.fillStyle = "#1a1a24";
        ctx.fillRect(-e.r * 0.34, -e.r * 0.66, e.r * 0.68, e.r * 0.14);  // shades
        ctx.fillStyle = "#ff3b53";
        ctx.fillRect(-e.r * 0.3, -e.r * 0.63, e.r * 0.2, 2);
        // dual machine guns, recoiling
        const rc = Math.sin(this.time * 30) * 3;
        for (const sgn of [-1, 1]) {
          ctx.save();
          ctx.translate(sgn * e.r * 0.78, e.r * 0.05);
          ctx.rotate(sgn * 0.12);
          ctx.fillStyle = "#23232e";
          ctx.fillRect(-4, -5, 30 - rc, 10);
          ctx.fillStyle = "#3a3a48";
          ctx.fillRect(-8, -3, 10, 14);
          ctx.fillStyle = "#15151c";
          ctx.fillRect(24 - rc, -3, 9, 6);
          if (e.attackTimer < 0.5) {                              // muzzle flash
            ctx.fillStyle = "#ffe066";
            ctx.shadowColor = "#ffb703"; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(34 - rc, 0, 6 + Math.random() * 4, 0, TAU); ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.restore();
        }
        break;
      }
      case "wyrm": {
        // Ryūjin — serpentine dragon with a burning maw
        const segs = 5;
        for (let i = segs; i >= 1; i--) {                        // trailing coils
          const a = this.time * 1.6 - i * 0.55;
          const sx = -Math.cos(a) * e.r * (0.5 + i * 0.3);
          const sy = Math.sin(a) * e.r * 0.42 + i * 5;
          ctx.fillStyle = i % 2 ? dark : body;
          ctx.beginPath(); ctx.ellipse(sx, sy, e.r * (0.62 - i * 0.07), e.r * (0.5 - i * 0.06), a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = body;                                    // head
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.92, e.r * 0.66, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = dark;                                    // snout
        ctx.beginPath(); ctx.ellipse(e.r * 0.62, e.r * 0.12, e.r * 0.46, e.r * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#ffd9a0";              // horns
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(-e.r * 0.1, sgn * e.r * 0.4);
          ctx.lineTo(-e.r * 0.85, sgn * e.r * 0.95);
          ctx.lineTo(-e.r * 0.2, sgn * e.r * 0.62);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#ffe14d";                               // eyes
        ctx.beginPath(); ctx.ellipse(e.r * 0.2, -e.r * 0.2, 5, 3.2, -0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.r * 0.2, e.r * 0.26, 5, 3.2, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = "#ffffff";                               // fangs
        for (let i = 0; i < 4; i++) ctx.fillRect(e.r * (0.65 + i * 0.12), e.r * 0.3, 3, 7);
        // burning breath glow at the maw
        const mg = ctx.createRadialGradient(e.r * 1.02, e.r * 0.2, 2, e.r * 1.02, e.r * 0.2, e.r * 0.55);
        mg.addColorStop(0, "rgba(255,240,170,0.95)");
        mg.addColorStop(0.5, "rgba(255,120,40,0.6)");
        mg.addColorStop(1, "rgba(255,60,0,0)");
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(e.r * 1.02, e.r * 0.2, e.r * 0.55, 0, TAU); ctx.fill();
        break;
      }
      case "priest": {
        // Daibutsu Genkai — colossal temple monk with enormous fists
        ctx.fillStyle = dark;                                    // robe
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.72, e.r * 1.0);
        ctx.lineTo(-e.r * 0.46, -e.r * 0.2);
        ctx.lineTo(e.r * 0.46, -e.r * 0.2);
        ctx.lineTo(e.r * 0.72, e.r * 1.0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = body;                                    // sash
        ctx.fillRect(-e.r * 0.56, e.r * 0.2, e.r * 1.12, e.r * 0.2);
        ctx.fillStyle = flash ? "#fff" : "#f0c99a";              // bald head
        ctx.beginPath(); ctx.arc(0, -e.r * 0.52, e.r * 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath(); ctx.ellipse(-e.r * 0.12, -e.r * 0.66, e.r * 0.12, e.r * 0.06, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a24";                               // serene eyes
        ctx.fillRect(-e.r * 0.2, -e.r * 0.52, e.r * 0.14, 2.6);
        ctx.fillRect(e.r * 0.06, -e.r * 0.52, e.r * 0.14, 2.6);
        ctx.fillStyle = "#ffd166";                               // forehead jewel
        ctx.beginPath(); ctx.arc(0, -e.r * 0.68, 3.6, 0, TAU); ctx.fill();
        // prayer-bead halo
        ctx.strokeStyle = "rgba(255,210,120,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.52, e.r * 0.62, 0, TAU); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + this.time * 0.7;
          ctx.fillStyle = "#ffd166";
          ctx.beginPath(); ctx.arc(Math.cos(a) * e.r * 0.62, -e.r * 0.52 + Math.sin(a) * e.r * 0.62, 3, 0, TAU); ctx.fill();
        }
        // the enormous fists
        const sw = Math.sin(this.time * 2.4) * e.r * 0.12;
        for (const sgn of [-1, 1]) {
          const fx = sgn * e.r * 1.0, fy = e.r * 0.25 + sgn * sw;
          ctx.fillStyle = flash ? "#fff" : "#f0c99a";
          ctx.beginPath(); ctx.arc(fx, fy, e.r * 0.46, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.22)";                     // knuckles
          for (let k = -1; k <= 1; k++)
            ctx.fillRect(fx - e.r * 0.26, fy + k * e.r * 0.15 - 2, e.r * 0.52, 3);
          ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 3;         // gold wraps
          ctx.beginPath(); ctx.arc(fx, fy, e.r * 0.46, 0, TAU); ctx.stroke();
        }
        break;
      }
      case "sumo": case "fatyak": {
        const fat = def.shape === "fatyak";
        ctx.fillStyle = flash ? "#fff" : (fat ? "#1c1c26" : "#f3d2b0");
        ctx.beginPath(); ctx.ellipse(0, e.r * 0.2, e.r * 0.95, e.r * 0.82, 0, 0, TAU); ctx.fill();
        if (!fat) { ctx.fillStyle = "#d8456b"; ctx.fillRect(-e.r * 0.5, e.r * 0.35, e.r, e.r * 0.3); }
        else { ctx.fillStyle = "#e8e8f0"; ctx.beginPath(); ctx.moveTo(-e.r*.2,-e.r*.3); ctx.lineTo(e.r*.2,-e.r*.3); ctx.lineTo(0,e.r*.5); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = flash ? "#fff" : "#f0c99a";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.62, e.r * 0.38, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a24";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.7, e.r * 0.4, Math.PI, TAU); ctx.fill();   // topknot/hair
        if (fat) {  // sunglasses
          ctx.fillStyle = "#0d0d14"; ctx.fillRect(-e.r * 0.3, -e.r * 0.66, e.r * 0.6, e.r * 0.14);
          ctx.fillStyle = "#6ff5e8"; ctx.fillRect(-e.r * 0.26, -e.r * 0.64, e.r * 0.16, 2);
        } else {
          ctx.fillStyle = "#1a1a24";
          ctx.fillRect(-e.r * 0.2, -e.r * 0.62, e.r * 0.12, 3);
          ctx.fillRect(e.r * 0.08, -e.r * 0.62, e.r * 0.12, 3);
        }
        // slapping hands
        const sl = Math.sin(this.time * 4) * e.r * 0.18;
        ctx.fillStyle = flash ? "#fff" : "#f0c99a";
        ctx.beginPath(); ctx.arc(-e.r * 0.95, sl, e.r * 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.95, -sl, e.r * 0.3, 0, TAU); ctx.fill();
        break;
      }
      case "assassin": {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = flash ? "#fff" : "#17141f";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.5, -e.r * 0.2, e.r, e.r * 1.1, e.r * 0.2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -e.r * 0.5, e.r * 0.38, 0, TAU); ctx.fill();
        ctx.fillStyle = `hsl(${hue},95%,70%)`;                      // glowing eye slit
        ctx.fillRect(-e.r * 0.26, -e.r * 0.54, e.r * 0.52, 3.4);
        // scarf whipping behind
        ctx.strokeStyle = `hsl(${hue},80%,55%)`; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.2, -e.r * 0.15);
        ctx.quadraticCurveTo(-e.r * 1.1, -e.r * 0.4 + Math.sin(this.time * 7) * 10, -e.r * 1.5, Math.cos(this.time * 6) * 12);
        ctx.stroke();
        // twin daggers
        ctx.fillStyle = "#dfe9ff";
        for (const sg of [-1, 1]) {
          ctx.save(); ctx.translate(sg * e.r * 0.7, e.r * 0.2); ctx.rotate(sg * 0.6 + Math.sin(this.time * 8) * 0.2);
          ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(e.r * 0.7, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        break;
      }
      case "monkboss": {
        ctx.fillStyle = flash ? "#fff" : "#d9922f";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.5, -e.r * 0.2, e.r, e.r * 1.1, e.r * 0.22); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#f0c99a";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.52, e.r * 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a24";                                  // blindfold
        ctx.fillRect(-e.r * 0.42, -e.r * 0.58, e.r * 0.84, e.r * 0.16);
        ctx.strokeStyle = "#8a2a1a"; ctx.lineWidth = 2;             // beads
        ctx.beginPath(); ctx.arc(0, -e.r * 0.1, e.r * 0.4, 0.2, Math.PI - 0.2); ctx.stroke();
        // wrapped fists that pulse
        const pf = 1 + Math.sin(this.time * 7) * 0.12;
        for (const sg of [-1, 1]) {
          ctx.fillStyle = flash ? "#fff" : "#f0c99a";
          ctx.beginPath(); ctx.arc(sg * e.r * 0.85, e.r * 0.15, e.r * 0.3 * pf, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#e8e8f0"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sg * e.r * 0.85, e.r * 0.15, e.r * 0.3 * pf, 0, TAU); ctx.stroke();
        }
        break;
      }
      case "templelord": {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.72, e.r); ctx.lineTo(-e.r * 0.46, -e.r * 0.2);
        ctx.lineTo(e.r * 0.46, -e.r * 0.2); ctx.lineTo(e.r * 0.72, e.r);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = body; ctx.fillRect(-e.r * 0.56, e.r * 0.2, e.r * 1.12, e.r * 0.2);
        ctx.fillStyle = flash ? "#fff" : "#f0c99a";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.52, e.r * 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a24";
        ctx.fillRect(-e.r * 0.2, -e.r * 0.52, e.r * 0.14, 2.6);
        ctx.fillRect(e.r * 0.06, -e.r * 0.52, e.r * 0.14, 2.6);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.68, 3.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,210,120,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.52, e.r * 0.62, 0, TAU); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + this.time * 0.7;
          ctx.fillStyle = "#ffd166";
          ctx.beginPath(); ctx.arc(Math.cos(a) * e.r * 0.62, -e.r * 0.52 + Math.sin(a) * e.r * 0.62, 3, 0, TAU); ctx.fill();
        }
        const sw = Math.sin(this.time * 2.4) * e.r * 0.12;
        for (const sg of [-1, 1]) {
          const fx = sg * e.r, fy = e.r * 0.25 + sg * sw;
          ctx.fillStyle = flash ? "#fff" : "#f0c99a";
          ctx.beginPath(); ctx.arc(fx, fy, e.r * 0.46, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(fx, fy, e.r * 0.46, 0, TAU); ctx.stroke();
        }
        break;
      }
      case "gangster": {
        ctx.fillStyle = flash ? "#fff" : "#2a2436";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.55, -e.r * 0.2, e.r * 1.1, e.r * 1.1, e.r * 0.2); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#e8b48c";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.5, e.r * 0.36, 0, TAU); ctx.fill();
        ctx.fillStyle = `hsl(${hue},60%,45%)`;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.58, e.r * 0.38, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = "#0d0d14"; ctx.fillRect(-e.r * 0.28, -e.r * 0.54, e.r * 0.56, 4);
        ctx.fillStyle = "#dfe9ff";
        ctx.save(); ctx.rotate(Math.sin(this.time * 9) * 0.5);
        ctx.beginPath(); ctx.moveTo(e.r * 0.5, -3); ctx.lineTo(e.r * 1.2, 0); ctx.lineTo(e.r * 0.5, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case "yakdragon": {
        ctx.fillStyle = "#14141c";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.65, -e.r * 0.3, e.r * 1.3, e.r * 1.25, e.r * 0.2); ctx.fill();
        // dragon irezumi glowing through the suit
        ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(this.time * 3) * 0.2;
        ctx.strokeStyle = `hsl(${hue},95%,60%)`; ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.4, e.r * 0.7);
        ctx.bezierCurveTo(e.r * 0.3, e.r * 0.3, -e.r * 0.3, -e.r * 0.05, e.r * 0.4, -e.r * 0.25);
        ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#e8e8f0";
        ctx.beginPath(); ctx.moveTo(-e.r * 0.14, -e.r * 0.3); ctx.lineTo(e.r * 0.14, -e.r * 0.3); ctx.lineTo(0, e.r * 0.45); ctx.closePath(); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#e8b48c";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.6, e.r * 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#0d0d14";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.68, e.r * 0.42, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = "#c0392b"; ctx.fillRect(-e.r * 0.3, -e.r * 0.62, e.r * 0.6, 4);
        const rc = Math.sin(this.time * 26) * 3;
        for (const sg of [-1, 1]) {
          ctx.save(); ctx.translate(sg * e.r * 0.8, e.r * 0.1); ctx.rotate(sg * 0.12);
          ctx.fillStyle = "#23232e"; ctx.fillRect(-4, -5, 28 - rc, 10);
          ctx.restore();
        }
        break;
      }
      case "willyclone": {
        ctx.fillStyle = flash ? "#fff" : "#2b3a56";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.5, -e.r * 0.2, e.r, e.r * 1.05, e.r * 0.25); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#f6cfae";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.5, e.r * 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath(); ctx.ellipse(-e.r * 0.12, -e.r * 0.64, e.r * 0.13, e.r * 0.07, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#c0392b";                                   // evil goatee
        ctx.beginPath(); ctx.arc(0, -e.r * 0.3, e.r * 0.14, 0, Math.PI); ctx.fill();
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath(); ctx.arc(-e.r * 0.15, -e.r * 0.52, 3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.15, -e.r * 0.52, 3, 0, TAU); ctx.fill();
        ctx.save(); ctx.rotate(Math.sin(this.time * 6) * 0.4);       // giant paddle
        ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(e.r * 0.4, 0); ctx.lineTo(e.r * 0.9, 0); ctx.stroke();
        ctx.fillStyle = "#1a1a24";
        ctx.beginPath(); ctx.ellipse(e.r * 1.3, 0, e.r * 0.42, e.r * 0.36, 0, 0, TAU); ctx.fill();
        ctx.restore();
        break;
      }
      case "foxgirl": {
        // nine tails fanned behind
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * 0.6 + (i / 8) * Math.PI * 0.8 + Math.sin(this.time * 2 + i) * 0.12;
          ctx.save(); ctx.rotate(a);
          ctx.fillStyle = `hsl(${hue},80%,${55 + (i % 3) * 8}%)`;
          ctx.beginPath(); ctx.ellipse(e.r * 0.95, 0, e.r * 0.55, e.r * 0.16, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.ellipse(e.r * 1.4, 0, e.r * 0.15, e.r * 0.12, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = flash ? "#fff" : `hsl(${hue},70%,58%)`;
        ctx.beginPath(); ctx.moveTo(-e.r * 0.5, e.r * 0.9); ctx.lineTo(-e.r * 0.3, -e.r * 0.2);
        ctx.lineTo(e.r * 0.3, -e.r * 0.2); ctx.lineTo(e.r * 0.5, e.r * 0.9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#fbdcc0";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.5, e.r * 0.36, 0, TAU); ctx.fill();
        ctx.fillStyle = `hsl(${(hue + 200) % 360},45%,28%)`;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.58, e.r * 0.38, Math.PI, TAU); ctx.fill();
        for (const sg of [-1, 1]) {                                   // fox ears
          ctx.fillStyle = `hsl(${hue},75%,55%)`;
          ctx.beginPath();
          ctx.moveTo(sg * e.r * 0.3, -e.r * 0.82); ctx.lineTo(sg * e.r * 0.46, -e.r * 1.25);
          ctx.lineTo(sg * e.r * 0.08, -e.r * 0.92); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#ffe14d";
        ctx.beginPath(); ctx.arc(-e.r * 0.14, -e.r * 0.5, 3.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.14, -e.r * 0.5, 3.4, 0, TAU); ctx.fill();
        break;
      }
      case "schoolspirit": {
        ctx.globalAlpha = 0.86;
        ctx.fillStyle = flash ? "#fff" : `hsl(${hue},55%,52%)`;
        ctx.beginPath();
        ctx.arc(0, -e.r * 0.2, e.r * 0.72, Math.PI, 0);
        ctx.lineTo(e.r * 0.72, e.r * 0.55);
        for (let i = 0; i < 4; i++)
          ctx.quadraticCurveTo(e.r * (0.52 - i * 0.36), e.r * (0.9 + Math.sin(this.time * 6 + i) * 0.12), e.r * (0.36 - i * 0.36), e.r * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0b1a12";
        ctx.beginPath(); ctx.arc(-e.r * 0.24, -e.r * 0.3, 5.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.24, -e.r * 0.3, 5.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1c2b22"; ctx.fillRect(-e.r * 0.5, -e.r * 0.95, e.r, e.r * 0.2);  // school cap
        ctx.fillStyle = "#ffe066";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.86, 3, 0, TAU); ctx.fill();
        break;
      }
      case "volleygirl": {
        ctx.fillStyle = flash ? "#fff" : "#f0f4f8";
        ctx.beginPath(); ctx.roundRect(-e.r * 0.45, -e.r * 0.2, e.r * 0.9, e.r * 0.8, e.r * 0.2); ctx.fill();
        ctx.fillStyle = `hsl(${hue},70%,50%)`;
        ctx.fillRect(-e.r * 0.45, e.r * 0.3, e.r * 0.9, e.r * 0.4);
        ctx.fillStyle = flash ? "#fff" : "#fbdcc0";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.5, e.r * 0.34, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2b2b3a";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.58, e.r * 0.36, Math.PI, TAU); ctx.fill();
        ctx.fillRect(e.r * 0.2, -e.r * 0.62, e.r * 0.14, e.r * 0.5);   // ponytail
        // the ball she's about to spike
        const bh = Math.sin(this.time * 4) * e.r * 0.3;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(e.r * 0.8, -e.r * 0.7 + bh, e.r * 0.3, 0, TAU); ctx.fill();
        ctx.strokeStyle = `hsl(${hue},70%,45%)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.r * 0.8, -e.r * 0.7 + bh, e.r * 0.3, 0, TAU); ctx.stroke();
        break;
      }
      case "coach": {
        ctx.fillStyle = flash ? "#fff" : "#2e3b2a";
        ctx.beginPath(); ctx.ellipse(0, e.r * 0.2, e.r * 0.92, e.r * 0.8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#f2f2ee";                                     // tracksuit stripes
        ctx.fillRect(-e.r * 0.86, e.r * 0.05, e.r * 1.72, e.r * 0.1);
        ctx.fillStyle = flash ? "#fff" : "#f0c99a";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.6, e.r * 0.38, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a24";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.68, e.r * 0.4, Math.PI, TAU); ctx.fill();
        ctx.fillRect(-e.r * 0.5, -e.r * 0.74, e.r, e.r * 0.1);          // cap brim
        ctx.fillStyle = "#0d0d14";
        ctx.fillRect(-e.r * 0.26, -e.r * 0.62, e.r * 0.52, 4);
        // whistle
        ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.3, e.r * 0.3, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.beginPath(); ctx.arc(0, -e.r * 0.02, e.r * 0.11, 0, TAU); ctx.fill();
        break;
      }
      case "ghost": {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(0, -e.r * 0.2, e.r * 0.75, Math.PI, 0);
        ctx.lineTo(e.r * 0.75, e.r * 0.6);
        for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(e.r * (0.55 - i * 0.37), e.r * (0.9 + Math.sin(this.time * 6 + i) * 0.1), e.r * (0.37 - i * 0.37), e.r * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#101018";
        ctx.beginPath(); ctx.arc(-e.r * 0.25, -e.r * 0.3, 5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(e.r * 0.25, -e.r * 0.3, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2b2b3a"; ctx.fillRect(-e.r * 0.5, -e.r * 0.95, e.r, e.r * 0.22);
        break;
      }
    }
    ctx.restore();
    // floating name plate + health bar above the boss
    ctx.save();
    ctx.textAlign = "center";
    const w = Math.max(120, e.r * 3.4);
    const barY = y - e.r - 30;
    ctx.font = "900 14px 'Noto Sans JP',system-ui";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(`💀 ${def.name} · ${def.jp}`, e.x, barY - 8);
    ctx.fillStyle = guarded ? "#bcd2ff" : `hsl(${hue},100%,78%)`;
    ctx.fillText(`💀 ${def.name} · ${def.jp}`, e.x, barY - 8);
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath(); ctx.roundRect(e.x - w / 2 - 2, barY - 2, w + 4, 12, 6); ctx.fill();
    const frac = clamp(e.hp / e.maxHp, 0, 1);
    const bg = ctx.createLinearGradient(e.x - w / 2, 0, e.x + w / 2, 0);
    if (guarded) { bg.addColorStop(0, "#7d8aa8"); bg.addColorStop(1, "#aebbd4"); }
    else { bg.addColorStop(0, "#ff2e4d"); bg.addColorStop(1, "#ff9f43"); }
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(e.x - w / 2, barY, w * frac, 8, 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(e.x - w / 2, barY, w, 8, 4); ctx.stroke();
    if (guarded) {
      ctx.fillStyle = "#bcd2ff";
      ctx.font = "900 10px system-ui";
      ctx.fillText(`🛡 ESCORT ×${e.guard}`, e.x, barY + 22);
    }
    if (e.milestone && def.phases) {
      const total = def.phases.length + 1;
      for (let i = 0; i < total; i++) {
        ctx.fillStyle = i <= (e.phase || 0) ? `hsl(${hue},100%,70%)` : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(e.x - (total - 1) * 6 + i * 12, barY + 20, 3.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawBullets(ctx: CanvasRenderingContext2D) {
    for (const b of this.bullets) {
      ctx.save();

      // ---- VOID: a dark collapsing singularity, never a solid ball
      if (b.element === "void" && !b.hostile) {
        const t = this.time * 6 + b.born * 13;
        // violet smear behind it
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "#a86bff";
        ctx.shadowColor = "#a86bff"; ctx.shadowBlur = 18;
        ctx.lineWidth = b.r * 1.5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // outer violet corona
        const halo = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r * 2.3);
        halo.addColorStop(0, "rgba(190,120,255,0.85)");
        halo.addColorStop(0.5, "rgba(130,60,220,0.45)");
        halo.addColorStop(1, "rgba(90,30,180,0)");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.3, 0, TAU); ctx.fill();
        // black event-horizon core
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#07030f";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.92, 0, TAU); ctx.fill();
        // bright accretion rim
        ctx.strokeStyle = "#d9b6ff";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.92, 0, TAU); ctx.stroke();
        // two counter-rotating arcs being sucked in
        ctx.strokeStyle = "rgba(216,170,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.5, t, t + 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.85, -t * 0.7 + 2, -t * 0.7 + 3.2); ctx.stroke();
        ctx.restore();
        if (Math.random() < 0.5) {
          const a = Math.random() * TAU;
          this.particles.push({
            x: b.x + Math.cos(a) * b.r * 3, y: b.y + Math.sin(a) * b.r * 3,
            vx: -Math.cos(a) * 180, vy: -Math.sin(a) * 180,
            life: 0.22, max: 0.22, size: 2.4, color: "#c79bff", kind: "spark",
          });
        }
        continue;
      }

      ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = b.r * 1.1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.015, b.y - b.vy * 0.015); ctx.stroke();
      ctx.globalAlpha = 1;
      if (b.spin) {
        ctx.translate(b.x, b.y);
        ctx.rotate(this.time * 18);
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.5, b.r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, b.r * 0.6, b.r * 1.5, 0, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        // elemental tells so each path is instantly identifiable
        if (b.element === "fire") {
          ctx.fillStyle = "rgba(255,240,170,0.95)";
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
        } else if (b.element === "ice") {
          ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.4;
          for (let k = 0; k < 3; k++) {
            const a = this.time * 2 + (k / 3) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(b.x - Math.cos(a) * b.r, b.y - Math.sin(a) * b.r);
            ctx.lineTo(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r);
            ctx.stroke();
          }
        } else if (b.element === "shock") {
          ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(b.x - b.r, b.y);
          ctx.lineTo(b.x - b.r * 0.1, b.y - b.r * 0.5);
          ctx.lineTo(b.x + b.r * 0.1, b.y + b.r * 0.4);
          ctx.lineTo(b.x + b.r, b.y);
          ctx.stroke();
        } else if (b.element === "wind") {
          ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.5, this.time * 9, this.time * 9 + 2.1); ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath(); ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.38, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  /** Letterbox + anime speed-lines for the milestone boss arrival. */
  drawCinematic(ctx: CanvasRenderingContext2D) {
    const t = clamp(this.cineT / 4.6, 0, 1);
    const open = Math.min(1, (1 - t) * 6, t * 6);
    const barH = this.vh * 0.13 * open;
    const sx = this.vw / 2 + (this.cineX - this.camx) * this.zoom;
    const sy = this.vh / 2 + (this.cineY - this.camy) * this.zoom;
    ctx.save();
    ctx.strokeStyle = `hsl(${this.cineHue},95%,65%)`;
    ctx.lineWidth = 2;
    const n = 54;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.time * 0.6;
      const inner = 150 + Math.sin(i * 3.1 + this.time * 9) * 40;
      const outer = Math.max(this.vw, this.vh) * 1.1;
      ctx.globalAlpha = (0.08 + (i % 3) * 0.06) * open;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * inner, sy + Math.sin(a) * inner);
      ctx.lineTo(sx + Math.cos(a) * outer, sy + Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    const g = ctx.createRadialGradient(sx, sy, 40, sx, sy, Math.max(this.vw, this.vh) * 0.8);
    g.addColorStop(0, `hsla(${this.cineHue},95%,55%,${0.3 * open})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);
    ctx.restore();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.vw, barH);
    ctx.fillRect(0, this.vh - barH, this.vw, barH);
    ctx.fillStyle = `hsla(${this.cineHue},95%,60%,${0.85 * open})`;
    ctx.fillRect(0, barH - 2, this.vw, 2);
    ctx.fillRect(0, this.vh - barH, this.vw, 2);
  }

  /** Big, impossible-to-miss screen-edge pointers to bosses, quests, chests. */
  drawGuideArrows(ctx: CanvasRenderingContext2D) {
    const targets: { x: number; y: number; color: string; glow: string; label: string; icon: string; big?: boolean }[] = [];
    for (const b of this.bosses) {
      targets.push({ x: b.x, y: b.y, color: "#ff4d6a", glow: "#ff2e4d", label: b.boss!.name.toUpperCase(), icon: "💀", big: true });
    }
    if (this.quest) targets.push({ x: this.quest.x, y: this.quest.y, color: "#ffd166", glow: "#ff9f1a", label: "QUEST", icon: "📍" });
    const chests = this.chests.filter((c) => !c.open)
      .sort((a2, b2) => d2(a2.x, a2.y, this.px, this.py) - d2(b2.x, b2.y, this.px, this.py)).slice(0, 2);
    for (const c of chests) targets.push({ x: c.x, y: c.y, color: "#6dff9a", glow: "#19d96a", label: "CHEST", icon: "📦" });

    const cx = this.vw / 2, cy = this.vh / 2;
    const margin = Math.min(76, Math.min(this.vw, this.vh) * 0.14);
    const pulse = 0.82 + Math.sin(this.time * 5) * 0.18;

    for (const t of targets) {
      const sx = cx + (t.x - this.camx) * this.zoom;
      const sy = cy + (t.y - this.camy) * this.zoom;
      const dist = Math.round(Math.hypot(t.x - this.px, t.y - this.py) / 10);
      const onScreen = sx > margin && sx < this.vw - margin && sy > margin && sy < this.vh - margin;

      if (onScreen && !t.big) {
        ctx.save();
        ctx.translate(sx, sy - 46 - Math.sin(this.time * 4) * 5);
        ctx.shadowColor = t.glow; ctx.shadowBlur = 16;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(0, 16); ctx.lineTo(-11, -4); ctx.lineTo(-4, -4);
        ctx.lineTo(-4, -16); ctx.lineTo(4, -16); ctx.lineTo(4, -4); ctx.lineTo(11, -4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        continue;
      }
      if (onScreen) continue;

      const a = Math.atan2(t.y - this.camy, t.x - this.camx);
      const hw = this.vw / 2 - margin, hh = this.vh / 2 - margin;
      const scale = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
      const ax = cx + Math.cos(a) * scale, ay = cy + Math.sin(a) * scale;
      const k = t.big ? 1.45 : 1;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.globalAlpha = (t.big ? 0.4 : 0.28) * pulse;
      ctx.fillStyle = t.glow;
      ctx.beginPath(); ctx.arc(0, 0, 36 * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.rotate(a);
      ctx.scale(k, k);
      ctx.shadowColor = t.glow; ctx.shadowBlur = t.big ? 30 : 20;
      ctx.beginPath();
      ctx.moveTo(30, 0); ctx.lineTo(2, -21); ctx.lineTo(9, 0); ctx.lineTo(2, 21);
      ctx.closePath();
      ctx.fillStyle = t.color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.stroke();
      ctx.restore();
      ctx.shadowBlur = 0;
      const text = `${t.icon} ${t.label} ${dist}m`;
      ctx.font = "900 12px system-ui";
      const w = ctx.measureText(text).width + 14;
      const lx = clamp(ax, w / 2 + 4, this.vw - w / 2 - 4);
      const ly = clamp(ay + (ay > cy ? -40 : 40), 22, this.vh - 14);
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.beginPath(); ctx.roundRect(lx - w / 2, ly - 11, w, 20, 10); ctx.fill();
      ctx.strokeStyle = t.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = t.color;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, lx, ly);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }
  }

  drawParticles(ctx: CanvasRenderingContext2D) {
    // Batched renderer. The previous version did save()/restore() and a
    // beginPath()+arc()+fill() per particle — ~700 state swaps and 700 draw
    // calls a frame. Sparks and smoke (the overwhelming majority) are now
    // grouped by colour and flushed as one path each, using rects instead of
    // arcs. Rare kinds keep their bespoke drawing.
    const ps = this.particles;
    if (!ps.length) return;

    // ---- pass 1: batch the cheap, numerous kinds ----
    const sparkByColor = this.fxBatch;
    sparkByColor.clear();
    let rare = false;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const k = p.kind;
      if (k === "spark" || k === "star") {
        let arr = sparkByColor.get(p.color);
        if (!arr) { arr = []; sparkByColor.set(p.color, arr); }
        arr.push(p);
      } else if (k === "smoke") {
        const key = "~" + p.color;            // smoke drawn at lower alpha
        let arr = sparkByColor.get(key);
        if (!arr) { arr = []; sparkByColor.set(key, arr); }
        arr.push(p);
      } else rare = true;
    }

    ctx.save();
    for (const [key, arr] of sparkByColor) {
      const smoke = key.charCodeAt(0) === 126;   // '~'
      ctx.fillStyle = smoke ? key.slice(1) : key;
      // one alpha + one path for the whole colour group
      ctx.globalAlpha = smoke ? 0.3 : 0.85;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        const t = p.life / p.max;
        const r = smoke ? p.size * (2 - t) : p.size * t + 0.6;
        // squares read identically at these sizes and cost far less than arcs
        ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.fill();
    }
    ctx.restore();
    if (!rare) return;

    // ---- pass 2: the handful of expensive, bespoke kinds ----
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const k = p.kind;
      if (k === "spark" || k === "star" || k === "smoke") continue;
      const t = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = clamp(t, 0, 1);
      if (k === "ring") {
        ctx.strokeStyle = p.color; ctx.lineWidth = 3 * t + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.9 - t), 0, TAU); ctx.stroke();
      } else if (k === "text") {
        ctx.fillStyle = p.color;
        ctx.font = `900 ${p.size}px system-ui`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3;
        ctx.strokeText(p.text!, p.x, p.y); ctx.fillText(p.text!, p.x, p.y);
      } else if (k === "heart") {
        ctx.fillStyle = p.color; ctx.font = `${p.size}px system-ui`; ctx.textAlign = "center";
        ctx.fillText("♥", p.x, p.y);
      } else if (k === "bolt") {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        const segs = 4;
        for (let j = 1; j <= segs; j++) {
          const tt = j / segs;
          const mx = lerp(p.x, p.x2!, tt) + (j < segs ? rand(-14, 14) : 0);
          const my = lerp(p.y, p.y2!, tt) + (j < segs ? rand(-14, 14) : 0);
          ctx.lineTo(mx, my);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawMinimap(ctx: CanvasRenderingContext2D) {
    const size = clamp(Math.min(this.vw, this.vh) * 0.19, 82, 132);
    const pad = 10;
    const x = this.vw - size - pad, y = this.vh - size - pad;
    const s = size / WORLD;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#07090f";
    ctx.beginPath(); ctx.roundRect(x, y, size, size, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x, y, size, size, 10); ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (const b of this.world.buildings) ctx.fillRect(x + b.x * s, y + b.y * s, b.w * s, b.h * s);
    ctx.fillStyle = "#7dffb8";
    for (const b of this.world.konbinis) ctx.fillRect(x + b.x * s - 1, y + b.y * s - 1, b.w * s + 2, b.h * s + 2);
    ctx.fillStyle = "#ffd166";
    for (const c of this.chests) if (!c.open) ctx.fillRect(x + c.x * s - 1.4, y + c.y * s - 1.4, 3, 3);
    ctx.fillStyle = "#ff6b81";
    for (const e of this.enemies) ctx.fillRect(x + e.x * s - 1, y + e.y * s - 1, e.boss ? 5 : 2, e.boss ? 5 : 2);
    if (this.quest) {
      ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + this.quest.x * s, y + this.quest.y * s, 5, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x + this.px * s, y + this.py * s, 2.8, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawStick(ctx: CanvasRenderingContext2D) {
    if (!this.touch) return;
    const one = (st: { active: boolean; ox: number; oy: number; x: number; y: number }, color: string) => {
      if (!st.active) return;
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(st.ox, st.oy, 48, 0, TAU); ctx.stroke();
      const dx = clamp(st.x - st.ox, -48, 48), dy = clamp(st.y - st.oy, -48, 48);
      ctx.globalAlpha = 0.5; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(st.ox + dx, st.oy + dy, 20, 0, TAU); ctx.fill();
      ctx.restore();
    };
    one(this.stick, "#7df9ff");
    one(this.aimStick, "#ff6b81");
  }
}

function waifuAsWeapon(w: WaifuDef): WeaponDef {
  return {
    id: `waifu_${w.id}`, name: w.name, jp: w.jp, icon: w.icon, desc: w.ability,
    behavior: w.behavior, element: w.element, color: w.color, maxLevel: 4,
    cd: w.cd, cdPer: w.cd * 0.12, dmg: w.dmg, dmgPer: w.dmg * 0.55,
    count: w.count, countEvery: 2, speed: w.speed, radius: w.radius, pierce: 2, piercePer: 1,
  };
}

/** Only the quality tier scales an item now — there are no item levels. */
export function itemScale(it: { tier: number }) {
  return ITEM_TIERS[it.tier].mult;
}
export function itemEffectLabel(e: ItemEffect) {
  return e && e !== "none" ? EFFECT_INFO[e] : null;
}

export function itemName(base: string, variant: string, tier: number) {
  const b = ITEM_BASES[base], v = ITEM_VARIANTS[variant], t = ITEM_TIERS[tier];
  if (tier === 0) return `${v.name} ${b.name}`;
  if (tier === 1) return `Fine ${b.name} of the ${v.name}`;
  return `${t.name} ${b.name}: ${v.name}`;
}
export function itemJp(base: string, variant: string, tier: number) {
  return `${ITEM_TIERS[tier].jp}・${ITEM_VARIANTS[variant].jp}${ITEM_BASES[base].jp}`;
}

export function formatStat(k: string, v: number) {
  const pctKeys = ["damage", "haste", "area", "projSpeed", "duration", "moveSpeed", "magnet", "luck", "crit", "critDmg", "xpGain", "coinGain", "cdr"];
  const names: Record<string, string> = {
    damage: "DMG", haste: "ATK SPD", area: "AREA", projSpeed: "PROJ SPD", duration: "DUR",
    amount: "PROJ", moveSpeed: "SPEED", maxHp: "HP", armor: "ARMOR", regen: "REGEN",
    magnet: "MAGNET", luck: "LUCK", crit: "CRIT", critDmg: "CRIT DMG", xpGain: "XP",
    coinGain: "COIN", lifesteal: "LIFESTEAL", cdr: "COOLDOWN", revives: "REVIVE",
  };
  const label = names[k] || k;
  if (pctKeys.includes(k)) {
    const p = v * 100;
    // gear values are deliberately small, so keep a decimal below 10%
    const txt = Math.abs(p) < 10 ? p.toFixed(1).replace(/\.0$/, "") : String(Math.round(p));
    return `${txt}% ${label}`;
  }
  return `${Math.abs(v) < 10 ? Number(v.toFixed(1)) : Math.round(v)} ${label}`;
}
