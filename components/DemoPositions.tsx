import type { DemoPosition } from "@/lib/demo";
import { formatPercent, formatUsdPrecise } from "@/lib/format";

export function DemoPositions({ positions }: { positions: DemoPosition[] }) {
  if (positions.length === 0) return null;

  return (
    <section
      aria-label="Demo positions"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
    >
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        DEMO positions — no real money involved
      </h2>
      <ul className="mt-2 space-y-2">
        {positions.map((p) => (
          <li key={p.id} className="text-xs text-amber-900 dark:text-amber-100">
            <span className="font-medium">DEMO</span> · {p.shares.toFixed(2)} shares of{" "}
            <span className="font-medium">{p.outcomeLabel}</span> at {formatPercent(p.priceAtFill)}{" "}
            for {formatUsdPrecise(p.costUsd)}
            <span className="block truncate text-amber-800/80 dark:text-amber-200/80">{p.question}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
