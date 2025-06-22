import { render, dispatchEvent, _reset } from "../index";
import { HostConfig, HostInstance } from "../index";
import { VNode, ComponentFactory } from "@tsmk/kernel";

const createMockHostConfig = () => {
  return {
    createInstance: jest.fn((type, props) => {
      if (type === "text") {
        return {
          type: "text",
          props: { content: props.children?.[0] },
          children: [],
        };
      }
      return { type, props, children: [] };
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children.push(child);
    }),
    removeChild: jest.fn(),
    commitUpdate: jest.fn(),
    commitTextUpdate: jest.fn(),
    insertBefore: jest.fn(),
  };
};

describe("Reconciler", () => {
  let mockHostConfig: ReturnType<typeof createMockHostConfig>;
  let rootContainer: HostInstance;

  beforeEach(() => {
    _reset();
    mockHostConfig = createMockHostConfig();
    rootContainer = { type: "root", props: {}, children: [] };
  });

  it("should mount a simple host component", () => {
    const node: VNode = {
      factory: "box",
      props: {
        children: [{ factory: "text", props: { children: ["Hello"] } }],
      },
    };
    render(node, rootContainer, mockHostConfig);

    expect(mockHostConfig.createInstance).toHaveBeenCalledWith("box", {
      children: [{ factory: "text", props: { children: ["Hello"] } }],
    });
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith("text", {
      children: ["Hello"],
    });
    expect(mockHostConfig.appendChild).toHaveBeenCalledTimes(2);
  });

  it("should render a functional component", () => {
    const Comp: ComponentFactory = () => ({
      factory: "box",
      props: { id: "inner" },
    });
    const node: VNode = { factory: Comp, props: { id: "outer" } };
    render(node, rootContainer, mockHostConfig);

    expect(mockHostConfig.createInstance).toHaveBeenCalledWith("box", {
      id: "inner",
    });
    expect(mockHostConfig.appendChild).toHaveBeenCalledTimes(1);
  });

  it("should update props on a host component", () => {
    const initialNode: VNode = {
      factory: "box",
      props: { id: 1, children: [] },
    };
    render(initialNode, rootContainer, mockHostConfig);

    const updatedNode: VNode = {
      factory: "box",
      props: { id: 2, children: [] },
    };
    render(updatedNode, rootContainer, mockHostConfig);

    const instance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[0].value;

    expect(mockHostConfig.commitUpdate).toHaveBeenCalledWith(instance, {
      id: 2,
      children: [],
    });
  });

  it("should remove a child component", () => {
    const initialNode: VNode = {
      factory: "box",
      props: {
        children: [{ factory: "text", props: { children: ["child"] } }],
      },
    };
    render(initialNode, rootContainer, mockHostConfig);

    const textInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[1].value;
    const boxInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[0].value;
    expect(boxInstance.children.length).toBe(1);

    const updatedNode: VNode = {
      factory: "box",
      props: { children: [] },
    };
    render(updatedNode, rootContainer, mockHostConfig);

    expect(mockHostConfig.removeChild).toHaveBeenCalledWith(
      boxInstance,
      textInstance
    );
  });

  it("should handle child reordering", () => {
    const text1: VNode = { factory: "text", props: { children: ["one"] } };
    const text2: VNode = { factory: "text", props: { children: ["two"] } };

    const initialNode: VNode = {
      factory: "box",
      props: { children: [text1, text2] },
    };
    render(initialNode, rootContainer, mockHostConfig);

    const updatedNode: VNode = {
      factory: "box",
      props: { children: [text2, text1] },
    };
    render(updatedNode, rootContainer, mockHostConfig);

    const text1Instance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[1].value;
    const text2Instance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[2].value;

    expect(mockHostConfig.commitUpdate).toHaveBeenCalledWith(text1Instance, {
      children: ["two"],
    });
    expect(mockHostConfig.commitUpdate).toHaveBeenCalledWith(text2Instance, {
      children: ["one"],
    });
    expect(mockHostConfig.removeChild).not.toHaveBeenCalled();
  });

  it("should handle unmounting a component by rendering null", () => {
    const initialNode: VNode = { factory: "box", props: { children: [] } };
    render(initialNode, rootContainer, mockHostConfig);
    const instance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[0].value;

    render(null as any, rootContainer, mockHostConfig);

    expect(mockHostConfig.removeChild).toHaveBeenCalledWith(
      rootContainer,
      instance
    );
  });

  it("should replace a component with a different type", () => {
    const initialNode: VNode = { factory: "box", props: { children: [] } };
    render(initialNode, rootContainer, mockHostConfig);
    const boxInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[0].value;

    const updatedNode: VNode = {
      factory: "text",
      props: { children: ["Hello"] },
    };
    render(updatedNode, rootContainer, mockHostConfig);
    const textInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[1].value;

    expect(mockHostConfig.removeChild).toHaveBeenCalledWith(
      rootContainer,
      boxInstance
    );
    expect(mockHostConfig.appendChild).toHaveBeenCalledWith(
      rootContainer,
      textInstance
    );
  });

  it("should handle updates on nested components", () => {
    const Child = ({ text }: { text: string }) => ({
      factory: "text",
      props: { children: [text] },
    });
    const Parent = ({ text }: { text: string }) => ({
      factory: "box",
      props: { children: [{ factory: Child, props: { text } }] },
    });

    const initialNode: VNode = { factory: Parent, props: { text: "initial" } };
    render(initialNode, rootContainer, mockHostConfig);

    const updatedNode: VNode = { factory: Parent, props: { text: "updated" } };
    render(updatedNode, rootContainer, mockHostConfig);

    const textInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[1].value;

    expect(mockHostConfig.commitUpdate).toHaveBeenCalledWith(textInstance, {
      children: ["updated"],
    });
  });

  it("should render nested functional components", () => {
    const Inner: ComponentFactory = () => ({
      factory: "text",
      props: { children: ["inner"] },
    });
    const Outer: ComponentFactory = () => ({ factory: Inner, props: {} });

    render({ factory: Outer }, rootContainer, mockHostConfig);
    expect(mockHostConfig.createInstance).toHaveBeenCalledWith("text", {
      children: ["inner"],
    });
  });

  it("should dispatch an event that bubbles up the tree", () => {
    const handlerOuter = jest.fn();
    const handlerInner = jest.fn();

    const Inner: ComponentFactory = () => ({
      factory: "button",
      props: { onClick: handlerInner },
    });
    const Outer: ComponentFactory = () => ({
      factory: Inner,
      props: { onClick: handlerOuter },
    });

    render({ factory: Outer, props: {} }, rootContainer, mockHostConfig);

    const buttonInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[0].value;

    dispatchEvent(buttonInstance, "click", { x: 1, y: 1 });

    expect(handlerInner).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(handlerOuter).not.toHaveBeenCalled();
  });

  it("should pass props to event handlers during bubbling", () => {
    const handler = jest.fn();

    const Button = ({ onClick }: { onClick: (e: any) => void }) => ({
      factory: "button",
      props: { onClick: () => onClick("inner") },
    });

    const App = () => ({
      factory: Button,
      props: { onClick: handler },
    });

    render({ factory: App, props: {} }, rootContainer, mockHostConfig);

    const buttonInstance = (mockHostConfig.createInstance as jest.Mock).mock
      .results[0].value;

    dispatchEvent(buttonInstance, "click", "outer");

    // The handler from the App component is passed to Button and should be called.
    expect(handler).toHaveBeenCalledWith("inner");
  });
});
