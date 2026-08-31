import { MarketList } from "@/components/MarketList";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Polymarket Widget
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Browse live prediction markets, get AI help choosing one, and place a bet.
        </p>
      </header>

      <MarketList />
    </main>
  );
}
