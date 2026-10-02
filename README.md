# Dino Picnic Island 🦕🍉

A cheerful 3D picnic game for a five-year-old, built with Three.js and Vite.
**The whole game lives in one file: `index.html`.** Every 3D model (island,
squishy palm trees, jelly rocks, sparkling pond, fish, fruit, baby dinosaurs,
accessories, decorations) is built from simple meshes in code. There are no
image or model files, and every sound is synthesized with Web Audio.

## Run it

```bash
npm install
npm run dev        # open the printed URL (also reachable from a tablet on the same Wi-Fi)
```

### One standalone HTML file

```bash
npm run build      # -> dist/index.html (~650 KB, three.js inlined)
```

`dist/index.html` has no other dependencies. You can double-click it, copy it to
a tablet, or host it anywhere. `npm run preview` serves the built file.

## How to play

1. Tap the big yellow ▶ button.
2. A dinosaur hops forward with a thought bubble showing the snack it wants.
   A pointing hand demonstrates the first move.
3. Give it the matching fruit from the basket in either of two ways:
   - **drag** the fruit to the dinosaur. Drop targets are large, the hungry
     dinosaur pulls the fruit toward its mouth, and on touch screens the fruit
     floats just above the finger so it stays visible; or
   - **tap** the fruit (it lifts up with a glowing ring), then **tap** the dinosaur.
4. The right snack gets chomps, a wiggle and a burp of little colored hearts.
   A wrong snack gets a sniff, a silly "bleh" and a giggle, then floats back to
   the basket. There is no penalty.
5. Once all three are fed, tap the **flower**, **cushion** and **party hat** in
   the basket to decorate the picnic blanket. The first three hats go on the
   dinosaurs' heads. When every spot of a kind is full, more taps change
   colors. Tapping a placed decoration also changes its color.
6. Tap the pink 🎵 button for the goofy picnic dance.
7. Tap the green ↻ button to play again. Each round brings new snacks and new
   dinosaur accessories (glasses, heart glasses, flowers, bows, bow ties,
   scarves, bead necklaces).

Things to discover at any time: tap the **pond** (a fish jumps), a **palm tree**
(petals drift down), a **jelly rock** (wobble) or a **dinosaur** (giggles).

## Design notes for little players

- No text, timers, scores or failure. Every button is a picture.
- Fixed camera, fitted to landscape tablets and portrait phones.
- Hit areas are larger than the objects. Only one finger is tracked at a
  time, so a resting palm doesn't break a drag.
- The hint hand comes back after about 10 seconds without progress.
- Sounds are soft. The 🔊 button mutes them, and the choice is remembered.
- No flashing: sparkles and highlights fade slowly. With
  `prefers-reduced-motion`, idle motion and confetti are reduced.

## Automated check

```bash
npm test
```

This builds the game and plays it through twice in headless Chromium:
once with the **mouse** on a 1280×800 landscape screen and once with **touch**
events on a 390×844 portrait phone. Each run covers a wrong snack, drag
feeding, tap-then-tap feeding, decorating, the pond and tree discoveries, the
dance, replay (new snacks and accessories) and mute, and fails on any page
error. It needs a Chromium; set `CHROME_PATH` or run
`npx playwright-core install chromium`. Use `SHOTS=./shots npm test` to also save
screenshots.
