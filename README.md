# Echo Loom

A contemplative, **touch-first** 3D light-weaving puzzle for the web.

You are a tiny weaver floating in a dark cathedral of glass and crystal. Cast pulses of light, bend them through the air, bounce them off panes, and awaken stained-glass constellation stars — three short chambers, then the loom hums.

Built with **Vite + Three.js**. Mobile-first controls; mouse works on desktop too.

## Quick start

Requirements: **Node.js 20+** and npm.

```bash
git clone https://github.com/benjamin-kraatz/echo-loom.git
cd echo-loom
npm install
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)).

On a phone on the same network:

```bash
npm run dev -- --host
```

Then open `http://<your-computer-lan-ip>:5173` in the phone browser.

## Production build

```bash
npm run build
npm run preview
```

- `npm run build` writes a static site to `dist/`
- `npm run preview` serves that folder locally
- Deploy `dist/` to any static host (GitHub Pages, Cloudflare Pages, Netlify, nginx, etc.)

Preview with a public host binding (e.g. for tunnels):

```bash
npm run preview -- --host 0.0.0.0 --port 5173
```

`vite.config.js` allows arbitrary hosts for tunnel/preview use.

## Controls

| Input | Action |
|--------|--------|
| **Tap / click** | Cast a light pulse. Short taps aim forward into the chamber. |
| **Hold + drag** | Preview a curved beam; release to cast along that bend. |

Pulses reflect off glass and crystals (limited bounces). Awaken every star in the room to advance.

## Chambers

1. **Chamber I — First Light** — learn casting and gentle bends  
2. **Chamber II — Refraction Hall** — more mirrors, intentional aim  
3. **Chamber III — The Silent Vault** — multi-bounce puzzle finish  

Details: [PLAYTEST.md](./PLAYTEST.md)

## Stack

- [Vite](https://vitejs.dev/) + [Three.js](https://threejs.org/)
- Web Audio API synth (no sample packs)
- Procedural cathedral / glass / crystals + one CC0 HDRI


## Assets

On `npm install`, `scripts/fetch-assets.mjs` downloads the CC0 **Dikhololo Night** HDRI from Poly Haven into `public/hdri/` (skipped if already present). Cinzel is loaded from Google Fonts (OFL).

## Attribution

Third-party assets and licenses are listed in [ATTRIBUTION.md](./ATTRIBUTION.md):

- **Dikhololo Night** HDRI — Greg Zaal / [Poly Haven](https://polyhaven.com/a/dikhololo_night) — CC0  
- **Cinzel** — Natanael Gama / Google Fonts — OFL  
- Gameplay, geometry, and audio — original to this project  

## Project layout

```
echo-loom/
├── index.html
├── src/
│   ├── main.js          # boot + UI wiring
│   ├── style.css
│   └── game/            # Three.js game modules
├── public/
│   ├── fonts/           # Cinzel (+ OFL)
│   └── hdri/            # Poly Haven environment map
├── ATTRIBUTION.md
└── PLAYTEST.md
```

## License

Code in this repository is provided as-is for playing and tinkering. Respect the licenses of third-party assets in `ATTRIBUTION.md` (CC0 HDRI, OFL font).
