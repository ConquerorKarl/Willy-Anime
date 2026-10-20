# Adding your own boss music (MP3 / OGG)

The game ships with a built-in **sequencer** that composes each boss theme live
in the browser — no files needed. If you'd rather use real recorded tracks, the
system supports that too.

## Quick version

Open `src/game/music.ts` and fill in the `TRACKS` map:

```ts
export const TRACKS: Record<ThemeId, string> = {
  samurai: "/music/raiden.mp3",   // L25 · Daibutsu Genkai (dojo trial)
  yakuza:  "/music/gorou.mp3",    // L50 · Gorou Kuromaki
  dragon:  "/music/ryujin.mp3",   // L75 · Gorilla-sensei
  titan:   "/music/genkai.mp3",   // L100 · Genkai Unbound
  normal:  "/music/miniboss.mp3", // every 5-level boss
};
```

Any entry left as `""` automatically falls back to the sequencer, so you can
mix and match — real audio for the four act finales, synth for the rest.

## Where to put the files

**Important:** this project builds to a *single* `index.html` via
`vite-plugin-singlefile`. Audio files are **not** inlined into that bundle, so
you have two options:

### Option A — host them (works with the single-file build)
Use absolute URLs to any host that sends permissive CORS headers:

```ts
samurai: "https://your-cdn.example.com/raiden.mp3",
```

### Option B — serve as a normal multi-file app
1. Create `public/music/` in the project root.
2. Drop your `.mp3` / `.ogg` files in.
3. Reference them as `/music/<name>.mp3`.
4. Remove `viteSingleFile()` from `vite.config.ts` so Vite emits the assets.

## Behaviour

- Tracks **loop** automatically for the duration of the fight.
- They **fade in** over ~1s so they don't collide with the arrival stinger, and
  **fade out** over ~0.4s on boss death.
- Music **pauses** when you pause and **resumes** on unpause.
- If a file 404s, or the browser blocks autoplay, the game silently falls back
  to the sequencer — it will never fail loudly or go silent unexpectedly.
- The **BGM slider** (top-right, under the mute button) controls both sources
  and is saved to `localStorage`.

## Format notes

- **MP3** has the widest support. **OGG** works everywhere except older Safari.
- Keep files small (~1–3 MB). They're fetched on first boss encounter.
- Loop-friendly tracks sound best — trim silence from both ends so the seam
  isn't audible.

## Licensing

Only use music you have the rights to. Good sources for royalty-free game
music include Kevin MacLeod (incompetech.com), Pixabay Music, OpenGameArt and
Freesound. Check each track's licence and attribution requirements.
