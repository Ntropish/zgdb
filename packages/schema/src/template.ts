import { parseTemplate } from "./dsl-parser";
import type { Schema } from "./index";

export function t(
  strings: TemplateStringsArray,
  ...values: any[]
): Schema<any, any> {
  let dslString = "";
  const placeholderPrefix = "__TSMK_DSL_INTERPOLATION__";
  for (let i = 0; i < strings.length; i++) {
    dslString += strings[i];
    if (i < values.length) {
      dslString += `"${placeholderPrefix}${i}"`;
    }
  }
  return parseTemplate(dslString, values);
}
