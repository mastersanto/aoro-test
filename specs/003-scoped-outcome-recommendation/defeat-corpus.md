# Defeat corpus — feature 003

Sentences that defeated a version of AR-3. **This file only grows.** A sentence
here is never removed, softened, or narrowed so an implementation can pass; a new
defeat found at any time is added, including after the feature ships.

It lives here, not in `tests/`, because it is a record of what has actually got
through — the test suite reads it, but the corpus is not defined by the suite.

Passing every line below is **necessary and not sufficient**. A screen that
matched only these strings would satisfy them all and remain trivially
defeatable, so the tests must also exercise each rule with held-out sentences
that appear nowhere in this file.

| # | Sentence | Rule it defeated | Round |
|---|---|---|---|
| 1 | "the market is badly underpricing this" | mispricing claim, no forbidden word | 2 |
| 2 | "the steps that remain are procedural, and nothing in the record shows them being contested" | asserted near-certainty, no price mentioned | 3 |
| 3 | "the conditions this outcome needs have held nine times out of ten" | probability via spelled-out quantity | 3 |
| 4 | "the current price implies the market has not yet taken account of the most recent steps" | mispricing claim without the enumerated words | 3 |
| 5 | "little stands in the way of this resolving" | likelihood as construction, not word | spec AR-3's own example |
| 6 | "Yes priced as a remote branch of the many possible policy paths" | likelihood via "remote" — absent from the word list | **live production output, first run** |
| 7 | "a plausible outcome if the data softens" | likelihood via "plausible" — absent from the word list | **live production output, first run** |

Entries 6 and 7 came from the first real recommendation the deployed route
produced, caught by manual check MC-6. They are the reason MC-6 exists: the
screen enforces the *forms* persuasion takes, and a form nobody enumerated is
invisible until a real model uses it.
