import { ComponentContext } from "./index.js";
import { Div, H1, P, MyChildComponent } from "./generated/index.js";

type MyExampleComponentContext = ComponentContext<{ name: string }>;

export default function MyExample(ctx: MyExampleComponentContext) {
  return Div({
    children: [
      H1({
        style: {
          color: "red",
        },
        children: [`My Example Component: ${ctx.props.name}`],
      }),
      P({
        children: ["This is a paragraph"],
      }),
      MyChildComponent({
        props: {
          name: "Timmy",
        },
      }),
    ],
  });
}
