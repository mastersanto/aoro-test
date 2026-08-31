import type { DemoPosition } from "@/lib/demo";
import { formatPercent, formatUsdPrecise } from "@/lib/format";

export function DemoPositions({ positions }: { positions: DemoPosition[] }) {
  if (positions.length === 0) return null;

  return (
    <section
      aria-label="Demo positions"
      className="rounded-panel border border-demo/30 bg-demo/[0.06] p-4"
    >
      <h2 className="text-sm font-semibold text-demo">
        DEMO positions — no real money involved
      </h2>
      <ul className="mt-2 space-y-2">
        {positions.map((p) => (
          <li key={p.id} className="font-figure text-xs tabular-nums text-ink">
            <span className="font-medium">DEMO</span> · {p.shares.toFixed(2)} shares of{" "}
            <span className="font-medium">{p.outcomeLabel}</span> at {formatPercent(p.priceAtFill)}{" "}
            for {formatUsdPrecise(p.costUsd)}
            <span className="block truncate font-sans text-muted">{p.question}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
