import { render, l, useState } from "..";
import { _reset as resetReconciler } from "@tsmk/reconciler";

describe("Loom Nested Components", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    resetReconciler();
  });

  afterEach(() => {
    render(null, container);
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it("should maintain reactivity in a nested stateful component", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);
      return l.div({}, [
        l.p({}, `Count: ${count}`),
        l.button({ onclick: () => setCount(count + 1) }, "Increment"),
      ]);
    };

    const App = () => {
      return l.div({}, [l.h1({}, "Parent App"), l(Counter)]);
    };

    render(l(App), container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    let button = container.querySelector("button") as HTMLButtonElement;
    let p = container.querySelector("p") as HTMLParagraphElement;

    expect(p.textContent).toBe("Count: 0");

    // First click
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    p = container.querySelector("p") as HTMLParagraphElement;
    expect(p.textContent).toBe("Count: 1");

    // Second click
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    p = container.querySelector("p") as HTMLParagraphElement;
    expect(p.textContent).toBe("Count: 2");
  });
});
