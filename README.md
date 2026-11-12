# The Odyssey — a scroll epic

A fan-made, scroll-driven retelling of Christopher Nolan's *The Odyssey* (2026), told through red-figure pottery, classical paintings, film footage and Ludwig Göransson's score.

It opens where Nolan would: at the end. A beggar in Ithaca is handed a bow nobody can string — and you have to string it yourself. Then: *twenty years earlier.*

## The chapters

| | Chapter | What you do |
|---|---|---|
| 00 | The Bow | Drag the string to the far notch, draw it and let go |
| 01 | Twenty Years Earlier | Title |
| 02 | Olympus | The council of the gods opens to full screen |
| 03 | Troy | Tiepolo's painting gives way to the Trojan Horse |
| 04 | The Voyage | A 3D clay amphora turns as you scroll; pull the knot on the bag of winds |
| 05 | The Cyclops | The eye follows your cursor until the stake goes in; *Nobody* becomes *Odysseus* |
| 06 | Laestrygonia | Eleven ships sink |
| 07 | Circe | Men become swine as you scroll; give Odysseus the moly to undo it |
| 08 | The Underworld | Agamemnon's army turns to skeletons (scroll or click); the gold mask cracks |
| 09 | The Sirens | Press wax into each rower's ears, then bind your king to the mast |
| 10 | The Strait | Choose Scylla or Charybdis |
| 11 | Thrinacia | Zeus' lightning splits the ship |
| 12 | Calypso | Seven years, tallied |
| 13 | Ithaca | Argos, Penelope's loom (weaves forward, unravels back), the suitors |
| 14 | The Contest | The arrow passes through twelve axes |
| 15 | The Olive Bed | Try to move the bed |
| 16 | Home | Credits |

## Built with

- **GSAP 3.13** — ScrollTrigger (pin, scrub, horizontal scroll, parallax), Flip, SplitText, TextPlugin, MotionPath, Draggable + Inertia (bounds, snap)
- **Three.js** — the lit clay amphora
- **anime.js 4** — loader grid and decorative loops
- **Lenis** — smooth scrolling
- **Canvas 2D** — the sea, rain and procedural lightning
- **Web Audio** — every sound effect is synthesized (bowstring, thunder, wind, the Sirens, a Shepard tone)
- Paper-puppet character rigs: images cut into parts with `clip-path`, each turning on its own joint

No build step: plain HTML, CSS and ES modules, with the libraries vendored in `vendor/`.

## Run it locally

ES modules need a server, so don't open `index.html` straight from disk.

```bash
npm start
```

Then open <http://localhost:5173>. Any static server works too.

## Credits

The film *The Odyssey* is written and directed by Christopher Nolan, after Homer. Music: Ludwig Göransson, "Odysseus". Paintings by Giovanni Domenico Tiepolo, Arnold Böcklin, John William Waterhouse, Herbert James Draper and Briton Rivière. Red-figure illustrations were generated with AI in the style of Attic pottery.

This is an unofficial fan project, not affiliated with Universal Pictures or the filmmakers.
