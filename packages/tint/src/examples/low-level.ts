import { Orchestrator, BREAK } from "@tsmk/kernel";
import { lowLevel } from "..";
import { TintContext } from "../types";

async function main() {
  const { red, bold, underline, render } = lowLevel;

  const pipeline = [red, bold, underline, render];

  const kernel = Orchestrator.create<TintContext>(pipeline);

  const context = await kernel.run({
    text: "Hello from the low-level API!",
    styles: [],
  });

  if (context !== BREAK) {
    console.log(context.rendered);
  }
}

main();
