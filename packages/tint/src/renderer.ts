import { StepHandler } from "@tsmk/kernel";
import { TintContext } from "./types";

/**
 * The final step in a tint pipeline. It takes the accumulated styles
 * and renders the final ANSI-escaped string.
 */
export const render: StepHandler<TintContext> = (ctx) => {
  if (!ctx.text) {
    ctx.rendered = "";
    return;
  }
  if (ctx.styles.length === 0) {
    ctx.rendered = ctx.text;
    return;
  }

  // Sort styles to ensure deterministic output
  ctx.styles.sort((a, b) => a[0] - b[0]);

  let open = "";
  let close = "";
  for (const style of ctx.styles) {
    open += `\u001b[${style[0]}m`;
    close = `\u001b[${style[1]}m` + close;
  }

  ctx.rendered = open + ctx.text + close;
};
