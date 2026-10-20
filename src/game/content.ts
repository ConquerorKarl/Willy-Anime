// ===================== STATS =====================
export interface Stats {
  damage: number;        // multiplier
  haste: number;         // attack speed multiplier (cooldown divider)
  area: number;          // multiplier
  projSpeed: number;     // multiplier
  duration: number;      // multiplier
  amount: number;        // +flat projectiles
  moveSpeed: number;     // multiplier
  maxHp: number;         // +flat
  armor: number;         // flat damage reduction
  regen: number;         // hp/sec
  magnet: number;        // multiplier
  luck: number;          // +% rare rolls
  crit: number;          // chance 0..1
  critDmg: number;       // multiplier on crit
  xpGain: number;        // multiplier
  coinGain: number;      // multiplier
  lifesteal: number;     // hp per hit
  cdr: number;           // active-skill cooldown multiplier (lower=better)
  revives: number;
}

export const baseStats = (): Stats => ({
  damage: 1, haste: 1, area: 1, projSpeed: 1, duration: 1, amount: 0,
  moveSpeed: 1, maxHp: 100, armor: 0, regen: 0, magnet: 1, luck: 0,
  crit: 0.05, critDmg: 2, xpGain: 1, coinGain: 1, lifesteal: 0, cdr: 1, revives: 0,
});

export type StatMods = Partial<Record<keyof Stats, number>>;

// ===================== WEAPONS =====================
export type Behavior =
  | "serve" | "spread" | "orbit" | "aura" | "nova" | "boomerang" | "chain"
  | "turret" | "beam" | "meteor" | "blackhole" | "shuriken" | "homing" | "mine"
  /** Directional melee: a punch cone you must aim. Area widens AND lengthens it. */
  | "cone"
  /** Sweeping arc around you — wide but still directional, not a full circle. */
  | "swipe"
  /** A dash-through strike that damages everything along the path. */
  | "lunge"
  /** Fires outward in every direction at once. */
  | "radial";

export type Element = "none" | "fire" | "ice" | "shock" | "wind" | "void";

/** The five specialisation paths. You commit to one early and build it out. */
export const ELEMENTS = {
  fire:  { name: "Flame",   jp: "炎", color: "#ff7a2f", icon: "🔥", desc: "Burns over time. Highest raw damage." },
  ice:   { name: "Frost",   jp: "氷", color: "#79dcff", icon: "❄️", desc: "Chills and freezes. Crowd control." },
  shock: { name: "Thunder", jp: "雷", color: "#ffe14d", icon: "⚡", desc: "Chains between foes and stuns." },
  wind:  { name: "Gale",    jp: "風", color: "#8ef5c0", icon: "🌪️", desc: "Fast, piercing, pushes crowds around." },
  void:  { name: "Void",    jp: "虚", color: "#a86bff", icon: "🕳️", desc: "Pulls enemies in and crushes them." },
} as const;
export type ElementPath = keyof typeof ELEMENTS;
export const ELEMENT_IDS = Object.keys(ELEMENTS) as ElementPath[];

export interface WeaponDef {
  id: string; name: string; jp: string; icon: string; desc: string;
  behavior: Behavior; element: Element; color: string; maxLevel: number;
  /** per-level stat table */
  cd: number; cdPer: number;       // base cooldown (s), reduction per level
  dmg: number; dmgPer: number;
  count: number; countEvery: number; // +1 projectile every N levels
  speed: number; radius: number; pierce: number; piercePer: number;
  minLevel?: number;               // player level required to appear
  /** Belongs to an elemental path; only offered once you've committed to it. */
  path?: ElementPath;
  /** Restricts this weapon to specific characters. Undefined = universal. */
  chars?: CharBody[];
  /** Meteor-type attacks land in front of you instead of on random targets. */
  aimed?: boolean;
  /** Gun-class only: requires one of these firearms to be owned. */
  needsGun?: string[];
}

export const WEAPONS: WeaponDef[] = [
  // ---------- NEUTRAL (always available, no path commitment) ----------
  { id: "racket", name: "Ping Pong Serve", jp: "卓球サーブ", icon: "🏓", desc: "Serves a ball where you aim.",
    behavior: "serve", element: "none", color: "#fff3c4", maxLevel: 5, cd: 0.6, cdPer: 0.05, dmg: 18, dmgPer: 6, count: 1, countEvery: 3, speed: 640, radius: 5, pierce: 0, piercePer: 0 , chars: ["willy"] },
  { id: "spread", name: "Triple Smash", jp: "三連スマッシュ", icon: "💢", desc: "Fan of balls in your aim direction.",
    behavior: "spread", element: "none", color: "#ffd1a1", maxLevel: 5, cd: 1.05, cdPer: 0.07, dmg: 11, dmgPer: 4, count: 3, countEvery: 2, speed: 560, radius: 4.5, pierce: 0, piercePer: 0, chars: ["willy"] },
  { id: "orbit", name: "Orbital Rackets", jp: "周回ラケット", icon: "🌀", desc: "Rackets spin around you.",
    behavior: "orbit", element: "none", color: "#ff5f8d", maxLevel: 5, cd: 0.28, cdPer: 0.01, dmg: 12, dmgPer: 6, count: 2, countEvery: 2, speed: 2.1, radius: 80, pierce: 99, piercePer: 0, minLevel: 3, chars: ["willy"] },
  { id: "boomerang", name: "Boomerang Bat", jp: "ブーメラン", icon: "🪃", desc: "Racket flies out and returns.",
    behavior: "boomerang", element: "none", color: "#ffcf5c", maxLevel: 5, cd: 1.55, cdPer: 0.11, dmg: 24, dmgPer: 10, count: 1, countEvery: 3, speed: 500, radius: 9, pierce: 99, piercePer: 0, minLevel: 4, chars: ["willy"] },
  { id: "shuriken", name: "Senbei Shuriken", jp: "煎餅手裏剣", icon: "🍘", desc: "Ricochets off walls and enemies.",
    behavior: "shuriken", element: "none", color: "#f2e2b6", maxLevel: 5, cd: 1.3, cdPer: 0.09, dmg: 18, dmgPer: 8, count: 2, countEvery: 3, speed: 580, radius: 6, pierce: 0, piercePer: 0, minLevel: 7, chars: ["willy"] },
  { id: "drone", name: "Konbini Drone", jp: "コンビニドローン", icon: "🛸", desc: "Deploys a turret that fires onigiri.",
    behavior: "turret", element: "none", color: "#8ef5c0", maxLevel: 5, cd: 6.5, cdPer: 0.4, dmg: 10, dmgPer: 5, count: 1, countEvery: 4, speed: 580, radius: 6, pierce: 0, piercePer: 0.4, minLevel: 9 , chars: ["willy", "joe"] },
  { id: "homing", name: "Idol Missiles", jp: "推しミサイル", icon: "🎤", desc: "Heart-seeking missiles that burst.",
    behavior: "homing", element: "none", color: "#ff79c6", maxLevel: 5, cd: 1.85, cdPer: 0.12, dmg: 26, dmgPer: 12, count: 2, countEvery: 2, speed: 360, radius: 5.5, pierce: 0, piercePer: 0, minLevel: 12 , chars: ["willy", "joe", "andy"] },

  // ---------- SIGNATURE WEAPONS (one per character) ----------
  { id: "bow", name: "Doomer Bow", jp: "弓", icon: "🏹", desc: "Charged arrows that pierce whole lines.",
    behavior: "serve", element: "none", color: "#d8c89a", maxLevel: 5, cd: 0.85, cdPer: 0.06, dmg: 26, dmgPer: 10, count: 1, countEvery: 3, speed: 920, radius: 4.5, pierce: 0, piercePer: 0 , chars: ["andy"] },
  { id: "dogpoop", name: "Dog's Gift", jp: "犬の贈り物", icon: "💩", desc: "Your dog returns fire. Biologically.",
    behavior: "homing", element: "none", color: "#8a6238", maxLevel: 5, cd: 1.5, cdPer: 0.1, dmg: 16, dmgPer: 8, count: 2, countEvery: 2, speed: 380, radius: 6, pierce: 0, piercePer: 0 , chars: ["andy"] },
  { id: "cleaver", name: "Cleaver", jp: "肉切り包丁", icon: "🔪", desc: "A heavy downward cleave in front of you.",
    behavior: "cone", element: "none", color: "#e8eef7", maxLevel: 5, cd: 0.7, cdPer: 0.05, dmg: 30, dmgPer: 13, count: 1, countEvery: 3, speed: 0, radius: 104, pierce: 99, piercePer: 0, chars: ["aidan"] },
  { id: "karate", name: "Karate Strikes", jp: "空手", icon: "🥋", desc: "Aimed punches and kicks in a cone in front of you.",
    behavior: "cone", element: "none", color: "#fff0c4", maxLevel: 5, cd: 0.85, cdPer: 0.06, dmg: 26, dmgPer: 11, count: 1, countEvery: 3, speed: 0, radius: 100, pierce: 99, piercePer: 0, chars: ["karl"] },


  // ================= JOE — gunplay =================
  { id: "burstfire", name: "Burst Fire", jp: "バースト", icon: "💥", desc: "Three-round bursts with tight spread.",
    behavior: "spread", element: "none", color: "#8ffff0", maxLevel: 5, cd: 0.62, cdPer: 0.045, dmg: 10, dmgPer: 4.4, count: 3, countEvery: 3, speed: 920, radius: 3.4, pierce: 0, piercePer: 0, chars: ["joe"] , needsGun: ["g_ar", "g_mp", "g_minigun"] },
  { id: "railgun", name: "Rail Shot", jp: "レールガン", icon: "⚡", desc: "Charged rail slug that pierces everything.",
    behavior: "serve", element: "none", color: "#b8fff6", maxLevel: 5, cd: 2.1, cdPer: 0.14, dmg: 62, dmgPer: 26, count: 1, countEvery: 4, speed: 1400, radius: 5, pierce: 5, piercePer: 0, minLevel: 7, chars: ["joe"] , needsGun: ["g_sniper"] },
  { id: "grenadelaunch", name: "Frag Launcher", jp: "擲弾", icon: "🧨", desc: "Lobs fragmentation grenades.",
    behavior: "meteor", element: "none", color: "#8ef5c0", maxLevel: 5, cd: 2.5, cdPer: 0.16, dmg: 27.0, dmgPer: 12.0, count: 1, countEvery: 2, speed: 0, radius: 64, pierce: 99, piercePer: 0, minLevel: 8, chars: ["joe"] , needsGun: ["g_grenade", "g_gl"] },
  { id: "sentrygun", name: "Auto Sentry", jp: "自動砲台", icon: "🤖", desc: "Deploys a self-aiming sentry gun.",
    behavior: "turret", element: "none", color: "#6ff5e8", maxLevel: 5, cd: 6.0, cdPer: 0.38, dmg: 13, dmgPer: 6, count: 1, countEvery: 3, speed: 760, radius: 5, pierce: 0, piercePer: 0.5, minLevel: 5, chars: ["joe"] },
  { id: "dronebuddy", name: "Killstreak Drone", jp: "ドローン", icon: "🛰️", desc: "Orbiting drones strafe nearby targets.",
    behavior: "orbit", element: "none", color: "#9ffff2", maxLevel: 5, cd: 0.3, cdPer: 0.012, dmg: 11, dmgPer: 5.5, count: 2, countEvery: 2, speed: 2.4, radius: 88, pierce: 99, piercePer: 0, minLevel: 10, chars: ["joe"] },

  // ================= AIDAN — butchery (pure melee) =================
  { id: "cleaverfan", name: "Butcher's Sweep", jp: "薙ぎ払い", icon: "〽️", desc: "A wide horizontal sweep of the blade.",
    behavior: "swipe", element: "none", color: "#e8eef7", maxLevel: 5, cd: 1.0, cdPer: 0.07, dmg: 34, dmgPer: 15, count: 1, countEvery: 3, speed: 0, radius: 118, pierce: 99, piercePer: 0, chars: ["aidan"] },
  { id: "spinknives", name: "Carving Spin", jp: "回転解体", icon: "🌀", desc: "Spin with the blade extended, cutting all around.",
    behavior: "swipe", element: "none", color: "#dfe9ff", maxLevel: 5, cd: 2.0, cdPer: 0.13, dmg: 38, dmgPer: 17, count: 1, countEvery: 3, speed: 0, radius: 128, pierce: 99, piercePer: 0, minLevel: 4, chars: ["aidan"] },
  { id: "meathook", name: "Meat Hook", jp: "肉鉤", icon: "🪝", desc: "Hook forward and drag victims onto your blade.",
    behavior: "lunge", element: "none", color: "#c9a227", maxLevel: 5, cd: 1.8, cdPer: 0.12, dmg: 42, dmgPer: 18, count: 1, countEvery: 4, speed: 1000, radius: 50, pierce: 99, piercePer: 0, minLevel: 6, chars: ["aidan"] },
  { id: "bonesaw", name: "Bone Saw", jp: "骨鋸", icon: "🪚", desc: "Grinding saw strokes that shred anything close.",
    behavior: "cone", element: "none", color: "#f0f4ff", maxLevel: 5, cd: 0.34, cdPer: 0.018, dmg: 13, dmgPer: 6, count: 1, countEvery: 99, speed: 0, radius: 82, pierce: 99, piercePer: 0, minLevel: 9, chars: ["aidan"] },
  { id: "tenderize", name: "Tenderiser", jp: "肉叩き", icon: "🔨", desc: "Slam the mallet down in a brutal arc.",
    behavior: "swipe", element: "none", color: "#ffb4b4", maxLevel: 5, cd: 1.5, cdPer: 0.1, dmg: 44, dmgPer: 19, count: 1, countEvery: 3, speed: 0, radius: 104, pierce: 99, piercePer: 0, minLevel: 7, chars: ["aidan"] },
  { id: "bloodprice", name: "Blood Price", jp: "血の代償", icon: "🩸", desc: "Deep cuts that drain life with every stroke.",
    behavior: "cone", element: "none", color: "#ff5e7a", maxLevel: 5, cd: 1.15, cdPer: 0.08, dmg: 32, dmgPer: 14, count: 1, countEvery: 4, speed: 0, radius: 112, pierce: 99, piercePer: 0, minLevel: 11, chars: ["aidan"] },
  { id: "cleavecone", name: "Butcher's Cleave", jp: "叩き斬り", icon: "🪓", desc: "An overhead cleave that splits the ground.",
    behavior: "cone", element: "none", color: "#ffd0d0", maxLevel: 5, cd: 1.25, cdPer: 0.085, dmg: 46, dmgPer: 20, count: 1, countEvery: 4, speed: 0, radius: 132, pierce: 99, piercePer: 0, minLevel: 3, chars: ["aidan"] },
  { id: "charge", name: "Carving Charge", jp: "突進解体", icon: "🐂", desc: "Barrel forward, carving everything in the way.",
    behavior: "lunge", element: "none", color: "#ff9f9f", maxLevel: 5, cd: 2.1, cdPer: 0.14, dmg: 48, dmgPer: 21, count: 1, countEvery: 4, speed: 1100, radius: 54, pierce: 99, piercePer: 0, minLevel: 10, chars: ["aidan"] },
  { id: "butcherswipe", name: "Wide Butchery", jp: "大振り", icon: "🗡️", desc: "A huge two-handed swing that opens the whole front.",
    behavior: "swipe", element: "none", color: "#ffbcbc", maxLevel: 5, cd: 1.7, cdPer: 0.11, dmg: 52, dmgPer: 22, count: 1, countEvery: 3, speed: 0, radius: 142, pierce: 99, piercePer: 0, minLevel: 8, chars: ["aidan"] },
  { id: "skewer", name: "Skewer Thrust", jp: "串刺し", icon: "🍢", desc: "A long narrow stab that spits everything in a line.",
    behavior: "cone", element: "none", color: "#ffe0b0", maxLevel: 5, cd: 0.95, cdPer: 0.065, dmg: 40, dmgPer: 17, count: 1, countEvery: 4, speed: 0, radius: 196, pierce: 99, piercePer: 0, minLevel: 5, chars: ["aidan"] },
  { id: "flaysweep", name: "Flaying Arc", jp: "皮剥ぎ", icon: "🔗", desc: "A rising arc that leaves foes bleeding out.",
    behavior: "swipe", element: "none", color: "#ff8fa0", maxLevel: 5, cd: 1.35, cdPer: 0.09, dmg: 36, dmgPer: 16, count: 1, countEvery: 3, speed: 0, radius: 116, pierce: 99, piercePer: 0, minLevel: 12, chars: ["aidan"] },

  // ================= KARL — martial arts (all directional) =================
  { id: "roundhouse", name: "Roundhouse Kick", jp: "回し蹴り", icon: "🦵", desc: "A wide sweeping arc in front of you.",
    behavior: "swipe", element: "none", color: "#fff0c4", maxLevel: 5, cd: 1.1, cdPer: 0.07, dmg: 34, dmgPer: 15, count: 1, countEvery: 3, speed: 0, radius: 104, pierce: 99, piercePer: 0, chars: ["karl"] },
  { id: "chiblast", name: "Chi Palm", jp: "気功掌", icon: "🌊", desc: "A focused cone of chi blasted forward.",
    behavior: "cone", element: "none", color: "#ffe9a8", maxLevel: 5, cd: 0.8, cdPer: 0.055, dmg: 30, dmgPer: 13, count: 1, countEvery: 3, speed: 0, radius: 128, pierce: 99, piercePer: 0, chars: ["karl"] },
  { id: "ironbody", name: "Iron Guard", jp: "鉄布衫", icon: "🧘", desc: "Short, brutal guard-break jabs up close.",
    behavior: "cone", element: "none", color: "#ffd98f", maxLevel: 5, cd: 0.42, cdPer: 0.022, dmg: 14, dmgPer: 6.5, count: 1, countEvery: 99, speed: 0, radius: 76, pierce: 99, piercePer: 0, minLevel: 4, chars: ["karl"] },
  { id: "flyingknee", name: "Flying Knee", jp: "飛び膝", icon: "🦶", desc: "Launch knee-first, shredding everything you pass.",
    behavior: "lunge", element: "none", color: "#ffe066", maxLevel: 5, cd: 2.0, cdPer: 0.13, dmg: 46, dmgPer: 20, count: 1, countEvery: 4, speed: 1150, radius: 54, pierce: 99, piercePer: 0, minLevel: 6, chars: ["karl"] },
  { id: "palmstrike", name: "Hundred Palms", jp: "百手", icon: "✋", desc: "A rapid flurry of forward palm thrusts.",
    behavior: "cone", element: "none", color: "#fff6d0", maxLevel: 5, cd: 0.3, cdPer: 0.016, dmg: 11, dmgPer: 5, count: 1, countEvery: 99, speed: 0, radius: 92, pierce: 99, piercePer: 0, minLevel: 8, chars: ["karl"] },
  { id: "groundslam", name: "Falling Axe Kick", jp: "踵落とし", icon: "🪓", desc: "Heel-drops a crater just ahead of you.",
    aimed: true, behavior: "meteor", element: "none", color: "#ffdd99", maxLevel: 5, cd: 2.2, cdPer: 0.14, dmg: 39.0, dmgPer: 16.5, count: 1, countEvery: 3, speed: 0, radius: 74, pierce: 99, piercePer: 0, minLevel: 10, chars: ["karl"] },
  { id: "uppercut", name: "Rising Dragon", jp: "昇龍拳", icon: "👊", desc: "A rising uppercut that launches foes skyward.",
    behavior: "cone", element: "none", color: "#ffb86c", maxLevel: 5, cd: 1.5, cdPer: 0.1, dmg: 56, dmgPer: 24, count: 1, countEvery: 4, speed: 0, radius: 96, pierce: 99, piercePer: 0, minLevel: 5, chars: ["karl"] },
  { id: "spinkick", name: "Tornado Sweep", jp: "旋風脚", icon: "🌀", desc: "A full spinning sweep — the one time you hit all sides.",
    behavior: "swipe", element: "none", color: "#ffe9b8", maxLevel: 5, cd: 2.4, cdPer: 0.15, dmg: 40, dmgPer: 18, count: 1, countEvery: 3, speed: 0, radius: 132, pierce: 99, piercePer: 0, minLevel: 12, chars: ["karl"] },
  { id: "shockpalm", name: "Shockwave Palm", jp: "衝波掌", icon: "💠", desc: "A long, narrow pressure wave that pierces crowds.",
    behavior: "cone", element: "none", color: "#cfe9ff", maxLevel: 5, cd: 1.3, cdPer: 0.085, dmg: 38, dmgPer: 17, count: 1, countEvery: 4, speed: 0, radius: 190, pierce: 99, piercePer: 0, minLevel: 9, chars: ["karl"] },

  // ================= ANDY — archery specs =================
  { id: "volley", name: "Arrow Volley", jp: "一斉射撃", icon: "🎯", desc: "Looses a fan of arrows downrange.",
    behavior: "spread", element: "none", color: "#e0d0a0", maxLevel: 5, cd: 1.1, cdPer: 0.075, dmg: 16, dmgPer: 7, count: 3, countEvery: 2, speed: 840, radius: 4, pierce: 0, piercePer: 0, chars: ["andy"] },
  { id: "snipe", name: "Doomshot", jp: "絶望の一矢", icon: "🏹", desc: "A slow, devastating piercing shot.",
    behavior: "serve", element: "none", color: "#ffd9a0", maxLevel: 5, cd: 2.3, cdPer: 0.15, dmg: 70, dmgPer: 30, count: 1, countEvery: 4, speed: 1150, radius: 6, pierce: 4, piercePer: 0, minLevel: 6, chars: ["andy"] },
  { id: "arrowrain", name: "Hail of Arrows", jp: "矢の雨", icon: "🌧️", desc: "Arcing arrows rain down on marked ground.",
    behavior: "meteor", element: "none", color: "#cfc090", maxLevel: 5, cd: 2.7, cdPer: 0.17, dmg: 22.5, dmgPer: 10.5, count: 2, countEvery: 2, speed: 0, radius: 62, pierce: 99, piercePer: 0, minLevel: 9, chars: ["andy"] },
  { id: "scattershot", name: "Scattershot", jp: "全方位射", icon: "💥", desc: "Fires arrows outward in every direction.",
    behavior: "radial", element: "none", color: "#e8d8a8", maxLevel: 5, cd: 1.9, cdPer: 0.12, dmg: 18, dmgPer: 8, count: 8, countEvery: 2, speed: 700, radius: 4.5, pierce: 0, piercePer: 0, minLevel: 5, chars: ["andy"] },
  { id: "splitarrow", name: "Splitting Arrow", jp: "分裂矢", icon: "🔱", desc: "Arrows that burst into shards on impact.",
    behavior: "serve", element: "none", color: "#f0e0b0", maxLevel: 5, cd: 1.25, cdPer: 0.085, dmg: 22, dmgPer: 10, count: 1, countEvery: 3, speed: 880, radius: 5, pierce: 0, piercePer: 0, minLevel: 7, chars: ["andy"] },
  { id: "ricochet", name: "Ricochet Shot", jp: "跳弾矢", icon: "🪃", desc: "Arrows bounce between walls and bodies.",
    behavior: "shuriken", element: "none", color: "#d8cfa0", maxLevel: 5, cd: 1.35, cdPer: 0.09, dmg: 20, dmgPer: 9, count: 2, countEvery: 3, speed: 760, radius: 4.5, pierce: 0, piercePer: 0, minLevel: 8, chars: ["andy"] },
  { id: "dogbite", name: "Sic 'Em", jp: "咬みつき", icon: "🐕", desc: "Your dog mauls anything that comes close.",
    behavior: "aura", element: "none", color: "#c08a50", maxLevel: 5, cd: 0.5, cdPer: 0.02, dmg: 8.0, dmgPer: 4.0, count: 1, countEvery: 99, speed: 0, radius: 74, pierce: 99, piercePer: 0, minLevel: 4, chars: ["andy"] },
  { id: "dogpack", name: "Stray Pack", jp: "野良の群れ", icon: "🐾", desc: "Summons stray dogs to fight for you.",
    behavior: "turret", element: "none", color: "#b08050", maxLevel: 5, cd: 7.0, cdPer: 0.45, dmg: 14, dmgPer: 7, count: 1, countEvery: 3, speed: 520, radius: 7, pierce: 0, piercePer: 0.4, minLevel: 11, chars: ["andy"] },
  { id: "stinkcloud", name: "Stink Cloud", jp: "悪臭", icon: "🤢", desc: "A lingering cloud of pure regret.",
    behavior: "mine", element: "none", color: "#9aa84a", maxLevel: 5, cd: 2.0, cdPer: 0.12, dmg: 18.0, dmgPer: 8.2, count: 1, countEvery: 3, speed: 0, radius: 72, pierce: 99, piercePer: 0, minLevel: 8, chars: ["andy"] },

  // ---- Willy extras ----
  { id: "serveblitz", name: "Serve Blitz", jp: "連続サーブ", icon: "⚡", desc: "A frantic burst of rapid serves.",
    behavior: "serve", element: "none", color: "#fff3c4", maxLevel: 5, cd: 0.3, cdPer: 0.02, dmg: 9, dmgPer: 4, count: 1, countEvery: 3, speed: 760, radius: 4, pierce: 0, piercePer: 0, minLevel: 5, chars: ["willy"] },
  { id: "smashcone", name: "Forehand Smash", jp: "強打", icon: "💢", desc: "A hard cone-shaped smash in front of you.",
    behavior: "cone", element: "none", color: "#ffd1a1", maxLevel: 5, cd: 1.2, cdPer: 0.08, dmg: 32, dmgPer: 14, count: 1, countEvery: 4, speed: 0, radius: 116, pierce: 99, piercePer: 0, minLevel: 6, chars: ["willy"] },
  { id: "ballstorm", name: "Ball Storm", jp: "球嵐", icon: "🌪️", desc: "Balls spray out in every direction.",
    behavior: "radial", element: "none", color: "#fff6c4", maxLevel: 5, cd: 2.1, cdPer: 0.13, dmg: 17, dmgPer: 8, count: 8, countEvery: 2, speed: 620, radius: 5, pierce: 0, piercePer: 0, minLevel: 8, chars: ["willy"] },
  { id: "netslam", name: "Net Slam", jp: "ネットスマッシュ", icon: "🥅", desc: "Dive forward smashing through the crowd.",
    behavior: "lunge", element: "none", color: "#ffe9a8", maxLevel: 5, cd: 2.3, cdPer: 0.15, dmg: 42, dmgPer: 18, count: 1, countEvery: 4, speed: 1050, radius: 50, pierce: 99, piercePer: 0, minLevel: 10, chars: ["willy"] },
  { id: "topspin", name: "Topspin Curve", jp: "トップスピン", icon: "🎱", desc: "Curving balls that seek out targets.",
    behavior: "homing", element: "none", color: "#ffdf8f", maxLevel: 5, cd: 1.5, cdPer: 0.1, dmg: 24, dmgPer: 11, count: 2, countEvery: 2, speed: 400, radius: 5, pierce: 0, piercePer: 0, minLevel: 9, chars: ["willy"] },

  // ---- Joe extras ----
  { id: "shotgun", name: "Breacher", jp: "散弾", icon: "💢", desc: "Point-blank cone of plasma buckshot.",
    behavior: "cone", element: "none", color: "#8ffff0", maxLevel: 5, cd: 1.0, cdPer: 0.07, dmg: 34, dmgPer: 15, count: 1, countEvery: 4, speed: 0, radius: 112, pierce: 99, piercePer: 0, minLevel: 6, chars: ["joe"] , needsGun: ["g_shotgun"] },
  { id: "noscope", name: "360 No-Scope", jp: "全方位射撃", icon: "🔄", desc: "Spins and unloads in all directions.",
    behavior: "radial", element: "none", color: "#b8fff6", maxLevel: 5, cd: 2.0, cdPer: 0.13, dmg: 16, dmgPer: 7.5, count: 10, countEvery: 2, speed: 780, radius: 3.6, pierce: 0, piercePer: 0, minLevel: 9, chars: ["joe"] , needsGun: ["g_ar", "g_mp", "g_minigun", "g_pistol"] },
  { id: "airstrike", name: "Call Airstrike", jp: "空爆要請", icon: "✈️", desc: "Paints the ground for a bombing run.",
    behavior: "meteor", element: "none", color: "#9ffff2", maxLevel: 5, cd: 3.2, cdPer: 0.2, dmg: 36.0, dmgPer: 15.8, count: 2, countEvery: 2, speed: 0, radius: 76, pierce: 99, piercePer: 0, minLevel: 12, chars: ["joe"] , needsGun: ["g_grenade", "g_gl", "g_rocket"] },
  { id: "tacsprint", name: "Tactical Sprint", jp: "戦術疾走", icon: "🏃", desc: "Slide-cancel through enemies, guns blazing.",
    behavior: "lunge", element: "none", color: "#6ff5e8", maxLevel: 5, cd: 2.2, cdPer: 0.14, dmg: 36, dmgPer: 16, count: 1, countEvery: 4, speed: 1200, radius: 46, pierce: 99, piercePer: 0, minLevel: 10, chars: ["joe"] },

  // ---------- 🔥 FLAME PATH ----------
  { id: "flame", name: "Flaming Balls", jp: "火炎球", icon: "🔥", desc: "Burning balls that ignite enemies.",
    behavior: "serve", element: "fire", color: "#ff7a2f", maxLevel: 5, cd: 0.9, cdPer: 0.06, dmg: 17, dmgPer: 7, count: 1, countEvery: 3, speed: 520, radius: 6, pierce: 0, piercePer: 0 },
  { id: "aura", name: "Burning Aura", jp: "闘気", icon: "☄️", desc: "Scorches everything close to you.",
    behavior: "aura", element: "fire", color: "#ff8f3c", maxLevel: 5, cd: 0.4, cdPer: 0.01, dmg: 5.6, dmgPer: 2.7, count: 1, countEvery: 99, speed: 0, radius: 86, pierce: 99, piercePer: 0, minLevel: 5, path: "fire" },
  { id: "mine", name: "Takoyaki Mines", jp: "たこ焼き地雷", icon: "🐙", desc: "Drops sizzling mines behind you.",
    behavior: "mine", element: "fire", color: "#ffb86c", maxLevel: 5, cd: 1.4, cdPer: 0.09, dmg: 22.5, dmgPer: 9.8, count: 1, countEvery: 3, speed: 0, radius: 52, pierce: 99, piercePer: 0, minLevel: 8, path: "fire" },
  { id: "meteor", name: "Gachapon Strike", jp: "ガチャ爆撃", icon: "🎰", desc: "Capsules rain down and explode.",
    behavior: "meteor", element: "fire", color: "#ff9f43", maxLevel: 5, cd: 2.8, cdPer: 0.18, dmg: 28.5, dmgPer: 12.8, count: 1, countEvery: 2, speed: 0, radius: 62, pierce: 99, piercePer: 0, minLevel: 14, path: "fire" },

  // ---------- ❄️ FROST PATH ----------
  { id: "frost", name: "Frost Balls", jp: "氷結球", icon: "❄️", desc: "Chilling balls that slow and shatter.",
    behavior: "spread", element: "ice", color: "#79dcff", maxLevel: 5, cd: 1.2, cdPer: 0.08, dmg: 13, dmgPer: 6, count: 2, countEvery: 3, speed: 540, radius: 5, pierce: 0, piercePer: 0 },
  { id: "blizzard", name: "Blizzard Field", jp: "吹雪領域", icon: "🌨️", desc: "A freezing field follows you.",
    behavior: "aura", element: "ice", color: "#9fe8ff", maxLevel: 5, cd: 0.45, cdPer: 0.012, dmg: 4.8, dmgPer: 2.4, count: 1, countEvery: 99, speed: 0, radius: 100, pierce: 99, piercePer: 0, minLevel: 5, path: "ice" },
  { id: "icicle", name: "Icicle Volley", jp: "氷柱の雨", icon: "🧊", desc: "Spears of ice pierce whole lines.",
    behavior: "serve", element: "ice", color: "#b8f1ff", maxLevel: 5, cd: 1.1, cdPer: 0.075, dmg: 22, dmgPer: 10, count: 1, countEvery: 2, speed: 760, radius: 4.5, pierce: 2, piercePer: 0, minLevel: 8, path: "ice" },
  { id: "glacier", name: "Glacier Drop", jp: "氷河落とし", icon: "🏔️", desc: "Ice blocks slam down and freeze.",
    behavior: "meteor", element: "ice", color: "#8fe6ff", maxLevel: 5, cd: 3.0, cdPer: 0.2, dmg: 25.5, dmgPer: 12.0, count: 1, countEvery: 2, speed: 0, radius: 66, pierce: 99, piercePer: 0, minLevel: 14, path: "ice" },

  // ---------- ⚡ THUNDER PATH ----------
  { id: "lightning", name: "Lightning Balls", jp: "雷球", icon: "⚡", desc: "Arcs between nearby gangsters.",
    behavior: "chain", element: "shock", color: "#ffe14d", maxLevel: 5, cd: 1.45, cdPer: 0.1, dmg: 22, dmgPer: 10, count: 1, countEvery: 2, speed: 0, radius: 0, pierce: 2, piercePer: 0.6 },
  { id: "pylon", name: "Shrine Pylon", jp: "神社の柱", icon: "⛩️", desc: "Plants a pylon that zaps nearby foes.",
    behavior: "mine", element: "shock", color: "#ffe14d", maxLevel: 5, cd: 4.0, cdPer: 0.25, dmg: 19.5, dmgPer: 9.0, count: 1, countEvery: 3, speed: 0, radius: 88, pierce: 99, piercePer: 0, minLevel: 6, path: "shock" },
  { id: "beam", name: "Neon Beam", jp: "ネオン光線", icon: "📡", desc: "Sweeping laser that melts a line.",
    behavior: "beam", element: "shock", color: "#ff4df0", maxLevel: 5, cd: 2.5, cdPer: 0.17, dmg: 27.9, dmgPer: 13.1, count: 1, countEvery: 4, speed: 0, radius: 14, pierce: 99, piercePer: 0, minLevel: 10, path: "shock" },
  { id: "satellite", name: "Idol Satellite", jp: "推し衛星", icon: "🛰️", desc: "Orbital rig paints strike zones.",
    behavior: "meteor", element: "shock", color: "#6dff9a", maxLevel: 5, cd: 3.4, cdPer: 0.22, dmg: 22.5, dmgPer: 11.2, count: 2, countEvery: 2, speed: 0, radius: 58, pierce: 99, piercePer: 0, minLevel: 14, path: "shock" },

  // ---------- 🌪️ GALE PATH ----------
  { id: "gale", name: "Gale Serve", jp: "疾風サーブ", icon: "🌬️", desc: "Razor-fast balls that pierce crowds.",
    behavior: "serve", element: "wind", color: "#8ef5c0", maxLevel: 5, cd: 0.52, cdPer: 0.04, dmg: 12, dmgPer: 5, count: 1, countEvery: 2, speed: 880, radius: 4.5, pierce: 1, piercePer: 0 },
  { id: "cyclone", name: "Cyclone Guard", jp: "旋風の守り", icon: "🌪️", desc: "A whirlwind orbits and flings foes.",
    behavior: "orbit", element: "wind", color: "#a8ffd8", maxLevel: 5, cd: 0.26, cdPer: 0.01, dmg: 11, dmgPer: 5.5, count: 3, countEvery: 2, speed: 3.0, radius: 96, pierce: 99, piercePer: 0, minLevel: 5, path: "wind" },
  { id: "swarm", name: "Origami Swarm", jp: "折鶴の群れ", icon: "🕊️", desc: "Paper cranes hunt on their own.",
    behavior: "homing", element: "wind", color: "#b8f1ff", maxLevel: 5, cd: 2.0, cdPer: 0.13, dmg: 18, dmgPer: 9, count: 3, countEvery: 2, speed: 340, radius: 4.5, pierce: 0, piercePer: 0, minLevel: 8, path: "wind" },
  { id: "tempest", name: "Tempest Burst", jp: "暴風爆", icon: "💨", desc: "Shockwaves blast enemies away.",
    behavior: "nova", element: "wind", color: "#c8ffe8", maxLevel: 5, cd: 2.6, cdPer: 0.18, dmg: 20.2, dmgPer: 9.4, count: 1, countEvery: 3, speed: 460, radius: 92, pierce: 99, piercePer: 0, minLevel: 13, path: "wind" },

  // ---------- 🕳️ VOID PATH ----------
  { id: "voidball", name: "Void Spheres", jp: "虚無球", icon: "🔮", desc: "Heavy orbs that drag foes along.",
    behavior: "serve", element: "void", color: "#a86bff", maxLevel: 5, cd: 1.0, cdPer: 0.07, dmg: 20, dmgPer: 9, count: 1, countEvery: 3, speed: 420, radius: 7, pierce: 1, piercePer: 0 },
  { id: "nova", name: "Collapse Wave", jp: "崩壊波", icon: "💥", desc: "Expanding gravity wave crushes foes.",
    behavior: "nova", element: "void", color: "#c08bff", maxLevel: 5, cd: 3.0, cdPer: 0.22, dmg: 21.6, dmgPer: 10.1, count: 1, countEvery: 4, speed: 440, radius: 96, pierce: 99, piercePer: 0, minLevel: 6, path: "void" },
  { id: "rift", name: "Rift Mines", jp: "亀裂", icon: "🌑", desc: "Collapsing rifts tear the street open.",
    behavior: "mine", element: "void", color: "#b07bff", maxLevel: 5, cd: 1.6, cdPer: 0.1, dmg: 24.0, dmgPer: 10.5, count: 1, countEvery: 3, speed: 0, radius: 58, pierce: 99, piercePer: 0, minLevel: 9, path: "void" },
  { id: "blackhole", name: "Otaku Singularity", jp: "特異点", icon: "🕳️", desc: "Pulls gangsters in and crushes them.",
    behavior: "blackhole", element: "void", color: "#a86bff", maxLevel: 5, cd: 7.0, cdPer: 0.42, dmg: 12.5, dmgPer: 6.2, count: 1, countEvery: 5, speed: 0, radius: 130, pierce: 99, piercePer: 0, minLevel: 16, path: "void" },
];

export const WEAPON_BY_ID: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

/** Level 6 is a rare "super modifier" — a mechanical evolution, not just more numbers. */
export type SuperKind = "split" | "explode" | "pool" | "pulse" | "swarm";
export interface SuperDef { name: string; jp: string; desc: string; kind: SuperKind; icon: string }
export const SUPERS: Record<string, SuperDef> = {
  // neutral
  racket: { name: "Thousand Rally", jp: "千本ラリー", kind: "split", icon: "🏓", desc: "Balls shatter into 3 fragments on impact." },
  spread: { name: "Detonation Smash", jp: "爆裂スマッシュ", kind: "explode", icon: "💣", desc: "Every ball detonates in a blast." },
  orbit: { name: "Saturn Formation", jp: "土星陣", kind: "swarm", icon: "🪐", desc: "A second, wider ring spins the other way." },
  boomerang: { name: "Eternal Return", jp: "永劫回帰", kind: "split", icon: "🔁", desc: "Bats split in two on the return trip." },
  shuriken: { name: "Infinite Ricochet", jp: "無限跳弾", kind: "explode", icon: "🍘", desc: "Endless bounces, exploding on the last hit." },
  drone: { name: "Drone Factory", jp: "ドローン工場", kind: "swarm", icon: "🏭", desc: "Double drones that last twice as long." },
  homing: { name: "Encore Barrage", jp: "アンコール", kind: "split", icon: "💞", desc: "Missiles cluster into smaller seeking hearts." },
  bow: { name: "Rain of Despair", jp: "絶望の雨", kind: "split", icon: "🏹", desc: "Arrows split into a volley mid-flight." },
  dogpoop: { name: "Biohazard", jp: "生物災害", kind: "pool", icon: "☣️", desc: "Leaves toxic puddles that linger." },
  cleaver: { name: "Cleave Everything", jp: "全斬", kind: "pulse", icon: "🔪", desc: "Each cleave strikes three times in sequence." },
  karate: { name: "Thousand Palms", jp: "千手", kind: "pulse", icon: "👊", desc: "Strikes repeat three times per cast." },
  volley: { name: "Storm of Arrows", jp: "矢嵐", kind: "swarm", icon: "🎯", desc: "Fires a wall of twelve arrows." },
  snipe: { name: "World Ender", jp: "終焉の矢", kind: "explode", icon: "🏹", desc: "The shot detonates on impact." },
  arrowrain: { name: "Endless Rain", jp: "終わらぬ雨", kind: "swarm", icon: "🌧️", desc: "Blankets the whole screen in arrows." },
  dogbite: { name: "Rabid Frenzy", jp: "狂犬", kind: "pulse", icon: "🐕", desc: "The dog mauls faster and bleeds targets." },
  dogpack: { name: "The Whole Pound", jp: "犬の群れ", kind: "swarm", icon: "🐾", desc: "Summons four strays at once." },
  stinkcloud: { name: "Chemical Warfare", jp: "化学兵器", kind: "pool", icon: "☣️", desc: "Clouds spread and linger far longer." },
  burstfire: { name: "Full Auto", jp: "フルオート", kind: "swarm", icon: "💥", desc: "Bursts become a continuous stream." },
  railgun: { name: "Orbital Rail", jp: "軌道砲", kind: "explode", icon: "⚡", desc: "The slug explodes along its entire path." },
  grenadelaunch: { name: "Cluster Bomb", jp: "クラスター", kind: "split", icon: "🧨", desc: "Grenades split into bomblets." },
  sentrygun: { name: "Turret Nest", jp: "砲台巣", kind: "swarm", icon: "🤖", desc: "Deploys three permanent sentries." },
  dronebuddy: { name: "Drone Squadron", jp: "飛行隊", kind: "swarm", icon: "🛰️", desc: "A second drone ring at double range." },
  cleaverfan: { name: "Meat Grinder", jp: "肉挽き", kind: "pulse", icon: "🔪", desc: "The sweep repeats, grinding everything down." },
  spinknives: { name: "Blade Cyclone", jp: "刃の旋風", kind: "pulse", icon: "🌀", desc: "Spin twice as long across a wider arc." },
  meathook: { name: "Slaughterhouse", jp: "屠殺場", kind: "pulse", icon: "🪝", desc: "Hook further and drag the whole crowd with you." },
  bonesaw: { name: "Perpetual Saw", jp: "永久鋸", kind: "pulse", icon: "🪚", desc: "The saw never stops — continuous shredding." },
  tenderize: { name: "Prime Cut", jp: "極上", kind: "pulse", icon: "🔨", desc: "The slam repeats three times." },
  bloodprice: { name: "Exsanguinate", jp: "失血", kind: "pool", icon: "🩸", desc: "Cuts leave bleeding pools and heal you far more." },
  roundhouse: { name: "Tornado Kick", jp: "竜巻脚", kind: "pulse", icon: "🦵", desc: "The kick repeats in a spinning combo." },
  chiblast: { name: "Dragon Wave", jp: "龍波", kind: "split", icon: "🌊", desc: "The wave splits into three beams." },
  ironbody: { name: "Diamond Body", jp: "金剛身", kind: "pulse", icon: "🧘", desc: "The aura pulses and reflects damage." },
  flyingknee: { name: "Meteor Knee", jp: "流星膝", kind: "explode", icon: "🦶", desc: "Lands with a detonating impact." },
  palmstrike: { name: "Thousand Palms", jp: "千手観音", kind: "swarm", icon: "✋", desc: "Eight palms strike at once." },
  groundslam: { name: "Mountain Breaker", jp: "山砕き", kind: "swarm", icon: "🪓", desc: "Craters the entire battlefield." },
  skewer: { name: "Impaler", jp: "串刺し王", kind: "pulse", icon: "🍢", desc: "The thrust pierces twice as far, twice over." },
  flaysweep: { name: "Skinner's Art", jp: "皮剥ぎの技", kind: "pool", icon: "🔗", desc: "Arcs leave bleeding ground behind them." },
  cleavecone: { name: "Guillotine", jp: "断頭", kind: "pulse", icon: "🪓", desc: "The cleave drops three times in a row." },
  charge: { name: "Stampede", jp: "暴走", kind: "pulse", icon: "🐂", desc: "Charge further and trample twice." },
  butcherswipe: { name: "Carcass Split", jp: "両断", kind: "pulse", icon: "🗡️", desc: "A second mirrored swing follows instantly." },
  uppercut: { name: "Heaven Piercer", jp: "天衝", kind: "pulse", icon: "👊", desc: "Launches foes and erupts on landing." },
  spinkick: { name: "Eye of the Storm", jp: "嵐の目", kind: "pulse", icon: "🌀", desc: "Spin continuously for a full rotation." },
  shockpalm: { name: "Mountain Splitter", jp: "山割", kind: "pulse", icon: "💠", desc: "The wave travels the entire screen." },
  scattershot: { name: "Porcupine", jp: "針鼠", kind: "split", icon: "💥", desc: "Double the arrows, each one splits." },
  splitarrow: { name: "Infinite Division", jp: "無限分裂", kind: "split", icon: "🔱", desc: "Shards split again on their own." },
  ricochet: { name: "Pinball Doom", jp: "永久跳弾", kind: "explode", icon: "🪃", desc: "Endless bounces, exploding at the end." },
  serveblitz: { name: "Machine Gun Serve", jp: "機関銃サーブ", kind: "swarm", icon: "⚡", desc: "Serves become a constant stream." },
  smashcone: { name: "Demolition Smash", jp: "破壊強打", kind: "explode", icon: "💢", desc: "The smash detonates on contact." },
  ballstorm: { name: "Hailstorm", jp: "雹嵐", kind: "split", icon: "🌪️", desc: "Twice the balls, and they all split." },
  netslam: { name: "Flying Smash", jp: "飛翔強打", kind: "pulse", icon: "🥅", desc: "Dive further and slam twice." },
  topspin: { name: "Guided Spin", jp: "誘導回転", kind: "split", icon: "🎱", desc: "Curving balls split into seekers." },
  shotgun: { name: "Double Barrel", jp: "二連散弾", kind: "pulse", icon: "💢", desc: "Fires both barrels back to back." },
  noscope: { name: "Clip Dump", jp: "弾倉全放出", kind: "swarm", icon: "🔄", desc: "Empties the entire magazine at once." },
  airstrike: { name: "Carpet Bomb", jp: "絨毯爆撃", kind: "swarm", icon: "✈️", desc: "The whole screen is designated a target." },
  tacsprint: { name: "Tac Insertion", jp: "戦術挿入", kind: "pulse", icon: "🏃", desc: "Slide twice as far, firing the whole way." },
  // fire
  flame: { name: "Hellfire Serve", jp: "獄炎サーブ", kind: "pool", icon: "🌋", desc: "Impacts leave a burning pool of fire." },
  aura: { name: "Inferno Shroud", jp: "業火の衣", kind: "pulse", icon: "☢️", desc: "The aura pulses a shockwave every second." },
  mine: { name: "Chain Reaction", jp: "連鎖爆発", kind: "pool", icon: "🧨", desc: "Mines chain-detonate and leave burning oil." },
  meteor: { name: "Carpet Gacha", jp: "絨毯ガチャ", kind: "swarm", icon: "🎲", desc: "Carpet-bombs the whole area in capsules." },
  // ice
  frost: { name: "Absolute Zero", jp: "絶対零度", kind: "explode", icon: "🧊", desc: "Balls burst into a freezing shockwave." },
  blizzard: { name: "Eternal Winter", jp: "永久凍土", kind: "pulse", icon: "⛄", desc: "The field pulses and freezes solid." },
  icicle: { name: "Thousand Spears", jp: "千本氷槍", kind: "split", icon: "🗡️", desc: "Spears shatter into shards on impact." },
  glacier: { name: "Ice Age", jp: "氷河期", kind: "swarm", icon: "🏔️", desc: "Blankets the whole screen in glaciers." },
  // shock
  lightning: { name: "Raijin's Wrath", jp: "雷神の怒り", kind: "pulse", icon: "🌩️", desc: "Arcs twice as far and stuns everything." },
  pylon: { name: "Grand Torii", jp: "大鳥居", kind: "pulse", icon: "🎏", desc: "The pylon pulses chain lightning constantly." },
  beam: { name: "Prism Cannon", jp: "虹光砲", kind: "swarm", icon: "🌈", desc: "Splits into a rotating three-way prism." },
  satellite: { name: "Orbital Judgement", jp: "軌道裁き", kind: "swarm", icon: "☄️", desc: "Paints a wide grid of strike zones." },
  // wind
  gale: { name: "Sonic Barrage", jp: "音速弾幕", kind: "split", icon: "🌬️", desc: "Balls break the sound barrier and split." },
  cyclone: { name: "Great Typhoon", jp: "大台風", kind: "swarm", icon: "🌀", desc: "A second cyclone ring at double range." },
  swarm: { name: "Thousand Cranes", jp: "千羽鶴", kind: "split", icon: "🎐", desc: "Each crane splits into two on impact." },
  tempest: { name: "Divine Wind", jp: "神風", kind: "pulse", icon: "🍃", desc: "Waves repeat and hurl enemies far away." },
  // void
  voidball: { name: "Collapse Sphere", jp: "崩壊球", kind: "explode", icon: "🔮", desc: "Orbs implode, dragging everything inward." },
  nova: { name: "Gravity Well", jp: "重力井", kind: "pulse", icon: "🌀", desc: "Waves drag enemies in before detonating." },
  rift: { name: "Abyssal Tear", jp: "深淵裂傷", kind: "pool", icon: "🌌", desc: "Rifts linger and devour anything near." },
  blackhole: { name: "Event Horizon", jp: "事象の地平", kind: "explode", icon: "⚫", desc: "The singularity annihilates in a huge blast." },
};

export const MAX_WEAPON_LEVEL = 5;
export const SUPER_LEVEL = 6;
/** Odds a maxed weapon offers its level-6 evolution on any given level-up. */
export const SUPER_CHANCE = 0.25;

export function weaponStats(def: WeaponDef, level: number) {
  const l = Math.min(level, MAX_WEAPON_LEVEL) - 1;
  const sup = level >= SUPER_LEVEL;
  return {
    cd: Math.max(0.1, (def.cd - def.cdPer * l) * (sup ? 0.82 : 1)),
    dmg: (def.dmg + def.dmgPer * l) * (sup ? 1.55 : 1),
    count: def.count + Math.floor(l / def.countEvery) + (sup ? 1 : 0),
    speed: def.speed,
    radius: def.radius * (1 + l * 0.06) * (sup ? 1.25 : 1),
    pierce: Math.floor(def.pierce + def.piercePer * l) + (sup ? 1 : 0),
    super: sup,
  };
}


// ===================== PLAYABLE CHARACTERS =====================
export type CharBody = "willy" | "andy" | "joe" | "aidan" | "karl";

export interface CharacterDef {
  id: CharBody; name: string; jp: string; title: string; blurb: string;
  /** Signature starting weapon id (always granted at level 1). */
  weapon: string;
  /** Flat stat profile so each character plays differently. */
  mods: StatMods;
  perk: string;          // readable unique trait
  colors: { skin: string; hair: string; top: string; bottom: string; accent: string };
  icon: string; hue: number;
  /** Andy only: fights alongside a dog. */
  pet?: boolean;
  /** Base pierce on this character's projectiles. Melee classes get 0. */
  basePierce?: number;
  /** Joe only: picks a primary firearm at level 1. */
  gunner?: boolean;
}

export const CHARACTERS: CharacterDef[] = [
  { id: "willy", name: "Willy Anime", jp: "ウィリー", title: "The Gaijin Otaku",
    blurb: "A bald white guy from nowhere with a table-tennis set and nothing to lose. Balanced, reliable, deeply uncool.",
    weapon: "racket", icon: "🏓", hue: 210,
    mods: { maxHp: 20, magnet: 0.15 },
    basePierce: 1,
    perk: "All-rounder — +20 HP, +15% pickup range, shots pierce 1 target",
    colors: { skin: "#f6cfae", hair: "#e8c35a", top: "#3b7dd8", bottom: "#2b63b0", accent: "#ff3b5c" } },

  { id: "andy", name: "Negative Andy", jp: "アンディ", title: "Doomer from Down Under",
    blurb: "Two metres of Australian pessimism and a dog that weaponises its own digestion. Nothing is ever going to work out, mate.",
    weapon: "bow", icon: "🏹", hue: 35, pet: true,
    mods: { damage: 0.1, projSpeed: 0.2, maxHp: -10 },
    basePierce: 2,
    perk: "Marksman — arrows pierce 2 targets, +20% projectile speed, loyal dog",
    colors: { skin: "#e8bb94", hair: "#6b4a2a", top: "#4a6b3a", bottom: "#3a4a2a", accent: "#c9a227" } },

  { id: "joe", name: "Joe FPS", jp: "ジョー", title: "Headset Hero",
    blurb: "Has not touched grass since the beta. Holds a spark rifle like he was born with it, because functionally he was.",
    weapon: "g_ar", icon: "🎧", hue: 160,
    mods: { haste: 0.25, crit: 0.05, armor: -1 },
    basePierce: 1, gunner: true,
    perk: "Gunsmith — +25% fire rate, builds an arsenal of firearms",
    colors: { skin: "#f0c9a8", hair: "#2b2b38", top: "#2a3340", bottom: "#1d242e", accent: "#39d8c8" } },

  { id: "aidan", name: "Arrogant Aidan", jp: "エイダン", title: "The Butcher",
    blurb: "Best knife hand in Chiba and he will tell you so, repeatedly, in detail, unprompted.",
    weapon: "cleaver", icon: "🔪", hue: 350,
    mods: { crit: 0.12, critDmg: 0.35, maxHp: -5, lifesteal: 0.18 },
    basePierce: 0,
    perk: "Bloodletter — heavy crits and lifesteal on every cut",
    colors: { skin: "#f3cfae", hair: "#8a5a2b", top: "#f2f2ee", bottom: "#e8e8e0", accent: "#c0392b" } },

  { id: "karl", name: "Karate Karl", jp: "カール", title: "Black Belt",
    blurb: "No weapon. No need. Every strike is a shockwave and every shockwave takes the element you chose.",
    weapon: "karate", icon: "🥋", hue: 50,
    mods: { armor: 6, moveSpeed: 0.12, area: 0.15, maxHp: 15 },
    basePierce: 0,
    perk: "Ironbody — +6 armor, +12% speed, strikes hit everything in the arc",
    colors: { skin: "#f6cfae", hair: "#1a1a24", top: "#f5f5f0", bottom: "#eaeae2", accent: "#1a1a24" } },
];
export const CHAR_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// ===================== PASSIVES =====================
export interface PassiveDef {
  id: string; name: string; jp: string; icon: string; desc: string; maxLevel: number; mods: StatMods;
}

export const PASSIVES: PassiveDef[] = [
  { id: "p_dmg", name: "Raw Power", jp: "剛力", icon: "💪", desc: "+8% damage", maxLevel: 10, mods: { damage: 0.08 } },
  { id: "p_haste", name: "Quickened", jp: "加速", icon: "⏩", desc: "+5% attack speed", maxLevel: 8, mods: { haste: 0.05 } },
  { id: "p_area", name: "Wide Reach", jp: "広域", icon: "🌐", desc: "+8% area", maxLevel: 7, mods: { area: 0.08 } },
  { id: "p_amount", name: "Multistrike", jp: "追加攻撃", icon: "➕", desc: "+20% chance to fire one extra projectile", maxLevel: 5, mods: { amount: 0.2 } },
  { id: "p_speed", name: "Fleet Footed", jp: "俊足", icon: "👟", desc: "+8% move speed", maxLevel: 14, mods: { moveSpeed: 0.08 } },
  { id: "p_hp", name: "Hearty", jp: "頑健", icon: "🍱", desc: "+25 max HP", maxLevel: 16, mods: { maxHp: 25 } },
  { id: "p_armor", name: "Toughened", jp: "硬化", icon: "🛡️", desc: "+2 armor", maxLevel: 16, mods: { armor: 2 } },
  { id: "p_regen", name: "Recovery", jp: "回復", icon: "🫧", desc: "+0.6 HP/sec", maxLevel: 14, mods: { regen: 0.6 } },
  { id: "p_magnet", name: "Scavenger", jp: "回収術", icon: "🧲", desc: "+30% pickup range", maxLevel: 12, mods: { magnet: 0.3 } },
  { id: "p_crit", name: "Keen Eye", jp: "鋭眼", icon: "🎯", desc: "+7% crit chance — at Lv6 EVERY strike crits, but for 70% crit damage", maxLevel: 6, mods: { crit: 0.07 } },
  { id: "p_critdmg", name: "Lethality", jp: "致命", icon: "🩸", desc: "+15% crit damage", maxLevel: 6, mods: { critDmg: 0.15 } },
  { id: "p_xp", name: "Fast Learner", jp: "研鑽", icon: "📖", desc: "+15% XP gain", maxLevel: 12, mods: { xpGain: 0.15 } },
  { id: "p_coin", name: "Opportunist", jp: "強欲", icon: "💴", desc: "+20% coin gain", maxLevel: 12, mods: { coinGain: 0.2 } },
  { id: "p_proj", name: "Velocity", jp: "速度", icon: "🗡️", desc: "+15% projectile speed", maxLevel: 12, mods: { projSpeed: 0.15 } },
  { id: "p_dur", name: "Lingering", jp: "持続", icon: "⏳", desc: "+15% effect duration", maxLevel: 12, mods: { duration: 0.15 } },
  { id: "p_cdr", name: "Composure", jp: "冷静", icon: "🧊", desc: "-4% skill cooldowns", maxLevel: 6, mods: { cdr: -0.04 } },
  { id: "p_steal", name: "Bloodletting", jp: "吸血", icon: "🦇", desc: "+0.08 HP per hit (reduces your damage)", maxLevel: 6, mods: { lifesteal: 0.08 } },
];

export const PASSIVE_BY_ID: Record<string, PassiveDef> = Object.fromEntries(PASSIVES.map((p) => [p.id, p]));



/** ============================================================
 *  JOE'S ARSENAL
 *  Joe is a weapons-first class. He picks a primary at level 1 and
 *  unlocks additional firearms at 25/50/75/100 — they all fire at once,
 *  each with its own targeting rule, magazine and reload.
 *  ============================================================ */
export type GunTarget =
  | "aim"        // where you point
  | "nearest"    // closest enemy
  | "lowest"     // lowest absolute health
  | "random"     // a random enemy on screen
  | "around"     // sprays in all directions
  | "cone"       // short cone in front
  | "self";      // centred on you

export interface GunDef {
  id: string; name: string; jp: string; icon: string; tier: 0 | 25 | 50 | 75 | 100;
  desc: string; perk: string;
  mag: number; reload: number;          // magazine size, reload seconds
  cd: number; dmg: number; count: number; spread: number; speed: number;
  radius: number; pierce: number; target: GunTarget;
  explode?: number;                      // blast radius on impact
  /** Deals this fraction of the target's MAX health instead of flat damage. */
  pctHealth?: number;
  color: string;
  /** Joe's primary choices at level 1. */
  primary?: boolean;
}

export const GUNS: GunDef[] = [
  // ---------------- LEVEL 1: pick your primary ----------------
  { id: "g_ar", name: "Assault Rifle", jp: "突撃銃", icon: "🔫", tier: 0, primary: true,
    desc: "Steady full-auto fire. 30 rounds, quick reload.",
    perk: "Rounds punch through armour — ignores 40% of enemy resistances",
    mag: 30, reload: 1.5, cd: 0.13, dmg: 13, count: 1, spread: 0.05, speed: 900,
    radius: 4, pierce: 1, target: "aim", color: "#6ff5e8" },
  { id: "g_shotgun", name: "Shotgun", jp: "散弾銃", icon: "💥", tier: 0, primary: true,
    desc: "Six shells of close-range devastation.",
    perk: "Pellets detonate on impact",
    mag: 6, reload: 2.0, cd: 0.62, dmg: 11, count: 7, spread: 0.34, speed: 760,
    radius: 4, pierce: 0, target: "aim", explode: 34, color: "#ffb703" },
  { id: "g_sniper", name: "Sniper Rifle", jp: "狙撃銃", icon: "🎯", tier: 0, primary: true,
    desc: "Five rounds. Each one goes through everything.",
    perk: "Always pierces the entire line and crits far more often",
    mag: 5, reload: 2.4, cd: 1.05, dmg: 95, count: 1, spread: 0, speed: 1500,
    radius: 5, pierce: 99, target: "nearest", color: "#b8fff6" },

  // ---------------- LEVEL 25 ----------------
  { id: "g_pistol", name: "Sidearm", jp: "拳銃", icon: "🔪", tier: 25,
    desc: "Fires off-angle at whatever your rifle isn't covering.",
    perk: "Never shoots your main target — covers your flanks",
    mag: 12, reload: 1.1, cd: 0.34, dmg: 18, count: 1, spread: 0.08, speed: 820,
    radius: 4, pierce: 0, target: "random", color: "#ffd166" },
  { id: "g_shield", name: "Riot Shield", jp: "盾", icon: "🛡️", tier: 25,
    desc: "Braced on your off-hand. Bullets bounce off it.",
    perk: "25% chance to block any projectile and reflect it back",
    mag: 0, reload: 0, cd: 0, dmg: 0, count: 0, spread: 0, speed: 0,
    radius: 0, pierce: 0, target: "self", color: "#9fb8d8" },
  { id: "g_knife", name: "Combat Knife", jp: "軍用ナイフ", icon: "🗡️", tier: 25,
    desc: "Slashes anything that gets inside your guard.",
    perk: "Automatic cleave in front — no ammo, no reload",
    mag: 0, reload: 0, cd: 0.55, dmg: 42, count: 1, spread: 0, speed: 0,
    radius: 104, pierce: 99, target: "cone", color: "#e8eef7" },

  // ---------------- LEVEL 50 ----------------
  { id: "g_grenade", name: "Frag Grenades", jp: "手榴弾", icon: "🧨", tier: 50,
    desc: "Lobbed at a random target and detonates.",
    perk: "Blast radius scales hard with Area",
    mag: 4, reload: 2.6, cd: 1.3, dmg: 54, count: 1, spread: 0, speed: 0,
    radius: 72, pierce: 99, target: "random", color: "#8ef5c0" },

  // ---------------- LEVEL 75 ----------------
  { id: "g_gl", name: "Grenade Launcher", jp: "擲弾発射器", icon: "💣", tier: 75,
    desc: "Arcs three grenades across the field at once.",
    perk: "Stacks with Frag Grenades — both fire together",
    mag: 6, reload: 2.8, cd: 1.8, dmg: 62, count: 3, spread: 0, speed: 0,
    radius: 78, pierce: 99, target: "random", color: "#9fe8a0" },
  { id: "g_mine", name: "Landmines", jp: "地雷", icon: "⚠️", tier: 100,
    desc: "Drops armed charges in your wake.",
    perk: "Mines persist until something walks into them",
    mag: 8, reload: 2.2, cd: 1.0, dmg: 70, count: 1, spread: 0, speed: 0,
    radius: 68, pierce: 99, target: "self", color: "#ffb86c" },
  { id: "g_plasma", name: "Plasma Rifle", jp: "プラズマ銃", icon: "⚛️", tier: 75,
    desc: "Superheated bolts that burn a percentage of whatever they touch.",
    perk: "Deals 3.5% of the target's MAX health per bolt — ignores armour entirely",
    mag: 20, reload: 2.0, cd: 0.16, dmg: 10, count: 1, spread: 0.05, speed: 940,
    radius: 5, pierce: 1, target: "aim", pctHealth: 0.035, color: "#6ff5e8" },
  { id: "g_mp", name: "Machine Pistol", jp: "機関拳銃", icon: "🔩", tier: 75,
    desc: "Hoses down whatever is closest to dying.",
    perk: "Always targets the lowest-health enemy — finishes them off",
    mag: 24, reload: 1.3, cd: 0.1, dmg: 15, count: 1, spread: 0.12, speed: 880,
    radius: 3.4, pierce: 0, target: "lowest", color: "#ff9f43" },

  // ---------------- LEVEL 100 ----------------
  { id: "g_minigun", name: "Minigun", jp: "ミニガン", icon: "🌀", tier: 100,
    desc: "Two hundred rounds. Spins up and does not stop.",
    perk: "Enormous magazine, blistering fire rate",
    mag: 200, reload: 4.0, cd: 0.05, dmg: 16, count: 1, spread: 0.14, speed: 980,
    radius: 3.6, pierce: 1, target: "aim", color: "#ffe066" },
  { id: "g_rocket", name: "Rocket Launcher", jp: "ロケット砲", icon: "🚀", tier: 100,
    desc: "One tube, one very large hole.",
    perk: "Seeks its target and detonates enormously",
    mag: 3, reload: 3.4, cd: 2.0, dmg: 180, count: 1, spread: 0, speed: 420,
    radius: 10, pierce: 0, target: "nearest", explode: 130, color: "#ff5a2f" },
  { id: "g_thrower", name: "Elemental Thrower", jp: "元素放射器", icon: "✴️", tier: 100,
    desc: "A continuous cone of your chosen element.",
    perk: "Applies your elemental effect constantly, at no ammo cost",
    mag: 0, reload: 0, cd: 0.22, dmg: 26, count: 1, spread: 0, speed: 0,
    radius: 150, pierce: 99, target: "cone", color: "#b388ff" },
];
export const GUN_BY_ID: Record<string, GunDef> = Object.fromEntries(GUNS.map((g) => [g.id, g]));
export function gunsForTier(t: number, owned: string[], primary: string | null) {
  if (t === 50) {
    // the two primaries you passed on, plus grenades
    const others = GUNS.filter((g) => g.primary && g.id !== primary && !owned.includes(g.id));
    return [...others, ...GUNS.filter((g) => g.tier === 50 && !owned.includes(g.id))];
  }
  return GUNS.filter((g) => g.tier === t && !owned.includes(g.id));
}

/** Joe's weapon-handling skills. */
export const GUN_SKILLS = [
  { id: "gs_reload", name: "Fast Hands", jp: "早業装填", icon: "🔁", maxLevel: 5,
    desc: "−18% reload time on every weapon" },
  { id: "gs_mag", name: "Extended Mags", jp: "拡張弾倉", icon: "📦", maxLevel: 5,
    desc: "+40% magazine size on every weapon" },
  { id: "gs_tradeoff", name: "Hot Loads", jp: "高圧弾", icon: "🔥", maxLevel: 4,
    desc: "+25% weapon damage, but +15% reload time" },
  { id: "gs_quick", name: "Tactical Reload", jp: "戦術装填", icon: "⚡", maxLevel: 3,
    desc: "Reloading grants +15% fire rate for 3 seconds" },
];

// ===================== MODIFIER SKILLS =====================
/** Stacking combat modifiers available to every class, alongside passives. */
export interface ModDef {
  id: string; name: string; jp: string; icon: string; desc: string; maxLevel: number;
  /** Only offered to these characters (undefined = all). */
  chars?: CharBody[];
  /** Only offered on this element path. */
  path?: ElementPath;
}
export const MODS: ModDef[] = [
  { id: "m_knock",   name: "Heavy Impact",   jp: "重撃",   icon: "🪨", desc: "+1 knockback — blows enemies further back", maxLevel: 6 },
  { id: "m_explode", name: "Detonate",       jp: "爆散",   icon: "💥", desc: "Slain enemies explode, chaining into the crowd", maxLevel: 4 },
  { chars: ["willy","andy","joe"], id: "m_pierce",  name: "Penetration",    jp: "貫通",   icon: "➡️", desc: "+30% chance to pierce an extra target. At Lv4, ALWAYS pierce one.", maxLevel: 4 },
  { chars: ["willy","andy","joe"], id: "m_split",   name: "Fracture",       jp: "分裂",   icon: "🔀", desc: "Projectiles split into 2 shards on impact", maxLevel: 2 },
  { chars: ["willy","andy","joe"], id: "m_bounce",  name: "Ricochet",       jp: "跳弾",   icon: "🎱", desc: "+1 wall bounce on every projectile", maxLevel: 2 },
  { id: "m_stagger", name: "Concussion",     jp: "脳震盪", icon: "😵", desc: "Hits briefly stun — longer each level", maxLevel: 4 },
  { id: "m_execute", name: "Execution",      jp: "処刑",   icon: "☠️", desc: "Instantly kill non-boss foes below 5/10/15/20/25% HP — 50% at max", maxLevel: 6 },
  { id: "m_vamp",    name: "Sanguine",       jp: "吸血",   icon: "🩸", desc: "Kills restore a small amount of health", maxLevel: 4 },
  { id: "m_chain",   name: "Overflow",       jp: "連鎖",   icon: "🔗", desc: "Hits arc to a nearby enemy for 40% damage", maxLevel: 4 },
  { id: "m_giant",   name: "Oversize",       jp: "巨大化", icon: "🔵", desc: "+20% projectile and melee size", maxLevel: 4 },
  { chars: ["willy","andy","joe"], id: "m_double",  name: "Double Tap",     jp: "二連",   icon: "👯", desc: "12% chance to fire a weapon twice", maxLevel: 3 },
  { id: "m_slowfoe", name: "Tar Hands",      jp: "鈍足",   icon: "🕸️", desc: "Hits slow enemies on contact", maxLevel: 3 },

  // ---- element-reactive modifiers (only on the matching path) ----
  { id: "x_fire",  name: "Cinder Burst",   jp: "燼",   icon: "🔥", desc: "Burning deaths explode — every 10s, −1s per level. At Lv6: 4% of all kills.", maxLevel: 6, path: "fire" },
  { id: "x_ice",   name: "Shatter",        jp: "砕氷", icon: "❄️", desc: "Frozen deaths shatter — every 10s, −1s per level. At Lv6: 4% of all kills.", maxLevel: 6, path: "ice" },
  { id: "x_shock", name: "Overload",       jp: "過負荷", icon: "⚡", desc: "Shocked deaths chain lightning — every 10s, −1s per level. At Lv6: 4% of all kills.", maxLevel: 6, path: "shock" },
  { id: "x_wind",  name: "Vacuum",         jp: "真空", icon: "🌪️", desc: "Kills pull enemies in — every 10s, −1s per level. At Lv6: 4% of all kills.", maxLevel: 6, path: "wind" },
  { id: "x_void",  name: "Pool of Decay",  jp: "腐敗沼", icon: "🕳️", desc: "Deaths leave a decay pool — every 10s, −1s per level. At Lv6: 4% of all kills.", maxLevel: 6, path: "void" },

  // ---- class-flavoured modifiers ----
  { id: "k_fist",   name: "Iron Knuckles",  jp: "鉄拳",   icon: "👊", desc: "+18% melee cone damage and reach", maxLevel: 5, chars: ["karl", "aidan"] },
  { id: "k_combo",  name: "Combo Flow",     jp: "連打",   icon: "🥊", desc: "Each consecutive strike adds +8% damage", maxLevel: 4, chars: ["karl"] },
  { id: "a_draw",   name: "Fast Draw",      jp: "速射",   icon: "🏹", desc: "+15% arrow speed, and arrows punch through +1 target per level", maxLevel: 5, chars: ["andy"] },
  { id: "a_dog",    name: "Good Boy",       jp: "良い子", icon: "🐕", desc: "Dog lunges faster, shoots faster and bites harder", maxLevel: 5, chars: ["andy"] },
  { id: "a_bark",   name: "Bark!",           jp: "吠え",   icon: "📢", desc: "The dog barks — a staggering cone that knocks foes back", maxLevel: 5, chars: ["andy"] },
  { id: "a_howl",   name: "Howl",            jp: "遠吠え", icon: "🐺", desc: "Periodic howl: buffs your attack speed and damage", maxLevel: 5, chars: ["andy"] },
  { id: "a_maul",   name: "Maul",            jp: "食い裂き", icon: "🦷", desc: "Dog lunges rip deeper and cause bleeding", maxLevel: 4, chars: ["andy"] },
  { id: "a_pack",   name: "Pack Instinct",   jp: "群れの本能", icon: "🐾", desc: "The dog shares your element and procs more often", maxLevel: 3, chars: ["andy"] },
  { id: "j_recoil", name: "Recoil Control", jp: "反動制御", icon: "🎯", desc: "+6% fire rate, tighter spread", maxLevel: 4, chars: ["joe"] },
  { id: "d_butcher", name: "Keen Edge",      jp: "鋭刃",   icon: "🔪", desc: "+10% crit and bleeding on every cut", maxLevel: 5, chars: ["aidan"] },
  { id: "d_infuse",  name: "Blade Infusion", jp: "刃の付与", icon: "✨", desc: "Your blades carry your element on every strike", maxLevel: 5, chars: ["aidan"] },
  { id: "d_reach",   name: "Longer Cleaver", jp: "長包丁", icon: "📏", desc: "+20% melee reach and arc", maxLevel: 5, chars: ["aidan"] },
  { id: "d_butchery",name: "Butchery",       jp: "解体",   icon: "🥩", desc: "Cuts execute wounded foes and drop extra meat", maxLevel: 4, chars: ["aidan"] },
  { id: "d_frenzy",  name: "Blood Frenzy",   jp: "血狂",   icon: "🩸", desc: "Each kill grants stacking attack speed", maxLevel: 4, chars: ["aidan"] },
  { id: "d_cleaveall",name: "Follow Through",jp: "追い斬り", icon: "〽️", desc: "Swings echo a second, weaker arc", maxLevel: 3, chars: ["aidan"] },
  { id: "w_edge",    name: "Perfect Contact", jp: "芯で捉える", icon: "🎯", desc: "+30% crit damage — sweet-spot every serve", maxLevel: 5, chars: ["willy"] },
  { id: "a_aim",     name: "Called Shot",     jp: "狙い撃ち",   icon: "🏹", desc: "+30% crit damage — he picks the spot first", maxLevel: 5, chars: ["andy"] },
  { id: "j_head",    name: "Headshot Multi",  jp: "頭部倍率",   icon: "💥", desc: "+30% crit damage — aim for the head", maxLevel: 5, chars: ["joe"] },
  { id: "d_prime",   name: "Prime Cut",       jp: "極上の一刀", icon: "🥩", desc: "+30% crit damage — along the grain", maxLevel: 5, chars: ["aidan"] },
  { id: "k_pressure",name: "Pressure Point",  jp: "急所突き",   icon: "👆", desc: "+30% crit damage — he knows where it hurts", maxLevel: 5, chars: ["karl"] },
  { id: "w_spin",   name: "Perfect Spin",   jp: "完全回転", icon: "🏓", desc: "+12% projectile speed, balls curve to targets", maxLevel: 5, chars: ["willy"] },
];
export const MOD_BY_ID: Record<string, ModDef> = Object.fromEntries(MODS.map((m) => [m.id, m]));

// ===================== ITEMS (chest / quest loot only) =====================
export type ItemSlot = "head" | "face" | "body" | "back" | "legs" | "feet" | "hands" | "neck" | "trinket" | "weapon" | "offhand";

/** ============================================================
 *  ITEM PROCS
 *  Epic and Legendary gear carries a *triggered* effect rather than a
 *  bigger number. Everything fires automatically — on a cooldown or when
 *  a condition is met. There are no buttons to press.
 *  ============================================================ */
export type ProcTrigger =
  | "cooldown"    // fires on a timer
  | "onKill"      // when you slay something
  | "onHurt"      // when you take damage
  | "onCrit"      // on a critical strike
  | "lowHp"       // while below 35% health
  | "onDash"      // when you move fast / lunge
  | "always";     // passive aura, no trigger

export type ProcKind =
  | "shield"      // absorb a burst of damage
  | "empower"     // next attacks hit much harder
  | "summon"      // spawn a temporary ally turret
  | "novaFire" | "novaIce" | "novaShock" | "novaVoid" | "novaWind"
  | "heal"        // restore health
  | "orbit"       // spin up temporary orbital blades
  | "chainBolt"   // arc lightning to nearby foes
  | "thornBurst"  // retaliatory spike damage
  | "slowField"   // chill everything close
  | "volley"      // auto-fire a salvo of projectiles
  | "mark"        // debuff foes to take extra damage
  | "hasteSurge"  // temporary attack-speed spike
  | "magnetPulse" // yank in all loot
  | "decoy"       // drop a taunting decoy
  | "revive";     // one-time death save

export interface ProcDef {
  kind: ProcKind;
  trigger: ProcTrigger;
  /** Seconds between activations (cooldown triggers and trigger throttles). */
  cd: number;
  /** Scales with the proc's own power; meaning depends on kind. */
  power: number;
  /** Duration in seconds, where relevant. */
  dur?: number;
  name: string;
  desc: string;
}

/** Unique behaviours granted by gear (legacy passive flags, now rarer). */
export type ItemEffect =
  | "thorns" | "bloom" | "dodge" | "firetrail" | "frostaura" | "critchain"
  | "coinburst" | "guardian" | "swift" | "greed" | "scholar" | "berserk" | "none";

export const EFFECT_INFO: Record<ItemEffect, { name: string; desc: string }> = {
  thorns: { name: "Thorns", desc: "Attackers take 12 damage back" },
  bloom: { name: "Bloom", desc: "Slain enemies burst for area damage" },
  dodge: { name: "Sidestep", desc: "7% chance to completely avoid a hit" },
  firetrail: { name: "Scorch Trail", desc: "Leaves burning ground as you run" },
  frostaura: { name: "Cold Snap", desc: "Chills enemies that come close" },
  critchain: { name: "Static Crit", desc: "Crits arc lightning to a second foe" },
  coinburst: { name: "Pocket Change", desc: "Kills sometimes scatter extra coins" },
  guardian: { name: "Guardian", desc: "Below 30% HP you gain +3 armor" },
  swift: { name: "Momentum", desc: "Moving builds up to +10% attack speed" },
  greed: { name: "Greed", desc: "Coins also grant a little XP" },
  scholar: { name: "Scholar", desc: "XP gems pull from anywhere on screen" },
  berserk: { name: "Berserk", desc: "+15% damage while under half health" },
  none: { name: "", desc: "" },
};

export const ITEM_BASE_STATS: Record<string, { mods: StatMods; tag: string; slot: ItemSlot }> = {
  // Values are deliberately TINY. A single Legendary multiplies these by 5.5,
  // which lands a headline stat around +4%. Gear is meant to be a slow,
  // cumulative drip — your weapons and skills are what make you strong.
  // ---- head ----
  headband:  { tag: "defense",  slot: "head", mods: { armor: 0.35, maxHp: 3 } },
  helmet:    { tag: "defense",  slot: "head", mods: { armor: 0.6, moveSpeed: -0.006 } },
  cap:       { tag: "utility",  slot: "head", mods: { xpGain: 0.008, magnet: 0.02 } },
  crown:     { tag: "offense",  slot: "head", mods: { damage: 0.008, coinGain: 0.02 } },
  hood:      { tag: "mobility", slot: "head", mods: { moveSpeed: 0.008, crit: 0.005 } },
  tiara:     { tag: "utility",  slot: "head", mods: { cdr: -0.008, regen: 0.06 } },
  // ---- face ----
  goggles:   { tag: "offense",  slot: "face", mods: { crit: 0.006, critDmg: 0.0073 } },
  mask:      { tag: "offense",  slot: "face", mods: { damage: 0.007, crit: 0.004 } },
  visor:     { tag: "offense",  slot: "face", mods: { projSpeed: 0.010, crit: 0.003 } },
  oni_mask:  { tag: "offense",  slot: "face", mods: { damage: 0.010, armor: -0.15 } },
  glasses:   { tag: "utility",  slot: "face", mods: { xpGain: 0.009, luck: 0.005 } },
  // ---- body ----
  jacket:    { tag: "defense",  slot: "body", mods: { armor: 0.45, maxHp: 4 } },
  vest:      { tag: "defense",  slot: "body", mods: { armor: 0.6, moveSpeed: -0.006 } },
  apron:     { tag: "offense",  slot: "body", mods: { critDmg: 0.010, lifesteal: 0.004 } },
  gi:        { tag: "mobility", slot: "body", mods: { moveSpeed: 0.009, area: 0.009 } },
  armor:     { tag: "defense",  slot: "body", mods: { armor: 0.8, maxHp: 5, moveSpeed: -0.008 } },
  kimono:    { tag: "utility",  slot: "body", mods: { regen: 0.09, duration: 0.012 } },
  hoodie:    { tag: "utility",  slot: "body", mods: { maxHp: 4, cdr: -0.007 } },
  // ---- back ----
  cape:      { tag: "mobility", slot: "back", mods: { moveSpeed: 0.008, armor: 0.2 } },
  quiver:    { tag: "offense",  slot: "back", mods: { amount: 0.03, projSpeed: 0.010 } },
  backpack:  { tag: "utility",  slot: "back", mods: { magnet: 0.04, coinGain: 0.016 } },
  wings:     { tag: "mobility", slot: "back", mods: { moveSpeed: 0.009, cdr: -0.005 } },
  banner:    { tag: "offense",  slot: "back", mods: { damage: 0.010, area: 0.010 } },
  scabbard:  { tag: "offense",  slot: "back", mods: { haste: 0.010, critDmg: 0.009 } },
  // ---- legs ----
  pants:     { tag: "defense",  slot: "legs", mods: { maxHp: 3.5, armor: 0.2 } },
  hakama:    { tag: "utility",  slot: "legs", mods: { duration: 0.015, regen: 0.05 } },
  shorts:    { tag: "mobility", slot: "legs", mods: { moveSpeed: 0.011 } },
  greaves:   { tag: "defense",  slot: "legs", mods: { armor: 0.65, maxHp: 3, moveSpeed: -0.005 } },
  // ---- feet ----
  sneakers:  { tag: "mobility", slot: "feet", mods: { moveSpeed: 0.008, cdr: -0.005 } },
  gumboots:  { tag: "defense",  slot: "feet", mods: { armor: 0.4, maxHp: 3 } },
  tabi:      { tag: "mobility", slot: "feet", mods: { moveSpeed: 0.009, crit: 0.003 } },
  geta:      { tag: "offense",  slot: "feet", mods: { damage: 0.008, moveSpeed: -0.005, armor: 0.25 } },
  cleats:    { tag: "mobility", slot: "feet", mods: { moveSpeed: 0.010, haste: 0.007 } },
  // ---- hands ----
  gloves:    { tag: "offense",  slot: "hands", mods: { damage: 0.008, haste: 0.006 } },
  gauntlets: { tag: "defense",  slot: "hands", mods: { armor: 0.5, damage: 0.007 } },
  wraps:     { tag: "offense",  slot: "hands", mods: { haste: 0.009, lifesteal: 0.003 } },
  claws:     { tag: "offense",  slot: "hands", mods: { crit: 0.007, critDmg: 0.0073 } },
  mitts:     { tag: "utility",  slot: "hands", mods: { magnet: 0.03, haste: 0.005 } },
  // ---- neck ----
  necklace:  { tag: "utility",  slot: "neck", mods: { regen: 0.055, maxHp: 2.5 } },
  amulet:    { tag: "utility",  slot: "neck", mods: { regen: 0.045, magnet: 0.022 } },
  scarf:     { tag: "mobility", slot: "neck", mods: { moveSpeed: 0.008, duration: 0.010 } },
  pendant:   { tag: "offense",  slot: "neck", mods: { damage: 0.009, crit: 0.004 } },
  collar:    { tag: "defense",  slot: "neck", mods: { armor: 0.45, lifesteal: 0.003 } },
  // ---- trinket ----
  ring:      { tag: "offense",  slot: "trinket", mods: { damage: 0.006, area: 0.007 } },
  charm:     { tag: "utility",  slot: "trinket", mods: { luck: 0.009, xpGain: 0.009 } },
  belt:      { tag: "utility",  slot: "trinket", mods: { maxHp: 3, duration: 0.010 } },
  watch:     { tag: "utility",  slot: "trinket", mods: { cdr: -0.007, haste: 0.005 } },
  badge:     { tag: "offense",  slot: "trinket", mods: { damage: 0.005, coinGain: 0.018 } },
  bell:      { tag: "utility",  slot: "trinket", mods: { magnet: 0.025 } },
  dice:      { tag: "utility",  slot: "trinket", mods: { luck: 0.009, critDmg: 0.007 } },
  coin:      { tag: "utility",  slot: "trinket", mods: { coinGain: 0.02 } },
  idol:      { tag: "offense",  slot: "trinket", mods: { damage: 0.008, haste: 0.007 } },
  sigil:     { tag: "offense",  slot: "trinket", mods: { area: 0.009, duration: 0.008 } },
  talisman:  { tag: "defense",  slot: "trinket", mods: { armor: 0.55, regen: 0.055 } },
  // ---- weapon charms ----
  sword:     { tag: "offense",  slot: "weapon", mods: { damage: 0.008, critDmg: 0.007 } },
  katana:    { tag: "offense",  slot: "weapon", mods: { crit: 0.007, damage: 0.006 } },
  spear:     { tag: "offense",  slot: "weapon", mods: { projSpeed: 0.014, damage: 0.006 } },
  hammer:    { tag: "offense",  slot: "weapon", mods: { damage: 0.010, haste: -0.005, area: 0.008 } },
  dagger:    { tag: "offense",  slot: "weapon", mods: { haste: 0.010, crit: 0.005 } },
  staff:     { tag: "utility",  slot: "weapon", mods: { area: 0.010, duration: 0.009 } },
  nunchaku:  { tag: "offense",  slot: "weapon", mods: { haste: 0.010, moveSpeed: 0.004 } },
  // ---- offhand ----
  shield:    { tag: "defense",  slot: "offhand", mods: { armor: 0.8, maxHp: 3.5 } },
  lantern:   { tag: "utility",  slot: "offhand", mods: { magnet: 0.035, luck: 0.008 } },
  fan:       { tag: "utility",  slot: "offhand", mods: { area: 0.010, cdr: -0.006 } },
  scroll:    { tag: "utility",  slot: "offhand", mods: { xpGain: 0.012, cdr: -0.005 } },
  flask:     { tag: "utility",  slot: "offhand", mods: { regen: 0.06, maxHp: 2.5 } },
  orb:       { tag: "offense",  slot: "offhand", mods: { damage: 0.008, area: 0.007 } },
  bracer:    { tag: "defense",  slot: "offhand", mods: { armor: 0.5, haste: 0.007 } },
};

export const ITEM_VARIANT_STATS: Record<string, StatMods> = {
  plain: {},
  worn: { maxHp: 1 },
  ice: { armor: 0.25, duration: 0.008 },
  flame: { damage: 0.008 },
  thunder: { haste: 0.008 },
  shadow: { moveSpeed: 0.006, crit: 0.004 },
  jade: { regen: 0.05, maxHp: 1.5 },
  gold: { coinGain: 0.02, luck: 0.005 },
  blood: { lifesteal: 0.005, damage: 0.004 },
  neon: { area: 0.008, xpGain: 0.010 },
};

export const ITEM_BASE_IDS = Object.keys(ITEM_BASE_STATS);
export const ITEM_VARIANT_IDS = Object.keys(ITEM_VARIANT_STATS);


/** ============================================================
 *  UNIQUE CLASS GEAR — 15 per character, Epic or Legendary only.
 *  These never roll from the generic pool; they are the chase items.
 *  ============================================================ */
export interface UniqueDef {
  id: string; name: string; jp: string; base: string; variant: string;
  tier: 2 | 3; chars: CharBody[]; flavour: string;
  mods: StatMods;
  proc: ProcDef;
}

const P = (kind: ProcKind, trigger: ProcTrigger, cd: number, power: number,
           name: string, desc: string, dur?: number): ProcDef =>
  ({ kind, trigger, cd, power, name, desc, dur });

export const UNIQUES: UniqueDef[] = [
  // ======================= WILLY — ping pong =======================
  { id: "u_w1", name: "Championship Headband", jp: "優勝鉢巻", base: "headband", variant: "flame", tier: 2, chars: ["willy"],
    flavour: "Sweat-stained from a tournament nobody remembers.",
    mods: { haste: 0.03 }, proc: P("hasteSurge", "onKill", 8, 0.35, "Rally Point", "Kills spark +35% attack speed for 4s", 4) },
  { id: "u_w2", name: "Grip of the Rally King", jp: "連打王の握り", base: "gloves", variant: "thunder", tier: 2, chars: ["willy"],
    flavour: "Worn smooth by ten thousand serves.", mods: { damage: 0.03 },
    proc: P("volley", "cooldown", 6, 5, "Auto Serve", "Fires a 5-ball salvo every 6s") },
  { id: "u_w3", name: "Paddle Saint's Charm", jp: "聖球護符", base: "charm", variant: "jade", tier: 2, chars: ["willy"],
    flavour: "Blessed at a shrine that mostly handles traffic safety.",
    mods: { luck: 0.02 }, proc: P("heal", "cooldown", 14, 0.08, "Second Wind", "Restores 8% HP every 14s") },
  { id: "u_w4", name: "Topspin Bracers", jp: "回転腕輪", base: "bracer", variant: "neon", tier: 2, chars: ["willy"],
    flavour: "Makes the ball curve in ways physics resents.",
    mods: { projSpeed: 0.05 }, proc: P("mark", "onCrit", 5, 0.25, "Spin Mark", "Crits mark foes to take +25% damage", 5) },
  { id: "u_w5", name: "Table of the Ancients", jp: "古卓", base: "shield", variant: "ice", tier: 2, chars: ["willy"],
    flavour: "A tabletop fragment. Still regulation thickness.",
    mods: { armor: 0.8 }, proc: P("shield", "onHurt", 12, 0.18, "Block Return", "Taking a hit grants a shield worth 18% HP", 5) },
  { id: "u_w6", name: "Net Cord Scarf", jp: "ネットの襟巻", base: "scarf", variant: "shadow", tier: 2, chars: ["willy"],
    flavour: "Lucky. Statistically, infuriatingly lucky.",
    mods: { moveSpeed: 0.03 }, proc: P("slowField", "cooldown", 9, 90, "Dead Net", "Chills everything within 90u every 9s", 3) },
  { id: "u_w7", name: "Ballboy's Satchel", jp: "球拾いの鞄", base: "backpack", variant: "gold", tier: 2, chars: ["willy"],
    flavour: "Bottomless, and somehow always damp.",
    mods: { magnet: 0.06 }, proc: P("magnetPulse", "cooldown", 10, 1, "Sweep Up", "Pulls in all loot on screen every 10s") },
  { id: "u_w8", name: "Smash Visor", jp: "強打の面", base: "visor", variant: "blood", tier: 2, chars: ["willy"],
    flavour: "Tinted so you can't see the fear in their eyes.",
    mods: { crit: 0.02 }, proc: P("empower", "cooldown", 11, 1.8, "Killer Shot", "Every 11s your next 3 hits deal 180% damage", 6) },
  { id: "u_w9", name: "Pong Sentinel Core", jp: "卓球守護核", base: "orb", variant: "thunder", tier: 3, chars: ["willy"],
    flavour: "A robot umpire's brain. It still counts faults.",
    mods: { damage: 0.05 }, proc: P("summon", "cooldown", 13, 1, "Deploy Umpire", "Summons a ball-firing turret every 13s", 11) },
  { id: "u_w10", name: "Orbit of Ten Thousand Volleys", jp: "万球の輪", base: "ring", variant: "neon", tier: 3, chars: ["willy"],
    flavour: "They orbit whether you want them to or not.",
    mods: { area: 0.04 }, proc: P("orbit", "cooldown", 12, 3, "Phantom Rally", "Spins up 3 orbital balls every 12s", 7) },
  { id: "u_w11", name: "The Perfect Serve", jp: "完全無欠", base: "katana", variant: "gold", tier: 3, chars: ["willy"],
    flavour: "Performed once, in 1987, and never since.",
    mods: { crit: 0.04, critDmg: 0.03 }, proc: P("chainBolt", "onCrit", 3, 0.6, "Ace", "Crits arc to 3 nearby enemies") },
  { id: "u_w12", name: "Gaijin's Resolve", jp: "外人の覚悟", base: "jacket", variant: "flame", tier: 3, chars: ["willy"],
    flavour: "He is not from here. He is not leaving either.",
    mods: { maxHp: 8, armor: 0.6 }, proc: P("empower", "lowHp", 16, 2.2, "Last Point", "Below 35% HP, attacks deal 220% damage", 6) },
  { id: "u_w13", name: "Tournament Trophy", jp: "優勝杯", base: "idol", variant: "gold", tier: 3, chars: ["willy"],
    flavour: "Third place. He insists it was a strong field.",
    mods: { coinGain: 0.05 }, proc: P("novaWind", "cooldown", 8, 1.1, "Victory Lap", "Blasts a knockback shockwave every 8s") },
  { id: "u_w14", name: "Rubber of the Void", jp: "虚無ラバー", base: "pendant", variant: "shadow", tier: 3, chars: ["willy"],
    flavour: "Grippier than the laws of motion permit.",
    mods: { damage: 0.04 }, proc: P("novaVoid", "onKill", 6, 1.0, "Collapse Spin", "Kills collapse space around them") },
  { id: "u_w15", name: "Anime's Last Paddle", jp: "最後のラケット", base: "sword", variant: "flame", tier: 3, chars: ["willy"],
    flavour: "Splintered, taped, undefeated.",
    mods: { damage: 0.06, haste: 0.03 }, proc: P("revive", "always", 0, 1, "One More Set", "Survive a fatal blow once per run") },

  // ======================= ANDY — bow & dog =======================
  { id: "u_a1", name: "Doomer's Hood", jp: "厭世のフード", base: "hood", variant: "shadow", tier: 2, chars: ["andy"],
    flavour: "Nothing's gonna work out. Might as well aim well.",
    mods: { crit: 0.02 }, proc: P("mark", "cooldown", 7, 0.3, "Grim Outlook", "Marks nearby foes for +30% damage", 5) },
  { id: "u_a2", name: "Quiver of Endless Sighs", jp: "溜息の矢筒", base: "quiver", variant: "ice", tier: 2, chars: ["andy"],
    flavour: "Never empties. He has checked, repeatedly.",
    mods: { amount: 0.04 }, proc: P("volley", "cooldown", 5, 6, "Autoloose", "Looses 6 arrows outward every 5s") },
  { id: "u_a3", name: "Good Boy's Collar", jp: "良い子の首輪", base: "collar", variant: "jade", tier: 2, chars: ["andy"],
    flavour: "He is, objectively, a very good boy.",
    mods: { regen: 0.04 }, proc: P("summon", "cooldown", 12, 1, "Fetch!", "Sends out an attacking stray every 12s", 10) },
  { id: "u_a4", name: "Bushranger's Cape", jp: "山賊の外套", base: "cape", variant: "worn", tier: 2, chars: ["andy"],
    flavour: "Smells of eucalyptus and poor decisions.",
    mods: { moveSpeed: 0.03 }, proc: P("shield", "onHurt", 13, 0.15, "She'll Be Right", "Taking damage grants a 15% HP shield", 4) },
  { id: "u_a5", name: "Drop Bear Talisman", jp: "落熊の護符", base: "talisman", variant: "blood", tier: 2, chars: ["andy"],
    flavour: "They're real. He's seen one. Nobody believes him.",
    mods: { armor: 0.5 }, proc: P("thornBurst", "onHurt", 6, 40, "Ambush Back", "Retaliate with a spike of damage") },
  { id: "u_a6", name: "Tinnie Flask", jp: "缶の水筒", base: "flask", variant: "gold", tier: 2, chars: ["andy"],
    flavour: "Medicinal. Allegedly.",
    mods: { regen: 0.06 }, proc: P("heal", "lowHp", 18, 0.14, "Liquid Courage", "Heals 14% when badly hurt") },
  { id: "u_a7", name: "Dingo Tracker Boots", jp: "追跡の靴", base: "sneakers", variant: "thunder", tier: 2, chars: ["andy"],
    flavour: "Tread pattern copied from something fast.",
    mods: { moveSpeed: 0.04 }, proc: P("hasteSurge", "onDash", 7, 0.3, "On The Hunt", "Dashing grants +30% attack speed", 4) },
  { id: "u_a8", name: "Boomerang Charm", jp: "回帰の護符", base: "charm", variant: "neon", tier: 2, chars: ["andy"],
    flavour: "It comes back. It always comes back.",
    mods: { projSpeed: 0.04 }, proc: P("chainBolt", "onKill", 4, 0.5, "Ricochet Soul", "Kills arc energy to nearby foes") },
  { id: "u_a9", name: "The Long Shot", jp: "遠矢", base: "spear", variant: "thunder", tier: 3, chars: ["andy"],
    flavour: "Fired in 2011. Still travelling, he reckons.",
    mods: { projSpeed: 0.08, damage: 0.04 }, proc: P("empower", "cooldown", 10, 2.4, "Perfect Draw", "Next 3 shots deal 240% damage", 6) },
  { id: "u_a10", name: "Pack Leader's Horn", jp: "群れの角笛", base: "idol", variant: "flame", tier: 3, chars: ["andy"],
    flavour: "Blown once. Six dogs arrived. He kept them all.",
    mods: { damage: 0.04 }, proc: P("summon", "cooldown", 15, 3, "The Whole Pack", "Summons 3 strays at once", 10) },
  { id: "u_a11", name: "Southern Cross Pendant", jp: "南十字", base: "pendant", variant: "ice", tier: 3, chars: ["andy"],
    flavour: "Points home. He's not going.",
    mods: { crit: 0.03 }, proc: P("novaIce", "cooldown", 9, 1.2, "Cold Front", "Freezing blast every 9s") },
  { id: "u_a12", name: "Vest of Grim Acceptance", jp: "諦観の胴着", base: "vest", variant: "shadow", tier: 3, chars: ["andy"],
    flavour: "Worst case, you die. He's made peace with it.",
    mods: { armor: 1.0, maxHp: 6 }, proc: P("shield", "cooldown", 11, 0.2, "Inevitable", "Periodic 20% HP shield", 6) },
  { id: "u_a13", name: "Sunburnt Sigil", jp: "灼熱の印", base: "sigil", variant: "flame", tier: 3, chars: ["andy"],
    flavour: "Factor 50 does nothing against this.",
    mods: { area: 0.05 }, proc: P("novaFire", "onCrit", 5, 1.1, "Scorcher", "Crits detonate in flame") },
  { id: "u_a14", name: "Billabong Wraps", jp: "水辺の包帯", base: "wraps", variant: "jade", tier: 3, chars: ["andy"],
    flavour: "Damp. Always damp.",
    mods: { lifesteal: 0.01, haste: 0.03 }, proc: P("heal", "onKill", 4, 0.03, "Steady Drip", "Kills restore a little health") },
  { id: "u_a15", name: "The Last Tinnie", jp: "最後の一缶", base: "amulet", variant: "gold", tier: 3, chars: ["andy"],
    flavour: "Saved for an occasion. This is it.",
    mods: { maxHp: 8 }, proc: P("revive", "always", 0, 1, "Not Today", "Survive a fatal blow once per run") },

  // ======================= JOE — gunplay =======================
  { id: "u_j1", name: "144Hz Headset", jp: "高速ヘッドセット", base: "goggles", variant: "thunder", tier: 2, chars: ["joe"],
    flavour: "Input lag is a lifestyle disease.",
    mods: { haste: 0.04 }, proc: P("hasteSurge", "cooldown", 9, 0.4, "Overclock", "+40% attack speed for 4s", 4) },
  { id: "u_j2", name: "Ammo Crate Pack", jp: "弾薬箱", base: "backpack", variant: "flame", tier: 2, chars: ["joe"],
    flavour: "Respawns every ninety seconds. Somehow.",
    mods: { amount: 0.04 }, proc: P("volley", "cooldown", 5, 8, "Mag Dump", "Sprays 8 rounds outward every 5s") },
  { id: "u_j3", name: "Juggernaut Plating", jp: "重装甲", base: "armor", variant: "ice", tier: 2, chars: ["joe"],
    flavour: "Slow. Extremely annoying to fight.",
    mods: { armor: 1.1 }, proc: P("shield", "onHurt", 10, 0.2, "Plate Carrier", "Damage grants a 20% HP shield", 5) },
  { id: "u_j4", name: "Killstreak Badge", jp: "連続撃破章", base: "badge", variant: "gold", tier: 2, chars: ["joe"],
    flavour: "Three more and you get the good one.",
    mods: { coinGain: 0.04 }, proc: P("summon", "onKill", 11, 1, "Support Drop", "Kills can call in a sentry", 9) },
  { id: "u_j5", name: "Tac Stim Flask", jp: "戦術刺激剤", base: "flask", variant: "blood", tier: 2, chars: ["joe"],
    flavour: "Field-tested. Not field-approved.",
    mods: { regen: 0.05 }, proc: P("heal", "lowHp", 16, 0.16, "Stim Shot", "Auto-injects when critically hurt") },
  { id: "u_j6", name: "Flashbang Charm", jp: "閃光の護符", base: "charm", variant: "neon", tier: 2, chars: ["joe"],
    flavour: "Mostly blinds you. Worth it.",
    mods: { luck: 0.02 }, proc: P("slowField", "onHurt", 8, 130, "Flash Out", "Blinds and slows nearby foes", 3) },
  { id: "u_j7", name: "Recoil Compensator", jp: "反動抑制", base: "bracer", variant: "shadow", tier: 2, chars: ["joe"],
    flavour: "Turns a spray into a laser.",
    mods: { crit: 0.02, projSpeed: 0.04 }, proc: P("empower", "cooldown", 10, 1.7, "Laser Beam", "Next shots deal 170% damage", 5) },
  { id: "u_j8", name: "Sprint Cleats", jp: "疾走スパイク", base: "cleats", variant: "jade", tier: 2, chars: ["joe"],
    flavour: "Slide-cancelling is a legitimate movement tech.",
    mods: { moveSpeed: 0.04 }, proc: P("novaWind", "onDash", 6, 0.9, "Slide Cancel", "Dashing blasts foes away") },
  { id: "u_j9", name: "Orbital Uplink", jp: "軌道通信", base: "orb", variant: "thunder", tier: 3, chars: ["joe"],
    flavour: "Calls something down. Don't ask what.",
    mods: { damage: 0.05 }, proc: P("novaShock", "cooldown", 8, 1.4, "Danger Close", "Calls a lightning strike every 8s") },
  { id: "u_j10", name: "Drone Swarm Module", jp: "群体ドローン", base: "sigil", variant: "ice", tier: 3, chars: ["joe"],
    flavour: "Each one has a name. He regrets naming them.",
    mods: { area: 0.04 }, proc: P("summon", "cooldown", 12, 2, "Swarm Deploy", "Deploys 2 sentries every 12s", 11) },
  { id: "u_j11", name: "Aimbot Visor", jp: "照準装置", base: "visor", variant: "neon", tier: 3, chars: ["joe"],
    flavour: "Totally legitimate. Definitely not banned.",
    mods: { crit: 0.05, critDmg: 0.03 }, proc: P("chainBolt", "onCrit", 2.5, 0.7, "Headshot Chain", "Crits arc to nearby heads") },
  { id: "u_j12", name: "Last Stand Plates", jp: "最終防衛", base: "vest", variant: "blood", tier: 3, chars: ["joe"],
    flavour: "Downed, not out.",
    mods: { armor: 1.0, maxHp: 8 }, proc: P("revive", "always", 0, 1, "Self Revive", "Survive a fatal blow once per run") },
  { id: "u_j13", name: "Nuke Killstreak", jp: "戦術核", base: "idol", variant: "flame", tier: 3, chars: ["joe"],
    flavour: "Thirty kills. He's counting.",
    mods: { damage: 0.05 }, proc: P("novaFire", "cooldown", 14, 2.6, "Tactical Nuke", "Massive detonation every 14s") },
  { id: "u_j14", name: "Loot Goblin Mitts", jp: "物欲の手袋", base: "mitts", variant: "gold", tier: 3, chars: ["joe"],
    flavour: "He will cross a minefield for a crate.",
    mods: { magnet: 0.06, coinGain: 0.04 }, proc: P("magnetPulse", "cooldown", 9, 1, "Loot Vacuum", "Pulls all loot every 9s") },
  { id: "u_j15", name: "Main Character Syndrome", jp: "主人公病", base: "cape", variant: "gold", tier: 3, chars: ["joe"],
    flavour: "The lobby exists to witness him.",
    mods: { damage: 0.04, moveSpeed: 0.03 }, proc: P("empower", "lowHp", 15, 2.3, "Clutch Up", "Below 35% HP, attacks hit for 230%", 7) },

  // ======================= AIDAN — butchery =======================
  { id: "u_d1", name: "Bloodied Apron", jp: "血染めの前掛け", base: "apron", variant: "blood", tier: 2, chars: ["aidan"],
    flavour: "That's not all his.",
    mods: { lifesteal: 0.008 }, proc: P("heal", "onKill", 3, 0.025, "Fresh Cut", "Kills restore a little health") },
  { id: "u_d2", name: "Boning Knife Charm", jp: "骨抜き包丁", base: "dagger", variant: "shadow", tier: 2, chars: ["aidan"],
    flavour: "Precision work. Grim, precise work.",
    mods: { crit: 0.03 }, proc: P("mark", "onCrit", 4, 0.3, "Weak Point", "Crits mark foes for +30% damage", 5) },
  { id: "u_d3", name: "Cold Room Key", jp: "冷蔵庫の鍵", base: "charm", variant: "ice", tier: 2, chars: ["aidan"],
    flavour: "Hangs by the door. Always cold to the touch.",
    mods: { armor: 0.4 }, proc: P("slowField", "cooldown", 8, 110, "Cold Storage", "Freezing aura pulse every 8s", 3) },
  { id: "u_d4", name: "Butcher's Gumboots", jp: "白長靴", base: "gumboots", variant: "jade", tier: 2, chars: ["aidan"],
    flavour: "Spotless. He is very particular about this.",
    mods: { moveSpeed: 0.03, armor: 0.4 }, proc: P("shield", "onHurt", 11, 0.16, "Steady Footing", "Damage grants a 16% HP shield", 4) },
  { id: "u_d5", name: "Tenderiser Charm", jp: "肉叩きの印", base: "hammer", variant: "flame", tier: 2, chars: ["aidan"],
    flavour: "For when the cut needs persuading.",
    mods: { damage: 0.04 }, proc: P("novaFire", "cooldown", 9, 1.1, "Pound Out", "Fiery shockwave every 9s") },
  { id: "u_d6", name: "Sharpening Steel", jp: "研ぎ棒", base: "scabbard", variant: "thunder", tier: 2, chars: ["aidan"],
    flavour: "The sound alone clears a queue.",
    mods: { haste: 0.03 }, proc: P("empower", "cooldown", 10, 1.8, "Honed", "Next 3 swings deal 180% damage", 6) },
  { id: "u_d7", name: "Meat Hook Pendant", jp: "肉鉤の首飾り", base: "pendant", variant: "worn", tier: 2, chars: ["aidan"],
    flavour: "Worn as jewellery. Used as a tool.",
    mods: { damage: 0.03 }, proc: P("thornBurst", "onHurt", 5, 45, "Hooked", "Attackers get torn right back") },
  { id: "u_d8", name: "Trade Secret Scroll", jp: "秘伝の書", base: "scroll", variant: "gold", tier: 2, chars: ["aidan"],
    flavour: "Mostly it says 'keep the blade sharp'.",
    mods: { xpGain: 0.03 }, proc: P("magnetPulse", "cooldown", 11, 1, "Clean Up", "Sweeps in all loot every 11s") },
  { id: "u_d9", name: "The Carving Blade", jp: "解体の刃", base: "sword", variant: "blood", tier: 3, chars: ["aidan"],
    flavour: "Passed down. Never once re-handled.",
    mods: { damage: 0.06, crit: 0.03 }, proc: P("empower", "onKill", 7, 2.2, "Carving Rhythm", "Kills empower your next swings", 5) },
  { id: "u_d10", name: "Abattoir Crown", jp: "屠殺王の冠", base: "crown", variant: "blood", tier: 3, chars: ["aidan"],
    flavour: "Nobody gave it to him. He simply wears it.",
    mods: { damage: 0.05 }, proc: P("novaVoid", "onKill", 5, 1.2, "Butchery", "Kills implode the space around them") },
  { id: "u_d11", name: "Grinder's Orbit", jp: "挽肉の輪", base: "ring", variant: "flame", tier: 3, chars: ["aidan"],
    flavour: "Spins constantly. Smells faintly of iron.",
    mods: { area: 0.04 }, proc: P("orbit", "cooldown", 11, 4, "Mincer", "Spins up 4 orbital blades", 7) },
  { id: "u_d12", name: "Hide of the Prime Cut", jp: "極上の皮", base: "jacket", variant: "jade", tier: 3, chars: ["aidan"],
    flavour: "Tanned himself. Of course he did.",
    mods: { armor: 1.1, maxHp: 8 }, proc: P("shield", "cooldown", 10, 0.22, "Thick Hide", "Periodic 22% HP shield", 6) },
  { id: "u_d13", name: "Cleaver of Nine Cuts", jp: "九断の包丁", base: "katana", variant: "thunder", tier: 3, chars: ["aidan"],
    flavour: "Nine strokes. Any animal, any size.",
    mods: { crit: 0.04, haste: 0.03 }, proc: P("chainBolt", "onCrit", 3, 0.7, "Through The Line", "Crits cut through to others") },
  { id: "u_d14", name: "Blood Price Sigil", jp: "血の代償", base: "sigil", variant: "blood", tier: 3, chars: ["aidan"],
    flavour: "Everything costs. This just makes the price visible.",
    mods: { lifesteal: 0.012 }, proc: P("empower", "lowHp", 14, 2.4, "Desperation", "Below 35% HP, swings hit for 240%", 7) },
  { id: "u_d15", name: "Master Butcher's Belt", jp: "肉屋の免許皆伝", base: "belt", variant: "gold", tier: 3, chars: ["aidan"],
    flavour: "Thirty years. One missing finger. Worth it.",
    mods: { maxHp: 8, damage: 0.04 }, proc: P("revive", "always", 0, 1, "One More Shift", "Survive a fatal blow once per run") },

  // ======================= KARL — martial arts =======================
  { id: "u_k1", name: "Black Belt, Frayed", jp: "擦切れた黒帯", base: "belt", variant: "shadow", tier: 2, chars: ["karl"],
    flavour: "Worn white at the edges. That's the point.",
    mods: { damage: 0.04 }, proc: P("empower", "onKill", 6, 1.9, "Flow State", "Kills empower your next strikes", 5) },
  { id: "u_k2", name: "Iron Palm Wraps", jp: "鉄砂掌", base: "wraps", variant: "flame", tier: 2, chars: ["karl"],
    flavour: "Conditioned against a bucket of gravel. Daily.",
    mods: { haste: 0.03 }, proc: P("novaFire", "onCrit", 5, 1.0, "Burning Palm", "Crits erupt in flame") },
  { id: "u_k3", name: "Sensei's Headband", jp: "師範の鉢巻", base: "headband", variant: "gold", tier: 2, chars: ["karl"],
    flavour: "Given, not earned. That bothers him.",
    mods: { armor: 0.5 }, proc: P("hasteSurge", "cooldown", 9, 0.35, "Kiai", "+35% attack speed for 4s", 4) },
  { id: "u_k4", name: "Stone Breaking Gauntlets", jp: "瓦割りの籠手", base: "gauntlets", variant: "worn", tier: 2, chars: ["karl"],
    flavour: "Eleven tiles. The record stands.",
    mods: { damage: 0.04, armor: 0.4 }, proc: P("thornBurst", "onHurt", 5, 50, "Iron Body", "Attackers break against you") },
  { id: "u_k5", name: "Meditation Beads", jp: "数珠", base: "necklace", variant: "jade", tier: 2, chars: ["karl"],
    flavour: "One bead per year of training. It's a long string.",
    mods: { regen: 0.05 }, proc: P("heal", "cooldown", 13, 0.09, "Inner Calm", "Restores 9% HP every 13s") },
  { id: "u_k6", name: "Tabi of the Silent Step", jp: "無音の足袋", base: "tabi", variant: "shadow", tier: 2, chars: ["karl"],
    flavour: "You will not hear him coming.",
    mods: { moveSpeed: 0.04 }, proc: P("novaWind", "onDash", 6, 1.0, "Wind Step", "Dashing blasts foes aside") },
  { id: "u_k7", name: "Dojo Floor Splinter", jp: "道場の破片", base: "charm", variant: "worn", tier: 2, chars: ["karl"],
    flavour: "From the board he first broke. He kept it.",
    mods: { luck: 0.02 }, proc: P("shield", "onHurt", 12, 0.17, "Root Stance", "Damage grants a 17% HP shield", 5) },
  { id: "u_k8", name: "Chi Focus Orb", jp: "気の珠", base: "orb", variant: "ice", tier: 2, chars: ["karl"],
    flavour: "Cold until he holds it. Then it isn't.",
    mods: { area: 0.04 }, proc: P("novaIce", "cooldown", 9, 1.1, "Freezing Palm", "Icy shockwave every 9s") },
  { id: "u_k9", name: "Thunder Fist Bracers", jp: "雷拳の腕輪", base: "bracer", variant: "thunder", tier: 3, chars: ["karl"],
    flavour: "The crack arrives before the fist does.",
    mods: { damage: 0.05, haste: 0.03 }, proc: P("chainBolt", "onCrit", 2.5, 0.8, "Thunderclap", "Crits arc through the crowd") },
  { id: "u_k10", name: "Hundred Palm Ring", jp: "百手の輪", base: "ring", variant: "neon", tier: 3, chars: ["karl"],
    flavour: "They move on their own now. He's stopped questioning it.",
    mods: { area: 0.05 }, proc: P("orbit", "cooldown", 11, 4, "Phantom Fists", "Spins up 4 orbital fists", 7) },
  { id: "u_k11", name: "Gi of the Unmoved", jp: "不動の道着", base: "gi", variant: "jade", tier: 3, chars: ["karl"],
    flavour: "Washed a thousand times. Never once torn.",
    mods: { armor: 1.2, maxHp: 8 }, proc: P("shield", "cooldown", 10, 0.22, "Mountain Stance", "Periodic 22% HP shield", 6) },
  { id: "u_k12", name: "Master's Final Lesson", jp: "最後の教え", base: "scroll", variant: "gold", tier: 3, chars: ["karl"],
    flavour: "It is one sentence long. He still doesn't understand it.",
    mods: { xpGain: 0.04 }, proc: P("empower", "lowHp", 14, 2.4, "No Mind", "Below 35% HP, strikes hit for 240%", 7) },
  { id: "u_k13", name: "Spirit Tiger Sigil", jp: "虎の印", base: "sigil", variant: "flame", tier: 3, chars: ["karl"],
    flavour: "Tattooed, then it moved.",
    mods: { damage: 0.05 }, proc: P("summon", "cooldown", 13, 1, "Spirit Beast", "Summons a spirit ally every 13s", 11) },
  { id: "u_k14", name: "Void Monk's Pendant", jp: "虚無僧の首飾り", base: "pendant", variant: "shadow", tier: 3, chars: ["karl"],
    flavour: "He meditated on nothing and nothing answered.",
    mods: { crit: 0.04 }, proc: P("novaVoid", "onKill", 6, 1.2, "Empty Hand", "Kills collapse the air around them") },
  { id: "u_k15", name: "The Thousandth Strike", jp: "千本目", base: "idol", variant: "gold", tier: 3, chars: ["karl"],
    flavour: "Nine hundred and ninety-nine were practice.",
    mods: { damage: 0.06 }, proc: P("revive", "always", 0, 1, "Still Standing", "Survive a fatal blow once per run") },
];

export const UNIQUE_BY_ID: Record<string, UniqueDef> = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
export function uniquesFor(ch: string) { return UNIQUES.filter((u) => u.chars.includes(ch as CharBody)); }

/** Gear quality. Drop odds are fixed: 40% / 30% / 20% / 10%. */
export const ITEM_TIERS = [
  { name: "Normal", jp: "並", mult: 1.0, chance: 0.40, rarity: 0 as const, effects: 0 },
  { name: "Rare", jp: "希少", mult: 2.0, chance: 0.30, rarity: 1 as const, effects: 0 },
  { name: "Epic", jp: "極上", mult: 3.5, chance: 0.20, rarity: 2 as const, effects: 1 },
  { name: "Legendary", jp: "伝説", mult: 5.5, chance: 0.10, rarity: 3 as const, effects: 1 },
];
export const ELEMENTAL_VARIANTS = ["ice", "flame", "thunder", "shadow", "jade", "gold", "blood", "neon"];
export const MAX_ITEM_LEVEL = 5;
/** Each item level adds this fraction of the base stats (so Lv5 = 1.8x). */
export const ITEM_LEVEL_STEP = 0.2;

const EFFECT_POOL: ItemEffect[] = [
  "thorns", "bloom", "dodge", "firetrail", "frostaura", "critchain",
  "coinburst", "guardian", "swift", "greed", "scholar", "berserk",
];

/** 40 / 30 / 20 / 10 weighted roll, nudged slightly by luck. */
export function rollItemTier(_playerLevel: number, luck = 0) {
  const r = Math.random() - Math.min(0.18, luck * 0.4);
  let acc = 0;
  for (let i = ITEM_TIERS.length - 1; i >= 0; i--) {
    acc += ITEM_TIERS[i].chance;
    if (r > 1 - acc) return i;
  }
  return 0;
}
export function rollItemVariant(tier: number) {
  if (tier === 0) return Math.random() < 0.5 ? "plain" : "worn";
  return ELEMENTAL_VARIANTS[Math.floor(Math.random() * ELEMENTAL_VARIANTS.length)];
}
export function rollItemEffect(tier: number): ItemEffect {
  if (!ITEM_TIERS[tier].effects) return "none";
  return EFFECT_POOL[Math.floor(Math.random() * EFFECT_POOL.length)];
}

// ===================== WAIFUS =====================
/** How a companion fights in melee when enemies crowd her. */
export type MeleeStyle = "none" | "slash" | "spin" | "punch" | "kick" | "claw" | "staff";
/** A big ability she casts on her own cooldown. */
export type CastKind =
  | "heal" | "shield" | "haste" | "rally" | "freeze" | "meteor"
  | "turrets" | "revive" | "blackhole" | "dragon" | "clone" | "lightning";

export interface WaifuDef {
  id: string; name: string; jp: string; tier: 1 | 2 | 3 | 4; maxLevel: number;
  title: string; blurb: string; hue: number; icon: string;
  ability: string;   // readable summary of her main weapon
  behavior: Behavior; element: Element; color: string;
  cd: number; dmg: number; count: number; speed: number; radius: number;
  buff: StatMods;    // per waifu-level

  /** Secondary sidearm she fires independently of her main attack. */
  sidearm?: { name: string; behavior: Behavior; element: Element; cd: number; dmg: number; count: number; speed: number; color: string };
  /** Close-range melee she uses when enemies get near her. */
  melee?: { style: MeleeStyle; name: string; cd: number; dmg: number; range: number; arc: number; knock: number };
  /** Signature cast on a long cooldown. */
  cast?: { kind: CastKind; name: string; jp: string; cd: number; desc: string };

  /** Passive aura she maintains automatically — no coins, no clicking. */
  aura: { name: string; jp: string; every: number; desc: string };
}

export const WAIFUS: WaifuDef[] = [
  // ================= Tier 1 (unlock @25, max Lv4) =================
  { id: "yuki", name: "Yuki", jp: "ユキ", tier: 1, maxLevel: 4, title: "Ice Nurse", hue: 195, icon: "🧊",
    blurb: "Clinic student with a cooler full of ice packs. Keeps you alive and keeps them slow.",
    ability: "Frost Nova — chills and damages everything around her", behavior: "nova", element: "ice", color: "#8fe6ff",
    cd: 4.2, dmg: 18, count: 1, speed: 360, radius: 120, buff: { regen: 0.8, maxHp: 20, armor: 1 },
    sidearm: { name: "Syringe Darts", behavior: "serve", element: "ice", cd: 1.4, dmg: 12, count: 1, speed: 620, color: "#b8f1ff" },
    melee: { style: "punch", name: "Clipboard Smack", cd: 1.1, dmg: 22, range: 60, arc: 1.5, knock: 220 },
    cast: { kind: "heal", name: "Emergency Triage", jp: "応急処置", cd: 18, desc: "Heals you 25% and cleanses the chill off herself" },
    aura: { name: "Field Triage", jp: "応急手当", every: 8, desc: "Heals you for 7% max HP" } },

  { id: "hina", name: "Hina", jp: "ヒナ", tier: 1, maxLevel: 4, title: "Underground Idol", hue: 330, icon: "🎤",
    blurb: "Chiba's #3 idol. Her encore fires heart-seeking mic missiles.",
    ability: "Encore Missiles — homing hearts that burst", behavior: "homing", element: "none", color: "#ff7fc8",
    cd: 2.4, dmg: 20, count: 2, speed: 330, radius: 8, buff: { haste: 0.1, xpGain: 0.1 },
    sidearm: { name: "Glowstick Volley", behavior: "spread", element: "none", cd: 1.8, dmg: 10, count: 3, speed: 520, color: "#ffb8e0" },
    melee: { style: "kick", name: "Idol Dropkick", cd: 1.3, dmg: 26, range: 62, arc: 1.2, knock: 320 },
    cast: { kind: "haste", name: "Live Encore!", jp: "アンコール", cd: 22, desc: "+45% attack speed for 6s" },
    aura: { name: "Encore Chorus", jp: "合唱", every: 10, desc: "+25% damage for 5s" } },

  { id: "rei", name: "Rei", jp: "レイ", tier: 1, maxLevel: 4, title: "Yakuza Defector", hue: 10, icon: "🗡️",
    blurb: "Left the Kuro-Tora with their best tanto and a grudge.",
    ability: "Tanto Spin — whirling blades orbit her", behavior: "orbit", element: "none", color: "#ff6b6b",
    cd: 0.3, dmg: 14, count: 2, speed: 2.6, radius: 76, buff: { armor: 3, damage: 0.08 },
    sidearm: { name: "Thrown Knives", behavior: "spread", element: "none", cd: 1.5, dmg: 14, count: 2, speed: 700, color: "#ffd0d0" },
    melee: { style: "slash", name: "Tanto Slash", cd: 0.75, dmg: 34, range: 74, arc: 1.9, knock: 260 },
    cast: { kind: "rally", name: "Oyabun's Mark", jp: "親分の印", cd: 20, desc: "Marks nearby foes — they take +30% damage for 6s" },
    aura: { name: "Oyabun\u2019s Mark", jp: "親分の印", every: 9, desc: "Marks nearby foes for +30% damage" } },

  // ================= Tier 2 (unlock @50, max Lv3) =================
  { id: "sakura", name: "Sakura", jp: "サクラ", tier: 2, maxLevel: 3, title: "Storm Miko", hue: 50, icon: "⛩️",
    blurb: "Shrine maiden who calls down judgement from the Chiba sky.",
    ability: "Kaminari — chain lightning strikes the mob", behavior: "chain", element: "shock", color: "#ffe14d",
    cd: 2.2, dmg: 38, count: 2, speed: 0, radius: 0, buff: { crit: 0.08, critDmg: 0.3, damage: 0.08 },
    sidearm: { name: "Ofuda Talismans", behavior: "homing", element: "shock", cd: 2.0, dmg: 22, count: 2, speed: 380, color: "#fff6c4" },
    melee: { style: "staff", name: "Gohei Sweep", cd: 1.0, dmg: 38, range: 86, arc: 2.4, knock: 300 },
    cast: { kind: "lightning", name: "Raijin Descends", jp: "雷神降臨", cd: 16, desc: "Calls 8 lightning bolts onto the crowd" },
    aura: { name: "Shrine Blessing", jp: "御加護", every: 11, desc: "Grants a shield worth 14% max HP" } },

  { id: "mio", name: "Mio", jp: "ミオ", tier: 2, maxLevel: 3, title: "Mecha Pilot", hue: 210, icon: "🤖",
    blurb: "Pilots a 2-meter exo-frame she built in shop class.",
    ability: "Missile Barrage from the exo-frame", behavior: "meteor", element: "fire", color: "#7fb4ff",
    cd: 3.0, dmg: 46, count: 2, speed: 0, radius: 86, buff: { armor: 5, maxHp: 40 },
    sidearm: { name: "Shoulder Vulcan", behavior: "serve", element: "none", cd: 0.5, dmg: 11, count: 1, speed: 780, color: "#bcd8ff" },
    melee: { style: "punch", name: "Piston Punch", cd: 1.2, dmg: 52, range: 70, arc: 1.3, knock: 520 },
    cast: { kind: "shield", name: "Deploy Barrier", jp: "障壁展開", cd: 24, desc: "Projects a 5s shield that absorbs all damage" },
    aura: { name: "Plate Rebuild", jp: "装甲再build", every: 10, desc: "+6 armor for 6s" } },

  { id: "aoi", name: "Aoi", jp: "アオイ", tier: 2, maxLevel: 3, title: "Sushi Assassin", hue: 150, icon: "🍣",
    blurb: "Knife work so clean the gangsters don't notice until they're plated.",
    ability: "Knife Fan — piercing blades + lifesteal", behavior: "spread", element: "none", color: "#8ef5c0",
    cd: 1.3, dmg: 24, count: 4, speed: 640, radius: 7, buff: { lifesteal: 0.08, haste: 0.1 },
    sidearm: { name: "Skewer Shot", behavior: "serve", element: "none", cd: 0.9, dmg: 18, count: 1, speed: 820, color: "#d8ffe9" },
    melee: { style: "slash", name: "Filleting Combo", cd: 0.6, dmg: 30, range: 70, arc: 2.2, knock: 180 },
    cast: { kind: "clone", name: "Shadow Service", jp: "影の給仕", cd: 26, desc: "Splits into 2 shadow clones that fight for 8s" },
    aura: { name: "Whetstone", jp: "砥石", every: 9, desc: "+30% crit damage for 6s" } },

  // ================= Tier 3 (unlock @75, max Lv2) =================
  { id: "kaede", name: "Kaede", jp: "カエデ", tier: 3, maxLevel: 2, title: "Kitsune Sage", hue: 25, icon: "🦊",
    blurb: "Nine tails, nine ways to set a street on fire.",
    ability: "Foxfire Orbs — burning orbs circle her", behavior: "orbit", element: "fire", color: "#ffa45c",
    cd: 0.26, dmg: 42, count: 4, speed: 1.9, radius: 140, buff: { area: 0.2, damage: 0.15 },
    sidearm: { name: "Will-o-Wisp", behavior: "homing", element: "fire", cd: 1.6, dmg: 30, count: 3, speed: 360, color: "#ffd09a" },
    melee: { style: "claw", name: "Nine-Tail Rake", cd: 0.7, dmg: 58, range: 88, arc: 2.6, knock: 340 },
    cast: { kind: "meteor", name: "Foxfire Rain", jp: "狐火の雨", cd: 15, desc: "Rains 10 foxfire blasts across the street" },
    aura: { name: "Foxfire Ward", jp: "狐火の守", every: 8, desc: "Ignites everything close to you" } },

  { id: "nanami", name: "Nanami", jp: "ナナミ", tier: 3, maxLevel: 2, title: "Oni Slayer", hue: 280, icon: "🔱",
    blurb: "Carries a club bigger than she is. Hits exactly as hard as that implies.",
    ability: "Oni Quake — huge shockwaves", behavior: "nova", element: "none", color: "#c08bff",
    cd: 2.8, dmg: 90, count: 2, speed: 520, radius: 190, buff: { damage: 0.2, armor: 4 },
    sidearm: { name: "Hurled Boulder", behavior: "serve", element: "none", cd: 2.2, dmg: 60, count: 1, speed: 440, color: "#d7c0ff" },
    melee: { style: "spin", name: "Kanabo Whirl", cd: 1.0, dmg: 86, range: 108, arc: 6.3, knock: 620 },
    cast: { kind: "freeze", name: "Demon's Glare", jp: "鬼の睨み", cd: 20, desc: "Petrifies every enemy on screen for 3s" },
    aura: { name: "War Drum", jp: "陣太鼓", every: 10, desc: "+35% damage for 6s" } },

  { id: "chiyo", name: "Chiyo", jp: "チヨ", tier: 3, maxLevel: 2, title: "Netrunner", hue: 170, icon: "💻",
    blurb: "Hijacks every vending machine on the block to fight for you.",
    ability: "Drone Swarm — autonomous turrets", behavior: "turret", element: "shock", color: "#6ff5e8",
    cd: 4.5, dmg: 26, count: 2, speed: 700, radius: 10, buff: { cdr: -0.18, haste: 0.12, magnet: 0.3 },
    sidearm: { name: "Taser Rounds", behavior: "chain", element: "shock", cd: 2.4, dmg: 28, count: 1, speed: 0, color: "#9ffff2" },
    melee: { style: "kick", name: "Stun Baton", cd: 1.0, dmg: 40, range: 66, arc: 1.6, knock: 300 },
    cast: { kind: "turrets", name: "Full Deployment", jp: "総展開", cd: 22, desc: "Drops 5 turrets around you at once" },
    aura: { name: "Systems Boost", jp: "系統強化", every: 8, desc: "+35% attack speed for 5s" } },

  // ================= Tier 4 (unlock @100, max Lv1) =================
  { id: "momo", name: "Momo", jp: "モモ", tier: 4, maxLevel: 1, title: "Peach Goddess", hue: 335, icon: "🌸",
    blurb: "An actual kami who got bored of her shrine. Reality bends politely around her.",
    ability: "Divine Singularity — collapses the street", behavior: "blackhole", element: "void", color: "#ff8fd0",
    cd: 5.0, dmg: 70, count: 1, speed: 0, radius: 240, buff: { damage: 0.3, regen: 2, revives: 1 },
    sidearm: { name: "Petal Storm", behavior: "spread", element: "void", cd: 1.1, dmg: 40, count: 5, speed: 560, color: "#ffc4e6" },
    melee: { style: "spin", name: "Divine Sweep", cd: 0.8, dmg: 110, range: 120, arc: 6.3, knock: 520 },
    cast: { kind: "revive", name: "Blessing of Peaches", jp: "桃の加護", cd: 40, desc: "Fully heals you and grants 4s of invulnerability" },
    aura: { name: "Divine Favour", jp: "神の恵み", every: 7, desc: "Heals 10% and cleanses you" } },

  { id: "ayaka", name: "Ayaka", jp: "アヤカ", tier: 4, maxLevel: 1, title: "Dragon of Tokyo Bay", hue: 15, icon: "🐉",
    blurb: "She was the bay. Now she's annoyed and wearing a tracksuit.",
    ability: "Dragon Breath — an endless sweeping beam", behavior: "beam", element: "fire", color: "#ff5a2f",
    cd: 1.9, dmg: 120, count: 2, speed: 0, radius: 24, buff: { damage: 0.35, area: 0.2 },
    sidearm: { name: "Ember Spit", behavior: "serve", element: "fire", cd: 0.55, dmg: 46, count: 2, speed: 700, color: "#ffb07a" },
    melee: { style: "claw", name: "Dragon Claw", cd: 0.7, dmg: 125, range: 112, arc: 2.8, knock: 600 },
    cast: { kind: "dragon", name: "Bay Devastation", jp: "湾の破壊", cd: 26, desc: "Unleashes a massive sweeping breath across the screen" },
    aura: { name: "Dragon\u2019s Heat", jp: "龍の熱", every: 8, desc: "+40% damage for 6s" } },

  { id: "rin", name: "Rin", jp: "リン", tier: 4, maxLevel: 1, title: "Void Catgirl", hue: 265, icon: "🐾",
    blurb: "Eight lives spent. The ninth one is very, very angry.",
    ability: "Void Claws — shredding phase strikes", behavior: "shuriken", element: "void", color: "#b07bff",
    cd: 0.7, dmg: 64, count: 4, speed: 760, radius: 11, buff: { crit: 0.2, critDmg: 0.8, moveSpeed: 0.15, lifesteal: 0.12 },
    sidearm: { name: "Rift Bolts", behavior: "homing", element: "void", cd: 1.2, dmg: 54, count: 3, speed: 440, color: "#d2b0ff" },
    melee: { style: "claw", name: "Nine Lives Flurry", cd: 0.4, dmg: 70, range: 92, arc: 3.0, knock: 280 },
    cast: { kind: "blackhole", name: "Devour the Street", jp: "街を喰らう", cd: 24, desc: "Tears open a huge void rift that eats the horde" },
    aura: { name: "Void Step", jp: "虚歩", every: 9, desc: "+25% move speed and a 12% shield" } },
];


/** ============================================================
 *  PARTNER DIALOGUE
 *  Shown at 25 (first recruitment) and 50/75/100, where your current
 *  partner asks you to stay while the newcomers make their pitch.
 *  ============================================================ */
export interface WaifuLines {
  /** Spoken when first offered at the level 25 gate. */
  pitch: string[];
  /** Said by your CURRENT partner when a rival tier appears. */
  loyalty: string[];
  /** Said by a RIVAL trying to poach you at 50/75/100. */
  poach: string[];
}
export const WAIFU_LINES: Record<string, WaifuLines> = {
  yuki: {
    pitch: ["You're bleeding. Sit. No — sit.", "I patch people up for a living. You are going to need that."],
    loyalty: ["Don't you dare. Who else is going to close those wounds?", "I've kept you breathing this far. Let me finish the job."],
    poach: ["That bandage work is appalling. Come here.", "You'll last twice as long with a medic. Simple maths."],
  },
  hina: {
    pitch: ["Ehh, a fighter! Can I come? I'll sing for you!", "Three fans came to my last show. I'm free, basically."],
    loyalty: ["But we're a DUO! You can't break up the duo!", "Who else is going to do your entrance music?"],
    poach: ["You need presence. Spectacle. Me.", "Fighting's just a performance with worse lighting."],
  },
  rei: {
    pitch: ["I left the Kuro-Tora. They'd like a word. So would I.", "You swing like an amateur. I can fix that."],
    loyalty: ["I burned every bridge to stand here. Don't make it pointless.", "You and me. That was the arrangement."],
    poach: ["You're being carried. I'd make you dangerous instead.", "I know how these people fight. I used to be them."],
  },
  sakura: {
    pitch: ["The shrine said to stay. The sky said to follow you.", "I'd like to see what the lightning does to them."],
    loyalty: ["I prayed over every step of this. Don't waste it.", "The storm follows me. It follows you because of me."],
    poach: ["Your current company is... fine. I am weather.", "Let me show you what judgement looks like."],
  },
  mio: {
    pitch: ["Built this frame in shop class. It works. Mostly.", "Two metres of steel says I'm useful."],
    loyalty: ["I rebuilt this thing twice for you. TWICE.", "Who's going to shield you? Her?"],
    poach: ["You take too many hits. I'm armour plating with opinions.", "My barrier has a 94% uptime. Ask anyone."],
  },
  aoi: {
    pitch: ["I do knife work. Clean, quick, nobody notices.", "You're loud. I'm not. We balance."],
    loyalty: ["I've been three steps ahead of you all night. Keep me there.", "Nobody else is watching your back this closely."],
    poach: ["You're swinging where they were. I cut where they'll be.", "Let me handle the ones you don't see."],
  },
  kaede: {
    pitch: ["Nine tails. Nine reasons to say yes.", "I've burned down better streets than this one."],
    loyalty: ["I've walked beside you through fire. Literally.", "Foxes don't share. Choose carefully."],
    poach: ["Your partner is sweet. I am an inferno.", "Come with me and the whole district burns."],
  },
  nanami: {
    pitch: ["This club's bigger than I am. I still swing it.", "Point me at the large one."],
    loyalty: ["I've broken everything you pointed at. Point at more.", "Don't trade me for someone who hits softer."],
    poach: ["Whatever's hitting for you isn't hitting hard enough.", "I solve problems with mass."],
  },
  chiyo: {
    pitch: ["I own every vending machine on this block now.", "Give me a network and I'll give you an army."],
    loyalty: ["I've got drones on every rooftop for you. Don't waste them.", "I rewired half the ward for this partnership."],
    poach: ["You're fighting manually. In this economy?", "Let me automate the boring parts. All of them."],
  },
  momo: {
    pitch: ["I was a shrine goddess. It was dull. This isn't.", "Reality is quite flexible, if you ask nicely."],
    loyalty: ["I bent the world for you once already.", "You won't find another of me. There isn't one."],
    poach: ["Mortal help is sweet. I am not mortal.", "I can simply decide you don't die. Think about it."],
  },
  ayaka: {
    pitch: ["I used to be the bay. Now I'm annoyed and portable.", "Everything burns. I just choose the order."],
    loyalty: ["I gave up an ocean for this. Stay.", "Nothing else you meet tonight is older than me."],
    poach: ["Your partner is capable. I am geological.", "Come with me and nothing stands up again."],
  },
  rin: {
    pitch: ["Eight lives gone. The ninth one's furious.", "I go through things, not around them."],
    loyalty: ["This is my last life. I'm spending it on you.", "Don't make me start the tenth alone."],
    poach: ["You're too slow. I'd fix that.", "The void and I have an understanding. You could too."],
  },
};
export function waifuLines(id: string): WaifuLines {
  return WAIFU_LINES[id] || { pitch: ["…"], loyalty: ["…"], poach: ["…"] };
}

export const WAIFU_BY_ID: Record<string, WaifuDef> = Object.fromEntries(WAIFUS.map((w) => [w.id, w]));
export const WAIFU_GATES = [25, 50, 75, 100];

// ===================== ACTIVE SKILLS (quest rewards) =====================
export interface ActiveDef { id: string; name: string; jp: string; icon: string; desc: string; cd: number }
export const ACTIVES: ActiveDef[] = [
  { id: "dash", name: "Shoe Dash", jp: "ダッシュ", icon: "💨", desc: "Blink forward, briefly invincible.", cd: 3 },
  { id: "heal", name: "Burst Heal", jp: "回復", icon: "💚", desc: "Instantly restore 45% max HP.", cd: 34 },
  { id: "nuke", name: "Serve Storm", jp: "サーブ嵐", icon: "🌪️", desc: "Blast every gangster on screen.", cd: 42 },
  { id: "slow", name: "Bullet Time", jp: "弾丸時間", icon: "⏱️", desc: "Slow all enemies for 5s.", cd: 36 },
  { id: "shield", name: "Iron Guard", jp: "鉄壁", icon: "🛡️", desc: "Absorb all damage for 4s.", cd: 30 },
  { id: "decoy", name: "Gachapon Decoy", jp: "囮", icon: "🎎", desc: "Spawn a decoy that taunts and explodes.", cd: 26 },
];
export const ACTIVE_BY_ID: Record<string, ActiveDef> = Object.fromEntries(ACTIVES.map((a) => [a.id, a]));

// ===================== BOSSES (every 5 levels) =====================
export interface BossDef {
  id: string; name: string; jp: string; title: string; hue: number; shape: "pig" | "demon" | "titan" | "mech" | "kaiju" | "ghost" | "samurai" | "oyabun" | "wyrm" | "priest"
    | "sumo" | "assassin" | "monkboss" | "templelord" | "gangster" | "fatyak" | "yakdragon"
    | "willyclone" | "foxgirl" | "schoolspirit" | "volleygirl" | "coach";
  hp: number; speed: number; dmg: number; radius: number; pattern: "charge" | "ring" | "spiral" | "summon" | "slam" | "laser";
  /** Extra mechanics layered on for the 25/50/75/100 trial fights. */
  mechanics?: TrialMech[];
  /** Two-line intro shown during the milestone cutscene. */
  intro?: [string, string];
  /** Elemental aura applied to the boss's attacks and visuals. */
  element?: Element;
  /** Phase thresholds (fractions of max HP) that trigger a burst + speedup. */
  phases?: number[];
  /** Exact level this boss appears at. */
  level?: number;
  /** Spawn N copies at reduced HP (demi-boss squads). */
  squad?: number;
}

/** Telegraphed, dodgeable set-pieces used by milestone bosses. */
export type TrialMech =
  | "crossbeam"    // rotating cross of lasers
  | "ringwall"     // expanding bullet rings with a safe gap
  | "meteorstorm"  // rain of telegraphed AoE circles
  | "dashcombo"    // triple consecutive charges
  | "shockwave"    // expanding floor waves you must outrun
  | "adds"         // summons elite escorts mid-fight
  | "pillars"      // safe-zone pillars, outside them hurts
  | "homingorbs"   // slow tracking orbs you must kite
  | "enrage"       // speeds up below 35% hp
  | "spinlaser"    // continuous rotating beam
  | "quakegrid"    // checkerboard floor eruptions
  | "iai"          // samurai: instant cross-map slash along a telegraphed line
  | "stormblade"   // samurai: lightning pillars chase your position
  | "cloneslash"   // samurai: afterimages that each slash once
  | "bulletstorm"  // yakuza: sustained dual-MG cone sweep
  | "suppress"     // yakuza: walls of fire you must break line-of-sight from
  | "grenades"     // yakuza: lobbed arcing explosives
  | "flamebreath"  // dragon: sweeping cone of fire
  | "firewall"     // dragon: rotating flame spokes
  | "skyfall"      // dragon: dives off-screen and crashes down
  | "groundpound"  // titan: massive radial slam
  | "fistbarrage"  // titan: alternating left/right fist slams
  | "pillarquake"  // titan: shockwave columns marching outward
  // ---- act 1 / dojo ----
  | "cleavefan"    // samurai: fan of sweeping cleave arcs
  | "blink"        // assassin: teleports behind you then strikes
  | "daggerfan"    // assassin: spray of fast daggers
  | "flurry"       // monk: rapid multi-hit cone combo
  | "kneedive"     // monk: leaping knee with a landing shock
  | "palmcone"     // monk: huge telegraphed palm cone
  // ---- act 2 / streets ----
  | "bellyflop"    // sumo: leaping body slam
  | "shielded"     // tank: temporary damage reduction window
  // ---- act 3 / school ----
  | "servestorm"   // ping pong rival: wall of serves
  | "foxfire"      // fox girl: tracking foxfire orbs
  | "raisedead"    // spirit: summons ghost students
  | "spikeserve"   // volleyball: hard-hit spiked projectiles
  | "elementalpe"   // coach: cycles elemental attacks
  // ---- colosseum gauntlet ----
  | "tidalwave"        // shaman: sweeping walls of water
  | "javelinvolley"    // colossus: dual-wield javelin spears
  | "manticoretriple"  // manticore: 3 fast rings with one safe gap
  | "greatcleave"      // minotaur: enormous telegraphed cleave
  | "imperialwrath"    // emperor: multi-stage signature
  | "sever";           // suppresses the player's lifesteal for a window
/** Every boss, keyed to the exact level it appears at. */
export const BOSS_SCHEDULE: BossDef[] = [
  // ============ ACT 1 — THE SUNKEN DOJO ============
  { id: "sumo", level: 5, name: "Ōzeki Chanko", jp: "大関ちゃんこ", title: "Undefeated, Unbothered",
    hue: 25, shape: "sumo", hp: 1460, speed: 112, dmg: 18, radius: 50, pattern: "charge" },
  { id: "bladeboss", level: 10, name: "Kirimaru", jp: "斬り丸", title: "He Does Not Sheathe",
    hue: 205, shape: "samurai", hp: 10900, speed: 128, dmg: 22, radius: 44, pattern: "ring",
    mechanics: ["cleavefan", "dashcombo"] },
  { id: "shadow", level: 15, name: "Kagerō", jp: "陽炎", title: "Already Behind You",
    hue: 275, shape: "assassin", hp: 15700, speed: 150, dmg: 24, radius: 38, pattern: "spiral",
    mechanics: ["daggerfan", "blink", "cloneslash", "daggerfan", "dashcombo"] },
  { id: "monkboss", level: 20, name: "Hizamaru", jp: "膝丸", title: "Enlightenment Through Violence",
    hue: 40, shape: "monkboss", hp: 20400, speed: 142, dmg: 26, radius: 46, pattern: "charge",
    mechanics: ["flurry", "kneedive", "palmcone"] },
  { id: "templelord", level: 25, name: "Daibutsu Genkai", jp: "大仏源海", title: "The Temple Lord",
    hue: 45, shape: "templelord", hp: 17500, speed: 108, dmg: 32, radius: 92, pattern: "slam",
    mechanics: ["sever", "groundpound", "fistbarrage", "pillarquake", "shockwave", "adds", "enrage"],
    intro: ["「大仏拳」", "The temple stands. So does he. One of you will not."], element: "none", phases: [0.7, 0.4, 0.15] },

  // ============ ACT 2 — STREETS OF CHIBA ============
  { id: "buta", level: 30, name: "Buta-kun", jp: "ブタくん", title: "Pig on a Bike",
    hue: 335, shape: "pig", hp: 29400, speed: 185, dmg: 26, radius: 40, pattern: "charge" },
  { id: "enforcer", level: 35, name: "Teppō Tetsu", jp: "鉄砲鉄", title: "Never Reloads, Somehow",
    hue: 15, shape: "oyabun", hp: 33700, speed: 118, dmg: 28, radius: 46, pattern: "ring",
    mechanics: ["bulletstorm", "grenades"] },
  { id: "trio", level: 40, name: "Sanningumi", jp: "三人組", title: "Three Fools, Nine Knives",
    hue: 300, shape: "gangster", hp: 12700, speed: 150, dmg: 24, radius: 36, pattern: "spiral",
    squad: 3, mechanics: ["daggerfan"] },
  { id: "fatyak", level: 45, name: "Megane Daisuke", jp: "眼鏡の大輔", title: "Bulletproof Belly",
    hue: 210, shape: "fatyak", hp: 42300, speed: 96, dmg: 30, radius: 62, pattern: "slam",
    mechanics: ["bellyflop", "ringwall", "shielded"] },
  { id: "yakdragon", level: 50, name: "Gorou Kuromaki", jp: "黒巻五郎", title: "Dragon of the Kuro-Tora",
    hue: 345, shape: "yakdragon", hp: 130500, speed: 126, dmg: 34, radius: 56, pattern: "ring",
    mechanics: ["sever", "bulletstorm", "grenades", "suppress", "ringwall", "adds", "enrage"],
    intro: ["「皆殺し」", "Two guns. No negotiation. Nothing personal."], element: "none", phases: [0.7, 0.4, 0.15] },

  // ============ ACT 3 — CHIBA HIGH ============
  { id: "willyclone", level: 55, name: "Anime Ichirō", jp: "アニメ一郎", title: "The Other One",
    hue: 210, shape: "willyclone", hp: 50700, speed: 150, dmg: 30, radius: 42, pattern: "spiral",
    mechanics: ["servestorm", "dashcombo"] },
  { id: "foxgirl", level: 60, name: "Sakura-hime", jp: "桜姫", title: "Nine Tails, Zero Chill",
    hue: 330, shape: "foxgirl", hp: 54800, speed: 146, dmg: 32, radius: 48, pattern: "charge",
    mechanics: ["cleavefan", "foxfire", "blink"] },
  { id: "schoolspirit", level: 65, name: "Rōka no Rei", jp: "廊下の霊", title: "Detention Is Eternal",
    hue: 150, shape: "schoolspirit", hp: 58900, speed: 132, dmg: 30, radius: 46, pattern: "summon",
    mechanics: ["raisedead", "homingorbs", "pillars"] },
  { id: "volley", level: 70, name: "Haikyū Shimai", jp: "排球姉妹", title: "Club Activities, Mandatory",
    hue: 190, shape: "volleygirl", hp: 15700, speed: 148, dmg: 28, radius: 36, pattern: "ring",
    squad: 4, mechanics: ["spikeserve"] },
  { id: "coach", level: 75, name: "Gorilla-sensei", jp: "ゴリラ先生", title: "Drop and Give Me Everything",
    hue: 35, shape: "coach", hp: 188000, speed: 112, dmg: 36, radius: 78, pattern: "slam",
    mechanics: ["sever", "bellyflop", "elementalpe", "quakegrid", "meteorstorm", "adds", "enrage"],
    intro: ["「体育の時間」", "Class is in session. Nobody is graduating."], element: "fire", phases: [0.75, 0.5, 0.25] },

  // ============ ACT 4 — THE DOJO ABLAZE ============
  { id: "sumo_f", level: 80, name: "Honō no Ōzeki", jp: "炎の大関", title: "Reborn in the Blaze",
    hue: 15, shape: "sumo", hp: 71000, speed: 128, dmg: 40, radius: 54, pattern: "charge",
    element: "fire", mechanics: ["firewall", "bellyflop"] },
  { id: "blade_f", level: 85, name: "Gōka Kirimaru", jp: "業火斬丸", title: "Sheathing Is For Cowards",
    hue: 20, shape: "samurai", hp: 75000, speed: 148, dmg: 42, radius: 48, pattern: "ring",
    element: "fire", mechanics: ["cleavefan", "iai", "dashcombo", "firewall"] },
  { id: "shadow_f", level: 90, name: "Shōei", jp: "焦影", title: "The Scorched Shadow",
    hue: 10, shape: "assassin", hp: 78900, speed: 182, dmg: 42, radius: 42, pattern: "spiral",
    element: "fire", mechanics: ["daggerfan", "blink", "meteorstorm", "daggerfan", "cleavefan"] },
  { id: "monk_f", level: 95, name: "Rekka Hizamaru", jp: "烈火膝丸", title: "His Knees Are On Fire",
    hue: 25, shape: "monkboss", hp: 82800, speed: 156, dmg: 44, radius: 50, pattern: "charge",
    element: "fire", mechanics: ["flurry", "kneedive", "palmcone", "firewall"] },
  { id: "inferno", level: 100, name: "Genkai Unbound", jp: "解界", title: "The Titan of Chiba",
    hue: 12, shape: "templelord", hp: 243600, speed: 120, dmg: 50, radius: 104, pattern: "slam",
    element: "fire", mechanics: ["sever", "groundpound", "fistbarrage", "pillarquake", "shockwave", "quakegrid", "firewall", "meteorstorm", "adds", "enrage"],
    intro: ["「解界」", "He was never the temple's guardian. He was its prisoner."], phases: [0.8, 0.6, 0.4, 0.2] },
];

/** Endless Colosseum champions, cycled and scaled by round. */
/** ============================================================
 *  THE COLOSSEUM GAUNTLET
 *  A fixed, escalating wave structure. Each wave re-fights everything
 *  from the previous wave and adds one new champion. No trash mobs ever
 *  spawn here — every enemy is a named combatant.
 *  ============================================================ */
export const CHAMPIONS: Record<string, BossDef> = {
  // ---- wave 1: the opening trio ----
  myrmidon: { id: "c_myrmidon", name: "Myrmidon Varro", jp: "剣闘士ヴァロ", title: "Shield and Shortsword",
    hue: 20, shape: "oyabun", hp: 60000, speed: 136, dmg: 40, radius: 46, pattern: "charge",
    mechanics: ["cleavefan", "dashcombo", "shockwave"], phases: [0.5] },
  sagittarius: { id: "c_sagittarius", name: "Sagitta Lucilla", jp: "射手ルキラ", title: "She Does Not Miss",
    hue: 140, shape: "assassin", hp: 48000, speed: 148, dmg: 38, radius: 40, pattern: "spiral",
    mechanics: ["daggerfan", "ringwall", "homingorbs"], phases: [0.5] },
  magus: { id: "c_magus", name: "Magus Caelo", jp: "魔導士カエロ", title: "The Sky Listens",
    hue: 265, shape: "schoolspirit", hp: 52000, speed: 118, dmg: 42, radius: 44, pattern: "ring",
    mechanics: ["crossbeam", "meteorstorm", "spinlaser"], phases: [0.5] },

  // ---- wave 2 ----
  shaman: { id: "c_shaman", name: "Serpent Shaman Nix", jp: "蛇の祈祷師", title: "The Tide Obeys",
    hue: 190, shape: "wyrm", hp: 95000, speed: 112, dmg: 44, radius: 52, pattern: "ring",
    mechanics: ["tidalwave", "ringwall", "homingorbs", "pillars"], phases: [0.6, 0.3] },

  // ---- wave 3 ----
  jaguar: { id: "c_jaguar", name: "Jaguar Warrior Itzel", jp: "豹の戦士", title: "Faster Than You",
    hue: 35, shape: "monkboss", hp: 130000, speed: 185, dmg: 46, radius: 48, pattern: "charge",
    mechanics: ["flurry", "kneedive", "dashcombo", "blink"], phases: [0.6, 0.3] },

  // ---- wave 4 ----
  colossus: { id: "c_colossus", name: "Javelin Colossus Draco", jp: "投槍の巨人", title: "Two Spears, No Mercy",
    hue: 45, shape: "titan", hp: 180000, speed: 104, dmg: 50, radius: 74, pattern: "ring",
    mechanics: ["javelinvolley", "bulletstorm", "groundpound"], phases: [0.6, 0.3] },

  // ---- wave 5 finisher ----
  manticore: { id: "c_manticore", name: "The Manticore", jp: "人面獅子", title: "Stand In The Gap",
    hue: 350, shape: "kaiju", hp: 220000, speed: 126, dmg: 58, radius: 68, pattern: "laser",
    mechanics: ["manticoretriple", "meteorstorm", "firewall"], phases: [0.66, 0.33] },

  // ---- wave 6 addition ----
  minotaur: { id: "c_minotaur", name: "Minotaur Rex", jp: "牛頭王", title: "The Labyrinth Walks",
    hue: 15, shape: "templelord", hp: 420000, speed: 98, dmg: 62, radius: 96, pattern: "slam",
    mechanics: ["sever", "greatcleave", "groundpound", "fistbarrage", "pillarquake"], phases: [0.75, 0.5, 0.25] },

  // ---- wave 7: the champion of the sands ----
  emperor: { id: "c_emperor", name: "Aurelius Invictus", jp: "不敗帝", title: "Champion of the Sands",
    hue: 48, shape: "templelord", hp: 900000, speed: 118, dmg: 66, radius: 92, pattern: "slam",
    mechanics: ["sever", "imperialwrath", "greatcleave", "manticoretriple", "groundpound",
                "pillarquake", "crossbeam", "fistbarrage"],
    phases: [0.75, 0.5, 0.25],
    intro: ["「不敗」", "He has never left this arena. Nobody has ever made him."] },

  // ---- endless phase ----
  gladiator: { id: "c_gladiator", name: "Nameless Gladiator", jp: "無名の闘士", title: "The Sand Remembers",
    hue: 30, shape: "samurai", hp: 500000, speed: 132, dmg: 58, radius: 54, pattern: "charge",
    mechanics: ["sever", "cleavefan", "dashcombo", "shockwave", "greatcleave"], phases: [0.66, 0.33] },
};

/** Fixed gauntlet. Each entry lists every champion present that wave. */
export const GAUNTLET: { wave: number; title: string; jp: string; ids: string[]; after?: string }[] = [
  { wave: 1, title: "The Opening Trio", jp: "三闘士", ids: ["myrmidon", "sagittarius", "magus"] },
  { wave: 2, title: "The Tide Rises", jp: "満ち潮", ids: ["myrmidon", "sagittarius", "magus", "shaman"] },
  { wave: 3, title: "The Hunt", jp: "狩り", ids: ["myrmidon", "sagittarius", "magus", "shaman", "jaguar"] },
  { wave: 4, title: "Spears of the Arena", jp: "闘技場の槍", ids: ["myrmidon", "sagittarius", "magus", "shaman", "jaguar", "colossus"] },
  { wave: 5, title: "The Beast Below", jp: "地底の獣", ids: ["myrmidon", "sagittarius", "magus", "shaman", "jaguar", "colossus"], after: "manticore" },
  { wave: 6, title: "Horns and Fangs", jp: "角と牙", ids: ["myrmidon", "sagittarius", "magus", "shaman", "jaguar", "colossus", "manticore", "minotaur"] },
  { wave: 7, title: "The Undefeated", jp: "不敗", ids: ["emperor"] },
];

/** Endless phase after the gauntlet: +20% HP and +1 gladiator per wave. */
export function endlessWave(n: number) {
  return {
    count: Math.min(12, n),
    hp: Math.round(500000 * Math.pow(1.2, n - 1)),
    dmgMul: Math.pow(1.06, n - 1),
  };
}

/** Spoils offered after every Colosseum victory. */
export type SpoilKind = "legendary" | "epic2" | "random3" | "stats3";
export interface SpoilDef { kind: SpoilKind; name: string; jp: string; icon: string; desc: string }
export const SPOILS: SpoilDef[] = [
  { kind: "legendary", name: "Champion's Prize", jp: "王者の褒賞", icon: "🏆", desc: "One Legendary item" },
  { kind: "epic2",     name: "Twin Honours",     jp: "二重の誉", icon: "⚜️", desc: "Two Epic items" },
  { kind: "random3",   name: "Spoils of War",    jp: "戦利品",   icon: "🎁", desc: "Three random items" },
  { kind: "stats3",    name: "Blood and Glory",  jp: "血と栄光", icon: "💪", desc: "Three stat boosts (4–10% each)" },
];

export function bossForLevel(level: number): BossDef | null {
  return BOSS_SCHEDULE.find((b) => b.level === level) || null;
}
/** Acts end on a trial boss at 25/50/75/100. */
export function isActBoss(level: number) { return level % 25 === 0; }

// ===================== META (permanent, localStorage) =====================
export interface MetaDef { id: string; name: string; jp: string; icon: string; desc: string; max: number; cost: number; costMul: number; mods: StatMods }
export const META_UPGRADES: MetaDef[] = [
  // Permanent upgrades are a slow, capped drip. Every 10-level line costs a
  // flat 250/level (2,500 to max), which is roughly three full 1-100 runs.
  // They must never be the reason a run trivialises — that is what in-run
  // levels, masteries and legendary cards are for.
  { id: "m_hp", name: "Max Health", jp: "体力", icon: "❤️", desc: "+1% starting max HP", max: 10, cost: 250, costMul: 1.0, mods: { maxHp: 1 } },
  { id: "m_armor", name: "Defense", jp: "防御", icon: "🛡️", desc: "+0.5 armor", max: 10, cost: 250, costMul: 1.0, mods: { armor: 0.5 } },
  { id: "m_speed", name: "Move Speed", jp: "速度", icon: "👟", desc: "+1% move speed", max: 10, cost: 250, costMul: 1.0, mods: { moveSpeed: 0.01 } },
  { id: "m_dmg", name: "Might", jp: "攻撃力", icon: "💥", desc: "+1% damage", max: 10, cost: 250, costMul: 1.0, mods: { damage: 0.01 } },
  { id: "m_haste", name: "Tempo", jp: "速射", icon: "⏩", desc: "+1% attack speed", max: 10, cost: 250, costMul: 1.0, mods: { haste: 0.01 } },
  { id: "m_magnet", name: "Magnet", jp: "磁力", icon: "🧲", desc: "+15% pickup range", max: 6, cost: 180, costMul: 1.0, mods: { magnet: 0.15 } },
  { id: "m_xp", name: "Growth", jp: "成長", icon: "📈", desc: "+0.5% XP gain", max: 10, cost: 250, costMul: 1.0, mods: { xpGain: 0.005 } },
  { id: "m_coin", name: "Greed", jp: "強欲", icon: "💴", desc: "+2% coin gain", max: 10, cost: 250, costMul: 1.0, mods: { coinGain: 0.02 } },
  { id: "m_regen", name: "Recovery", jp: "再生", icon: "🫧", desc: "+0.35 HP/sec", max: 6, cost: 250, costMul: 1.0, mods: { regen: 0.35 } },
  { id: "m_crit", name: "Precision", jp: "精密", icon: "🎯", desc: "+1% crit chance", max: 10, cost: 250, costMul: 1.0, mods: { crit: 0.01 } },
  { id: "m_cdr", name: "Focus", jp: "集中", icon: "🧊", desc: "-0.5% skill cooldown", max: 10, cost: 250, costMul: 1.0, mods: { cdr: -0.005 } },
  { id: "m_revive", name: "Second Wind", jp: "復活", icon: "🕊️", desc: "+1 revive per run", max: 2, cost: 250, costMul: 4.0, mods: { revives: 1 } },
];



// ===================== QUESTS =====================
export type QuestKind = "hunt" | "reach" | "survive" | "boss";
export interface QuestTemplate { kind: QuestKind; title: string; jp: string; desc: string }
export const QUEST_TEMPLATES: QuestTemplate[] = [
  { kind: "hunt", title: "Alley Sweep", jp: "路地掃除", desc: "Wipe out {n} gangsters" },
  { kind: "hunt", title: "Turf War", jp: "抗争", desc: "Take down {n} Kuro-Tora goons" },
  { kind: "reach", title: "Dead Drop", jp: "受け渡し", desc: "Reach the marked spot" },
  { kind: "reach", title: "Konbini Run", jp: "コンビニへ", desc: "Deliver the package to the marker" },
  { kind: "survive", title: "Hold the Corner", jp: "死守", desc: "Survive {n}s inside the zone" },
  { kind: "survive", title: "Neon Standoff", jp: "ネオン決戦", desc: "Hold the zone for {n}s" },
];

// ===================== XP CURVE =====================
export const MAX_LEVEL = 100;
/** Steep cubic-ish curve: levels get meaningfully harder to earn all the way to 100. */
export function xpToNext(level: number) {
  // Full-length progression: ~2.5x the previous testing pace.
  return Math.floor((14 + level * 9 + Math.pow(level, 2.15) * 1.05) * 1.25);
}



/** ============================================================
 *  ELEMENTAL IDENTITY
 *  Your element is not a perk you pick — it is how you hit things.
 *  Every strike applies its signature effect from level 1, always.
 *  ============================================================ */
export const ELEMENT_BASE: Record<ElementPath, { verb: string; desc: string }> = {
  fire:  { verb: "Ignite",   desc: "Every hit sets enemies alight, burning them over time" },
  ice:   { verb: "Chill",    desc: "Every hit chills, slowing enemies — three chills FREEZE them solid" },
  shock: { verb: "Shock",    desc: "Every hit builds static — enough charge and they are stunned" },
  wind:  { verb: "Displace", desc: "Every hit shoves enemies backwards" },
  void:  { verb: "Corrode",  desc: "Every hit corrodes, decaying enemies over time" },
};

/** ============================================================
 *  STARTING BOONS — a real opening tradeoff, offered at level 1.
 *  Your elemental identity is already active; this is what you add.
 *  ============================================================ */
export interface BoonDef {
  id: string; name: string; jp: string; icon: string; desc: string;
}
export const BOONS: BoonDef[] = [
  { id: "b_vamp",  name: "Vampirism", jp: "吸血", icon: "🩸",
    desc: "Modest lifesteal and health on kill — at the cost of some damage." },
  { id: "b_guard", name: "Aegis of the Veteran", jp: "古強者の盾", icon: "🛡️",
    desc: "+6 armor and all damage taken reduced by 15%. Harder to kill." },
  { id: "b_force", name: "Elemental Force", jp: "元素強化", icon: "✴️",
    desc: "Your elemental effect hits 60% harder and lasts 50% longer." },
];
export const BOON_BY_ID: Record<string, BoonDef> = Object.fromEntries(BOONS.map((b) => [b.id, b]));

/** ============================================================
 *  ELEMENTAL MASTERY — the real depth of your element.
 *  Offered in the normal level-up pool, but ONLY for your path.
 *  ============================================================ */
export interface MasteryDef {
  id: string; path: ElementPath; name: string; jp: string; icon: string;
  desc: string; maxLevel: number; minLevel?: number;
}
export const MASTERIES: MasteryDef[] = [
  // ---------------- FIRE: stacking burn, detonations ----------------
  { id: "mf_fuel",   path: "fire", name: "Accelerant",     jp: "助燃剤", icon: "🔥", maxLevel: 5,
    desc: "Burn ticks deal +40% damage and last longer" },
  { id: "mf_tender", path: "fire", name: "Tenderised",     jp: "炙り",   icon: "♨️", maxLevel: 5,
    desc: "Ignited enemies take +12% damage from ALL sources" },
  { id: "mf_spread", path: "fire", name: "Wildfire",       jp: "野火",   icon: "🌋", maxLevel: 4, minLevel: 8,
    desc: "Burning enemies set nearby enemies alight" },
  { id: "mf_blast",  path: "fire", name: "Combustion",     jp: "爆燃",   icon: "💥", maxLevel: 4, minLevel: 12,
    desc: "Ignited enemies explode violently when slain" },

  // ---------------- ICE: stacking chill into freeze/shatter ----------------
  { id: "mi_deep",   path: "ice", name: "Deep Freeze",     jp: "深凍",   icon: "❄️", maxLevel: 5,
    desc: "Chills stack faster and freezes last 40% longer" },
  { id: "mi_shatter",path: "ice", name: "Shatterpoint",    jp: "砕点",   icon: "🧊", maxLevel: 5,
    desc: "Frozen enemies take +35% damage and shatter for area damage" },
  { id: "mi_brittle",path: "ice", name: "Brittle",         jp: "脆化",   icon: "🪟", maxLevel: 4, minLevel: 8,
    desc: "Chilled enemies take +10% damage per chill stack" },
  { id: "mi_field",  path: "ice", name: "Permafrost",      jp: "永久凍土", icon: "🌨️", maxLevel: 4, minLevel: 12,
    desc: "Frozen enemies that die leave a freezing patch behind" },

  // ---------------- SHOCK: static buildup into stuns and chains ----------------
  { id: "ms_charge", path: "shock", name: "Overcharge",    jp: "過充電", icon: "⚡", maxLevel: 5,
    desc: "Static builds twice as fast — enemies stun sooner" },
  { id: "ms_arc",    path: "shock", name: "Arc Conductor", jp: "導体",   icon: "🔗", maxLevel: 5,
    desc: "Stunned enemies chain lightning to everything nearby" },
  { id: "ms_amp",    path: "shock", name: "Amplify",       jp: "増幅",   icon: "📡", maxLevel: 4, minLevel: 8,
    desc: "Shocked enemies take +15% damage and spread static on hit" },
  { id: "ms_storm",  path: "shock", name: "Thunderhead",   jp: "雷雲",   icon: "🌩️", maxLevel: 4, minLevel: 12,
    desc: "Stunning an enemy calls a lightning strike on them" },

  // ---------------- WIND: displacement into collision damage ----------------
  { id: "mw_gust",   path: "wind", name: "Gale Force",     jp: "疾風",   icon: "🌪️", maxLevel: 5,
    desc: "Displacement hits harder and deals impact damage (same knockback)" },
  { id: "mw_slam",   path: "wind", name: "Crash Landing",  jp: "激突",   icon: "💨", maxLevel: 5,
    desc: "Displaced enemies that hit walls or each other take heavy damage" },
  { id: "mw_cyclone",path: "wind", name: "Updraft",        jp: "上昇気流", icon: "🍃", maxLevel: 4, minLevel: 8,
    desc: "Displaced enemies are briefly helpless and take +20% damage" },
  { id: "mw_vortex", path: "wind", name: "Vortex",         jp: "渦",     icon: "🌀", maxLevel: 4, minLevel: 12,
    desc: "Kills pull everything nearby into a crushing vortex" },

  // ---------------- VOID: decay that spreads and feeds ----------------
  { id: "mv_rot",    path: "void", name: "Virulence",      jp: "毒性",   icon: "🕳️", maxLevel: 5,
    desc: "Decay ticks deal +45% damage and last longer" },
  { id: "mv_spread", path: "void", name: "Contagion",      jp: "伝染",   icon: "☣️", maxLevel: 5,
    desc: "Decaying enemies spread their decay to others when slain" },
  { id: "mv_collapse",path: "void", name: "Collapse",      jp: "崩壊",   icon: "⚫", maxLevel: 4, minLevel: 12,
    desc: "Decaying enemies implode on death, pulling in and crushing others" },
];
export const MASTERY_BY_ID: Record<string, MasteryDef> = Object.fromEntries(MASTERIES.map((m) => [m.id, m]));
export function masteriesFor(path: ElementPath | null) {
  return path ? MASTERIES.filter((m) => m.path === path) : [];
}


/** ============================================================
 *  ELITE SKILLS — single-level, run-defining picks that appear
 *  rarely (2-3%) in the normal level-up pool. They are strong, but
 *  because they cannot be levelled they never spiral out of control.
 *  ============================================================ */
export interface EliteDef {
  id: string; name: string; jp: string; icon: string; desc: string;
  path?: ElementPath;            // only on this element
  chars?: CharBody[];            // only for these characters
}
export const ELITES: EliteDef[] = [
  // ---- elemental capstones (replace the old levelled versions) ----
  { id: "e_parasite", path: "void", name: "Parasite", jp: "寄生", icon: "🦠",
    desc: "Your decay heals you for a share of the damage it deals" },
  { id: "e_shatter", path: "ice", name: "Absolute Shatter", jp: "絶対零度", icon: "🧊",
    desc: "Frozen non-boss enemies simply shatter and die" },
  { id: "e_conflagrate", path: "fire", name: "Conflagration", jp: "大火", icon: "🔥",
    desc: "Burning enemies spread fire constantly, not just on death" },
  { id: "e_chainstorm", path: "shock", name: "Chain Storm", jp: "連雷", icon: "⚡",
    desc: "Every stun arcs lightning through the entire crowd" },
  { id: "e_maelstrom", path: "wind", name: "Maelstrom", jp: "大渦", icon: "🌪️",
    desc: "Displaced enemies collide, damaging everything they strike" },

  // ---- universal capstones ----
  { id: "e_executioner", name: "Headsman", jp: "首斬り", icon: "☠️",
    desc: "Executes trigger at double the health threshold" },
  { id: "e_adrenaline", name: "Adrenaline", jp: "火事場", icon: "💉",
    desc: "Dropping below 30% HP fully heals you. Once every 60s." },
  { id: "e_fortress", name: "Fortress", jp: "要塞", icon: "🏰",
    desc: "Standing still for 2s grants a shield worth 25% max HP" },
  { id: "e_glasscannon", name: "Hair Trigger", jp: "一触即発", icon: "⚗️",
    desc: "+60% damage while at full health" },
  { id: "e_momentum", name: "Perpetual Motion", jp: "永久機関", icon: "🌀",
    desc: "Moving continuously builds up to +40% attack speed" },
  { id: "e_scavenger", name: "Battlefield Surgeon", jp: "野戦医", icon: "⚕️",
    desc: "Health pickups heal double and grant 4s of damage immunity" },
];
export const ELITE_BY_ID: Record<string, EliteDef> = Object.fromEntries(ELITES.map((e) => [e.id, e]));
/** Odds any single level-up offers an elite pick. */
export const ELITE_CHANCE = 0.03;

/** ============================================================
 *  LEGENDARY MODIFIER CARDS — awarded only after the 25/50/75/100
 *  act bosses. Each carries a run-defining effect AND real stats.
 *  ============================================================ */
export interface LegendCardDef {
  id: string; tier: 1 | 2 | 3 | 4; name: string; jp: string; icon: string;
  desc: string; flavour: string;
  /** Flat stat package carried alongside the effect. */
  mods: StatMods;
  /** Only offered on this element path. */
  path?: ElementPath;
}
export const LEGEND_CARDS: LegendCardDef[] = [
  // ================= TIER 1 — after the level 25 boss =================
  { id: "L_ramp", tier: 1, name: "Ramping Fury", jp: "増幅", icon: "📈",
    desc: "+0.5% damage and +0.2% attack speed per hit, stacking to +60%. Resets after 4s idle.",
    flavour: "Momentum is a weapon.", mods: { damage: 0.1, haste: 0.08 } },
  { id: "L_glass", tier: 1, name: "Glass Edge", jp: "硝子の刃", icon: "🔪",
    desc: "Crits deal DOUBLE damage — but every hit you take hurts 25% more.",
    flavour: "Everything cuts both ways.", mods: { critDmg: 1.0, crit: 0.1, damage: 0.15 } },
  { id: "L_echo", tier: 1, name: "Echo Strike", jp: "残響", icon: "🔊",
    desc: "25% chance every attack fires a second time, free.",
    flavour: "The arena repeats what it hears.", mods: { haste: 0.15, amount: 1 } },
  { id: "L_bulwark", tier: 1, name: "Bulwark", jp: "防壁", icon: "🛡️",
    desc: "Gain a shield worth 20% max HP every 8 seconds.",
    flavour: "Patience is its own armour.", mods: { maxHp: 60, armor: 5, regen: 1.2 } },

  // ================= TIER 2 — after the level 50 boss =================
  { id: "L_rez", tier: 2, name: "Resurrection", jp: "復活", icon: "🕊️",
    desc: "On lethal damage, revive at 1 HP with +400% damage and +200% attack speed for 5s. Recharges each act.",
    flavour: "Not finished. Not yet.", mods: { maxHp: 80, armor: 4, damage: 0.15 } },
  { id: "L_exec", tier: 2, name: "Executioner", jp: "処刑人", icon: "☠️",
    desc: "+90% damage to enemies below 40% health, and they explode when you finish them.",
    flavour: "Finish what you started.", mods: { damage: 0.2, crit: 0.08, critDmg: 0.3 } },
  { id: "L_leech", tier: 2, name: "Crimson Pact", jp: "緋の契約", icon: "🩸",
    desc: "Strong lifesteal and +50% max health. Your health bar is your resource.",
    flavour: "Signed in the obvious ink.", mods: { lifesteal: 0.45, maxHp: 120, regen: 2 } },
  { id: "L_elem2", tier: 2, name: "Elemental Surge", jp: "元素奔流", icon: "✴️",
    desc: "Your elemental effect applies TWICE per hit and spreads to one nearby enemy.",
    flavour: "It gets everywhere.", mods: { damage: 0.18, area: 0.2, duration: 0.3 } },

  // ================= TIER 3 — after the level 75 boss =================
  { id: "L_boss", tier: 3, name: "Giantslayer", jp: "巨人殺し", icon: "🗡️",
    desc: "+150% damage to bosses and champions. They also take +30% from every source.",
    flavour: "He only ever trained for the big ones.", mods: { damage: 0.25, critDmg: 0.5, armor: 6 } },
  { id: "L_storm", tier: 3, name: "Eye of the Storm", jp: "嵐の目", icon: "🌀",
    desc: "Elemental procs trigger twice as often and hit 80% harder. Your mastery effects double.",
    flavour: "Stand still. Let it come apart around you.", mods: { area: 0.3, duration: 0.4, damage: 0.2 } },
  { id: "L_time", tier: 3, name: "Temporal Edge", jp: "時の刃", icon: "⏳",
    desc: "−40% all cooldowns, +35% attack speed, and every 10th hit is a guaranteed crit.",
    flavour: "He stopped waiting.", mods: { haste: 0.35, cdr: -0.4, projSpeed: 0.25 } },
  { id: "L_berserk", tier: 3, name: "Blood Frenzy", jp: "血の狂乱", icon: "🔥",
    desc: "Below 50% health you deal +100% damage and heal 3% max HP per kill.",
    flavour: "He fights better bleeding.", mods: { damage: 0.2, lifesteal: 0.3, moveSpeed: 0.12 } },

  // ================= TIER 4 — after the level 100 boss =================
  { id: "L_gambler", tier: 4, name: "The Gambler", jp: "博徒", icon: "🎲",
    desc: "Re-roll EVERY item you own — all become Epic or better. Then +30% luck permanently.",
    flavour: "He has never once walked away from the table.", mods: { luck: 0.3, coinGain: 0.5, xpGain: 0.3 } },
  { id: "L_apex", tier: 4, name: "Apex Predator", jp: "頂点捕食者", icon: "👑",
    desc: "Every kill permanently grants +0.5% damage and +0.3% max health. Forever. No cap.",
    flavour: "There is always something bigger. Briefly.", mods: { damage: 0.3, maxHp: 150, crit: 0.1 } },
  { id: "L_titan", tier: 4, name: "Titanbane", jp: "巨躯断ち", icon: "⚔️",
    desc: "+250% boss damage. Bosses drop a health pack every 8% health lost.",
    flavour: "The bigger they are, the more there is to cut.", mods: { damage: 0.35, critDmg: 0.8, armor: 8 } },
  { id: "L_avatar", tier: 4, name: "Elemental Avatar", jp: "元素の化身", icon: "🌟",
    desc: "You BECOME your element. All mastery effects triple, and your element detonates on every kill.",
    flavour: "There is very little left of the person.", mods: { damage: 0.4, area: 0.4, duration: 0.5, haste: 0.2 } },
];
export function legendCardsForTier(t: number) { return LEGEND_CARDS.filter((c) => c.tier === t); }

// ===================== ACTS / ZONES =====================
export type ActId = "dojo" | "streets" | "school" | "inferno" | "colosseum";

export interface ActDef {
  id: ActId; name: string; jp: string; blurb: string;
  from: number; to: number;             // level range
  /** Konbini shop shown in the hub before this act. */
  shop: { name: string; jp: string; flavour: string; icon: string };
  /** Enemy archetypes that spawn here. */
  roles: EnemyRole[];
  /** Ambient palette. */
  ground: [string, string]; road: string; mark: string; glow: string; fog: string;
  /** Burning variant of act 1. */
  ablaze?: boolean;
}

export const ACTS: ActDef[] = [
  { id: "dojo", name: "The Sunken Dojo", jp: "沈んだ道場", from: 1, to: 25,
    blurb: "Stone training grounds, totems and lantern poles. No walls — nowhere to hide.",
    shop: { name: "Dojo Supply Stand", jp: "道場売店", flavour: "A creaking stall by the gate. Tea, bandages, questionable protein.", icon: "⛩️" },
    roles: ["monk", "ninja", "samurai", "acolyte", "sohei"],
    ground: ["#3f6b4a", "#47794f"], road: "#8a6a44", mark: "rgba(255,245,220,0.22)", glow: "#ff5a52", fog: "rgba(30,60,40,0.12)" },

  { id: "streets", name: "Streets of Chiba", jp: "千葉の街", from: 26, to: 50,
    blurb: "Neon alleys and open intersections. The Kuro-Tora own every corner.",
    shop: { name: "Konbini 24", jp: "コンビニ", flavour: "Fluorescent, spotless, open forever. The safest place in the ward.", icon: "🏪" },
    roles: ["brawler", "rusher", "swordsman", "gunner", "bomber", "shielder", "brute"],
    ground: ["#1d2138", "#20253f"], road: "#171a2c", mark: "rgba(255,255,255,0.10)", glow: "#ff3fd0", fog: "rgba(10,12,28,0.18)" },

  { id: "school", name: "Chiba High", jp: "千葉高校", from: 51, to: 75,
    blurb: "A gymnasium on one side, open campus on the other. Club activities have gone wrong.",
    shop: { name: "School Tuck Shop", jp: "購買部", flavour: "Melon pan, yakisoba rolls, and whatever the student council is fencing.", icon: "🏫" },
    roles: ["student", "jock", "cheer", "prefect", "ghoststudent"],
    ground: ["#223026", "#27382c"], road: "#2b2b33", mark: "rgba(200,255,210,0.12)", glow: "#5fe0a0", fog: "rgba(16,30,20,0.18)" },

  { id: "inferno", name: "The Dojo Ablaze", jp: "炎の道場", from: 76, to: 100, ablaze: true,
    blurb: "You return to where it began. Everything is burning, and everything remembers you.",
    shop: { name: "The Last Stall", jp: "最後の店", flavour: "The old shopkeeper never left. He has been waiting a long time.", icon: "🔥" },
    roles: ["monk", "ninja", "samurai", "acolyte", "sohei"],
    ground: ["#3a1a12", "#44201a"], road: "#2c1410", mark: "rgba(255,140,60,0.18)", glow: "#ff5a2f", fog: "rgba(70,20,8,0.3)" },
  { id: "colosseum", name: "The Colosseum", jp: "闘技場", from: 101, to: 9999,
    blurb: "Sand, stone tiers and a crowd that has waited a very long time. It does not end.",
    shop: { name: "The Victor's Table", jp: "勝者の卓", flavour: "Spoils laid out between bouts. Choose quickly.", icon: "🏛️" },
    roles: ["samurai", "sohei", "brute", "shielder", "swordsman"],
    ground: ["#b8a179", "#c4ad83"], road: "#9c8560", mark: "rgba(90,60,30,0.25)", glow: "#ffcf5c", fog: "rgba(120,90,50,0.10)" },
];
export const ACT_BY_ID: Record<string, ActDef> = Object.fromEntries(ACTS.map((a) => [a.id, a]));
export function actForLevel(level: number): ActDef {
  return ACTS.find((a) => level >= a.from && level <= a.to) || ACTS[ACTS.length - 1];
}

// ===================== ENEMY ARCHETYPES =====================
export type EnemyRole =
  // streets
  | "brawler" | "swordsman" | "gunner" | "rusher" | "brute" | "bomber" | "shielder"
  // dojo / inferno
  | "monk" | "ninja" | "samurai" | "acolyte" | "sohei"
  // high school
  | "student" | "jock" | "cheer" | "prefect" | "ghoststudent";
export interface RoleDef {
  id: EnemyRole; name: string; jp: string; weapon: "fist" | "katana" | "pistol" | "bat" | "club" | "bomb" | "shield" | "staff" | "naginata" | "pompom" | "spirit";
  hp: number; speed: number; dmg: number; size: number; weight: number; minLevel: number;
}
/** Mixed crowds so a horde reads as many different threats, not one repeated goon. */
export const ROLES: RoleDef[] = [
  { id: "brawler",   name: "Brawler",   jp: "喧嘩屋", weapon: "fist",   hp: 1.0, speed: 1.0,  dmg: 1.0, size: 1.0,  weight: 30, minLevel: 1 },
  { id: "rusher",    name: "Runner",    jp: "特攻",   weapon: "bat",    hp: 0.6, speed: 1.55, dmg: 0.8, size: 0.9,  weight: 22, minLevel: 1 },
  { id: "swordsman", name: "Swordsman", jp: "剣士",   weapon: "katana", hp: 1.3, speed: 1.12, dmg: 1.7, size: 1.05, weight: 24, minLevel: 3 },
  { id: "gunner",    name: "Gunner",    jp: "鉄砲",   weapon: "pistol", hp: 0.8, speed: 0.85, dmg: 1.0, size: 0.95, weight: 20, minLevel: 4 },
  { id: "bomber",    name: "Bomber",    jp: "爆弾魔", weapon: "bomb",   hp: 0.9, speed: 1.2,  dmg: 1.9, size: 1.0,  weight: 12, minLevel: 10 },
  { id: "shielder",  name: "Shielder",  jp: "盾持ち", weapon: "shield", hp: 2.6, speed: 0.72, dmg: 1.1, size: 1.15, weight: 14, minLevel: 14 },
  { id: "brute",     name: "Brute",     jp: "巨漢",   weapon: "club",   hp: 3.2, speed: 0.78, dmg: 2.0, size: 1.5,  weight: 10, minLevel: 8 },

  // ---- dojo / inferno ----
  { id: "monk",      name: "Monk",      jp: "僧",     weapon: "fist",   hp: 1.1, speed: 1.05, dmg: 1.1, size: 1.0,  weight: 26, minLevel: 1 },
  { id: "ninja",     name: "Ninja",     jp: "忍者",   weapon: "katana", hp: 0.7, speed: 1.6,  dmg: 1.5, size: 0.92, weight: 24, minLevel: 1 },
  { id: "samurai",   name: "Samurai",   jp: "侍",     weapon: "katana", hp: 2.4, speed: 0.88, dmg: 1.8, size: 1.18, weight: 20, minLevel: 3 },
  { id: "acolyte",   name: "Acolyte",   jp: "修行僧", weapon: "staff",  hp: 0.9, speed: 0.9,  dmg: 1.2, size: 0.98, weight: 18, minLevel: 4 },
  { id: "sohei",     name: "Warrior Monk", jp: "僧兵", weapon: "naginata", hp: 2.0, speed: 0.95, dmg: 1.6, size: 1.22, weight: 14, minLevel: 8 },

  // ---- high school ----
  { id: "student",   name: "Delinquent", jp: "不良",  weapon: "bat",    hp: 0.9, speed: 1.2,  dmg: 1.0, size: 0.95, weight: 26, minLevel: 1 },
  { id: "jock",      name: "Jock",      jp: "体育会", weapon: "club",   hp: 2.2, speed: 1.0,  dmg: 1.6, size: 1.25, weight: 20, minLevel: 1 },
  { id: "cheer",     name: "Cheer Squad", jp: "応援団", weapon: "pompom", hp: 0.8, speed: 1.15, dmg: 1.1, size: 0.95, weight: 20, minLevel: 3 },
  { id: "prefect",   name: "Prefect",   jp: "風紀委員", weapon: "shield", hp: 2.6, speed: 0.8, dmg: 1.3, size: 1.12, weight: 16, minLevel: 5 },
  { id: "ghoststudent", name: "Haunted Pupil", jp: "幽霊生徒", weapon: "spirit", hp: 1.0, speed: 1.3, dmg: 1.4, size: 1.0, weight: 16, minLevel: 6 },
];
export function rollRole(playerLevel: number, allowed?: EnemyRole[]): RoleDef {
  const avail = ROLES.filter((r) => r.minLevel <= playerLevel && (!allowed || allowed.includes(r.id)));
  if (!avail.length) return ROLES[0];
  const total = avail.reduce((a, r) => a + r.weight, 0);
  let r = Math.random() * total;
  for (const role of avail) { r -= role.weight; if (r <= 0) return role; }
  return avail[0];
}

// ===================== ENEMY TIERS =====================
export interface TierDef { name: string; jp: string; body: string; accent: string; hair: string; acc: "none" | "shades" | "mask" | "scar" | "horns" | "oni" | "crown" }
export const TIERS: TierDef[] = [
  { name: "Chinpira", jp: "チンピラ", body: "#3a4060", accent: "#d8d8e4", hair: "#141420", acc: "none" },
  { name: "Street Thug", jp: "street", body: "#4a3050", accent: "#e0c0f0", hair: "#1a0f22", acc: "shades" },
  { name: "Kyodai", jp: "兄貴", body: "#5a2f2f", accent: "#ffd2b0", hair: "#200c0c", acc: "scar" },
  { name: "Enforcer", jp: "用心棒", body: "#2f4a5a", accent: "#b0e8ff", hair: "#0c1a20", acc: "mask" },
  { name: "Shateigashira", jp: "舎弟頭", body: "#4a4420", accent: "#ffe9a0", hair: "#1a1708", acc: "shades" },
  { name: "Wakagashira", jp: "若頭", body: "#2a5a3a", accent: "#b8ffd0", hair: "#081a0f", acc: "scar" },
  { name: "Oni-Blood", jp: "鬼血", body: "#6a1f3a", accent: "#ff90b0", hair: "#260810", acc: "horns" },
  { name: "Shinigami", jp: "死神", body: "#1d1d2e", accent: "#9fe8ff", hair: "#000008", acc: "mask" },
  { name: "Kuro-Tora", jp: "黒虎", body: "#120f22", accent: "#ffcc3d", hair: "#000000", acc: "oni" },
  { name: "Ashura", jp: "阿修羅", body: "#3b0f3b", accent: "#ff5fe0", hair: "#12001a", acc: "horns" },
  { name: "Oyabun's Elite", jp: "親分直属", body: "#0a0a14", accent: "#ff2e4d", hair: "#000000", acc: "crown" },
];
