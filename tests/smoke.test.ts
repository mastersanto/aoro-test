import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs plain unit tests", () => {
    expect(1 + 1).toBe(2);
  });
});
