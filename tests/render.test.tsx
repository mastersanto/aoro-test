import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Proves the DOM environment and render library are wired up. Every RED task that
// asserts on a rendered component (T11, T13, T17, T19, T26) depends on this working,
// so that those tests fail on their assertions rather than on a missing DOM.
function Probe() {
  return <h1>harness online</h1>;
}

describe("component test harness", () => {
  it("renders a component into a DOM", () => {
    render(<Probe />);
    expect(screen.getByRole("heading", { name: "harness online" })).toBeInTheDocument();
  });
});
