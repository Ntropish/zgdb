import { render, l } from "..";
import { _reset as resetReconciler } from "@tsmk/reconciler";

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
});
