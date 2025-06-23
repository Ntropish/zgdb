import { render, l } from "..";

describe("Loom DOM Renderer", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container element for each test
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up the container after each test
    document.body.removeChild(container);
  });

  it("should render a simple element into the DOM", () => {
    const vnode = l.h1({}, "Hello, Loom!");
    render(vnode, container);

    expect(container.innerHTML).toBe("<h1>Hello, Loom!</h1>");
  });

  it("should render nested elements", () => {
    const vnode = l.div({}, [
      l.h1({}, "Title"),
      l.p({}, "This is a paragraph."),
    ]);
    render(vnode, container);

    const h1 = container.querySelector("h1");
    const p = container.querySelector("p");

    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Title");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("This is a paragraph.");
  });

  it("should attach attributes to elements", () => {
    const vnode = l.a(
      { id: "test-link", href: "https://example.com" },
      "Click me"
    );
    render(vnode, container);

    const link = container.querySelector("#test-link");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.textContent).toBe("Click me");
  });
});
