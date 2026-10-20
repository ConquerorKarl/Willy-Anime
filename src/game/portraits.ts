// Pixel-art portraits for the companions. 16x16 char grids, rendered to a
// data URL on demand and cached. Keys map to a per-character palette so every
// girl reads differently at a glance.
const cache = new Map<string, string>();

export interface PortraitPalette {
  h: string; // hair
  H: string; // hair highlight
  s: string; // skin
  e: string; // eye
  c: string; // clothing primary
  C: string; // clothing accent
  a: string; // accessory / prop
  k: string; // outline
}

type Grid = string[];

/** Shared 16x16 base: head, bust and shoulders. Letters index the palette. */
const BASE: Grid = [
  "....kkkkkk......",
  "..kkhhhhhhkk....",
  ".khhhhhhhhhhk...",
  ".khhhhhhhhhhhk..",
  ".khhssssssshhk..",
  ".khsssssssssHk..",
  ".khsesssssesHk..",
  ".khsssssssssHk..",
  "..khssmmmsshk...",
  "...kkssssskk....",
  ".....kssssk.....",
  "...kkcccccckk...",
  "..kcCccccccCck..",
  ".kcCCcccccCCck..",
  ".kccccccccccck..",
  "..kkkkkkkkkkk...",
];

/** Per-character overlays drawn on top of the base (hats, ears, props). */
const OVERLAYS: Record<string, Grid> = {
  // nurse cap
  yuki: [
    "....aaaaaa......",
    "...aaaaaaaa.....",
    "....a.aa.a......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  // idol twin-tails + mic
  hina: [
    "................",
    "aa............aa",
    "aaa..........aaa",
    "aaa..........aaa",
    ".aa..........aa.",
    "..............a.",
    "................",
    "................",
    "................",
    "................",
    "............aa..",
    "...........aa...",
    "..........aa....",
    "................",
    "................",
    "................",
  ],
  // eyepatch + blade
  rei: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..aaaa..........",
    "................",
    "................",
    "................",
    "...........a....",
    "..........aa....",
    ".........aa.....",
    "........aa......",
    "................",
    "................",
  ],
  // miko headdress
  sakura: [
    "................",
    "....aa..aa......",
    "...a.a..a.a.....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  // mecha visor + antenna
  mio: [
    ".......a........",
    ".......a........",
    "................",
    "................",
    "................",
    "..aaaaaaaaaa....",
    "..a........a....",
    "................",
    "................",
    "................",
    "................",
    "..aa........aa..",
    ".aa..........aa.",
    "................",
    "................",
    "................",
  ],
  // chef band + knife
  aoi: [
    "................",
    "................",
    "..aaaaaaaaaa....",
    "..aaaaaaaaaa....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "............a...",
    "...........aa...",
    "..........aa....",
    "................",
    "................",
    "................",
  ],
  // fox ears + tails
  kaede: [
    "..a..........a..",
    ".aaa........aaa.",
    ".aAa........aAa.",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "a..............a",
    "aa............aa",
    ".aa..........aa.",
    "................",
    "................",
  ],
  // oni horns + club
  nanami: [
    "..a..........a..",
    "..aa........aa..",
    "...a........a...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "...........aaa..",
    "...........aaa..",
    "............a...",
    "............a...",
    "................",
    "................",
  ],
  // headset + visor glow
  chiyo: [
    "................",
    "................",
    ".aa..........aa.",
    ".aa..........aa.",
    ".a............a.",
    ".a............a.",
    "..aaa.....aaa...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  // halo + petals
  momo: [
    "...aaaaaaaa.....",
    "..a........a....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..a..........a..",
    "................",
    "a..............a",
    "................",
    "................",
    "................",
  ],
  // dragon horns + scales
  ayaka: [
    ".a............a.",
    ".aa..........aa.",
    "..aa........aa..",
    "...a........a...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "...a......a.....",
    "..a........a....",
    "................",
    "................",
    "................",
  ],
  // cat ears + tail
  rin: [
    "..aa........aa..",
    ".aAAa......aAAa.",
    ".aAAa......aAAa.",
    "..aa........aa..",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..............aa",
    ".............aa.",
    "............aa..",
    "...........aa...",
    "................",
  ],
};

export const PORTRAIT_PALETTES: Record<string, PortraitPalette> = {
  yuki:   { h: "#9fd9f0", H: "#d6f2ff", s: "#fbdcc0", e: "#2a7fa8", c: "#e8f6ff", C: "#59c6e8", a: "#ffffff", k: "#1b2733" },
  hina:   { h: "#ff8ec4", H: "#ffd1e8", s: "#fbdcc0", e: "#d8356f", c: "#ff5fa2", C: "#ffe066", a: "#ff4d8d", k: "#33101f" },
  rei:    { h: "#c0392b", H: "#ff8a74", s: "#f3cfae", e: "#f0c419", c: "#2b2b38", C: "#c0392b", a: "#e8eef7", k: "#1a0c0c" },
  sakura: { h: "#2b2b3a", H: "#6b6b85", s: "#fbdcc0", e: "#c8a02a", c: "#ffffff", C: "#e03b3b", a: "#ffd166", k: "#1a1a24" },
  mio:    { h: "#5f8fd8", H: "#a8c9ff", s: "#fbdcc0", e: "#59c6e8", c: "#3c4a66", C: "#7fb4ff", a: "#c8d8f0", k: "#16202e" },
  aoi:    { h: "#2f6b4f", H: "#64c295", s: "#fbdcc0", e: "#3ddba0", c: "#f2f7f4", C: "#2f6b4f", a: "#d8e8e0", k: "#10231a" },
  kaede:  { h: "#e2762f", H: "#ffb870", s: "#fbdcc0", e: "#ffcf5c", c: "#8a3b1e", C: "#ffd9a0", a: "#ff9f43", k: "#2a1206" },
  nanami: { h: "#9b6bd8", H: "#d0a8ff", s: "#f6cfae", e: "#ffe14d", c: "#4a2a6b", C: "#c08bff", a: "#ffd9a0", k: "#1d0f2b" },
  chiyo:  { h: "#39d8c8", H: "#9ffff2", s: "#fbdcc0", e: "#6ff5e8", c: "#17303a", C: "#39d8c8", a: "#6ff5e8", k: "#0a1a20" },
  momo:   { h: "#ffb3d9", H: "#ffe0f0", s: "#fff0e0", e: "#ff6fb0", c: "#fff5fa", C: "#ff8fd0", a: "#ffe066", k: "#3a1a2c" },
  ayaka:  { h: "#ff6a3c", H: "#ffb07a", s: "#f6cfae", e: "#ffcf2f", c: "#7a1f10", C: "#ff5a2f", a: "#ffd08a", k: "#2a0a04" },
  rin:    { h: "#8b6ff0", H: "#c9b6ff", s: "#f6e0d0", e: "#c9a0ff", c: "#1b1030", C: "#b07bff", a: "#2b1b4a", k: "#0d0518" },
};

// ---------------- playable character portraits ----------------
const CHAR_BASE: Grid = [
  "....kkkkkk......",
  "...khhhhhhk.....",
  "..khhhhhhhhk....",
  "..khssssssHk....",
  "..khsssssssk....",
  "..khsesssesk....",
  "..khsssssssk....",
  "...khsmmmsk.....",
  "....kkssskk.....",
  "...kkcccckk.....",
  "..kcCccccCck....",
  ".kcCCccccCCck...",
  ".kccccccccck....",
  ".kcc.cccc.cck...",
  "..k..cccc..k....",
  "...kkkkkkkk.....",
];

const CHAR_OVERLAYS: Record<string, Grid> = {
  willy: [ // bald + racket
    "................","................","................","................","................",
    "................","................","................","................","................",
    "..............aa","............aaaa",".........k..aaaa","........kk...aa.","................","................",
  ],
  andy: [ // tall mop, bow, dog paw
    "..aaaaaaaa......",".aaaaaaaaaa.....","..a........a....","................","................",
    "................","................","................","................","................",
    "a..............a","a..............a",".a............a.","..aa........aa..","................","................",
  ],
  joe: [ // headset
    "................","..aa......aa....",".aaa......aaa...",".aa........aa...",".a..........a...",
    ".a..........a...","..a........a....","....aaaaaa......","................","................",
    "..............aa","............aaaa","................","................","................","................",
  ],
  aidan: [ // chef cap + cleaver
    "...aaaaaaa......","..aaaaaaaaa.....","...aaaaaaa......","................","................",
    "................","................","................","................","................",
    "..............aa",".............aaa","............aaa.","...........a....","................","................",
  ],
  karl: [ // headband + belt
    "................","................","..aaaaaaaaaa....","..aAaaaaaaAa....","................",
    "................","................","................","................","................",
    "................","................",".aaaaaaaaaaaa...","................","................","................",
  ],
};

export const CHAR_PALETTES: Record<string, PortraitPalette> = {
  willy: { h: "#f6cfae", H: "#ffe0c4", s: "#f6cfae", e: "#2f6fb8", c: "#3b7dd8", C: "#2b63b0", a: "#ff3b5c", k: "#1b2230" },
  andy:  { h: "#6b4a2a", H: "#a07a4a", s: "#e8bb94", e: "#4a7a4a", c: "#4a6b3a", C: "#3a4a2a", a: "#c9a227", k: "#1a2214" },
  joe:   { h: "#2b2b38", H: "#4a4a5c", s: "#f0c9a8", e: "#39d8c8", c: "#2a3340", C: "#1d242e", a: "#39d8c8", k: "#0e141c" },
  aidan: { h: "#8a5a2b", H: "#b88a52", s: "#f3cfae", e: "#9a4a3a", c: "#f2f2ee", C: "#e8e8e0", a: "#c0392b", k: "#2a1a14" },
  karl:  { h: "#1a1a24", H: "#3a3a4a", s: "#f6cfae", e: "#8a6a2a", c: "#f5f5f0", C: "#eaeae2", a: "#e03b3b", k: "#1a1a22" },
};

/** The robed elder who initiates you. Original design. */
const SAGE: Grid = [
  "....kkkkkk......",
  "...khhhhhhk.....",
  "..khhhhhhhhk....",
  "..khssssssHk....",
  "..khsesssesk....",
  "..khsssssssk....",
  "...khmmmmmk.....",
  "..kkHHHHHHkk....",
  ".kcHHHHHHHHck...",
  "kcCHHHHHHHHCck..",
  "kcCccccccccCck..",
  "kcCcaaaaaacCck..",
  ".kcccaaaaccck...",
  "..kcccccccck....",
  "...kkcccckk.....",
  "....kkkkkk......",
];

export const SAGE_PALETTE: PortraitPalette = {
  h: "#8d8f98", H: "#e8e6e0", s: "#e8c9a6", e: "#2f6fb8",
  c: "#4a3f6b", C: "#6a5a94", a: "#e3b23c", k: "#1b1724",
};

export function sagePortraitUrl(scale = 9): string {
  const key = `sage|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pal = SAGE_PALETTE;
  const c = document.createElement("canvas");
  c.width = 16 * scale; c.height = 16 * scale;
  const ctx = c.getContext("2d")!;
  const map: Record<string, string> = {
    k: pal.k, h: pal.h, H: pal.H, s: pal.s, e: pal.e,
    c: pal.c, C: pal.C, a: pal.a, A: pal.k, m: "#c9bfae",
  };
  for (let y = 0; y < SAGE.length; y++)
    for (let x = 0; x < SAGE[y].length; x++) {
      const ch = SAGE[y][x];
      if (ch === "." || !map[ch]) continue;
      ctx.fillStyle = map[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function charPortraitUrl(id: string, scale = 8): string {
  const key = `char|${id}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pal = CHAR_PALETTES[id] || CHAR_PALETTES.willy;
  const c = document.createElement("canvas");
  c.width = 16 * scale; c.height = 16 * scale;
  const ctx = c.getContext("2d")!;
  const map: Record<string, string> = {
    k: pal.k, h: pal.h, H: pal.H, s: pal.s, e: pal.e,
    c: pal.c, C: pal.C, a: pal.a, A: pal.k, m: "#c9707f",
  };
  const paint = (grid: Grid) => {
    for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
      const ch = grid[y][x];
      if (ch === "." || !map[ch]) continue;
      ctx.fillStyle = map[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  };
  paint(CHAR_BASE);
  const ov = CHAR_OVERLAYS[id];
  if (ov) paint(ov);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function portraitDataUrl(id: string, scale = 8): string {
  const key = `${id}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pal = PORTRAIT_PALETTES[id] || PORTRAIT_PALETTES.yuki;
  const c = document.createElement("canvas");
  c.width = 16 * scale; c.height = 16 * scale;
  const ctx = c.getContext("2d")!;
  const map: Record<string, string> = {
    k: pal.k, h: pal.h, H: pal.H, s: pal.s, e: pal.e,
    c: pal.c, C: pal.C, a: pal.a, A: pal.s, m: "#d8798f",
  };
  const paint = (grid: Grid) => {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || !map[ch]) continue;
        ctx.fillStyle = map[ch];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  };
  paint(BASE);
  const ov = OVERLAYS[id];
  if (ov) paint(ov);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
