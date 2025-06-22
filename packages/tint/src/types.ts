/**
 * The context for a tinting operation.
 */
export type TintContext = {
  /**
   * The text to be styled.
   */
  text: string;
  /**
   * The raw ANSI style codes to apply. Each element is a [open, close] tuple.
   */
  styles: [number, number][];
  /**
   * The final, rendered string with all ANSI escape codes.
   * This is added by the render step.
   */
  rendered?: string;
};
