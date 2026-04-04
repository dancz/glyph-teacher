# Ingress Glyph Trainer

A mobile-first web application for learning and practicing [Ingress](https://ingress.com/) glyph sequences. Replicates the in-game Glyph Hack mechanic and adds structured training modes powered by a Spaced Repetition System (SRS) — all running locally, with no account required.

---

## Features

| Feature | Description |
|---|---|
| **Hack Mode** | Simulates the real Glyph Hack: watch a sequence, draw it from memory. Supports L1–L8 portal difficulties. |
| **Visual Training** | Shows each glyph as a picture, then asks you to draw it. Tracks accuracy per sequence. |
| **Text Training** | Shows only the word names (e.g. *SEARCH · POTENTIAL*), no pictures. Tests true glyph recall from memory. |
| **SRS Algorithm** | Sequences and individual glyphs are weighted by accuracy. Weaker material surfaces more often. Mode-specific (visual vs text stats are tracked separately). |
| **Glyph Dictionary** | Searchable reference grid of all 100+ Ingress glyphs with names and drawn shapes. |
| **Sequence Dictionary** | All known glyph sequences grouped by portal level, with searchable word sentences and inline glyph pictograms. Level filter included. |
| **Progress Persistence** | All training progress saved to `localStorage` — survives page refreshes, no login needed. |

---

## Requirements

- **Node.js** 18 or later
- **npm** 9 or later

---

## Running Locally

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd glyph-teacher

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Tip:** On desktop, the app simulates a mobile phone viewport (9:16 ratio) — resize as needed. On a real phone or tablet it fills the whole screen automatically.

---

## Building for Production

```bash
npm run build
```

Output is written to the `dist/` folder as a fully static site (HTML + JS + CSS). No server-side runtime is required.

To preview the production build locally before deploying:

```bash
npm run preview
```

---

## Deployment

Because the app is a fully static bundle, it can be deployed to any static hosting provider for free.

### Netlify (recommended — one command)

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

Or connect your GitHub repository on [netlify.com](https://netlify.com) and set:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Vercel

```bash
npm run build
npx vercel --prod
```

Or import the repository on [vercel.com](https://vercel.com) — it detects Vite automatically.

### GitHub Pages

```bash
npm run build
```

Then push the `dist/` folder to the `gh-pages` branch, or use the [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) GitHub Action.

Add the following to `vite.config.js` if your site is served from a subdirectory (e.g. `https://user.github.io/glyph-teacher/`):

```js
export default {
  base: '/glyph-teacher/',
}
```

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select dist as public dir, SPA: yes
npm run build
firebase deploy
```

### Self-hosted / Docker

Since the build output is purely static, any web server works:

```bash
npm run build

# Example: serve with npx
npx serve dist -l 8080

# Example: Nginx — copy dist/ contents to /var/www/html
```

---

## Project Structure

```
src/
├── components/
│   ├── GlyphGrid.jsx        # Core SVG drawing/display component
│   ├── HackScreen.jsx       # Hack mode game flow
│   ├── TrainingScreen.jsx   # Training mode dashboard + sessions
│   ├── GlyphDictionary.jsx  # Glyph reference browser
│   └── SequenceDictionary.jsx
├── hooks/
│   ├── useGlyphGame.js      # Hack mode state machine
│   └── useTraining.js       # SRS training state machine
├── services/
│   └── progressService.js   # localStorage SRS engine
├── data/
│   ├── glyphs.json          # All glyph shapes + names
│   ├── sequences.json       # All known sequences by portal level
│   └── index.js             # Data access helpers
├── App.jsx                  # Root — tab navigation
└── index.css                # Global design system
```

---

## Glyph and Sequence Data

All glyph shapes are defined in `src/data/glyphs.json` using a compact edge-string format referencing the 11 canonical Ingress node positions. Sequences are in `src/data/sequences.json` tagged with portal level sets.

To add a new glyph or sequence, edit the respective JSON files — no code changes required.

---

## Tech Stack

- **React 19** with hooks
- **Vite 8** bundler
- **Vanilla CSS** — no CSS framework
- **localStorage** — for offline-first progress persistence
- Zero runtime dependencies beyond React

---

## License

This project is unofficial and not affiliated with Niantic or the Ingress game. Glyph data sourced from community documentation.
