import { CapabilityMap, createBuilder } from "../";
import { createFluentBuilder, FluentBuilder } from "../fluent";

interface TestProduct {
  version: string;
  steps: string[];
}

const testCapabilities: CapabilityMap<
  TestProduct,
  {
    test: (version: string) => string;
    other: () => void;
  }
> = {
  test: {
    apply: (version: string) => `version-${version}`,
    build: (product: TestProduct, applyReturn: string, version: string) => {
      product.version = applyReturn;
      product.steps.push(`test-v${version}`);
    },
  },
  other: {
    build: (product: TestProduct) => {
      product.steps.push("other");
    },
  },
};

describe("Builder", () => {
  it("should create a build orchestrator from a map of capabilities", async () => {
    const builder = createBuilder(testCapabilities);

    builder.apply("test", "1.0.0");
    builder.apply("other");

    const product = await builder.build({ version: "0.0.0", steps: [] });

    expect(product.version).toBe("version-1.0.0");
    expect(product.steps).toEqual(["test-v1.0.0", "other"]);
  });

  it("should support nested builders to compose build logic", async () => {
    // 1. Define products and capabilities for a "sub-builder"
    interface SubProduct {
      config: string;
      features: string[];
    }

    // 2. Define the main product and a capability that creates/returns the sub-builder
    interface MainProduct {
      name: string;
      sub: SubProduct | null;
    }

    // 3. Create the main builder and get the sub-builder from its apply hook
    const mainBuilder = createBuilder({
      useSubBuilder: {
        apply: () =>
          createBuilder({
            setConfig: {
              build: (product: SubProduct) => {
                product.config = "sub-config-set";
              },
            },
            addFeature: {
              build: (product: SubProduct, _: any, featureName: string) => {
                product.features.push(featureName);
              },
            },
          }),
        build: async (product: MainProduct, subBuilder: any) => {
          const subProduct: SubProduct = { config: "", features: [] };
          await subBuilder.build(subProduct);
          product.sub = subProduct;
        },
      },
    });
    const subBuilder = mainBuilder.apply("useSubBuilder");

    // 4. Apply capabilities to the sub-builder
    subBuilder.apply("setConfig");
    subBuilder.apply("addFeature", "cool-feature-1");
    subBuilder.apply("addFeature", "cool-feature-2");

    // 5. Get the final pipeline and run it
    const product = await mainBuilder.build({
      name: "main-product",
      sub: null,
    });

    // 6. Assert that the sub-builder ran with its applied capabilities
    expect(product.sub).not.toBeNull();
    expect(product.sub?.config).toBe("sub-config-set");
    expect(product.sub?.features).toEqual(["cool-feature-1", "cool-feature-2"]);
  });

  it("should support recursive builders for tree-like structures", async () => {
    // 1. Define the recursive data structure
    interface TreeNode {
      name: string;
      children: TreeNode[];
    }

    // 2. Define the capabilities for the node builder

    // 3. Build a tree using the recursive capabilities
    const rootBuilder = createBuilder({
      // This capability adds a child node and returns a builder for that child
      addChild: {
        apply: (name: string) => {
          // The returned builder has the same capabilities, enabling recursion
          const childBuilder = createBuilder(nodeCapabilities);
          // Set the name for the child node being built
          childBuilder.apply("setName", name);
          return childBuilder;
        },
        build: async (product: TreeNode, childBuilder: any) => {
          const childNode: TreeNode = { name: "", children: [] };
          await childBuilder.build(childNode);
          product.children.push(childNode);
        },
      },
      // This capability sets the name of the current node
      setName: {
        build: (product: TreeNode, _: any, name: string) => {
          product.name = name;
        },
      },
    });
    rootBuilder.apply("setName", "root");

    const child1Builder = rootBuilder.apply("addChild", "child1");
    const child2Builder = rootBuilder.apply("addChild", "child2");

    // Add a grandchild to the first child
    child1Builder.apply("addChild", "grandchild1");
    child2Builder.apply("addChild", "grandchild2");

    // 4. Get the final pipeline and run it
    const product = await rootBuilder.build({ name: "", children: [] });

    // 5. Assert the final structure of the tree
    expect(product.name).toBe("root");
    expect(product.children.length).toBe(2);
    expect(product.children[0].name).toBe("child1");
    expect(product.children[0].children.length).toBe(1);
    expect(product.children[0].children[0].name).toBe("grandchild1");
    expect(product.children[1].name).toBe("child2");
    expect(product.children[1].children.length).toBe(0);
  });

  it("should support a recursive HTML builder", async () => {
    // 1. Define the product structure, including a place for the final output
    interface HtmlElement {
      tag: string;
      attributes: Record<string, string>;
      children: (HtmlElement | string)[];
      render(): string;
    }

    // 2. Define the capabilities for the HTML builder
    const htmlCapabilities = {
      element: {
        apply: (tag: string, attributes: Record<string, string> = {}) => {
          const subBuilder = createBuilder(htmlCapabilities);
          subBuilder.apply("init", tag, attributes);
          return subBuilder;
        },
        build: async (product: HtmlElement, childBuilder: any) => {
          const childElement: HtmlElement = createHtmlElement();
          await childBuilder.build(childElement);
          product.children.push(childElement);
        },
      },
      text: {
        build: (product: HtmlElement, _: any, content: string) => {
          product.children.push(content);
        },
      },
      init: {
        build: (
          product: HtmlElement,
          _: any,
          tag: string,
          attributes: Record<string, string> = {}
        ) => {
          product.tag = tag;
          product.attributes = attributes;
        },
      },
    };

    // Helper function to create a new HtmlElement with the render method
    const createHtmlElement = (): HtmlElement => ({
      tag: "",
      attributes: {},
      children: [],
      render: function () {
        const renderChild = (child: HtmlElement | string): string =>
          typeof child === "string" ? child : child.render();

        const attrs = Object.entries(this.attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        const childrenHtml = this.children.map(renderChild).join("");

        return `<${this.tag}${attrs ? ` ${attrs}` : ""}>${childrenHtml}</${
          this.tag
        }>`;
      },
    });

    // 3. Build an HTML tree declaratively using a fluent, chained API
    const rootBuilder = createBuilder<HtmlElement>(htmlCapabilities);

    rootBuilder
      .apply("init", "html", {})
      .apply("element", "body")
      .apply("element", "div", { id: "main" })
      .apply("element", "p", { class: "greeting" })
      .apply("text", "Hello, Builder!");

    // 4. Get the final pipeline and run it
    const product = await rootBuilder.build(createHtmlElement());

    // 5. Assert the final rendered HTML string
    const expected =
      '<html><body><div id="main"><p class="greeting">Hello, Builder!</p></div></body></html>';
    expect(product.render()).toEqual(expected);
  });

  it("should provide a fluent, proxy-based API for a recursive builder", async () => {
    // 1. Define the product structure for an HTML element
    interface HtmlElement {
      tag: string;
      attributes: Record<string, string>;
      children: (HtmlElement | string)[];
      render(): string;
    }

    // 2. Define the capabilities for the HTML builder
    const htmlCapabilities = {
      element: {
        apply: (tag: string, attributes: Record<string, string> = {}) =>
          createBuilder(htmlCapabilities).apply("init", tag, attributes),
        build: async (product: HtmlElement, childBuilder: any) => {
          const childElement = createHtmlElement();
          await childBuilder.build(childElement);
          product.children.push(childElement);
        },
      },
      text: {
        build: (product: HtmlElement, _: any, content: string) => {
          product.children.push(content);
        },
      },
      init: {
        build: (
          product: HtmlElement,
          _: any,
          tag: string,
          attributes: Record<string, string> = {}
        ) => {
          product.tag = tag;
          product.attributes = attributes;
        },
      },
    };

    // Helper function to create a new HtmlElement with the render method
    const createHtmlElement = (): HtmlElement => ({
      tag: "",
      attributes: {},
      children: [],
      render: function () {
        const renderChild = (child: HtmlElement | string): string =>
          typeof child === "string" ? child : child.render();
        const attrs = Object.entries(this.attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");
        const childrenHtml = this.children.map(renderChild).join("");
        return `<${this.tag}${attrs ? ` ${attrs}` : ""}>${childrenHtml}</${
          this.tag
        }>`;
      },
    });

    // 3. Build an HTML tree using the fluent, chained API
    const builder = createFluentBuilder(htmlCapabilities);

    const pBuilder = builder
      .init("html")
      .element("body")
      .element("div", { id: "main" })
      .element("p", { class: "greeting" });

    pBuilder.text("Hello, Fluent Builder!");

    // 4. Get the final pipeline and run it
    const product = await builder.build(createHtmlElement());

    // 5. Assert the final rendered HTML string
    const expected =
      '<html><body><div id="main"><p class="greeting">Hello, Fluent Builder!</p></div></body></html>';
    expect(product.render()).toEqual(expected);
  });
});
