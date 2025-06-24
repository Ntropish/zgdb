import { render, l } from "..";
import {
  _reset as resetReconciler,
  useState,
  _getInstanceCount as getReconcilerInstanceCount,
} from "@tsmk/reconciler";
import { _getInstanceCount as getLoomInstanceCount } from "..";

describe("Loom DOM Renderer", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container element for each test
    container = document.createElement("div");
    document.body.appendChild(container);
    resetReconciler();
  });

  afterEach(() => {
    // Clean up the container after each test
    render(null, container);
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it("should render a simple element into the DOM", async () => {
    const vnode = l.h1({}, "Hello, Loom!");
    render(vnode, container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.innerHTML).toBe("<h1>Hello, Loom!</h1>");
  });

  it("should render nested elements", async () => {
    const vnode = l.div({}, [
      l.h1({}, "Title"),
      l.p({}, "This is a paragraph."),
    ]);
    render(vnode, container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const h1 = container.querySelector("h1");
    const p = container.querySelector("p");

    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Title");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("This is a paragraph.");
  });

  it("should attach attributes to elements", async () => {
    const vnode = l.a(
      { id: "test-link", href: "https://example.com" },
      "Click me"
    );
    render(vnode, container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const link = container.querySelector("#test-link");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.textContent).toBe("Click me");
  });

  it("should handle falsy and empty values as children", async () => {
    const vnode = l.div({}, [
      "Visible",
      null,
      l.span({}, "Child"),
      undefined,
      false,
      [],
    ]);
    render(vnode, container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.innerHTML).toBe("<div>Visible<span>Child</span></div>");
  });

  it("should render SVG elements with the correct namespace", async () => {
    const vnode = l.svg(
      { width: "100", height: "100" },
      l.circle({
        cx: "50",
        cy: "50",
        r: "40",
        stroke: "black",
        "stroke-width": "2",
        fill: "red",
      })
    );
    render(vnode, container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const svg = container.querySelector("svg");
    const circle = container.querySelector("circle");

    expect(svg).not.toBeNull();
    expect(svg?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(circle).not.toBeNull();
    expect(circle?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("should correctly handle boolean attributes", async () => {
    const vnode = l.div({}, [
      l.input({ type: "text", disabled: true }),
      l.input({ type: "text", disabled: false }),
      l.input({ type: "checkbox", checked: true }),
      l.input({ type: "checkbox", checked: false }),
    ]);
    render(vnode, container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const inputs = container.querySelectorAll("input");
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[1].disabled).toBe(false);
    expect(inputs[2].checked).toBe(true);
    expect(inputs[3].checked).toBe(false);
  });

  it("should handle state changes with useState", async () => {
    const Component = () => {
      const [count, setCount] = useState(0);
      return l.div(
        { "data-testid": "container" },
        l.button({ onclick: () => setCount(count + 1) }, `Count: ${count}`)
      );
    };

    render(l(Component), container);

    let button = container.querySelector("button");
    expect(button?.textContent).toBe("Count: 0");

    // Simulate a click
    button?.click();

    // Wait for the re-render
    await new Promise((resolve) => setTimeout(resolve, 0));

    button = container.querySelector("button");
    expect(button?.textContent).toBe("Count: 1");
  });
});
