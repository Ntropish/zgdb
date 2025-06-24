import { HostConfig, render, useState, useEffect, _reset } from "../index";
import { VNode, ComponentFactory } from "@tsmk/kernel";

let mockHostConfig: jest.Mocked<HostConfig>;
let rootContainer: any;

beforeEach(() => {
  mockHostConfig = {
    createInstance: jest.fn((type, props, parent) => ({
      type,
      props,
      children: [],
    })),
    createTextInstance: jest.fn((text) => ({
      nodeValue: text,
    })),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    commitUpdate: jest.fn(),
    insertBefore: jest.fn(),
  };
  rootContainer = { type: "ROOT", props: {}, children: [] };
  _reset(); // Reset reconciler state before each test
});

describe("Reconciler", () => {
  it("should render a single node", () => {
    const node = { factory: "div", props: {} };
    render(node, rootContainer, mockHostConfig, jest.fn());
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith(
      "div",
      {},
      rootContainer
    );
    expect(mockHostConfig.appendChild).toHaveBeenCalled();
  });

  it("should render nested nodes", () => {
    const node = {
      factory: "div",
      props: { children: [{ factory: "span", props: {} }] },
    };
    render(node, rootContainer, mockHostConfig, jest.fn());
    const divInstance = mockHostConfig.createInstance.mock.results[0].value;
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith(
      "div",
      expect.any(Object),
      rootContainer
    );
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith(
      "span",
      {},
      divInstance
    );
    expect(mockHostConfig.appendChild).toHaveBeenCalledTimes(2);
  });

  it("should update a node's props", () => {
    const initialNode = { factory: "div", props: { id: "initial" } };
    render(initialNode, rootContainer, mockHostConfig, jest.fn());
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith(
      "div",
      {
        id: "initial",
      },
      rootContainer
    );

    const updatedNode = { factory: "div", props: { id: "updated" } };
    render(updatedNode, rootContainer, mockHostConfig, jest.fn());
    expect(mockHostConfig.commitUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      {
        id: "updated",
      }
    );
  });

  it("should replace a node with a different one", () => {
    const initialNode = { factory: "div", props: {} };
    render(initialNode, rootContainer, mockHostConfig, jest.fn());
    const initialDiv = mockHostConfig.createInstance.mock.results[0].value;

    const updatedNode = { factory: "span", props: {} };
    render(updatedNode, rootContainer, mockHostConfig, jest.fn());
    const newSpan = mockHostConfig.createInstance.mock.results[1].value;

    expect(mockHostConfig.removeChild).toHaveBeenCalledWith(
      rootContainer,
      initialDiv
    );
    expect(mockHostConfig.appendChild).toHaveBeenCalledWith(
      rootContainer,
      newSpan
    );
  });

  it("should remove a child node", () => {
    const initialNode = {
      factory: "div",
      props: { children: [{ factory: "span", props: {} }] },
    };
    render(initialNode, rootContainer, mockHostConfig, jest.fn());
    const childSpan = mockHostConfig.createInstance.mock.results[1].value;

    const updatedNode = { factory: "div", props: { children: [] } };
    render(updatedNode, rootContainer, mockHostConfig, jest.fn());

    expect(mockHostConfig.removeChild).toHaveBeenCalledWith(
      expect.any(Object),
      childSpan
    );
  });

  it("should render a functional component", () => {
    const Component = (props: { name: string }) => ({
      factory: "h1",
      props: { children: [`Hello, ${props.name}`] },
    });
    const node = { factory: Component, props: { name: "World" } };
    render(node, rootContainer, mockHostConfig, jest.fn());
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith(
      "h1",
      {
        children: ["Hello, World"],
      },
      rootContainer
    );
  });

  it("should unmount a functional component and trigger cleanup", () => {
    const cleanup = jest.fn();
    const Component = () => {
      useEffect(() => {
        return cleanup;
      }, []);
      return { factory: "div", props: {} };
    };
    const initialNode = { factory: Component, props: {} };
    render(initialNode, rootContainer, mockHostConfig, jest.fn());

    render(
      { factory: "div", props: {} },
      rootContainer,
      mockHostConfig,
      jest.fn()
    );

    expect(cleanup).toHaveBeenCalled();
  });

  it("should update a functional component", () => {
    const Component = (props: { count: number }) => ({
      factory: "p",
      props: { children: [`Count: ${props.count}`] },
    });
    const initialNode = { factory: Component, props: { count: 1 } };
    render(initialNode, rootContainer, mockHostConfig, jest.fn());
    const p = mockHostConfig.createInstance.mock.results[0].value;
    expect(mockHostConfig.commitUpdate).not.toHaveBeenCalled();

    const updatedNode = { factory: Component, props: { count: 2 } };
    render(updatedNode, rootContainer, mockHostConfig, jest.fn());
    expect(mockHostConfig.commitUpdate).toHaveBeenCalledWith(p, {
      children: ["Count: 2"],
    });
  });

  it("should handle nested functional components and their effects", () => {
    const childCleanup = jest.fn();
    const parentCleanup = jest.fn();

    const Child = () => {
      useEffect(() => {
        return childCleanup;
      }, []);
      return { factory: "span", props: { children: ["I'm a child"] } };
    };
    const Parent = () => {
      useEffect(() => {
        return parentCleanup;
      }, []);
      return {
        factory: "div",
        props: { children: [{ factory: Child, props: {} }] },
      };
    };
    const initialNode = { factory: Parent, props: {} };
    render(initialNode, rootContainer, mockHostConfig, jest.fn());

    // Unmount
    render(
      { factory: "div", props: {} },
      rootContainer,
      mockHostConfig,
      jest.fn()
    );

    expect(childCleanup).toHaveBeenCalled();
    expect(parentCleanup).toHaveBeenCalled();
  });

  describe("useState", () => {
    it("should manage state in a functional component", () => {
      let capturedSetState: ((newState: number) => void) | null = null;
      const Component = () => {
        const [count, setCount] = useState(0);
        capturedSetState = setCount;
        return { factory: "p", props: { children: [`Count: ${count}`] } };
      };

      const mockUpdate = jest.fn();
      render({ factory: Component }, rootContainer, mockHostConfig, mockUpdate);

      expect(capturedSetState).not.toBeNull();
      capturedSetState!(1);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("useEffect", () => {
    it("should only re-run effect when dependencies change", () => {
      const effect = jest.fn();
      const Component = (props: { dep: number }) => {
        useEffect(effect, [props.dep]);
        return { factory: "div", props: {} };
      };

      render(
        { factory: Component, props: { dep: 1 } },
        rootContainer,
        mockHostConfig,
        jest.fn()
      );
      expect(effect).toHaveBeenCalledTimes(1);

      // Re-render with same dependency
      render(
        { factory: Component, props: { dep: 1 } },
        rootContainer,
        mockHostConfig,
        jest.fn()
      );
      expect(effect).toHaveBeenCalledTimes(1);

      // Re-render with different dependency
      render(
        { factory: Component, props: { dep: 2 } },
        rootContainer,
        mockHostConfig,
        jest.fn()
      );
      expect(effect).toHaveBeenCalledTimes(2);
    });
  });
});
