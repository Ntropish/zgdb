import { tint } from "../facade";

describe("Tint Facade API", () => {
  it("should create a styled string with a single style", async () => {
    const styled = await tint().red("hello");
    const expected = "\u001b[31mhello\u001b[39m";
    expect(styled).toBe(expected);
  });

  it("should chain multiple styles correctly", async () => {
    const styled = await tint().red.bold.underline("world");
    const expected =
      "\u001b[1m\u001b[4m\u001b[31mworld\u001b[39m\u001b[24m\u001b[22m";
    expect(styled).toBe(expected);
  });

  it("should create independent chains", async () => {
    const redBold = tint().red.bold;
    const greenUnderline = tint().green.underline;

    const styled1 = await redBold("text1");
    const expected1 = "\u001b[1m\u001b[31mtext1\u001b[39m\u001b[22m";
    expect(styled1).toBe(expected1);

    const styled2 = await greenUnderline("text2");
    const expected2 = "\u001b[4m\u001b[32mtext2\u001b[39m\u001b[24m";
    expect(styled2).toBe(expected2);
  });
});
