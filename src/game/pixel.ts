// Tiny pixel-art helper: sprites defined as char grids, recoloured per variant.
export type Palette = { a: string; b: string; c: string; d: string };

export const ITEM_BASES: Record<string, { name: string; jp: string; art: string[] }> = {
  headband: {
    name: "Headband", jp: "鉢巻",
    art: [
      "........",
      "........",
      ".cccccc.",
      ".aaaaaa.",
      ".abaaba.",
      ".cccccc.",
      "..d..d..",
      ".d....d.",
    ],
  },
  mask: {
    name: "Mask", jp: "面",
    art: ["........",".cccccc.","caaaaaac","cabaabac","caaaaaac","cadddac.",".caaac..","..ccc..."],
  },
  vest: {
    name: "Vest", jp: "ベスト",
    art: ["a.....a.","aa...aa.","aba...ab","abaaaaba","abddddba","abbbbbba","ac....ca",".a....a."],
  },
  cape: {
    name: "Cape", jp: "マント",
    art: ["..cccc..",".cddddc.","caaaaaac","caaaaaac",".aaaaaa.",".aaaaaa.","..a..a..","..b..b.."],
  },
  pants: {
    name: "Pants", jp: "ズボン",
    art: [".cccccc.",".aaaaaa.",".aaaaaa.",".abbbba.",".aa..aa.",".aa..aa.",".aa..aa.",".dd..dd."],
  },
  belt: {
    name: "Belt", jp: "ベルト",
    art: ["........","........","aaaaaaaa","abbccbba","abcddcba","abbccbba","aaaaaaaa","........"],
  },
  necklace: {
    name: "Necklace", jp: "首飾り",
    art: ["..c..c..",".c....c.","c......c","c......c",".c....c.","..caac..","...bb...","...dd..."],
  },
  watch: {
    name: "Watch", jp: "時計",
    art: ["...aa...","...aa...",".cccccc.","cabbbbac","cabdbbac","cabbbbac",".cccccc.","...aa..."],
  },
  badge: {
    name: "Badge", jp: "バッジ",
    art: ["...cc...","..cccc..",".caaaac.","caabbaac","caabbaac",".caaaac.","..dccd..","...dd..."],
  },
  gloves: {
    name: "Gloves", jp: "手袋",
    art: [
      "..aa....",
      ".aaaa.a.",
      ".aaaaaa.",
      ".aaaaaa.",
      ".abbbba.",
      ".acccca.",
      "..aaaa..",
      "........",
    ],
  },
  sneakers: {
    name: "Sneakers", jp: "スニーカー",
    art: [
      "..aaa...",
      "..aba...",
      "..aaa...",
      "..aaaa..",
      "..aaaaa.",
      ".dddddd.",
      ".cccccc.",
      "........",
    ],
  },
  jacket: {
    name: "Jacket", jp: "ジャケット",
    art: [
      ".a....a.",
      ".aaaaaa.",
      "aabbbbaa",
      "aabddbaa",
      ".abddba.",
      ".abbbba.",
      ".a.cc.a.",
      "..a..a..",
    ],
  },
  amulet: {
    name: "Amulet", jp: "お守り",
    art: [
      "...cc...",
      "..c..c..",
      ".c....c.",
      ".c....c.",
      "..c..c..",
      "...aa...",
      "..abba..",
      "...aa...",
    ],
  },
  goggles: {
    name: "Goggles", jp: "ゴーグル",
    art: [
      "........",
      ".cccccc.",
      "caaccaac",
      "cabccbac",
      "cadccdac",
      ".cccccc.",
      "...cc...",
      "........",
    ],
  },
  charm: {
    name: "Charm", jp: "勝守",
    art: [
      "...cc...",
      "..cccc..",
      ".aaaaaa.",
      ".abaaba.",
      ".aaaaaa.",
      ".abbbba.",
      ".aaaaaa.",
      "..cccc..",
    ],
  },
  ring: {
    name: "Ring", jp: "指輪",
    art: [
      "...dd...",
      "..daad..",
      ".da..ad.",
      ".a....a.",
      ".a....a.",
      ".da..ad.",
      "..daad..",
      "...cc...",
    ],
  },
};


// --- additional bases. Compact definitions keyed by silhouette family. ---
const EXTRA: Record<string, [string, string, string[]]> = {
  helmet:   ["Helmet", "兜", ["..cccccc..",".caaaaaac.","caaaaaaaac","caabbbbaac","caaaaaaaac",".cdddddc..","..c....c..",".........."]],
  cap:      ["Cap", "帽子", ["...cccc...","..caaaac..",".caaaaaac.","caaaaaaaac","cdddddddd.","..........","..........",".........."]],
  crown:    ["Crown", "王冠", ["a...a...a.","aa.aaa.aa.","aaaaaaaaa.","aabbbbbaa.","aaaaaaaaa.","cccccccc..","..........",".........."]],
  hood:     ["Hood", "フード", ["..cccc....",".caaaac...","caaaaaac..","caabbaac..","caaaaaac..",".caaaac...","..cccc....",".........."]],
  tiara:    ["Tiara", "ティアラ", ["....b.....","...aba....","..aabaa...",".caaaaac..","ccccccccc.","..........","..........",".........."]],
  visor:    ["Visor", "バイザー", ["..........","cccccccc..","cbbbbbbc..","cbddddbc..","cccccccc..","...cc.....","..........",".........."]],
  oni_mask: ["Oni Mask", "鬼面", ["..a....a..",".aa....aa.","caaaaaaac","cabccbac.","caaaaaaac",".cbbbbc...","..cccc....",".........."]],
  glasses:  ["Glasses", "眼鏡", ["..........","..........","cccc.cccc","cbbc.cbbc","cccc.cccc","..........","..........",".........."]],
  apron:    ["Apron", "前掛け", [".c....c...",".cccccc...","caaaaaac..","caabbaac..","caaaaaac..","caaaaaac..",".cccccc...",".........."]],
  gi:       ["Gi", "道着", ["a......a..","aaaaaaaa..","abaccaba..","abaccaba..","abbbbbba..","addddddа..","a......a..",".........."]],
  armor:    ["Armor", "鎧", [".cccccc...","caaaaaac..","cabbbbac..","cabddbac..","cabbbbac..","caaaaaac..",".c.cc.c...",".........."]],
  kimono:   ["Kimono", "着物", [".a....a...",".aaaaaa...","abccccba..","abcddcba..","abccccba..","abbbbbba..",".cccccc...",".........."]],
  hoodie:   ["Hoodie", "パーカー", ["..cccc....",".caaaac...","caaaaaac..","caabbaac..","caaaaaac..","ca.cc.ac..",".c....c...",".........."]],
  quiver:   ["Quiver", "矢筒", [".d..d..d..",".d..d..d..",".cccccc...",".caaaac...",".cabbac...",".caaaac...",".cccccc...",".........."]],
  backpack: ["Backpack", "鞄", [".cc..cc...",".caaaac...","caaaaaac..","cabbbbac..","caddddac..","caaaaaac..",".cccccc...",".........."]],
  wings:    ["Wings", "翼", ["aa......aa","aaa....aaa","aaaa..aaaa",".aaabbaaa.","..aabbaa..","...aaaa...","....aa....",".........."]],
  banner:   ["Banner", "旗", ["..d.......","..daaaaa..","..dabbba..","..daaaaa..","..dabbba..","..daaaa...","..d.......","..d......."]],
  scabbard: ["Scabbard", "鞘", ["......cc..",".....caac.","....caac..","...caac...","..caac....",".caac.....","cbac......","cc........"]],
  hakama:   ["Hakama", "袴", [".cccccc...",".aaaaaa...","aaaaaaaa..","aaa..aaa..","aaa..aaa..","aaa..aaa..","ddd..ddd..",".........."]],
  shorts:   ["Shorts", "短パン", [".cccccc...",".aaaaaa...",".aaaaaa...",".aa..aa...",".dd..dd...","..........","..........",".........."]],
  greaves:  ["Greaves", "脛当て", [".cc..cc...","caac.caac","cbac.cbac","caac.caac","caac.caac",".cc..cc...","..........",".........."]],
  gumboots: ["Gumboots", "長靴", [".aa..aa...",".aa..aa...",".aa..aa...",".aa..aa...","caaccaac","caaccaac","dddddddd..",".........."]],
  tabi:     ["Tabi", "足袋", ["..........","..aaa.aaa.",".aaaa.aaaa",".abaa.aaba",".aaaaaaaa.","cddddddd..","..........",".........."]],
  geta:     ["Geta", "下駄", ["..aaaaaa..",".aaaaaaaa.","..cccccc..","..d....d..","..d....d..","..dddddd..","..........",".........."]],
  cleats:   ["Cleats", "スパイク", ["..aaa.....",".aaaaaa...","caaaaaac..","cdddddddc","c.d.d.d.c","..........","..........",".........."]],
  gauntlets:["Gauntlets", "篭手", [".cc..cc...","caacaaac..","cbacabac..","caacaaac..","caaaaaac..",".cccccc...","..........",".........."]],
  wraps:    ["Wraps", "拳サポ", ["..........",".aaaaaa...","cbbbbbbc..",".aaaaaa...","cbbbbbbc..",".aaaaaa...","..........",".........."]],
  claws:    ["Claws", "爪", ["b..b..b...","ab.ab.ab..","aabaabaab.",".aaaaaaa..",".caaaac...","..cccc....","..........",".........."]],
  mitts:    ["Mitts", "ミット", ["..cccc....",".caaaac...","caaaaaac..","caabbaac..","caaaaaac..",".caaaac...","..cccc....",".........."]],
  scarf:    ["Scarf", "襟巻", ["..........",".cccccc...","caaaaaac..",".cccccc...","....ca....","....ca....","....cd....",".........."]],
  pendant:  ["Pendant", "首飾り", ["..c..c....",".c....c...","c......c..",".c....c...","..caac....","..abba....","..caac....",".........."]],
  collar:   ["Collar", "首輪", ["..........",".cccccc...","cabbbbac..","cabddbac..","cabbbbac..",".cccccc...","....dd....",".........."]],
  bell:     ["Bell", "鈴", ["...cc.....","..caac....",".caaaac...","caaaaaac..","caabbaac..","cccccccc..","...dd.....",".........."]],
  dice:     ["Dice", "賽", [".cccccc...","cabbbbac..","cabaabac..","cabbbbac..","cabaabac..","cabbbbac..",".cccccc...",".........."]],
  coin:     ["Coin", "小判", ["..cccc....",".caaaac...","caabbaac..","cabddbac..","caabbaac..",".caaaac...","..cccc....",".........."]],
  idol:     ["Idol", "偶像", ["...cc.....","..caac....",".caaaac...",".cabbac...",".caaaac...","..cccc....",".cccccc...",".........."]],
  sigil:    ["Sigil", "印", ["..cccc....",".caaaac...","cabdbbac..","cabbdbac..","cabdbbac..",".caaaac...","..cccc....",".........."]],
  talisman: ["Talisman", "護符", [".cccccc...",".cbbbbc...",".cbddbc...",".cbdbbc...",".cbddbc...",".cbbbbc...",".cccccc...",".........."]],
  sword:    ["Sword", "剣", ["......bb..",".....bab..","....bab...","...bab....","..bab.....",".cac......","cdc.......","cc........"]],
  katana:   ["Katana", "刀", [".......b..","......bb..",".....bb...","....bb....","...bb.....","..cc......",".cdc......","cc........"]],
  spear:    ["Spear", "槍", [".....b....","....bab...","....bab...","....cac...","....dad...","....dad...","....dad...","....dd...."]],
  hammer:   ["Hammer", "槌", ["..bbbb....",".baaaab...",".babbab...",".baaaab...","..bddb....","...cc.....","...cc.....","...cc....."]],
  dagger:   ["Dagger", "短刀", ["......b...",".....bab..","....bab...","...bab....","..cac.....",".cdc......","cc........",".........."]],
  staff:    ["Staff", "杖", ["...bb.....","..b..b....","..b..b....","...bb.....","...ca.....","...ca.....","...ca.....","...cd....."]],
  nunchaku: ["Nunchaku", "ヌンチャク", [".aa.......",".aa.d.....",".aa..d....",".aa...d...","......aa..","......aa..","......aa..",".........."]],
  shield:   ["Shield", "盾", [".cccccc...","caaaaaac..","cabbbbac..","cabddbac..","cabbbbac..",".caaaac...","..caac....","...cc....."]],
  lantern:  ["Lantern", "提灯", ["...cc.....",".cccccc...","cabbbbac..","cabddbac..","cabbbbac..",".cccccc...","...cc.....",".........."]],
  fan:      ["Fan", "扇", ["..b...b...",".ab.a.ba..","aabaaabaa.","aaaaaaaaa.",".ccccccc..","...ccc....","....c.....",".........."]],
  scroll:   ["Scroll", "巻物", ["cc......cc","cacccccca.","cabbbbbca.","cabdddbca.","cabbbbbca.","cacccccca.","cc......cc",".........."]],
  flask:    ["Flask", "薬瓶", ["...cc.....","...ca.....","..cccc....",".cabbac...","cabddbac..","cabddbac..",".cbbbbc...","..cccc...."]],
  orb:      ["Orb", "宝珠", ["..cccc....",".cabbac...","cabddbac..","cabdbbac..","cabbbbac..",".caaaac...","..cccc....",".........."]],
  bracer:   ["Bracer", "腕輪", ["..........",".cccccc...","cabbbbac..","cadddbac..","cabbbbac..",".cccccc...","..........",".........."]],
};
for (const [k, v] of Object.entries(EXTRA)) {
  ITEM_BASES[k] = { name: v[0], jp: v[1], art: v[2].map((r) => (r + "........").slice(0, 8)) };
}

export const ITEM_VARIANTS: Record<string, { name: string; jp: string; pal: Palette }> = {
  plain: { name: "Plain", jp: "並", pal: { a: "#8a8f9e", b: "#c3c8d4", c: "#4a4f5c", d: "#a6abb8" } },
  worn: { name: "Worn", jp: "使い古し", pal: { a: "#9a8a72", b: "#cfc2a8", c: "#5c5244", d: "#b4a68c" } },
  ice: { name: "Ice Warrior", jp: "氷の戦士", pal: { a: "#6fd8ff", b: "#d6f6ff", c: "#1b5a8a", d: "#b4ecff" } },
  flame: { name: "Flame Spirit", jp: "炎の精", pal: { a: "#ff7a3c", b: "#ffd37a", c: "#8a2a10", d: "#ffb05c" } },
  thunder: { name: "Thunder God", jp: "雷神", pal: { a: "#ffe14d", b: "#fffbb8", c: "#7a5c00", d: "#fff176" } },
  shadow: { name: "Night Crawler", jp: "夜這い", pal: { a: "#8b6ff0", b: "#d3c6ff", c: "#2b1f52", d: "#a98cff" } },
  jade: { name: "Jade Monk", jp: "翡翠僧", pal: { a: "#5fe0a0", b: "#d6ffe9", c: "#15563a", d: "#8df2bf" } },
  gold: { name: "Gold Rush", jp: "黄金狂", pal: { a: "#ffcc3d", b: "#fff3bd", c: "#8a6200", d: "#ffdf70" } },
  blood: { name: "Blood Oath", jp: "血の誓い", pal: { a: "#ff4d6a", b: "#ffd0d8", c: "#78101f", d: "#ff7f93" } },
  neon: { name: "Neon Idol", jp: "ネオンアイドル", pal: { a: "#ff5fe0", b: "#b6fcff", c: "#52086b", d: "#ff9bee" } },
};

const cache = new Map<string, string>();

export function spriteDataUrl(baseId: string, variantId: string, scale = 6): string {
  const key = `${baseId}|${variantId}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = ITEM_BASES[baseId];
  const pal = ITEM_VARIANTS[variantId].pal;
  const c = document.createElement("canvas");
  c.width = 8 * scale; c.height = 8 * scale;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < base.art.length; y++) {
    for (let x = 0; x < base.art[y].length; x++) {
      const ch = base.art[y][x] as keyof Palette | ".";
      if (ch === ".") continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

// draw directly onto the world canvas (for ground loot)
export function drawSprite(ctx: CanvasRenderingContext2D, baseId: string, variantId: string, x: number, y: number, px: number) {
  const base = ITEM_BASES[baseId];
  const pal = ITEM_VARIANTS[variantId].pal;
  const o = -4 * px;
  for (let gy = 0; gy < 8; gy++) {
    const row = base.art[gy];
    for (let gx = 0; gx < 8; gx++) {
      const ch = row[gx] as keyof Palette | ".";
      if (ch === ".") continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x + o + gx * px, y + o + gy * px, px + 0.5, px + 0.5);
    }
  }
}
