# Náš byt – v21 (3D prohlížeč)

Statická webová aplikace pro prohlížení 3D modelu bytu. Vite + React + Three.js (`@react-three/fiber`).

## Lokální vývoj

```bash
npm install   # nebo bun install
npm run dev
```

Otevře se Vite dev server (obvykle `http://localhost:5173`).

Ověření, že všechny klíče z `nabytek.json` existují v GLB:

```bash
npm run verify-nodes
```

## Build

```bash
npm run build
```

Výstup: složka `dist/` (statické soubory). Náhled: `npm run preview`.

Model: `public/models/byt-v21-web-draco.glb` (~0,6 MB). Dekodér Draco je lokálně v `public/draco/` (žádné CDN).

Přepnutí na Meshopt verzi: v `src/constants.ts` změň `MODEL_URL` a v `Model.tsx` použij `useGLTF(MODEL_URL, true, true)`.

Nekomprimovaný GLB (`byt-v21-web.glb`) je jen pro ladění ve složce `_debug-models/` — do `dist/` se nekopíruje.

## Nasazení na Vercel

1. Pushni repozitář na GitHub / GitLab / Bitbucket (nebo použij Vercel CLI).
2. Na [vercel.com](https://vercel.com) → **Add New Project** → Import.
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy.

`vercel.json` nastavuje dlouhou cache pro `/models/*` a `/draco/*`. Při nové verzi modelu změň název souboru (např. `byt-v22-…`).

Relativní cesty (`base: './'` ve Vite) fungují i v podsložce.

## Nasazení na Netlify

**Varianta A – z repozitáře:**

1. [app.netlify.com](https://app.netlify.com) → Add new site → Import.
2. Build command: `npm run build`
3. Publish directory: `dist`

**Varianta B – drag & drop:**

1. Lokálně spusť `npm run build`
2. Přetáhni složku `dist/` do Netlify Drop.

`netlify.toml` obsahuje stejné cache hlavičky pro modely.

## Ovládání

| Akce | Desktop | Mobil |
|------|---------|-------|
| Pohledy | tlačítka / 1–9, 0 | pás pohledů |
| Režim zobrazení | V | segmenty nahoře |
| Projít se | F / tlačítko | tlačítko |
| Pohyb | WASD + myš | joystick + tažení |
| Info o nábytku | klik / E | tap |
| Konec chůze | Esc | tlačítko Pohledy |
