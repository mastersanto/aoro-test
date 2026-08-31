# Design canvases

Each directory holds the **source** of one design canvas:

- `*.dc.html` — one artboard each (the actual design content)
- `canvas.json` — layout, annotations, which view opens first

The seeded `polymarket-*.html` that these are published from is **not tracked**: it
is ~2.5MB, almost all of it editor code, and it is regenerated from the files above.
One of them was committed by accident, which is why this note exists.

| Directory | What it explores | Outcome |
|---|---|---|
| `widget-terminal/` | The trading-terminal visual direction | Built as feature 002 |
| `widget-flow/` | Where the bet panel lives, and what to do about two AI panels | "Decision rail" built as feature 005; the empty-rail tradeoff it named was paid by 007 |

Both were published as private artifacts; the links live in the session that made
them, not here.
