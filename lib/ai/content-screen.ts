/**
 * AR-3 content screen — feature 003.
 *
 * Removes the FORMS persuasion reliably takes from an argued recommendation:
 * asserted likelihood, quantities, and claims that the price is wrong. The spec
 * is explicit that this reduces harm rather than eliminating it — see its Known
 * limits section. Pure by design: no model call, no network, so every rule is
 * testable directly and the corpus can be run against it in milliseconds.
 */

export type Part = "resolvesOn" | "priceImplies" | "caseFor" | "caseAgainst";
export type Parts = Record<Part, string>;

export type ScreenResult =
  | { ok: true }
  | { ok: false; rule: string; part: Part; evidence: string };

export const MAX_PART_CHARS = 320;

const PARTS: Part[] = ["resolvesOn", "priceImplies", "caseFor", "caseAgainst"];

type Rule = { name: string; pattern: RegExp };

/**
 * Quantities in any form. Digits are the easy half; spelled-out numbers are how
 * "nine times out of ten" states a probability while passing a digit check.
 */
const QUANTITY: Rule[] = [
  { name: "quantity:digit", pattern: /\d/ },
  { name: "quantity:currency", pattern: /[$£€]/ },
  // Spelled-out numbers are blocked when they QUANTIFY — state a frequency,
  // proportion or magnitude — not when a small cardinal merely determines a noun
  // ("the two outcomes"). A screen that rejects that sentence rejects everything
  // useful, and a screen that withholds always is as broken as one that passes
  // anything. Every corpus and held-out quantity below still fails.
  {
    name: "quantity:frequency",
    pattern:
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b[^.]{0,24}\b(?:times?|out of|in (?:ten|a hundred)|of the (?:last|previous|past))\b/i,
  },
  {
    name: "quantity:proportion",
    pattern:
      /\b(?:half|halves|thirds?|quarters?|fifths?|percent|per cent|proportion of|majority of|most of the (?:last|previous))\b/i,
  },
  {
    name: "quantity:magnitude",
    pattern:
      /\b(?:hundreds?|thousands?|millions?|billions?|dozens?|twice|thrice|(?:about|around|roughly|nearly|almost|some)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))\b/i,
  },
  {
    name: "quantity:measure",
    pattern:
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(?:points?|cents?|cases?|fixtures?|occasions?|instances?|examples?|episodes?|days?|weeks?|months?|years?)\b/i,
  },
];

/**
 * Likelihood, confidence and sufficiency-of-evidence — as words AND as the
 * constructions that carry the same claim without them. This is the rule the
 * earlier drafts gestured at and never stated; it is also the one a lexical
 * screen reaches least completely, which the spec records as a known limit.
 */
const LIKELIHOOD: Rule[] = [
  {
    name: "likelihood:word",
    pattern:
      // Extended after live output defeated the first list with "remote" and
      // "plausible" (defeat corpus 6 and 7). Any word that rates how probable
      // an outcome is belongs to the price, not to the argument.
      /\b(?:likely|unlikely|probable|probably|possible|possibly|possibility|plausible|plausibly|conceivable|conceivably|remote|slim|narrow chance|reasonable (?:prospect|chance)|prospect|odds-on|favou?rite|certain|certainly|certainty|sure|surely|clearly|obviously|evidently|undoubtedly|inevitable|inevitably|virtually|practically|essentially|overwhelming(?:ly)?|comfortable|comfortably|safe|strong(?:ly)? (?:favou?red|placed)|expected to|on track to|set to)\b/i,
  },
  {
    name: "likelihood:construction",
    pattern:
      /\b(?:all but|little (?:stands|remains|to stop)|no realistic|hard to see|difficult to (?:see|imagine)|nothing (?:in the record |)(?:shows|suggests|indicates|points)|nothing to suggest|close to (?:certain|settled)|as good as|barring|short of|only a matter of|merely procedural|purely procedural|(?:are|is|remain(?:s)?) procedural)\b/i,
  },
];

/** Any claim the market's price is wrong, lagging, stale or a bargain. */
const MISPRICING: Rule[] = [
  {
    name: "mispricing:valuation",
    pattern:
      /\b(?:under-?pric\w*|over-?pric\w*|mis-?pric\w*|cheap|expensive|bargain|free money|too (?:low|high|cheap)|below where it should|above where it should|value here|discount)\b/i,
  },
  {
    name: "mispricing:lag",
    pattern:
      /\b(?:not (?:yet |fully |)(?:taken account|priced|absorbed|reflected)|has(?:n't| not) (?:priced|absorbed|caught up|reflected)|slow to (?:reprice|adjust|react)|lagging|stale price|yet to (?:price|absorb|reflect)|market is wrong)\b/i,
  },
];

/** Instructions aimed at the user, and anything about stake size. */
const DIRECTION: Rule[] = [
  {
    name: "instruction",
    pattern:
      /\b(?:you (?:should|could|might want|may want|can)|consider (?:backing|taking|betting)|worth (?:taking|backing|a look)|I(?:'d| would) (?:recommend|suggest|take)|take this side|back this|get in|act (?:now|fast))\b/i,
  },
  {
    name: "certainty:will",
    pattern: /\b(?:will (?:not |never |)(?:happen|occur|resolve|win|lose|recover)|won't|guarantee\w*|is going to)\b/i,
  },
  {
    name: "stake",
    pattern:
      /\b(?:stake|wager|position size|size (?:this|it|your)|larger position|smaller position|how much to|bet size|allocate)\b/i,
  },
];

const RULES: Rule[] = [...QUANTITY, ...LIKELIHOOD, ...MISPRICING, ...DIRECTION];

export function screenRecommendation(parts: Parts): ScreenResult {
  for (const part of PARTS) {
    const text = parts[part];

    // A missing part is not a passing recommendation: AR-2 requires the
    // counter-case, and a partial response is withheld rather than shown.
    if (typeof text !== "string" || text.trim() === "") {
      return { rule: "missing-part", part, evidence: "", ok: false };
    }
    if (text.length > MAX_PART_CHARS) {
      return {
        ok: false,
        rule: "length",
        part,
        evidence: `${text.length} > ${MAX_PART_CHARS}`,
      };
    }

    for (const rule of RULES) {
      const hit = rule.pattern.exec(text);
      if (hit) {
        return { ok: false, rule: rule.name, part, evidence: hit[0] };
      }
    }
  }

  return { ok: true };
}
