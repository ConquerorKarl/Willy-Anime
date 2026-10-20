import { useEffect, useRef, useState } from "react";
import { ELEMENTS, ELEMENT_BASE, ELEMENT_IDS, CHAR_BY_ID, GUN_BY_ID, GUNS } from "./game/content";
import { charPortraitUrl, sagePortraitUrl } from "./game/portraits";
import { sfx } from "./game/audio";

type Stage = "leap" | "sage" | "element" | "gun" | "infuse";

interface Props {
  charId: string;
  onDone: (element: string, gun: string | null) => void;
  onCancel: () => void;
}

/**
 * The opening ceremony. Your fighter bursts into frame, a robed elder
 * arrives and binds an element to you — and, if you are Joe, hands you
 * your first firearm. Then the run begins.
 */
export default function Intro({ charId, onDone, onCancel }: Props) {
  const ch = CHAR_BY_ID[charId] || CHAR_BY_ID.willy;
  const isGunner = !!ch.gunner;

  const [stage, setStage] = useState<Stage>("leap");
  const [element, setElement] = useState<string | null>(null);
  const [gun, setGun] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const timers = useRef<number[]>([]);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // ---- scripted beats ----
  useEffect(() => {
    sfx.ensure();
    sfx.heroEntrance();
    after(1500, () => { setStage("sage"); sfx.sageArrive(); });
    after(2500, () => setStage("element"));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- the elder's line, typed out ----
  const line =
    stage === "sage" ? "…so. Another one walks into Tokyo."
    : stage === "element" ? "Every fighter burns with something. Which is yours?"
    : stage === "gun" ? "And you carry iron. Choose what you'll live behind."
    : stage === "infuse" ? "Then it is done. Go — the city is waiting."
    : "";

  useEffect(() => {
    if (!line) { setTyped(""); return; }
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setTyped(line.slice(0, i));
      if (i >= line.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [line]);

  const pickElement = (id: string) => {
    setElement(id);
    if (isGunner) { setStage("gun"); return; }
    beginInfusion(id, null);
  };

  const pickGun = (id: string) => {
    setGun(id);
    beginInfusion(element!, id);
  };

  const beginInfusion = (el: string, g: string | null) => {
    setStage("infuse");
    const E = ELEMENTS[el as keyof typeof ELEMENTS];
    const hz = { fire: 330, ice: 523, shock: 660, wind: 440, void: 220 }[el] ?? 440;
    sfx.infuse(hz);
    after(2600, () => onDone(el, g));
    void E;
  };

  const EL = element ? ELEMENTS[element as keyof typeof ELEMENTS] : null;
  const tint = EL?.color ?? "#9fe8ff";
  const primaries = GUNS.filter((x) => x.primary);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#06070d]">
      {/* ---- backdrop ---- */}
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(circle at 50% 62%, ${tint}22, transparent 62%)` }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]
        [background:repeating-linear-gradient(0deg,#fff_0px,#fff_1px,transparent_1px,transparent_3px)]" />
      {/* floor line */}
      <div className="pointer-events-none absolute bottom-[28%] left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${tint}66,transparent)` }} />

      {/* ---- infusion burst ---- */}
      {stage === "infuse" && (
        <>
          <div className="pointer-events-none absolute inset-0 animate-[flashOut_2.6s_ease-out_forwards]"
            style={{ background: tint }} />
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="pointer-events-none absolute left-1/2 top-[58%] h-1.5 w-1.5 rounded-full"
              style={{
                background: tint,
                animation: `converge 1.1s ease-in ${i * 0.035}s both`,
                // each mote flies in from its own angle
                ["--ax" as string]: `${Math.cos((i / 28) * Math.PI * 2) * 320}px`,
                ["--ay" as string]: `${Math.sin((i / 28) * Math.PI * 2) * 320}px`,
              }} />
          ))}
        </>
      )}

      {/* ---- the two figures ---- */}
      <div className="relative flex items-end gap-10 sm:gap-20">
        {/* your fighter */}
        <div className="relative flex flex-col items-center">
          <img
            src={charPortraitUrl(charId, 10)}
            alt={ch.name}
            className={`h-40 w-40 [image-rendering:pixelated] sm:h-48 sm:w-48 ${
              stage === "leap" ? "animate-[leap_1.5s_cubic-bezier(.3,1.6,.5,1)]" : "animate-[idle_2.4s_ease-in-out_infinite]"
            }`}
            style={stage === "infuse"
              ? { filter: `drop-shadow(0 0 26px ${tint}) saturate(1.5)`, animation: "pulseGlow .5s ease-in-out infinite alternate" }
              : undefined} />
          <div className="mt-1 text-sm font-black italic tracking-tight">{ch.name}</div>
          <div className="text-[10px] font-bold tracking-widest text-white/40">{ch.jp}</div>
          {/* orbiting element motes once chosen */}
          {element && stage === "infuse" && Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
              style={{ background: tint, animation: `orbit 1.2s linear ${i * 0.2}s infinite` }} />
          ))}
        </div>

        {/* the elder */}
        <div className={`flex flex-col items-center transition-all duration-700 ${
          stage === "leap" ? "translate-x-10 opacity-0" : "translate-x-0 opacity-100"}`}>
          <img src={sagePortraitUrl(9)} alt="Elder"
            className="h-36 w-36 [image-rendering:pixelated] sm:h-44 sm:w-44"
            style={{ animation: "idle 3.2s ease-in-out infinite" }} />
          <div className="mt-1 text-[11px] font-black tracking-widest text-violet-300">THE ELDER</div>
          <div className="text-[10px] font-bold tracking-widest text-white/35">老師</div>
        </div>
      </div>

      {/* ---- dialogue ---- */}
      {stage !== "leap" && (
        <div className="relative mt-6 w-[min(92%,640px)] rounded-2xl border-2 border-violet-400/50 bg-[#120d1c]/95 px-5 py-3 text-center shadow-[0_0_32px_rgba(150,100,255,.25)]">
          <p className="min-h-[2.4em] text-sm leading-relaxed text-white/90 sm:text-base">
            {typed}<span className="animate-pulse">▌</span>
          </p>
        </div>
      )}

      {/* ---- element choice ---- */}
      {stage === "element" && (
        <div className="relative mt-4 w-[min(94%,780px)]">
          <div className="grid grid-cols-5 gap-2">
            {ELEMENT_IDS.map((id) => {
              const E = ELEMENTS[id];
              return (
                <button key={id} onClick={() => pickElement(id)}
                  className="group rounded-2xl border-2 border-white/15 bg-white/5 p-3 transition hover:scale-105 active:scale-95"
                  style={{ borderColor: E.color + "55" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = E.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = E.color + "55")}>
                  <div className="text-3xl leading-none">{E.icon}</div>
                  <div className="mt-1 text-[11px] font-black" style={{ color: E.color }}>{E.name}</div>
                  <div className="text-[9px] font-bold text-white/40">{E.jp}</div>
                  <div className="mt-1 text-[9px] leading-tight text-white/55">
                    Every hit {ELEMENT_BASE[id].verb.toLowerCase()}s
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Joe's firearm choice ---- */}
      {stage === "gun" && (
        <div className="relative mt-4 w-[min(94%,760px)]">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {primaries.map((w) => (
              <button key={w.id} onClick={() => pickGun(w.id)}
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
                <div className="flex justify-between text-[9px] font-black text-white/45">
                  <span>MAG {w.mag}</span><span>RELOAD {w.reload}s</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- infusion banner ---- */}
      {stage === "infuse" && EL && (
        <div className="relative mt-6 text-center">
          <div className="text-[11px] font-black tracking-[0.5em]" style={{ color: tint }}>
            {EL.jp} · 付与
          </div>
          <div className="text-3xl font-black italic tracking-tighter sm:text-4xl"
            style={{ color: "#fff", textShadow: `0 0 28px ${tint}` }}>
            {EL.name.toUpperCase()} INFUSED
          </div>
          {gun && (
            <div className="mt-1 text-xs font-black tracking-widest text-emerald-300">
              {GUN_BY_ID[gun].icon} {GUN_BY_ID[gun].name.toUpperCase()} ISSUED
            </div>
          )}
        </div>
      )}

      {/* ---- back out ---- */}
      {(stage === "element" || stage === "gun" || stage === "sage") && (
        <button onClick={onCancel}
          className="absolute left-4 top-4 rounded-xl border border-white/20 px-3 py-1.5 text-[11px] font-bold text-white/55 transition hover:text-white active:scale-95">
          ← BACK
        </button>
      )}

      <style>{`
        @keyframes leap {
          0%   { transform: translateY(120px) scale(.6); opacity: 0 }
          45%  { transform: translateY(-46px) scale(1.08); opacity: 1 }
          70%  { transform: translateY(6px) scale(.97) }
          85%  { transform: translateY(-12px) scale(1.02) }
          100% { transform: translateY(0) scale(1) }
        }
        @keyframes idle {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(-7px) }
        }
        @keyframes pulseGlow {
          from { transform: scale(1) }
          to   { transform: scale(1.06) }
        }
        @keyframes converge {
          from { transform: translate(var(--ax), var(--ay)) scale(1.4); opacity: 0 }
          60%  { opacity: 1 }
          to   { transform: translate(0,0) scale(0); opacity: 0 }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(58px) }
          to   { transform: rotate(360deg) translateX(58px) }
        }
        @keyframes flashOut {
          0%  { opacity: 0 }
          18% { opacity: .55 }
          100%{ opacity: 0 }
        }
      `}</style>
    </div>
  );
}
