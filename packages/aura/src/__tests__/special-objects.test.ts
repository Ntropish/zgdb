import { aura } from "../state";

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Aura: Special Objects", () => {
  it("should not proxy Date objects", async () => {
    const d = new Date();
    const state = aura<{ date: Date }>({ date: d });

    expect(state.date).toBe(d);
    expect(state.date instanceof Date).toBe(true);
    expect(() => state.date.getFullYear()).not.toThrow();
  });

  it("should not proxy RegExp objects", async () => {
    const r = /hello/g;
    const state = aura<{ regex: RegExp }>({ regex: r });

    expect(state.regex).toBe(r);
    expect(state.regex instanceof RegExp).toBe(true);
    expect(() => state.regex.test("hello world")).not.toThrow();
  });
});
