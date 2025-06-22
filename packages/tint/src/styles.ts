import { StepHandler } from "@tsmk/kernel";
import { TintContext } from "./types";

// ANSI style codes
// Each property is a tuple of [open, close] codes.
export const STYLE_CODES: Record<string, [number, number]> = {
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],

  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],

  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
};

// Type definition for all possible style names
export type StyleName = keyof typeof STYLE_CODES;

/**
 * A factory that creates a style step for a given style name.
 * @param name The name of the style to apply.
 */
function createStyleStep(name: StyleName): StepHandler<TintContext> {
  return (ctx) => {
    if (!ctx.styles) {
      ctx.styles = [];
    }
    ctx.styles.push(STYLE_CODES[name]);
  };
}

// Export a step for each style
export const bold = createStyleStep("bold");
export const dim = createStyleStep("dim");
export const italic = createStyleStep("italic");
export const underline = createStyleStep("underline");
export const inverse = createStyleStep("inverse");
export const hidden = createStyleStep("hidden");
export const strikethrough = createStyleStep("strikethrough");

export const black = createStyleStep("black");
export const red = createStyleStep("red");
export const green = createStyleStep("green");
export const yellow = createStyleStep("yellow");
export const blue = createStyleStep("blue");
export const magenta = createStyleStep("magenta");
export const cyan = createStyleStep("cyan");
export const white = createStyleStep("white");
export const gray = createStyleStep("gray");

export const bgBlack = createStyleStep("bgBlack");
export const bgRed = createStyleStep("bgRed");
export const bgGreen = createStyleStep("bgGreen");
export const bgYellow = createStyleStep("bgYellow");
export const bgBlue = createStyleStep("bgBlue");
export const bgMagenta = createStyleStep("bgMagenta");
export const bgCyan = createStyleStep("bgCyan");
export const bgWhite = createStyleStep("bgWhite");
