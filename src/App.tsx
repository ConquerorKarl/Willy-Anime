import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Game, loadMeta, saveMeta, formatStat, itemScale, type Choice, type HudState, type MetaSave, type OwnedItem } from "./game/engine";
import {
  ACTIVE_BY_ID, EFFECT_INFO, ITEM_BASE_STATS, ITEM_TIERS, ITEM_VARIANT_STATS, MAX_LEVEL, MAX_WEAPON_LEVEL,
  ACTS, BOON_BY_ID, CHARACTERS, ELEMENTS, ELITE_BY_ID, GUN_BY_ID, LEGEND_CARDS, MASTERY_BY_ID, META_UPGRADES,
  PASSIVE_BY_ID, SPOILS, SUPER_LEVEL, UNIQUE_BY_ID, WAIFU_BY_ID, WEAPONS, WEAPON_BY_ID,
  waifuLines, type WaifuDef,
} from "./game/content";
import { spriteDataUrl } from "./game/pixel";
import { charPortraitUrl, portraitDataUrl, sagePortraitUrl } from "./game/portraits";
import Intro from "./Intro";
import { sfx } from "./game/audio";
import { TRACKS, setTrack, clearTracks, validateTrackUrl, type ThemeId } from "./game/music";

const emptyHud = (): HudState => ({
  state: "menu", level: 1, xp: 0, xpNeed: 24, hp: 100, maxHp: 100, coins: 0, kills: 0, time: 0,
  weapons: [], passives: [], items: [], actives: [], waifu: null, elementPath: null, quest: null, bosses: [], gate: null,
  act: { id: "dojo", name: "The Sunken Dojo", jp: "沈んだ道場", index: 0, total: 4, from: 1, to: 25 },
  actCleared: false, statPoints: 0, spent: {}, procs: [], shieldHp: 0, empowerT: 0, arena: null,
  boons: [], legends: [], rampStacks: 0, apexKills: 0, rezT: 0, masteries: {}, guns: [], primaryGun: null,
  leechLock: 0, elites: [],
  nearShop: false, district: "Chiba", districtJp: "千葉", dps: 0, enemies: 0,
});

const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const RARITY = ["from-slate-600 to-slate-700", "from-sky-600 to-blue-700", "from-fuchsia-600 to-purple-700", "from-amber-500 to-orange-600"];
const RARITY_RING = ["border-slate-400/40", "border-sky-400/60", "border-fuchsia-400/70", "border-amber-300/80"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>(emptyHud);
  const [screen, setScreen] = useState<"menu" | "run" | "gameover" | "win">("menu");
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [waifuOpts, setWaifuOpts] = useState<{ def: WaifuDef; upgrade: boolean }[] | null>(null);
  const [meta, setMeta] = useState<MetaSave>(() => loadMeta());
  const [toasts, setToasts] = useState<{ id: number; msg: string; icon: string }[]>([]);
  const [bossAlert, setBossAlert] = useState<{ name: string; jp: string; title: string; milestone: boolean; level: number; intro?: [string, string] } | null>(null);
  const [loot, setLoot] = useState<OwnedItem | null>(null);
  const [spoils, setSpoils] = useState(false);
  const [defeat, setDefeat] = useState<string | null>(null);
  const [gunPick, setGunPick] = useState<{ id:string;name:string;jp:string;icon:string;desc:string;perk:string;mag:number;reload:number }[] | null>(null);
  const [boon, setBoon] = useState<{ id:string;name:string;jp:string;icon:string;desc:string }[] | null>(null);
  const [legend, setLegend] = useState<{ id:string;name:string;jp:string;icon:string;desc:string;flavour:string }[] | null>(null);
  const [roll, setRoll] = useState<{ reel: OwnedItem[]; winIndex: number } | null>(null);
  const [recruit, setRecruit] = useState<{ id: string; level: number; upgrade: boolean } | null>(null);
  const [muted, setMuted] = useState(false);
  const [arenaBest] = useState(() => Number(localStorage.getItem("willy-arena-best") || 0));
  const [intro, setIntro] = useState<{ survival: boolean } | null>(null);
  const [musicPanel, setMusicPanel] = useState(false);
  const [trackDraft, setTrackDraft] = useState<Record<string, string>>(() => ({ ...TRACKS }));
  const [trackErr, setTrackErr] = useState<Record<string, string>>({});
  const [musicVol, setMusicVol] = useState(() => Number(localStorage.getItem("willy-musicvol") ?? 0.42));
  const [name] = useState(() => localStorage.getItem("willy-name") || "WILLY");
  const [tab, setTab] = useState<"stats" | "shop">("shop");
  const [charId, setCharId] = useState(() => localStorage.getItem("willy-char") || "willy");
  const [elem, setElem] = useState<string>(() => localStorage.getItem("willy-elem") || "fire");
  const toastId = useRef(1);

  useEffect(() => {
    const c = canvasRef.current!;
    const g = new Game(c);
    gameRef.current = g;
    g.onUi = setHud;
    g.onChoices = (c2) => setChoices(c2);
    g.onWaifuGate = (o) => setWaifuOpts(o);
    g.onEnd = (won) => {
      // Hard-clear every overlay — a stale panel must never outlive the run.
      setChoices(null); setWaifuOpts(null); setLoot(null); setRecruit(null);
      setRoll(null); setSpoils(false); setBoon(null); setLegend(null); setGunPick(null); setDefeat(null);
      setScreen(won ? "win" : "gameover");
      setMeta(loadMeta());
    };
    g.onBossAlert = (b) => setBossAlert(b);
    g.onLoot = (it) => setLoot(it);
    g.onRoll = (r) => setRoll(r);
    g.onSpoils = (o) => setSpoils(o);
    g.onBoon = (o) => setBoon(o);
    g.onGun = (o) => setGunPick(o);
    g.onDefeat = (n) => setDefeat(n);
    g.onLegend = (o) => setLegend(o);
    g.onRecruit = (r) => setRecruit(r);
    g.onToast = (msg, icon) => {
      const id = toastId.current++;
      setToasts((t) => [...t.slice(-3), { id, msg, icon }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    };
    sfx.setMusicVolume(Number(localStorage.getItem("willy-musicvol") ?? 0.42));
    const ro = new ResizeObserver(() => g.resize());
    ro.observe(c);
    return () => { ro.disconnect(); g.destroy(); };
  }, []);

  useEffect(() => {
    if (!recruit) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
        e.preventDefault();
        setRecruit(null);
        gameRef.current?.confirmRecruit();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [recruit]);

  // Enter / Space claims the reel once it has landed
  useEffect(() => {
    if (!roll) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [roll]);

  // Enter / Space confirms the loot screen without reaching for the mouse
  useEffect(() => {
    if (!loot) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
        e.preventDefault();
        setLoot(null);
        gameRef.current?.confirmLoot();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [loot]);

  const startRun = useCallback((survival: boolean, elemOverride?: string, gunPick2?: string | null) => {
    sfx.ensure();
    localStorage.setItem("willy-name", name);
    const g = gameRef.current!;
    g.meta = loadMeta();
    g.coins = g.meta.coins;
    localStorage.setItem("willy-char", charId);
    const useElem = elemOverride ?? elem;
    localStorage.setItem("willy-elem", useElem);
    if (gunPick2) g.introGun = gunPick2;
    // Clear stale overlays BEFORE starting. start() can synchronously open a
    // panel (survival queues waifu gates immediately) and clearing afterwards
    // would wipe it, leaving the engine paused on a panel that isn't drawn.
    setChoices(null); setWaifuOpts(null); setLoot(null);
    setRecruit(null); setRoll(null); setSpoils(false); setBoon(null); setLegend(null); setGunPick(null); setDefeat(null);
    setScreen("run");
    g.start(charId, useElem as never, survival);
  }, [name, charId, elem]);

  // Safety net: if the engine is waiting on a choice panel but the UI has no
  // overlay mounted, re-ask the engine for it. Prevents an invisible panel
  // from locking the game.
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    const id = window.setInterval(() => {
      // only ever re-open panels during live play
      if (g.state === "gameover" || g.state === "win" || g.state === "menu") return;
      if (g.state === "levelup" && !choices) g.onChoices(g.rollChoices());
      else if (g.state === "waifu" && !waifuOpts && !recruit) g.onWaifuGate(g.waifuOptions());
      else if (g.state === "loot" && !loot && g.pendingLoot) g.onLoot(g.pendingLoot);
      else if (g.state === "spoils" && !spoils) g.onSpoils(true);
      else if (g.state === "boon" && !boon) g.onBoon(g.boonOptions());
      else if (g.state === "gun" && !gunPick) g.onGun(g.gunOptions(0));
      else if (g.state === "defeat" && !defeat) g.confirmDefeat();
    }, 500);
    return () => clearInterval(id);
  }, [choices, waifuOpts, recruit, loot, spoils, boon, gunPick, defeat]);

  const start = useCallback(() => { sfx.ensure(); setIntro({ survival: false }); }, []);
  const startSurvival = useCallback(() => { sfx.ensure(); setIntro({ survival: true }); }, []);

  const quit = useCallback(() => {
    const g = gameRef.current;
    if (g) { g.state = "menu"; g.meta = loadMeta(); g.pushUi(); }
    setMeta(loadMeta());
    setChoices(null); setWaifuOpts(null); setLoot(null); setRecruit(null); setRoll(null); setSpoils(false); setBoon(null); setLegend(null); setGunPick(null); setDefeat(null);
    setScreen("menu");
  }, []);

  const takeChoice = (c: Choice) => { setChoices(null); gameRef.current?.takeChoice(c); };

  const g = gameRef.current;
  const inRun = screen === "run";
  const paused = hud.state === "paused";
  const shopOpen = hud.state === "shop";
  const hpPct = (hud.hp / hud.maxHp) * 100;
  const xpPct = (hud.xp / hud.xpNeed) * 100;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#06080e] font-sans text-white select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(0deg,#fff_0px,#fff_1px,transparent_1px,transparent_3px)]" />

      {/* ============ HUD ============ */}
      {inRun && (
        <>
          {/* XP bar */}
          <div className="pointer-events-none absolute left-0 right-0 top-0">
            <div className="h-2.5 w-full bg-black/60">
              <div className={`h-full transition-[width] duration-150 ${hud.gate ? "animate-pulse bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400" : "bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400"}`}
                style={{ width: `${xpPct}%` }} />
            </div>
            {hud.gate && (
              <div className="mt-1 flex justify-center">
                <div className="animate-pulse rounded-b-xl border-x border-b border-amber-400/60 bg-black/85 px-4 py-1 text-center text-[11px] font-black tracking-widest text-amber-300">
                  🚧 LEVEL {hud.gate.level} LOCKED —{" "}
                  {hud.gate.stage === "clear"
                    ? `DEFEAT ${hud.gate.remaining} REMAINING BOSS${hud.gate.remaining === 1 ? "" : "ES"}`
                    : "DEFEAT THE TRIAL BOSS"}
                </div>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute left-0 right-0 top-3 p-2 sm:p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="w-[min(50%,340px)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-600 px-2 py-0.5 text-sm font-black shadow">
                    Lv{hud.level}
                  </span>
                  <div className="h-3.5 flex-1 overflow-hidden rounded-full border border-white/20 bg-black/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${hpPct}%` }} />
                  </div>
                  <span className="w-16 text-right text-[11px] font-bold tabular-nums text-rose-200">{hud.hp}/{hud.maxHp}</span>
                </div>
                {/* weapon icons */}
                <div className="flex flex-wrap gap-1">
                  {hud.weapons.map((w) => (
                    <span key={w.id} className="rounded-md border border-cyan-300/40 bg-cyan-400/10 px-1.5 py-0.5 text-[11px] font-bold">
                      {WEAPON_BY_ID[w.id].icon}<span className={w.level >= SUPER_LEVEL ? "text-amber-300" : "text-cyan-200"}>
                        {w.level >= SUPER_LEVEL ? "★" : w.level}
                      </span>
                    </span>
                  ))}
                  {hud.passives.map((p) => (
                    <span key={p.id} className="rounded-md border border-amber-300/30 bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-bold">
                      {PASSIVE_BY_ID[p.id].icon}<span className="text-amber-200">{p.level}</span>
                    </span>
                  ))}
                  {hud.items.length > 0 && (
                    <span className="rounded-md border border-violet-300/30 bg-violet-400/10 px-1.5 py-0.5 text-[11px] font-bold text-violet-200">
                      🎒{hud.items.length}
                    </span>
                  )}
                  {hud.waifu && (
                    <span className="rounded-md border border-pink-300/40 bg-pink-400/15 px-1.5 py-0.5 text-[11px] font-bold text-pink-200">
                      {WAIFU_BY_ID[hud.waifu.id].icon} {WAIFU_BY_ID[hud.waifu.id].name} Lv{hud.waifu.level}
                    </span>
                  )}
                  {hud.procs.map((p) => {
                    const ready = p.cd <= 0;
                    return (
                      <span key={p.id} title={p.name}
                        className={`relative overflow-hidden rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${ready ? "border-amber-300/60 bg-amber-400/20 text-amber-200" : "border-white/15 bg-black/40 text-white/40"}`}>
                        <span className="absolute inset-x-0 bottom-0 bg-amber-400/25"
                          style={{ height: `${ready ? 0 : (p.cd / p.max) * 100}%` }} />
                        <span className="relative">⚡</span>
                      </span>
                    );
                  })}
                  {hud.leechLock > 0 && (
                    <span className="animate-pulse rounded-md border border-rose-400/70 bg-rose-500/25 px-1.5 py-0.5 text-[11px] font-black text-rose-200">
                      🚫 {hud.leechLock.toFixed(1)}s
                    </span>
                  )}
                  {hud.elites.map((e) => ELITE_BY_ID[e] && (
                    <span key={e} title={`${ELITE_BY_ID[e].name} — ${ELITE_BY_ID[e].desc}`}
                      className="rounded-md border border-amber-200/70 bg-amber-300/25 px-1.5 py-0.5 text-[11px] font-black text-amber-100">
                      {ELITE_BY_ID[e].icon}
                    </span>
                  ))}
                  {hud.shieldHp > 0 && (
                    <span className="rounded-md border border-sky-300/50 bg-sky-400/20 px-1.5 py-0.5 text-[11px] font-black text-sky-200">
                      🛡{hud.shieldHp}
                    </span>
                  )}
                  {hud.empowerT > 0 && (
                    <span className="animate-pulse rounded-md border border-amber-300/60 bg-amber-400/25 px-1.5 py-0.5 text-[11px] font-black text-amber-200">
                      ⚔{hud.empowerT.toFixed(1)}s
                    </span>
                  )}
                  {Object.entries(hud.masteries).map(([k, lv]) => MASTERY_BY_ID[k] && (
                    <span key={k} title={`${MASTERY_BY_ID[k].name} — ${MASTERY_BY_ID[k].desc}`}
                      className="rounded-md border px-1.5 py-0.5 text-[11px] font-bold"
                      style={{ borderColor: (hud.elementPath ? ELEMENTS[hud.elementPath].color : "#fff") + "66",
                               color: hud.elementPath ? ELEMENTS[hud.elementPath].color : "#fff",
                               background: (hud.elementPath ? ELEMENTS[hud.elementPath].color : "#fff") + "1a" }}>
                      {MASTERY_BY_ID[k].icon}{String(lv)}
                    </span>
                  ))}
                  {hud.boons.map((b) => BOON_BY_ID[b] && (
                    <span key={b} title={BOON_BY_ID[b].desc}
                      className="rounded-md border border-cyan-300/40 bg-cyan-400/15 px-1.5 py-0.5 text-[11px] font-bold text-cyan-200">
                      {BOON_BY_ID[b].icon}
                    </span>
                  ))}
                  {hud.legends.map((l) => {
                    const c = LEGEND_CARDS.find((x) => x.id === l);
                    return c && (
                      <span key={l} title={`${c.name} — ${c.desc}`}
                        className="rounded-md border border-amber-300/60 bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-black text-amber-200">
                        {c.icon}
                      </span>
                    );
                  })}
                  {hud.rampStacks > 0 && (
                    <span className="rounded-md border border-orange-300/50 bg-orange-400/20 px-1.5 py-0.5 text-[11px] font-black text-orange-200">
                      📈{Math.round(hud.rampStacks * 0.5)}%
                    </span>
                  )}
                  {hud.rezT > 0 && (
                    <span className="animate-pulse rounded-md border border-amber-200 bg-amber-300/40 px-1.5 py-0.5 text-[11px] font-black text-white">
                      🕊️ {hud.rezT.toFixed(1)}s
                    </span>
                  )}
                  {hud.elementPath && (
                    <span className="rounded-md border px-1.5 py-0.5 text-[11px] font-black"
                      style={{ borderColor: ELEMENTS[hud.elementPath].color + "80", color: ELEMENTS[hud.elementPath].color, background: ELEMENTS[hud.elementPath].color + "1a" }}>
                      {ELEMENTS[hud.elementPath].icon} {ELEMENTS[hud.elementPath].name}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right text-[11px] font-bold">
                <div className="text-xl font-black tabular-nums text-amber-300 drop-shadow sm:text-2xl">¥{hud.coins.toLocaleString()}</div>
                <div className="text-white/60">{hud.kills} KO · {fmtTime(hud.time)}</div>
                {hud.arena ? (
                  <>
                    <div className="text-base font-black text-amber-300 drop-shadow sm:text-lg">
                      🏛️ {hud.arena.endless ? hud.arena.label.toUpperCase() : `WAVE ${hud.arena.round}/7`}
                    </div>
                    <div className="text-white/60">{hud.arena.label} · {hud.arena.jp}</div>
                    <div className="text-white/45">BEST {Math.max(hud.arena.best, arenaBest)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-amber-200/80">
                      ACT {hud.act.index + 1}/{hud.act.total} · {hud.act.name}
                    </div>
                    <div className="text-white/35">{hud.act.jp}</div>
                  </>
                )}
                <div className="text-rose-300/80">{hud.enemies} hostiles · {hud.dps} dps</div>
              </div>
            </div>
          </div>

          {/* Boss arrival banner */}
          {bossAlert && (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
              {bossAlert.milestone ? (
                <div className="w-full text-center">
                  <div className="animate-[flashIn_.5s_ease-out] text-[11px] font-black tracking-[0.7em] text-rose-400">
                    LEVEL {bossAlert.level} · 最終試練
                  </div>
                  <div className="relative mt-2 overflow-hidden py-4">
                    <div className="absolute inset-y-0 left-0 w-full -skew-y-2 bg-gradient-to-r from-transparent via-black/90 to-transparent" />
                    <div className="relative animate-[slamIn_.5s_cubic-bezier(.15,1.7,.4,1)]">
                      <div className="text-[11px] font-black tracking-[0.4em] text-rose-300">{bossAlert.jp}</div>
                      <div className="bg-gradient-to-b from-white via-rose-100 to-rose-500 bg-clip-text text-5xl font-black italic leading-none tracking-tighter text-transparent drop-shadow-[0_0_30px_rgba(255,46,77,1)] sm:text-7xl">
                        {bossAlert.name.toUpperCase()}
                      </div>
                      <div className="mt-1 text-lg font-black italic tracking-widest text-rose-200 sm:text-2xl">
                        「{bossAlert.title}」
                      </div>
                    </div>
                  </div>
                  {bossAlert.intro && (
                    <div className="animate-[flashIn_.6s_.25s_both]">
                      <div className="text-2xl font-black tracking-[0.3em] text-rose-300 sm:text-3xl">{bossAlert.intro[0]}</div>
                      <div className="mt-1 text-sm italic text-white/80 sm:text-base">{bossAlert.intro[1]}</div>
                    </div>
                  )}
                  <div className="mt-2 animate-[flashIn_.6s_.5s_both] text-sm font-black tracking-[0.35em] text-white/90">
                    ☠ THE STREET FALLS SILENT ☠
                  </div>
                </div>
              ) : (
                <div className="animate-[bossIn_.45s_cubic-bezier(.2,1.5,.4,1)] text-center">
                  <div className="text-[11px] font-black tracking-[0.55em] text-rose-400 drop-shadow">警告 · WARNING</div>
                  <div className="relative mt-1 px-6 py-2">
                    <div className="absolute inset-0 -skew-x-12 rounded bg-gradient-to-r from-transparent via-rose-900/80 to-transparent" />
                    <div className="relative text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_0_18px_rgba(255,46,77,0.95)] sm:text-5xl">
                      {bossAlert.name.toUpperCase()}
                    </div>
                    <div className="relative text-sm font-black tracking-[0.3em] text-rose-300">{bossAlert.jp}</div>
                  </div>
                  <div className="mt-1 inline-block rounded-full border border-rose-400/60 bg-black/70 px-4 py-1 text-xs font-black tracking-widest text-rose-200">
                    ☠ {bossAlert.title.toUpperCase()} HAS ARRIVED
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Boss health bars — one per live boss */}
          {hud.bosses.length > 0 && (
            <div className="pointer-events-none absolute left-1/2 top-16 w-[min(94%,620px)] -translate-x-1/2 space-y-1.5">
              {hud.bosses.map((b, i) => (
                <div key={i}>
                  <div className="mb-0.5 flex items-end justify-between px-1">
                    <span className="text-sm font-black italic tracking-tight text-rose-200 drop-shadow sm:text-base">
                      {b.milestone ? "👑" : "💀"} {b.name}
                      {b.milestone && <span className="ml-1 rounded bg-amber-400 px-1 text-[9px] font-black text-black">TRIAL</span>}
                    </span>
                    <span className="text-[11px] font-black tracking-widest text-rose-300/80">{b.jp}</span>
                  </div>
                  <div className={`relative overflow-hidden rounded-md border-2 bg-black/80 shadow-[0_0_22px_rgba(255,46,77,0.45)] ${hud.bosses.length > 1 ? "h-4" : "h-5"} ${b.guard > 0 ? "border-slate-300/70" : "border-rose-500/80"}`}>
                    <div className={`h-full transition-[width] duration-200 ${b.guard > 0 ? "bg-gradient-to-r from-slate-600 via-slate-400 to-slate-300" : "bg-gradient-to-r from-rose-700 via-rose-500 to-orange-400"}`}
                      style={{ width: `${(b.hp / b.maxHp) * 100}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums tracking-wider text-white drop-shadow">
                      {Math.ceil(b.hp).toLocaleString()} / {Math.ceil(b.maxHp).toLocaleString()}
                    </div>
                    <div className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(90deg,transparent_0,transparent_38px,rgba(0,0,0,.45)_38px,rgba(0,0,0,.45)_40px)]" />
                  </div>
                  {b.guard > 0 && (
                    <div className="text-center text-[11px] font-black tracking-widest text-sky-300 drop-shadow">
                      🛡 ESCORT GUARD — defeat {b.guard} more to expose it
                    </div>
                  )}
                </div>
              ))}
              {hud.bosses.length > 1 && (
                <div className="text-center text-[11px] font-black tracking-[0.3em] text-amber-300 drop-shadow">
                  ⚠ {hud.bosses.length} BOSSES ENGAGED
                </div>
              )}
            </div>
          )}

          {/* Quest */}
          {hud.quest && (
            <div className="pointer-events-none absolute left-2 top-28 w-[min(60%,250px)] rounded-xl border border-amber-300/40 bg-black/60 p-2 backdrop-blur sm:top-32">
              <div className="text-[10px] font-black tracking-widest text-amber-300">📍 {hud.quest.title} · {hud.quest.jp}</div>
              <div className="text-[11px] text-white/80">{hud.quest.desc}</div>
              {hud.quest.goal > 1 && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/60">
                  <div className="h-full bg-amber-400" style={{ width: `${(hud.quest.progress / hud.quest.goal) * 100}%` }} />
                </div>
              )}
              <div className="mt-1 text-[10px] font-bold text-emerald-300">Reward: {hud.quest.rewardIcon} {hud.quest.reward}</div>
            </div>
          )}

          {/* Safe zone prompt */}
          {hud.nearShop && hud.state === "playing" && (
            <button onClick={() => g?.openShop()}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 animate-pulse rounded-xl border-2 border-emerald-300/70 bg-emerald-500/25 px-5 py-2.5 text-sm font-black tracking-wider backdrop-blur active:scale-95">
              🏪 SAFE ZONE — OPEN SHOP (E)
            </button>
          )}

          {/* Right controls */}
          <div className="absolute right-2 top-28 flex flex-col gap-2 sm:top-32">
            <button onClick={() => g?.togglePause()} className="rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-xs font-bold backdrop-blur active:scale-95">⏸</button>
            <button onClick={() => { const m = !muted; setMuted(m); sfx.setMuted(m); }} className="rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-xs font-bold backdrop-blur active:scale-95">{muted ? "🔇" : "🔊"}</button>
            <div className="rounded-xl border border-white/20 bg-black/55 px-2 py-2 backdrop-blur">
              <div className="mb-1 text-center text-[8px] font-black tracking-widest text-white/50">BGM</div>
              <input type="range" min={0} max={1} step={0.05} value={musicVol}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMusicVol(v);
                  sfx.setMusicVolume(v);
                  localStorage.setItem("willy-musicvol", String(v));
                }}
                className="h-1 w-14 cursor-pointer accent-fuchsia-400" />
            </div>
          </div>

          {/* Joe's arsenal: live ammo + reload bars */}
          {hud.guns.length > 0 && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-1.5 sm:bottom-28">
              {hud.guns.map((w) => {
                const def = GUN_BY_ID[w.id];
                if (!def || def.mag === 0) return null;
                const reloading = w.reloadT > 0;
                return (
                  <div key={w.id}
                    className={`relative overflow-hidden rounded-lg border px-2 py-1 text-[10px] font-black backdrop-blur ${reloading ? "border-amber-300/50 bg-black/70 text-amber-300" : "border-white/20 bg-black/60 text-white/80"}`}>
                    {reloading && (
                      <span className="absolute inset-y-0 left-0 bg-amber-400/25"
                        style={{ width: `${100 - (w.reloadT / w.reloadMax) * 100}%` }} />
                    )}
                    <span className="relative">{def.icon} {reloading ? "RELOAD" : `${w.ammo}/${w.mag}`}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active skills */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-3 sm:bottom-5">
            {hud.actives.length === 0 && (
              <div className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-[10px] font-bold tracking-wider text-white/50">
                Complete quests 📍 to unlock active skills
              </div>
            )}
            {hud.actives.map((a, i) => {
              const def = ACTIVE_BY_ID[a.id];
              const ready = a.cd <= 0;
              const pct = ready ? 0 : (a.cd / a.max) * 100;
              return (
                <button key={a.id} onPointerDown={(e) => { e.preventDefault(); g?.useActive(i); }}
                  className={`relative flex h-16 w-16 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 text-[9px] font-black tracking-wide transition active:scale-90 ${ready ? "border-cyan-300 bg-gradient-to-br from-cyan-600 to-blue-700 shadow-[0_0_18px_rgba(80,220,255,0.4)]" : "border-white/20 bg-black/60 text-white/50"}`}>
                  <div className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${pct}%` }} />
                  <span className="relative text-xl">{def.icon}</span>
                  <span className="relative">{["Q/SPC", "E/1", "R/2"][i]}</span>
                </button>
              );
            })}
          </div>

          {/* Toasts */}
          <div className="pointer-events-none absolute left-1/2 top-20 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
            {toasts.map((t) => (
              <div key={t.id} className="animate-[pop_.3s_ease-out] rounded-full border border-amber-300/50 bg-black/80 px-4 py-1.5 text-xs font-black tracking-wide text-amber-200 shadow-lg">
                {t.icon} {t.msg}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============ LEVEL UP ============ */}
      {choices && (
        <Overlay>
          <div className="w-full max-w-3xl">
            <div className="mb-3 text-center">
              <div className="text-xs font-black tracking-[0.4em] text-cyan-300">レベルアップ</div>
              <h2 className="text-3xl font-black italic tracking-tighter sm:text-4xl">
                LEVEL <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">{hud.level}</span>
              </h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {choices.map((c) => (
                <button key={c.key} onClick={() => takeChoice(c)}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 ${RARITY_RING[c.rarity]} bg-gradient-to-br ${RARITY[c.rarity]} bg-opacity-20 p-3 text-left transition hover:scale-[1.02] hover:brightness-125 active:scale-95 ${c.isSuper ? "animate-pulse ring-2 ring-amber-300/70" : ""}`}>
                  {c.isSuper && (
                    <span className="absolute right-2 top-1.5 rounded bg-amber-400 px-1.5 text-[9px] font-black text-black">
                      ★ EVOLUTION
                    </span>
                  )}
                  {!c.isSuper && c.element && c.element !== "none" && !hud.elementPath && c.isNew && (
                    <span className="absolute right-2 top-1.5 rounded px-1.5 text-[9px] font-black text-black"
                      style={{ background: ELEMENTS[c.element as keyof typeof ELEMENTS].color }}>
                      ⚑ PATH
                    </span>
                  )}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/40 text-3xl">
                    {c.type === "item"
                      ? <img src={spriteDataUrl(c.id, c.variant!, 5)} alt="" className="h-11 w-11 [image-rendering:pixelated]" />
                      : c.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-black">{c.name}</span>
                      {c.type === "mastery" && hud.elementPath && (
                        <span className="shrink-0 rounded px-1 text-[9px] font-black uppercase tracking-wider text-black"
                          style={{ background: ELEMENTS[hud.elementPath].color }}>
                          {ELEMENTS[hud.elementPath].name}
                        </span>
                      )}
                      {c.type === "item" && c.tier !== undefined && (
                        <span className="shrink-0 rounded bg-black/50 px-1 text-[9px] font-black uppercase tracking-wider">
                          {ITEM_TIERS[c.tier].name}
                        </span>
                      )}
                      {c.isNew ? <span className="rounded bg-white/25 px-1 text-[9px] font-black">NEW</span>
                        : <span className="rounded bg-black/40 px-1 text-[9px] font-black">Lv{c.level}</span>}
                    </div>
                    <div className="truncate text-[10px] font-bold text-white/50">{c.jp}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-white/85">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ PARTNER GATE (with dialogue) ============ */}
      {waifuOpts && g && (
        <WaifuScene
          opts={waifuOpts}
          currentId={hud.waifu?.id ?? null}
          onPick={(i) => { setWaifuOpts(null); g.chooseWaifu(i); }}
        />
      )}

      {/* ============ BOSS DEFEATED ============ */}
      {defeat && g && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/88"
          onClick={() => { setDefeat(null); g.confirmDefeat(); }}>
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%,#ffd16622,transparent 65%)" }} />
          <div className="relative animate-[slamIn_.5s_cubic-bezier(.15,1.7,.4,1)] text-center">
            <div className="text-[11px] font-black tracking-[0.6em] text-amber-400">撃破 · VICTORY</div>
            <div className="mt-1 bg-gradient-to-b from-white via-amber-100 to-amber-500 bg-clip-text text-4xl font-black italic leading-none tracking-tighter text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,.85)] sm:text-6xl">
              {defeat.toUpperCase()}
            </div>
            <div className="mt-2 text-2xl font-black italic tracking-[0.3em] text-amber-200 sm:text-3xl">DEFEATED</div>
            <div className="mt-6 animate-pulse text-[11px] font-black tracking-widest text-white/50">CLICK TO CONTINUE</div>
          </div>
        </div>
      )}

      {/* ============ WEAPON SALVAGE (Joe) ============ */}
      {gunPick && gunPick.length > 0 && g && (
        <SageGunScene
          opts={gunPick}
          first={hud.level <= 1}
          onPick={(id) => { setGunPick(null); g.takeGun(id); }}
        />
      )}

      {/* ============ STARTING BOON ============ */}
      {boon && g && (
        <Overlay>
          <div className="w-full max-w-3xl text-center">
            <div className="text-[11px] font-black tracking-[0.45em] text-cyan-300">開眼 · AWAKENING</div>
            <h2 className="text-3xl font-black italic tracking-tighter sm:text-4xl">
              CHOOSE YOUR <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">FOUNDATION</span>
            </h2>
            <p className="mt-1 text-xs text-white/60">This shapes your entire run. It applies from the very first hit.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {boon.map((b) => (
                <button key={b.id} onClick={() => { setBoon(null); g.takeBoon(b.id); }}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-cyan-300/40 bg-gradient-to-b from-cyan-900/30 to-slate-900/40 p-4 transition hover:scale-[1.03] hover:border-cyan-300 active:scale-95">
                  <span className="text-4xl">{b.icon}</span>
                  <span className="text-sm font-black leading-tight">{b.name}</span>
                  <span className="text-[10px] font-bold text-white/40">{b.jp}</span>
                  <span className="text-[11px] leading-snug text-white/80">{b.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ LEGENDARY MODIFIER CARD ============ */}
      {legend && legend.length > 0 && g && (
        <Overlay>
          <div className="w-full max-w-4xl text-center">
            <div className="animate-pulse text-[11px] font-black tracking-[0.5em] text-amber-300">伝説 · LEGENDARY</div>
            <h2 className="text-3xl font-black italic tracking-tighter sm:text-5xl">
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,.6)]">
                CHOOSE A LEGEND
              </span>
            </h2>
            <p className="mt-1 text-xs text-white/60">A permanent modifier to who you are. Awarded only for clearing a floor.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {legend.map((c) => {
                const full = LEGEND_CARDS.find((x) => x.id === c.id);
                return (
                  <button key={c.id} onClick={() => { setLegend(null); g.takeLegend(c.id); }}
                    className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl p-[2px] text-left transition hover:scale-[1.04] active:scale-95"
                    style={{ background: "linear-gradient(145deg,#ffe9a8,#f0b429 35%,#8a5a12 60%,#ffd166)" }}>
                    <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-white/25 blur-md transition-all duration-700 group-hover:left-[115%]" />
                    <div className="relative flex h-full flex-col gap-2 rounded-[14px] bg-gradient-to-b from-[#2a1d06] via-[#1a1304] to-[#120c02] p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl drop-shadow-[0_0_10px_rgba(251,191,36,.8)]">{c.icon}</span>
                        <div className="min-w-0">
                          <div className="bg-gradient-to-b from-amber-100 to-amber-400 bg-clip-text text-sm font-black leading-tight text-transparent">{c.name}</div>
                          <div className="text-[10px] font-bold text-amber-500/70">{c.jp}</div>
                        </div>
                      </div>
                      <div className="text-[11px] leading-snug text-amber-50/90">{c.desc}</div>
                      {full && (
                        <div className="grid grid-cols-2 gap-x-2 rounded-lg border border-amber-400/25 bg-amber-400/10 p-1.5">
                          {Object.entries(full.mods).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[10px]">
                              <span className="text-amber-200/60">{formatStat(k, 0).replace(/^0%?\s*/, "")}</span>
                              <span className="font-black text-amber-200">
                                {(v as number) > 0 ? "+" : ""}{formatStat(k, v as number).split(" ")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto border-t border-amber-400/20 pt-1.5 text-[10px] italic text-amber-200/45">"{c.flavour}"</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ RECRUITMENT CUTSCENE ============ */}
      {recruit && (() => {
        const w = WAIFU_BY_ID[recruit.id];
        const hue = w.hue;
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 animate-[spinSlow_22s_linear_infinite] opacity-40"
              style={{ background: `repeating-conic-gradient(from 0deg at 50% 50%, hsla(${hue},90%,60%,.5) 0deg 6deg, transparent 6deg 16deg)` }} />
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="pointer-events-none absolute text-lg"
                style={{ left: `${(i * 6.3 + 3) % 100}%`, top: "-8%", color: `hsl(${hue},90%,72%)`,
                  animation: `petal ${4 + (i % 5)}s linear ${i * 0.25}s infinite` }}>❀</span>
            ))}
            <div className="relative mx-3 w-full max-w-lg animate-[slamIn_.55s_cubic-bezier(.15,1.5,.4,1)] text-center">
              <div className="text-[11px] font-black tracking-[0.6em]" style={{ color: `hsl(${hue},90%,72%)` }}>
                {recruit.upgrade ? "絆が深まる · BOND DEEPENS" : "新たな仲間 · NEW PARTNER"}
              </div>
              <div className="relative mx-auto mt-3 w-fit">
                <div className="absolute inset-0 animate-pulse rounded-3xl blur-2xl" style={{ background: `hsl(${hue},95%,55%)`, opacity: 0.6 }} />
                <img src={portraitDataUrl(recruit.id, 11)} alt=""
                  className="relative h-44 w-44 rounded-3xl border-4 [image-rendering:pixelated]"
                  style={{ borderColor: `hsl(${hue},90%,62%)`, background: `hsl(${hue},45%,14%)` }} />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-2 px-3 py-0.5 text-[11px] font-black tracking-widest"
                  style={{ borderColor: `hsl(${hue},90%,62%)`, background: "#07080f", color: `hsl(${hue},90%,75%)` }}>
                  {Array.from({ length: w.maxLevel }).map((_, i) => (
                    <span key={i} className={i < recruit.level ? "" : "opacity-25"}>★</span>
                  ))}
                </div>
              </div>
              <h2 className="mt-5 text-4xl font-black italic leading-none tracking-tighter sm:text-5xl"
                style={{ color: "#fff", textShadow: `0 0 26px hsl(${hue},95%,60%)` }}>
                {w.name.toUpperCase()}
              </h2>
              <div className="text-sm font-black tracking-[0.35em]" style={{ color: `hsl(${hue},90%,72%)` }}>{w.jp}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-widest text-white/60">
                {w.title} · Tier {w.tier} · Lv{recruit.level}/{w.maxLevel}
              </div>
              <p className="mx-auto mt-3 max-w-sm text-sm italic leading-relaxed text-white/80">"{w.blurb}"</p>
              <div className="mx-auto mt-3 grid max-w-sm gap-1 rounded-xl border border-white/10 bg-black/60 p-3 text-left text-[11px]">
                <div><span className="text-cyan-300">⚔</span> <b>{w.ability}</b></div>
                {w.sidearm && <div><span className="text-sky-300">🔫</span> {w.sidearm.name}</div>}
                {w.melee && <div><span className="text-rose-300">🥋</span> {w.melee.name}</div>}
                <div><span className="text-emerald-300">🔄</span> {w.aura.name} — every {w.aura.every}s</div>
              </div>
              <div className="mt-2 text-[11px] font-black tracking-widest text-amber-300">
                ★ {Object.entries(w.buff).map(([k, v]) => formatStat(k, v as number)).join("  ·  ")}
              </div>
              <button autoFocus onClick={() => { setRecruit(null); gameRef.current?.confirmRecruit(); }}
                className="mt-5 rounded-2xl px-10 py-3 text-sm font-black tracking-widest text-black transition hover:brightness-110 active:scale-95"
                style={{ background: `linear-gradient(90deg, hsl(${hue},90%,65%), hsl(${(hue + 40) % 360},90%,62%))` }}>
                {recruit.upgrade ? "SHE GROWS STRONGER" : "LET'S GO, PARTNER!"} — EN
              </button>
            </div>
          </div>
        );
      })()}

      {/* ============ COLOSSEUM SPOILS ============ */}
      {spoils && g && (
        <Overlay>
          <div className="w-full max-w-3xl text-center">
            <div className="text-[11px] font-black tracking-[0.5em] text-amber-300">勝利 · VICTORY</div>
            <h2 className="text-3xl font-black italic tracking-tighter sm:text-4xl">
              <span className="bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">
                WAVE {hud.arena?.round ?? 1} CLEARED
              </span>
            </h2>
            <p className="mt-1 text-xs text-white/60">The crowd roars. Claim your spoils — the next gate opens shortly.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {SPOILS.map((sp) => (
                <button key={sp.kind} onClick={() => { setSpoils(false); g.takeSpoil(sp.kind); }}
                  className="group flex items-center gap-3 rounded-2xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-700/30 to-orange-900/30 p-4 text-left transition hover:scale-[1.02] hover:border-amber-300 active:scale-95">
                  <span className="text-4xl">{sp.icon}</span>
                  <div>
                    <div className="text-sm font-black">{sp.name} <span className="text-white/45">{sp.jp}</span></div>
                    <div className="text-[11px] text-white/75">{sp.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-[11px] font-black tracking-widest text-white/40">
              BEST ROUND: {Math.max(hud.arena?.best ?? 0, arenaBest)}
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ CHEST ROULETTE ============ */}
      {roll && <ChestRoll data={roll} onDone={() => { setRoll(null); gameRef.current?.finishRoll(); }} />}

      {/* ============ LOOT PICKUP ============ */}
      {loot && (
        <Overlay>
          {(() => {
            const tier = ITEM_TIERS[loot.tier];
            const scale = itemScale(loot);
            const mods = [
              ...Object.entries(ITEM_BASE_STATS[loot.base].mods),
              ...Object.entries(ITEM_VARIANT_STATS[loot.variant] || {}),
            ];
            const eff = loot.effect && loot.effect !== "none" ? EFFECT_INFO[loot.effect] : null;
            const uq = loot.uniqueId ? UNIQUE_BY_ID[loot.uniqueId] : null;
            const glow = ["rgba(148,163,184,.5)", "rgba(56,189,248,.55)", "rgba(217,70,239,.6)", "rgba(251,191,36,.65)"][tier.rarity];
            return (
              <div className="w-full max-w-md animate-[pop_.3s_cubic-bezier(.2,1.4,.4,1)] text-center">
                <div className="text-[11px] font-black tracking-[0.45em] text-amber-300">装備獲得 · ITEM FOUND</div>
                <div className={`mt-2 rounded-3xl border-2 ${RARITY_RING[tier.rarity]} bg-gradient-to-br ${RARITY[tier.rarity]} bg-opacity-20 p-5`}
                  style={{ boxShadow: `0 0 50px ${glow}` }}>
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-white/20 bg-black/45">
                    <img src={spriteDataUrl(loot.base, loot.variant, 9)} alt="" className="h-20 w-20 [image-rendering:pixelated]" />
                  </div>
                  <div className="mt-3 inline-block rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    {tier.name} · {ITEM_BASE_STATS[loot.base].slot}
                  </div>
                  <h3 className="mt-1 text-xl font-black italic leading-tight tracking-tight">{loot.name}</h3>
                  <div className="text-[11px] font-bold text-white/45">{loot.jp}</div>
                  {uq && (
                    <>
                      <p className="mt-1 px-2 text-[11px] italic leading-snug text-white/55">"{uq.flavour}"</p>
                      <div className="mt-2 rounded-xl border border-amber-300/40 bg-amber-400/10 p-2.5 text-left">
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/80">
                          {uq.proc.trigger === "cooldown" ? `AUTO · EVERY ${uq.proc.cd}s`
                            : uq.proc.trigger === "always" ? "PASSIVE"
                            : `ON ${uq.proc.trigger.replace("on", "").replace("lowHp", "LOW HP").toUpperCase()} · ${uq.proc.cd}s CD`}
                        </div>
                        <div className="text-sm font-black text-amber-200">⚡ {uq.proc.name}</div>
                        <div className="text-[11px] leading-snug text-white/80">{uq.proc.desc}</div>
                      </div>
                      <div className="mt-2 space-y-1 rounded-xl bg-black/40 p-2.5 text-left">
                        {Object.entries(uq.mods).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-white/60">{formatStat(k, 0).replace(/^0%?\s*/, "")}</span>
                            <span className="font-black text-emerald-300">
                              {(v as number) > 0 ? "+" : ""}{formatStat(k, v as number).split(" ")[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {!uq && (
                    <div className="mt-3 space-y-1 rounded-xl bg-black/40 p-3 text-left">
                      {mods.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className="text-white/60">{formatStat(k, 0).replace(/^0%?\s*/, "")}</span>
                          <span className="font-black text-emerald-300">
                            {(v as number) > 0 ? "+" : ""}{formatStat(k, (v as number) * scale).split(" ")[0]}
                          </span>
                        </div>
                      ))}
                      {eff && (
                        <div className="mt-2 border-t border-white/10 pt-2">
                          <div className="text-xs font-black text-amber-300">★ {eff.name}</div>
                          <div className="text-[11px] leading-snug text-white/75">{eff.desc}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <button autoFocus onClick={() => { setLoot(null); gameRef.current?.confirmLoot(); }}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-black tracking-widest text-black transition hover:brightness-110 active:scale-95">
                    EQUIP — EN / SPACE
                  </button>
                </div>
              </div>
            );
          })()}
        </Overlay>
      )}

      {/* ============ BETWEEN-ACTS HUB ============ */}
      {hud.state === "hub" && g && (() => {
        const next = ACTS[Math.min(ACTS.length - 1, hud.act.index + 1)];
        const cur = ACTS[hud.act.index];
        const POINTS = [
          { id: "sp_hp", name: "Vitality", jp: "体力", icon: "❤️", desc: "+25 max HP" },
          { id: "sp_armor", name: "Defense", jp: "防御", icon: "🛡️", desc: "+2 armor" },
          { id: "sp_dmg", name: "Might", jp: "攻撃", icon: "💥", desc: "+8% damage" },
          { id: "sp_haste", name: "Tempo", jp: "速射", icon: "⏩", desc: "+6% attack speed" },
          { id: "sp_speed", name: "Agility", jp: "敏捷", icon: "👟", desc: "+5% move speed" },
          { id: "sp_luck", name: "Fortune", jp: "幸運", icon: "🍀", desc: "+6% luck, +15% magnet" },
        ];
        return (
          <Overlay>
            <div className="w-full max-w-3xl">
              <div className="text-center">
                <div className="text-[11px] font-black tracking-[0.5em] text-emerald-300">安全地帯 · SAFE HAVEN</div>
                <h2 className="text-3xl font-black italic tracking-tighter sm:text-4xl">
                  {cur.shop.icon} <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">{cur.shop.name}</span>
                </h2>
                <p className="mx-auto mt-1 max-w-lg text-[11px] italic text-white/60">{cur.shop.flavour}</p>
              </div>
              <div className="mt-3 rounded-2xl border border-amber-300/40 bg-black/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-widest text-amber-300">SPEND STAT POINTS</span>
                  <span className={`text-sm font-black ${hud.statPoints > 0 ? "animate-pulse text-amber-300" : "text-white/40"}`}>
                    {hud.statPoints} available
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {POINTS.map((p) => (
                    <button key={p.id} disabled={hud.statPoints <= 0} onClick={() => g.spendPoint(p.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${hud.statPoints > 0 ? "border-amber-300/40 bg-white/5 hover:bg-amber-400/20 active:scale-95" : "border-white/10 opacity-50"}`}>
                      <span className="text-xl">{p.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black">{p.name} <span className="text-white/40">{p.jp}</span></div>
                        <div className="text-[10px] text-white/55">{p.desc}</div>
                      </div>
                      <span className="text-xs font-black text-amber-300">{hud.spent[p.id] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2.5 rounded-2xl border border-emerald-300/30 bg-black/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-widest text-emerald-300">PERMANENT UPGRADES</span>
                  <span className="text-sm font-black text-amber-300">¥{hud.coins.toLocaleString()}</span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[{ k: "heal", l: "Full Heal", c: 40, i: "🍱" }, { k: "shield", l: "14s Shield", c: 55, i: "🛡️" }, { k: "refill", l: "Reset Skills", c: 25, i: "⚡" }].map((x) => (
                    <button key={x.k} onClick={() => g.buyService(x.k)}
                      className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-500/30 active:scale-95">
                      {x.i} {x.l} <span className="text-amber-300">¥{Math.round(x.c * g.shopPrices())}</span>
                    </button>
                  ))}
                </div>
                <div className="grid max-h-[26vh] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {META_UPGRADES.map((m) => {
                    const lv = meta.levels[m.id] || 0;
                    const maxed = lv >= m.max;
                    const cost = g.metaCost(m.id);
                    const afford = hud.coins >= cost && !maxed;
                    return (
                      <button key={m.id} disabled={!afford} onClick={() => { if (g.buyMeta(m.id)) setMeta(loadMeta()); }}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${maxed ? "border-amber-300/50 bg-amber-500/10" : afford ? "border-emerald-300/40 bg-white/5 hover:bg-emerald-500/20 active:scale-95" : "border-white/10 opacity-50"}`}>
                        <span className="text-lg">{m.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-black">{m.name}</div>
                          <div className="text-[10px] text-white/55">{m.desc}</div>
                        </div>
                        <span className="text-[11px] font-black text-amber-300">{maxed ? "MAX" : `¥${cost}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 rounded-2xl border-2 border-rose-400/50 bg-gradient-to-r from-rose-900/40 to-fuchsia-900/30 p-3 text-center">
                <div className="text-[10px] font-black tracking-[0.35em] text-rose-300">NEXT — ACT {hud.act.index + 2}</div>
                <div className="text-xl font-black italic tracking-tight">{next.name} <span className="text-white/45">{next.jp}</span></div>
                <p className="mx-auto mt-0.5 max-w-md text-[11px] text-white/65">{next.blurb}</p>
                <button onClick={() => g.startNextAct()}
                  className="mt-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-10 py-3 text-sm font-black tracking-widest shadow-lg transition hover:brightness-110 active:scale-95">
                  ENTER {next.name.toUpperCase()} →
                </button>
              </div>
            </div>
          </Overlay>
        );
      })()}

      {/* ============ SHOP ============ */}
      {shopOpen && g && (
        <Overlay>
          <div className="flex w-full max-w-3xl flex-col rounded-3xl border-2 border-emerald-400/50 bg-[#0a1016]/95 p-4 shadow-[0_0_50px_rgba(60,255,180,0.2)]">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic tracking-tight text-emerald-300">KONBINI 24 <span className="text-sm text-white/50">コンビニ</span></h2>
                <p className="text-[11px] text-white/50">Permanent upgrades — they persist between runs.</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-black tabular-nums text-amber-300">¥{hud.coins.toLocaleString()}</div>
                <button onClick={() => g.closeShop()} className="mt-1 rounded-lg border border-white/20 px-3 py-1 text-xs font-bold active:scale-95">CLOSE (E)</button>
              </div>
            </div>

            {/* services */}
            <div className="mb-2 flex flex-wrap gap-2">
              {[{ k: "heal", l: "Full Heal", c: 40, i: "🍱" }, { k: "shield", l: "14s Shield", c: 55, i: "🛡️" }, { k: "refill", l: "Reset Skills", c: 25, i: "⚡" }].map((s) => (
                <button key={s.k} onClick={() => g.buyService(s.k)}
                  className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold transition hover:bg-emerald-500/30 active:scale-95">
                  {s.i} {s.l} <span className="text-amber-300">¥{Math.round(s.c * g.shopPrices())}</span>
                </button>
              ))}
              {hud.waifu && (
                <span className="rounded-xl border border-pink-300/40 bg-pink-500/15 px-3 py-1.5 text-xs font-bold text-pink-200">
                  💖 {WAIFU_BY_ID[hud.waifu.id].name}: {WAIFU_BY_ID[hud.waifu.id].aura.name} (auto)
                </span>
              )}
            </div>

            <div className="grid max-h-[46vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {META_UPGRADES.map((m) => {
                const lv = meta.levels[m.id] || 0;
                const maxed = lv >= m.max;
                const cost = g.metaCost(m.id);
                const afford = hud.coins >= cost && !maxed;
                return (
                  <button key={m.id} disabled={!afford}
                    onClick={() => { if (g.buyMeta(m.id)) setMeta(loadMeta()); }}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${maxed ? "border-amber-300/50 bg-amber-500/10" : afford ? "border-emerald-300/40 bg-white/5 hover:bg-emerald-500/20 active:scale-[0.98]" : "border-white/10 bg-black/30 opacity-50"}`}>
                    <span className="text-2xl">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black">{m.name} <span className="text-white/40">{m.jp}</span></div>
                      <div className="text-[10px] text-white/60">{m.desc}</div>
                      <div className="mt-1 flex gap-0.5">
                        {Array.from({ length: m.max }).map((_, i) => (
                          <span key={i} className={`h-1.5 w-full rounded-full ${i < lv ? "bg-emerald-400" : "bg-white/15"}`} />
                        ))}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-black ${maxed ? "text-amber-300" : afford ? "text-amber-300" : "text-white/40"}`}>
                      {maxed ? "MAX" : `¥${cost}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ PAUSE ============ */}
      {paused && (
        <Overlay>
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0a0d18]/95 p-5">
            <h2 className="text-center text-3xl font-black italic tracking-tight text-cyan-300">PAUSED 一時停止</h2>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <Stat label="LEVEL" value={`${hud.level}`} />
              <Stat label="KILLS" value={`${hud.kills}`} />
              <Stat label="TIME" value={fmtTime(hud.time)} />
              <Stat label="COINS" value={`${hud.coins}`} />
            </div>
            <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
              <Section title="WEAPONS">
                {hud.weapons.map((w) => <Row key={w.id} icon={WEAPON_BY_ID[w.id].icon} name={WEAPON_BY_ID[w.id].name} right={w.level >= SUPER_LEVEL ? "★ SUPER" : `Lv${w.level}/${MAX_WEAPON_LEVEL}`} />)}
              </Section>
              {hud.passives.length > 0 && (
                <Section title="PASSIVES">
                  {hud.passives.map((p) => <Row key={p.id} icon={PASSIVE_BY_ID[p.id].icon} name={PASSIVE_BY_ID[p.id].name} right={`Lv${p.level}`} />)}
                </Section>
              )}
              {hud.items.length > 0 && (
                <Section title={`GEAR (${hud.items.length})`}>
                  <div className="flex flex-wrap gap-1.5">
                    {hud.items.map((it, i) => {
                      const scale = itemScale(it);
                      const uq2 = it.uniqueId ? UNIQUE_BY_ID[it.uniqueId] : null;
                      const mods = uq2 ? Object.entries(uq2.mods)
                        : [...Object.entries(ITEM_BASE_STATS[it.base].mods), ...Object.entries(ITEM_VARIANT_STATS[it.variant] || {})];
                      return (
                        <div key={i} title={`${it.name} [${ITEM_TIERS[it.tier].name}]\n${mods.map(([k, v]) => formatStat(k, (v as number) * (uq2 ? 1 : scale))).join(", ")}${uq2 ? `\n⚡ ${uq2.proc.name}: ${uq2.proc.desc}` : it.effect && it.effect !== "none" ? `\n★ ${EFFECT_INFO[it.effect].name}: ${EFFECT_INFO[it.effect].desc}` : ""}`}
                          className={`relative rounded-lg border bg-black/40 p-1 ${RARITY_RING[ITEM_TIERS[it.tier].rarity]}`}>
                          <img src={spriteDataUrl(it.base, it.variant, 4)} alt="" className="h-8 w-8 [image-rendering:pixelated]" />

                          {(it.uniqueId || (it.effect && it.effect !== "none")) && (
                            <span className="absolute -left-1 -top-1 text-[9px]">{it.uniqueId ? "⚡" : "★"}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => g?.togglePause()} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-black tracking-wider active:scale-95">RESUME</button>
              <button onClick={quit} className="rounded-xl border border-white/20 px-6 py-3 text-sm font-black tracking-wider text-white/70 active:scale-95">QUIT</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ OPENING CEREMONY ============ */}
      {intro && (
        <Intro
          charId={charId}
          onCancel={() => setIntro(null)}
          onDone={(el, gunId) => {
            const sv = intro.survival;
            setElem(el);
            setIntro(null);
            startRun(sv, el, gunId);
          }}
        />
      )}

      {/* ============ MENU ============ */}
      {screen === "menu" && (
        <Overlay>
          <div className="w-full max-w-4xl">
            <div className="text-center">
              <div className="text-[11px] font-black tracking-[0.5em] text-cyan-300">千葉・ネオンサバイバー</div>
              <h1 className="text-4xl font-black italic leading-[0.9] tracking-tighter sm:text-6xl">
                <span className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">WILLY ANIME</span>
                <br /><span className="text-xl tracking-widest text-white/90 sm:text-3xl">TOKYO ASSAULT 🏓</span>
              </h1>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">
                A bullet-heaven roguelite. You start with a ping pong racket at <b className="text-cyan-300">Level 1</b>.
                Auto-attack endless gangsters, hoover up XP, level to <b className="text-fuchsia-300">{MAX_LEVEL}</b>, fight a boss every 5 levels,
                run quests for active skills, and recruit a partner at 25 / 50 / 75 / 100.
              </p>
            </div>

            {/* ---- character select ---- */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
              <div className="mb-2 text-[11px] font-black tracking-widest text-fuchsia-300">キャラ選択 · CHOOSE YOUR FIGHTER</div>
              <div className="grid grid-cols-5 gap-1.5">
                {CHARACTERS.map((c) => {
                  const on = c.id === charId;
                  return (
                    <button key={c.id} onClick={() => setCharId(c.id)}
                      className={`flex flex-col items-center rounded-xl border-2 p-1.5 transition ${on ? "scale-[1.04] border-fuchsia-400 bg-fuchsia-500/20" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
                      <img src={charPortraitUrl(c.id, 5)} alt=""
                        className="h-14 w-14 rounded-lg [image-rendering:pixelated]"
                        style={{ background: `hsl(${c.hue},45%,16%)` }} />
                      <span className="mt-1 text-center text-[9px] font-black leading-[1.1]">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              {(() => {
                const c = CHARACTERS.find((x) => x.id === charId)!;
                return (
                  <div className="mt-2 rounded-xl bg-black/50 p-2.5 text-left">
                    <div className="text-sm font-black">
                      {c.icon} {c.name} <span className="text-white/45">{c.jp}</span>
                      <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">{c.title}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] italic leading-snug text-white/65">{c.blurb}</p>
                    <div className="mt-1 text-[11px] font-bold text-amber-300">★ {c.perk}</div>
                    <div className="text-[11px] text-cyan-200">
                      ⚔ {WEAPON_BY_ID[c.weapon]?.name}
                      {c.pet && <span className="ml-1 text-orange-200">· 🐕 dog companion</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {WEAPONS.filter((w) => w.chars?.includes(c.id) && w.element === "none")
                        .map((w) => (
                          <span key={w.id} title={w.desc}
                            className="rounded border border-white/15 bg-white/5 px-1 py-0.5 text-[9px] font-bold text-white/70">
                            {w.icon} {w.name}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })()}

              {/* element is chosen during the opening ceremony */}
              <div className="mt-2.5 rounded-xl border border-violet-400/30 bg-violet-500/10 p-2 text-center">
                <div className="text-[10px] font-black tracking-[0.3em] text-violet-300">NEXT · 開眼の儀</div>
                <div className="text-[11px] leading-snug text-white/70">
                  The Elder will bind your element when you begin
                  {CHARACTERS.find((c) => c.id === charId)?.gunner && " — and issue your first firearm"}.
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-center gap-2 text-xs font-black">
              <button onClick={() => setMusicPanel(true)}
                className="rounded-full border border-white/20 px-4 py-1.5 tracking-widest text-white/60 transition hover:border-fuchsia-300 hover:text-fuchsia-200">
                🎵 MUSIC
              </button>
              {(["shop", "stats"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 tracking-widest transition ${tab === t ? "bg-white text-black" : "border border-white/20 text-white/60"}`}>
                  {t === "shop" ? "🏪 KONBINI" : "📊 RECORDS"}
                </button>
              ))}
            </div>

            <div className="mt-3 max-h-[36vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-3">
              {tab === "shop" ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-black tracking-widest text-emerald-300">PERMANENT UPGRADES</span>
                    <span className="text-sm font-black text-amber-300">¥{meta.coins.toLocaleString()}</span>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {META_UPGRADES.map((m) => {
                      const lv = meta.levels[m.id] || 0;
                      const maxed = lv >= m.max;
                      const cost = Math.round(m.cost * Math.pow(m.costMul, lv));
                      const afford = meta.coins >= cost && !maxed;
                      return (
                        <button key={m.id} disabled={!afford}
                          onClick={() => {
                            const nm = loadMeta();
                            nm.coins -= cost; nm.levels[m.id] = lv + 1;
                            saveMeta(nm); setMeta(nm);
                            if (gameRef.current) gameRef.current.meta = nm;
                            sfx.upgrade();
                          }}
                          className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${maxed ? "border-amber-300/50 bg-amber-500/10" : afford ? "border-emerald-300/40 bg-white/5 hover:bg-emerald-500/20 active:scale-[0.98]" : "border-white/10 opacity-50"}`}>
                          <span className="text-xl">{m.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-black">{m.name} <span className="text-white/40">{m.jp}</span></div>
                            <div className="text-[10px] text-white/55">{m.desc}</div>
                            <div className="mt-1 flex gap-0.5">
                              {Array.from({ length: m.max }).map((_, i) => (
                                <span key={i} className={`h-1 w-full rounded-full ${i < lv ? "bg-emerald-400" : "bg-white/15"}`} />
                              ))}
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-black text-amber-300">{maxed ? "MAX" : `¥${cost}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 text-[11px] font-black tracking-widest text-cyan-300">BEST RUNS</div>
                  {meta.best.length === 0 && <div className="text-xs text-white/40">No runs yet. Go get battered.</div>}
                  <ol className="space-y-1 text-xs">
                    {meta.best.map((b, i) => (
                      <li key={i} className="flex justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 tabular-nums">
                        <span className="text-white/80">{i + 1}. {b.name} — Lv{b.level}</span>
                        <span className="text-white/50">{b.kills} KO · {fmtTime(b.time)} · ¥{b.coins}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 grid gap-1 text-[11px] text-white/60">
                    <div className="font-black tracking-widest text-amber-300">CONTROLS</div>
                    <div><b className="text-white">WASD / Arrows</b> or <b className="text-white">drag anywhere</b> — move. Attacks are automatic.</div>
                    <div><b className="text-white">Q/Space, E/1, R/2</b> — active skills (earned from quests)</div>
                    <div><b className="text-white">E</b> — open chests 📦 & konbini shops 🏪 · <b className="text-white">P/Esc</b> — pause</div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button onClick={start}
                  className="rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-cyan-400 px-10 py-4 text-lg font-black tracking-widest shadow-[0_0_34px_rgba(255,60,160,0.5)] transition hover:scale-105 active:scale-95">
                  START RUN 🏓
                </button>
                <button onClick={startSurvival}
                  title="Test mode: level 100, 40 random items, straight into the endless Colosseum"
                  className="rounded-2xl border-2 border-amber-300/70 bg-gradient-to-r from-amber-600/40 to-orange-700/40 px-8 py-4 text-base font-black tracking-widest text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.35)] transition hover:scale-105 hover:border-amber-200 active:scale-95">
                  START SURVIVAL 🏛️
                </button>
              </div>
              <div className="max-w-md text-center text-[10px] leading-snug text-white/40">
                <b className="text-amber-300/70">SURVIVAL</b> — jump straight to the endless Colosseum at
                level 100 with 40 items and a full set of level-up picks to spend.
                {arenaBest > 0 && <> Your best round: <b className="text-amber-300">{arenaBest}</b>.</>}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ MUSIC SETTINGS ============ */}
      {musicPanel && (
        <Overlay>
          <div className="w-full max-w-2xl rounded-3xl border border-fuchsia-400/40 bg-[#0a0d18]/96 p-5">
            <h2 className="text-2xl font-black italic tracking-tight text-fuchsia-300">🎵 BOSS MUSIC</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-white/60">
              Each boss theme is composed live by the built-in sequencer. To use your own music,
              paste a <b className="text-white">direct audio file URL</b> below — it's saved to this browser.
            </p>
            <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-200/90">
              ⚠ YouTube / Spotify / SoundCloud links <b>will not work</b> — those serve a player page,
              not an audio file, and extracting their streams breaks their terms of service.
              Host your own file (Dropbox direct link, GitHub raw, your own server) or use a
              royalty-free source such as Pixabay Music, Free Music Archive or OpenGameArt.
            </div>

            <div className="mt-3 space-y-2">
              {([
                { id: "samurai", label: "Act 1 Trial · Daibutsu Genkai", lv: "L25" },
                { id: "yakuza", label: "Act 2 Trial · Gorou Kuromaki", lv: "L50" },
                { id: "dragon", label: "Act 3 Trial · Gorilla-sensei", lv: "L75" },
                { id: "titan", label: "Act 4 Trial · Genkai Unbound", lv: "L100" },
                { id: "normal", label: "All other bosses", lv: "every 5" },
              ] as { id: ThemeId; label: string; lv: string }[]).map((t) => (
                <div key={t.id}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[11px] font-black text-white/80">
                      <span className="mr-1 rounded bg-white/10 px-1 text-[9px]">{t.lv}</span>{t.label}
                    </span>
                    <button onClick={() => { sfx.ensure(); sfx.startBossMusic(t.id); }}
                      className="rounded-md border border-white/20 px-2 py-0.5 text-[10px] font-bold hover:bg-white/10 active:scale-95">
                      ▶ TEST
                    </button>
                  </div>
                  <input
                    value={trackDraft[t.id] || ""}
                    placeholder="(empty — using built-in sequencer)"
                    onChange={(e) => {
                      const v = e.target.value;
                      setTrackDraft((d) => ({ ...d, [t.id]: v }));
                      const err = validateTrackUrl(v);
                      setTrackErr((d) => ({ ...d, [t.id]: err || "" }));
                      if (!err) setTrack(t.id, v);
                    }}
                    className={`w-full rounded-lg border bg-black/50 px-2 py-1.5 text-[11px] outline-none ${trackErr[t.id] ? "border-rose-400/70" : "border-white/15 focus:border-fuchsia-300"}`} />
                  {trackErr[t.id] && <div className="mt-0.5 text-[10px] text-rose-300">{trackErr[t.id]}</div>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={() => { clearTracks(); setTrackDraft({ ...TRACKS }); setTrackErr({}); sfx.stopBossMusic(); }}
                className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white/60 active:scale-95">
                RESET TO SEQUENCER
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => sfx.stopBossMusic()}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold active:scale-95">■ STOP</button>
                <button onClick={() => { sfx.stopBossMusic(); setMusicPanel(false); }}
                  className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 py-2 text-xs font-black tracking-widest active:scale-95">
                  DONE
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ============ END ============ */}
      {(screen === "gameover" || screen === "win") && (
        <Overlay>
          <div className="w-full max-w-lg rounded-3xl border-2 border-white/15 bg-[#0a0d18]/95 p-6 text-center">
            <h2 className={`text-4xl font-black italic tracking-tighter ${screen === "win" ? "text-amber-300" : "text-rose-400"}`}>
              {screen === "win" ? "LEGEND OF CHIBA" : "KNOCKED OUT"}
            </h2>
            <p className="mt-1 text-[11px] font-bold tracking-widest text-white/50">
              {screen === "win" ? "レベル100到達 — the whole bay belongs to Willy" : "ゲームオーバー — the gangs dragged you off"}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              <Stat label="LEVEL" value={`${hud.level}`} />
              <Stat label="KILLS" value={`${hud.kills}`} />
              <Stat label="TIME" value={fmtTime(hud.time)} />
              <Stat label="COINS" value={`${hud.coins}`} />
            </div>
            {hud.arena && (
              <div className="mt-3 rounded-2xl border-2 border-amber-300/50 bg-amber-500/10 p-3">
                <div className="text-[10px] font-black tracking-[0.3em] text-amber-300">COLOSSEUM</div>
                <div className="text-3xl font-black italic text-amber-200">
                  {hud.arena.endless ? hud.arena.label.toUpperCase() : `WAVE ${hud.arena.round}`}
                </div>
                <div className="text-[11px] text-white/50">Best ever: {Math.max(hud.arena.best, arenaBest)}</div>
              </div>
            )}
            <p className="mt-2 text-[11px] text-emerald-300">Coins are kept — spend them at the Konbini on the menu.</p>
            <div className="mt-3 max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-2 text-left">
              <div className="mb-1 text-[10px] font-black tracking-widest text-cyan-300">BEST RUNS</div>
              <ol className="space-y-0.5 text-[11px]">
                {meta.best.map((b, i) => (
                  <li key={i} className="flex justify-between tabular-nums text-white/70">
                    <span>{i + 1}. {b.name} — Lv{b.level}</span>
                    <span>{b.kills} KO · {fmtTime(b.time)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-4 flex justify-center">
              <button onClick={quit}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-10 py-3 text-sm font-black tracking-wider shadow-lg active:scale-95">
                RETURN TO MENU
              </button>
            </div>
            <p className="mt-2 text-[10px] text-white/40">Pick your character, element and loadout again from the menu.</p>
          </div>
        </Overlay>
      )}

      <style>{`@keyframes spinSlow{to{transform:rotate(360deg)}}
      @keyframes petal{0%{transform:translateY(-10vh) rotate(0);opacity:0}10%{opacity:.9}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
      @keyframes slamIn{from{transform:scale(3.4) rotate(-6deg);opacity:0;filter:blur(14px)}60%{filter:blur(0)}to{transform:scale(1) rotate(0);opacity:1;filter:blur(0)}}
      @keyframes flashIn{from{opacity:0;letter-spacing:1.2em}to{opacity:1}}
      @keyframes bossIn{from{transform:scale(2.2);opacity:0;filter:blur(8px)}to{transform:scale(1);opacity:1;filter:blur(0)}}
      @keyframes pop{from{transform:scale(.8) translateY(-8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:3px}`}</style>
    </div>
  );
}


/** Spinning reward reel. Eases to a stop with the winner under the marker. */
function ChestRoll({ data, onDone }: { data: { reel: OwnedItem[]; winIndex: number }; onDone: () => void }) {
  const CARD = 104;                 // px per item including gap
  const [offset, setOffset] = useState(0);
  const [landed, setLanded] = useState(false);
  const raf = useRef(0);
  const lastTick = useRef(-1);

  useEffect(() => {
    // stop with the winning card centred, nudged a little off-centre so it
    // doesn't look mechanically perfect
    const jitter = (Math.random() - 0.5) * CARD * 0.5;
    const target = data.winIndex * CARD + jitter;
    const DUR = 5200;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      // strong ease-out: fast blur then a slow crawl into place
      const e = 1 - Math.pow(1 - p, 4.2);
      const off = target * e;
      setOffset(off);
      const idx = Math.round(off / CARD);
      if (idx !== lastTick.current) { lastTick.current = idx; sfx.reelTick(); }
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        setLanded(true);
        sfx.reelLand(ITEM_TIERS[data.reel[data.winIndex].tier].rarity);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [data]);

  const prize = data.reel[data.winIndex];
  const pTier = ITEM_TIERS[prize.tier];
  const GLOW = ["rgba(148,163,184,.55)", "rgba(56,189,248,.6)", "rgba(217,70,239,.65)", "rgba(251,191,36,.75)"];

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="text-[11px] font-black tracking-[0.5em] text-amber-300">宝箱 · CHEST</div>
      <div className="mb-3 text-2xl font-black italic tracking-tighter sm:text-3xl">
        {landed ? "YOU RECEIVED" : "OPENING…"}
      </div>

      <div className="relative w-full max-w-3xl overflow-hidden border-y-2 border-white/15 bg-black/60 py-3">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-black to-transparent" />
        {/* centre marker */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_18px_6px_rgba(251,191,36,.55)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2">
          <div className="h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-amber-300" />
        </div>

        <div className="flex will-change-transform"
          style={{ transform: `translateX(calc(50% - ${offset}px - 46px))` }}>
          {data.reel.map((it, i) => {
            const tier = ITEM_TIERS[it.tier];
            const win = landed && i === data.winIndex;
            return (
              <div key={i}
                className={`mx-1 flex h-[92px] w-[96px] shrink-0 flex-col items-center justify-center rounded-xl border-2 ${RARITY_RING[tier.rarity]} bg-gradient-to-b ${RARITY[tier.rarity]} transition-transform ${win ? "scale-110" : ""}`}
                style={win ? { boxShadow: `0 0 34px ${GLOW[tier.rarity]}` } : undefined}>
                <img src={spriteDataUrl(it.base, it.variant, 5)} alt=""
                  className="h-12 w-12 [image-rendering:pixelated]" />
                <span className="mt-0.5 text-[8px] font-black uppercase tracking-wider opacity-80">
                  {tier.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`mt-4 text-center transition-opacity duration-300 ${landed ? "opacity-100" : "opacity-0"}`}>
        <div className="text-[10px] font-black uppercase tracking-[0.3em]"
          style={{ color: ["#94a3b8", "#38bdf8", "#d946ef", "#fbbf24"][pTier.rarity] }}>
          {pTier.name} · {ITEM_BASE_STATS[prize.base].slot}
        </div>
        <div className="text-xl font-black italic tracking-tight">{prize.name}</div>
        <button onClick={onDone}
          className="mt-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-10 py-2.5 text-sm font-black tracking-widest text-black transition hover:brightness-110 active:scale-95">
          CLAIM
        </button>
      </div>
    </div>
  );
}

/** Partner gate with dialogue. At 25 everyone pitches; at 50/75/100 your
 *  current partner pleads to stay while the newcomers try to poach you. */
/** The Elder returns after a floor boss, offering salvage from the body. */
function SageGunScene({ opts, first, onPick }: {
  opts: { id: string; name: string; jp: string; icon: string; desc: string; perk: string; mag: number; reload: number }[];
  first: boolean;
  onPick: (id: string) => void;
}) {
  const [spoke, setSpoke] = useState(false);
  const [typed, setTyped] = useState("");
  const line = first
    ? "You'll want iron in your hands. Choose."
    : "I went through the body. Found this. Don't ask what else was in there.";

  useEffect(() => {
    sfx.sageArrive();
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i++; setTyped(line.slice(0, i));
      if (i >= line.length) { clearInterval(id); setSpoke(true); }
    }, 26);
    return () => clearInterval(id);
  }, [line]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 55%, rgba(110,245,232,.14), transparent 62%)" }} />
      <div className="relative flex flex-col items-center">
        <img src={sagePortraitUrl(9)} alt="Elder"
          className="h-36 w-36 [image-rendering:pixelated] sm:h-40 sm:w-40"
          style={{ animation: "idle 3.2s ease-in-out infinite" }} />
        <div className="mt-1 text-[11px] font-black tracking-widest text-violet-300">THE ELDER</div>
      </div>
      <div className="relative mt-4 w-[min(92%,620px)] rounded-2xl border-2 border-violet-400/50 bg-[#120d1c]/95 px-5 py-3 text-center">
        <p className="min-h-[2.4em] text-sm leading-relaxed text-white/90 sm:text-base">
          {typed}<span className="animate-pulse">▌</span>
        </p>
      </div>
      {spoke && (
        <div className="relative mt-4 w-[min(94%,760px)] animate-[pop_.3s_ease-out]">
          <div className="mb-2 text-center text-[11px] font-black tracking-[0.4em] text-emerald-300">
            武器庫 · {first ? "CHOOSE YOUR PRIMARY" : "SALVAGED WEAPON"}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {opts.map((w) => (
              <button key={w.id} onClick={() => onPick(w.id)}
                className="flex flex-col gap-1.5 rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-b from-emerald-900/30 to-slate-900/50 p-3 text-left transition hover:scale-[1.03] hover:border-emerald-300 active:scale-95">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{w.icon}</span>
                  <div>
                    <div className="text-xs font-black leading-tight">{w.name}</div>
                    <div className="text-[9px] font-bold text-white/40">{w.jp}</div>
                  </div>
                </div>
                <div className="text-[10px] leading-snug text-white/75">{w.desc}</div>
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-1 text-[9px] text-emerald-200">
                  ★ {w.perk}
                </div>
                {w.mag > 0 && (
                  <div className="mt-auto flex justify-between text-[9px] font-black text-white/45">
                    <span>MAG {w.mag}</span><span>RELOAD {w.reload}s</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}`}</style>
    </div>
  );
}

function WaifuScene({ opts, currentId, onPick }: {
  opts: { def: WaifuDef; upgrade: boolean }[];
  currentId: string | null;
  onPick: (i: number) => void;
}) {
  const [beat, setBeat] = useState(0);
  const [typed, setTyped] = useState("");

  // Build the conversation: loyalty plea first (if any), then each pitch.
  const script = useMemo(() => {
    const out: { id: string; name: string; jp: string; hue: number; line: string; tag: string }[] = [];
    const cur = currentId ? WAIFU_BY_ID[currentId] : null;
    if (cur) {
      for (const l of waifuLines(cur.id).loyalty)
        out.push({ id: cur.id, name: cur.name, jp: cur.jp, hue: cur.hue, line: l, tag: "STAY WITH ME" });
    }
    for (const o of opts) {
      if (cur && o.def.id === cur.id) continue;
      const lines = waifuLines(o.def.id);
      const src = cur ? lines.poach : lines.pitch;
      out.push({ id: o.def.id, name: o.def.name, jp: o.def.jp, hue: o.def.hue, line: src[0], tag: cur ? "COME WITH ME" : "LET ME JOIN" });
    }
    return out;
  }, [opts, currentId]);

  const done = beat >= script.length;
  const cur = script[Math.min(beat, script.length - 1)];

  useEffect(() => {
    if (done || !cur) return;
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i++; setTyped(cur.line.slice(0, i));
      if (i >= cur.line.length) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [beat, done, cur]);

  // click anywhere to advance the dialogue
  if (!done && cur) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
        onClick={() => setBeat((b) => b + 1)}>
        <div className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 55%, hsla(${cur.hue},80%,55%,.18), transparent 62%)` }} />
        <div className="relative flex flex-col items-center">
          <img src={portraitDataUrl(cur.id, 11)} alt={cur.name}
            className="h-44 w-44 rounded-3xl border-4 [image-rendering:pixelated]"
            style={{ borderColor: `hsl(${cur.hue},85%,60%)`, background: `hsl(${cur.hue},45%,14%)` }} />
          <div className="mt-2 text-xl font-black italic tracking-tight">
            {cur.name} <span className="text-white/45">{cur.jp}</span>
          </div>
          <div className="text-[10px] font-black tracking-[0.3em]" style={{ color: `hsl(${cur.hue},85%,70%)` }}>
            {cur.tag}
          </div>
        </div>
        <div className="relative mt-5 w-[min(92%,640px)] rounded-2xl border-2 px-5 py-4 text-center"
          style={{ borderColor: `hsl(${cur.hue},80%,55%)`, background: "#120d1cf2" }}>
          <p className="min-h-[2.6em] text-sm leading-relaxed text-white/90 sm:text-base">
            “{typed}<span className="animate-pulse">▌</span>”
          </p>
        </div>
        <div className="relative mt-3 text-[11px] font-black tracking-widest text-white/40">
          CLICK TO CONTINUE · {beat + 1}/{script.length}
        </div>
      </div>
    );
  }

  // ---- the actual choice ----
  return (
    <Overlay>
      <div className="w-full max-w-4xl">
        <div className="mb-3 text-center">
          <div className="text-xs font-black tracking-[0.4em] text-pink-300">決断 · DECIDE</div>
          <h2 className="text-3xl font-black italic tracking-tighter sm:text-4xl">
            <span className="bg-gradient-to-r from-pink-300 to-fuchsia-500 bg-clip-text text-transparent">
              {currentId ? "WHO FIGHTS BESIDE YOU?" : "CHOOSE YOUR PARTNER"}
            </span>
          </h2>
        </div>
        <div className="grid max-h-[62vh] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
          {opts.map((o, i) => (
            <button key={o.def.id + i} onClick={() => onPick(i)}
              className={`flex flex-col gap-1.5 rounded-2xl border-2 p-3 text-left transition hover:scale-[1.03] active:scale-95 ${
                o.upgrade ? "border-amber-300 bg-gradient-to-br from-amber-600/40 to-orange-700/40"
                          : "border-pink-400/60 bg-gradient-to-br from-pink-700/40 to-fuchsia-800/40"}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20"
                  style={{ background: `hsl(${o.def.hue},55%,22%)` }}>
                  <img src={portraitDataUrl(o.def.id, 6)} alt="" className="h-14 w-14 [image-rendering:pixelated]" />
                </div>
                <div>
                  <div className="text-sm font-black">{o.def.name} <span className="text-white/50">{o.def.jp}</span></div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-pink-200">
                    {o.upgrade ? "STAY TOGETHER — LEVEL UP" : `Tier ${o.def.tier} · max Lv${o.def.maxLevel}`}
                  </div>
                </div>
              </div>
              <div className="space-y-1 rounded-lg bg-black/40 p-2 text-[11px]">
                <div className="text-cyan-100">⚔ {o.def.ability}</div>
                {o.def.melee && <div className="text-rose-100">🥋 {o.def.melee.name}</div>}
                <div className="text-emerald-200">
                  🔄 {o.def.aura.name} · every {o.def.aura.every}s — {o.def.aura.desc}
                </div>
                <div className="border-t border-white/10 pt-1 text-amber-200">
                  ★ {Object.entries(o.def.buff).map(([k, v]) => formatStat(k, v as number)).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-auto bg-gradient-to-b from-[#06080ecc] via-[#080b14f2] to-[#06080ecc] p-3 backdrop-blur-sm">
      {children}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
      <div className="text-[9px] font-black tracking-widest text-white/40">{label}</div>
      <div className="text-base font-black tabular-nums">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-2">
      <div className="mb-1 text-[10px] font-black tracking-widest text-white/40">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function Row({ icon, name, right }: { icon: string; name: string; right: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
      <span>{icon} {name}</span>
      <span className="font-black text-amber-300">{right}</span>
    </div>
  );
}


