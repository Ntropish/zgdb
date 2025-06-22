import { Orchestrator, StepHandler, BREAK } from "@tsmk/kernel";
import { TintContext } from "./types";
import * as styles from "./styles";
import { render } from "./renderer";

type TintChain = {
  [S in styles.StyleName]: TintChain;
} & ((text: string) => Promise<string | undefined>);

export function tint(): TintChain {
  const steps: StepHandler<TintContext>[] = [];

  const handler: ProxyHandler<any> = {
    get(target, prop: string, receiver) {
      if (prop in styles.STYLE_CODES) {
        steps.push((styles as any)[prop]);
        return new Proxy(target, handler);
      }
      return Reflect.get(target, prop, receiver);
    },
    async apply(target, thisArg, argumentsList) {
      const text = argumentsList[0] as string;
      const allSteps = [...steps, render];
      const kernel = Orchestrator.create<TintContext>(allSteps);
      const result = await kernel.run({ text, styles: [] });
      if (result === BREAK) {
        return undefined;
      }
      return result.rendered;
    },
  };

  const emptyFn = () => {};
  return new Proxy(emptyFn, handler) as TintChain;
}
