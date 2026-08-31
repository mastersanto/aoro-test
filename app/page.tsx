import { Widget } from "@/components/Widget";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Polymarket Widget
        </h1>
        <p className="mt-1 text-sm text-muted">
          Browse live prediction markets, get AI help choosing one, and place a bet.
        </p>
      </header>

      <Widget />
    </main>
  );
}
