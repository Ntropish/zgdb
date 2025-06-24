import { ComponentContext } from "./index.js";
import { Div, H2, P } from "./generated/index.js";

type MyChildComponentContext = ComponentContext<{ name: string }>;

export default function MyChildComponent(ctx: MyChildComponentContext) {
  return Div({
    children: [
      H2({
        style: {
          color: "blue",
          fontSize: "1.5rem",
        },
        children: [`My Child Component: ${ctx.props.name}`],
      }),
      P({
        style: {
          color: "green",
          fontSize: "1rem",
        },
        children: ["This is a child component paragraph"],
      }),
    ],
  });
}
