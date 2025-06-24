import { l, render } from "@tsmk/loom";
import { useState } from "@tsmk/reconciler";

const Counter = () => {
  const [count, setCount] = useState(0);

  return l.div({}, [
    l.h1({}, "Loom Counter"),
    l.p({}, `Count: ${count}`),
    l.button({ onclick: () => setCount(count + 1) }, "Increment"),
    l.button({ onclick: () => setCount(count - 1) }, "Decrement"),
  ]);
};

const App = () => {
  return l.div({ style: "text-align: center; margin-top: 2rem;" }, [
    l.h1({}, "Hello, Loom with Vite!"),
    l.p({}, "This is a simple playground to test Loom components."),
    { factory: Counter, props: {} },
  ]);
};

const rootElement = document.getElementById("root");

if (rootElement) {
  render({ factory: App, props: {} }, rootElement);
}
