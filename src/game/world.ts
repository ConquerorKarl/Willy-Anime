// Compact arenas: ~1/3 the previous footprint so objectives are always close.
// 8x280 = 2240px across — a handful of seconds corner to corner.
export const CELL = 280;
export const GRID = 8;
export const WORLD = CELL * GRID;

export type District = "downtown" | "shotengai" | "park" | "harbor" | "industrial" | "residential";

export interface DistrictStyle {
  ground: [string, string]; road: string; mark: string; glow: string; label: string; jp: string;
}

export const DISTRICTS: Record<District, DistrictStyle> = {
  downtown: { ground: ["#1d2138", "#20253f"], road: "#171a2c", mark: "rgba(255,255,255,0.10)", glow: "#ff3fd0", label: "Neon Downtown", jp: "繁華街" },
  shotengai: { ground: ["#2a2235", "#2e253a"], road: "#201a2a", mark: "rgba(255,210,120,0.14)", glow: "#ffb13d", label: "Shotengai", jp: "商店街" },
  park: { ground: ["#1b2d26", "#1f332b"], road: "#2a2a1f", mark: "rgba(200,255,200,0.10)", glow: "#5fe0a0", label: "Kaihin Park", jp: "海浜公園" },
  harbor: { ground: ["#152736", "#17304a"], road: "#132233", mark: "rgba(140,220,255,0.12)", glow: "#4fc8ff", label: "Tokyo Bay Docks", jp: "港" },
  industrial: { ground: ["#26262c", "#2b2b33"], road: "#1d1d22", mark: "rgba(255,160,80,0.12)", glow: "#ff7a3c", label: "Factory Block", jp: "工業地帯" },
  residential: { ground: ["#232436", "#26283c"], road: "#1b1c2b", mark: "rgba(255,255,255,0.08)", glow: "#8f9cff", label: "Danchi", jp: "団地" },
};

export interface Rect { x: number; y: number; w: number; h: number }

export type BuildingKind = "solid" | "room" | "konbini";

export interface Building {
  x: number; y: number; w: number; h: number;
  kind: BuildingKind;
  district: District;
  rects: Rect[];           // solid collision pieces
  doorSide: 0 | 1 | 2 | 3; // 0 top,1 right,2 bottom,3 left
  doorPos: number;
  height: number;
  shade: string; top: string; sign: string; signHue: number; lit: boolean;
  floor: string;
  id: number;
}

export interface Prop {
  x: number; y: number; kind: "tree" | "vending" | "bench" | "torii" | "crate" | "lamp" | "sign" | "barrel" | "water" | "car"
    | "pillar" | "totem" | "lantern" | "rack" | "brazier" | "bleacher" | "vaultbox" | "goalpost";
  r: number; solid: boolean; hue: number; seed: number;
}

export interface WorldData {
  buildings: Building[];
  grid: (Building | null)[];
  props: Prop[];
  propGrid: Prop[][];
  districtOf: District[];
  konbinis: Building[];
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function isBuildingCell(gx: number, gy: number) {
  if (gx < 1 || gy < 1 || gx >= GRID - 1 || gy >= GRID - 1) return false;
  return gx % 2 === 1 && gy % 2 === 1;
}

const SIGNS: Record<District, string[]> = {
  downtown: ["カラオケ", "クラブ", "バー", "ゲーセン", "ネオン", "ホスト"],
  shotengai: ["ラーメン", "本屋", "漫画", "八百屋", "たこ焼", "喫茶"],
  park: ["トイレ", "売店", "神社", "茶屋"],
  harbor: ["倉庫", "漁協", "船宿", "市場"],
  industrial: ["工場", "鉄工所", "整備", "倉庫"],
  residential: ["団地", "アパート", "銭湯", "交番"],
};

/** Zone-aware generation. Each act lays out the map completely differently. */
export function generateWorld(act: string = "streets"): WorldData {
  if (act === "colosseum") return generateColosseum();
  if (act === "dojo" || act === "inferno") return generateDojo(act === "inferno");
  if (act === "school") return generateSchool();
  return generateStreets();
}

function generateStreets(): WorldData {
  const districtOf: District[] = new Array(GRID * GRID);
  const zones: District[] = ["downtown", "shotengai", "park", "harbor", "industrial", "residential"];
  // voronoi-ish district seeds
  const seeds = zones.map((z, i) => ({
    z,
    x: (i % 3) * (GRID / 3) + rnd(1, GRID / 3 - 1),
    y: Math.floor(i / 3) * (GRID / 2) + rnd(1, GRID / 2 - 1),
  }));
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      let best = seeds[0], bd = Infinity;
      for (const s of seeds) {
        const d = (s.x - gx) ** 2 + (s.y - gy) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      districtOf[gy * GRID + gx] = best.z;
    }
  }

  const buildings: Building[] = [];
  const grid: (Building | null)[] = new Array(GRID * GRID).fill(null);
  const konbinis: Building[] = [];
  let id = 1;

  const palettes = [
    ["#2b3550", "#39456a"], ["#3a2b43", "#4c3a58"], ["#213b43", "#2c505a"],
    ["#432b2b", "#593838"], ["#2d3a2b", "#3d4f3a"], ["#333048", "#45405f"],
  ];

  for (let gy = 1; gy < GRID - 1; gy++) {
    for (let gx = 1; gx < GRID - 1; gx++) {
      if (!isBuildingCell(gx, gy)) continue;
      const district = districtOf[gy * GRID + gx];
      if (district === "park" && Math.random() < 0.6) continue; // open parks
      // Act 2 wants open alleys — skip a good chunk of blocks entirely
      if (Math.random() < 0.34) continue;
      const pad = rnd(40, 62);
      const x = gx * CELL + pad, y = gy * CELL + pad;
      const w = CELL - pad * 2, h = CELL - pad * 2;
      const r = Math.random();
      let kind: BuildingKind = "solid";
      if (r < 0.14) kind = "konbini";
      else if (r < 0.46) kind = "room";
      const p = pick(palettes);
      const doorSide = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
      const b: Building = {
        x, y, w, h, kind, district, rects: [], doorSide, doorPos: 0.5,
        height: kind === "solid" ? 30 + Math.random() * 44 : 18,
        shade: p[0], top: p[1],
        sign: kind === "konbini" ? "コンビニ" : pick(SIGNS[district]),
        signHue: kind === "konbini" ? 150 : pick([340, 190, 50, 280, 10, 150]),
        lit: Math.random() < 0.8,
        floor: kind === "konbini" ? "#2b3a44" : "#2e2a38",
        id: id++,
      };
      buildWalls(b);
      buildings.push(b);
      grid[gy * GRID + gx] = b;
      if (kind === "konbini") konbinis.push(b);
    }
  }

  // ensure at least 6 konbinis
  if (konbinis.length < 6) {
    for (const b of buildings) {
      if (konbinis.length >= 6) break;
      if (b.kind === "solid") {
        b.kind = "konbini"; b.sign = "コンビニ"; b.signHue = 150; b.height = 18; b.floor = "#2b3a44";
        b.rects = []; buildWalls(b); konbinis.push(b);
      }
    }
  }

  // props
  const props: Prop[] = [];
  const propGrid: Prop[][] = Array.from({ length: GRID * GRID }, () => []);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (isBuildingCell(gx, gy) && grid[gy * GRID + gx]) continue;
      const d = districtOf[gy * GRID + gx];
      const n = d === "park" ? 7 : d === "industrial" ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const px = gx * CELL + rnd(40, CELL - 40);
        const py = gy * CELL + rnd(40, CELL - 40);
        let kind: Prop["kind"] = "lamp";
        if (d === "park") kind = pick(["tree", "tree", "tree", "bench", "torii", "lamp"] as Prop["kind"][]);
        else if (d === "harbor") kind = pick(["crate", "barrel", "water", "lamp", "crate"] as Prop["kind"][]);
        else if (d === "industrial") kind = pick(["barrel", "crate", "lamp", "car"] as Prop["kind"][]);
        else if (d === "shotengai") kind = pick(["vending", "sign", "lamp", "bench"] as Prop["kind"][]);
        else if (d === "downtown") kind = pick(["vending", "sign", "lamp", "car"] as Prop["kind"][]);
        else kind = pick(["vending", "bench", "lamp", "tree", "car"] as Prop["kind"][]);
        const solid = kind === "tree" || kind === "vending" || kind === "crate" || kind === "barrel" || kind === "car";
        const p: Prop = { x: px, y: py, kind, r: kind === "car" ? 26 : kind === "tree" ? 20 : 15, solid, hue: rnd(0, 360), seed: Math.random() };
        props.push(p);
        propGrid[gy * GRID + gx].push(p);
      }
    }
  }

  return { buildings, grid, props, propGrid, districtOf, konbinis };
}


// ---------------------------------------------------------------- DOJO ----
/** Open stone training grounds: no buildings, only totems, pillars and torii. */
function generateDojo(ablaze: boolean): WorldData {
  const districtOf: District[] = new Array(GRID * GRID).fill("park");
  const grid: (Building | null)[] = new Array(GRID * GRID).fill(null);
  const props: Prop[] = [];
  const propGrid: Prop[][] = Array.from({ length: GRID * GRID }, () => []);

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
      const add = (p: Prop) => { props.push(p); propGrid[gy * GRID + gx].push(p); };
      const r = Math.random();
      // regular colonnade of pillars on a loose lattice
      if (gx % 2 === 1 && gy % 2 === 1) {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          add({ x: cx + rnd(-110, 110), y: cy + rnd(-110, 110), kind: "pillar",
                r: 22, solid: true, hue: ablaze ? 15 : 35, seed: Math.random() });
        }
      } else if (r < 0.2) {
        add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "totem", r: 20, solid: true, hue: ablaze ? 10 : 40, seed: Math.random() });
      } else if (r < 0.34) {
        add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "torii", r: 18, solid: false, hue: 0, seed: Math.random() });
      } else if (r < 0.5) {
        add({ x: cx + rnd(-100, 100), y: cy + rnd(-100, 100), kind: "lantern", r: 14, solid: false, hue: ablaze ? 15 : 40, seed: Math.random() });
      } else if (r < 0.62) {
        add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "rack", r: 16, solid: true, hue: 30, seed: Math.random() });
      } else if (r < 0.72 && !ablaze) {
        add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "tree", r: 20, solid: true, hue: 0, seed: 0.9 });
      } else if (r < 0.84 && ablaze) {
        add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "brazier", r: 15, solid: false, hue: 12, seed: Math.random() });
      }
    }
  }
  return { buildings: [], grid, props, propGrid, districtOf, konbinis: [] };
}

// -------------------------------------------------------------- SCHOOL ----
/** Gymnasium on one half, open campus on the other. */
function generateSchool(): WorldData {
  const districtOf: District[] = new Array(GRID * GRID).fill("residential");
  const grid: (Building | null)[] = new Array(GRID * GRID).fill(null);
  const buildings: Building[] = [];
  const props: Prop[] = [];
  const propGrid: Prop[][] = Array.from({ length: GRID * GRID }, () => []);
  let id = 1;
  const half = Math.floor(GRID / 2);

  for (let gy = 1; gy < GRID - 1; gy++) {
    for (let gx = 1; gx < GRID - 1; gx++) {
      const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
      const gym = gx < half;                       // west = indoor gymnasium
      districtOf[gy * GRID + gx] = gym ? "downtown" : "park";
      const add = (p: Prop) => { props.push(p); propGrid[gy * GRID + gx].push(p); };

      if (gym) {
        // sparse structural columns + bleachers, otherwise a big open floor
        if (gx % 3 === 1 && gy % 3 === 1)
          add({ x: cx, y: cy, kind: "pillar", r: 20, solid: true, hue: 200, seed: 0.3 });
        else if (Math.random() < 0.22)
          add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "bleacher", r: 30, solid: true, hue: 210, seed: Math.random() });
        else if (Math.random() < 0.2)
          add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "vaultbox", r: 18, solid: true, hue: 40, seed: Math.random() });
      } else {
        // campus: classroom blocks, trees, benches
        if (isBuildingCell(gx, gy) && Math.random() < 0.45) {
          const pad = rnd(46, 66);
          const b: Building = {
            x: gx * CELL + pad, y: gy * CELL + pad, w: CELL - pad * 2, h: CELL - pad * 2,
            kind: Math.random() < 0.4 ? "room" : "solid", district: "residential", rects: [],
            doorSide: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3, doorPos: 0.5,
            height: 34, shade: "#3a4150", top: "#4a5366",
            sign: pick(["教室", "図書", "理科", "音楽", "購買"]), signHue: 150,
            lit: true, floor: "#39404e", id: id++,
          };
          buildWalls(b);
          buildings.push(b);
          grid[gy * GRID + gx] = b;
        } else if (Math.random() < 0.4) {
          add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "tree", r: 20, solid: true, hue: 0, seed: Math.random() });
        } else if (Math.random() < 0.3) {
          add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "bench", r: 15, solid: false, hue: 0, seed: Math.random() });
        } else if (Math.random() < 0.25) {
          add({ x: cx + rnd(-90, 90), y: cy + rnd(-90, 90), kind: "goalpost", r: 22, solid: false, hue: 190, seed: Math.random() });
        }
      }
    }
  }
  return { buildings, grid, props, propGrid, districtOf, konbinis: [] };
}

// ---------------------------------------------------------- COLOSSEUM ----
/** A circular sand arena ringed by stone tiers. Open fighting ground. */
function generateColosseum(): WorldData {
  const districtOf: District[] = new Array(GRID * GRID).fill("harbor");
  const grid: (Building | null)[] = new Array(GRID * GRID).fill(null);
  const props: Prop[] = [];
  const propGrid: Prop[][] = Array.from({ length: GRID * GRID }, () => []);
  const cx = WORLD / 2, cy = WORLD / 2;
  const R = WORLD * 0.42;

  const add = (p: Prop) => {
    const gx = Math.floor(p.x / CELL), gy = Math.floor(p.y / CELL);
    if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return;
    props.push(p);
    propGrid[gy * GRID + gx].push(p);
  };

  // outer wall of stone pillars forming the arena boundary
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    add({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R,
          kind: "pillar", r: 30, solid: true, hue: 40, seed: i / N });
  }
  // braziers set just inside the ring
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.12;
    add({ x: cx + Math.cos(a) * (R - 90), y: cy + Math.sin(a) * (R - 90),
          kind: "brazier", r: 16, solid: false, hue: 20, seed: Math.random() });
  }
  // scattered cover: broken columns and barricades on the sand
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, d = rnd(140, R - 200);
    add({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d,
          kind: Math.random() < 0.5 ? "crate" : "barrel",
          r: 16, solid: true, hue: 30, seed: Math.random() });
  }
  return { buildings: [], grid, props, propGrid, districtOf, konbinis: [] };
}

function buildWalls(b: Building) {
  const t = 16; // wall thickness
  if (b.kind === "solid") {
    b.rects = [{ x: b.x, y: b.y, w: b.w, h: b.h }];
    return;
  }
  const gap = 64;
  const { x, y, w, h } = b;
  const segs: Rect[] = [];
  const addWall = (side: number, rect: Rect, horizontal: boolean) => {
    if (b.doorSide !== side) { segs.push(rect); return; }
    const c = horizontal ? rect.x + rect.w / 2 : rect.y + rect.h / 2;
    if (horizontal) {
      segs.push({ x: rect.x, y: rect.y, w: c - gap / 2 - rect.x, h: rect.h });
      segs.push({ x: c + gap / 2, y: rect.y, w: rect.x + rect.w - (c + gap / 2), h: rect.h });
    } else {
      segs.push({ x: rect.x, y: rect.y, w: rect.w, h: c - gap / 2 - rect.y });
      segs.push({ x: rect.x, y: c + gap / 2, w: rect.w, h: rect.y + rect.h - (c + gap / 2) });
    }
  };
  addWall(0, { x, y, w, h: t }, true);
  addWall(2, { x, y: y + h - t, w, h: t }, true);
  addWall(3, { x, y: y + t, w: t, h: h - t * 2 }, false);
  addWall(1, { x: x + w - t, y: y + t, w: t, h: h - t * 2 }, false);
  b.rects = segs.filter((s) => s.w > 1 && s.h > 1);
}

export function doorPoint(b: Building): { x: number; y: number } {
  switch (b.doorSide) {
    case 0: return { x: b.x + b.w / 2, y: b.y - 10 };
    case 1: return { x: b.x + b.w + 10, y: b.y + b.h / 2 };
    case 2: return { x: b.x + b.w / 2, y: b.y + b.h + 10 };
    default: return { x: b.x - 10, y: b.y + b.h / 2 };
  }
}

export function interiorCenter(b: Building) {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function insideBuilding(b: Building, x: number, y: number) {
  return x > b.x + 10 && x < b.x + b.w - 10 && y > b.y + 10 && y < b.y + b.h - 10;
}
