import { render } from "../dom";
import { h } from "../h";
import { useEffect } from "@tsmk/reconciler";

describe("Loom Lifecycle", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should call useEffect cleanup function on unmount", () => {
    let effectCalled = false;
    let cleanupCalled = false;

    const Component = () => {
      useEffect(() => {
        effectCalled = true;
        return () => {
          cleanupCalled = true;
        };
      }, []);

      return h.div({}, ["Hello"]);
    };

    // First render: Mount the component
    render(h.div({}, [Component()]), container);
    expect(effectCalled).toBe(true);
    expect(cleanupCalled).toBe(false);

    // Second render: Unmount the component by rendering something else
    render(h.div({}, ["Goodbye"]), container);
    expect(cleanupCalled).toBe(true);
  });
});
