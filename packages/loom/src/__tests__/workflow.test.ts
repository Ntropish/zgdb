import { render, l } from "..";
import { _reset as resetReconciler, useState } from "@tsmk/reconciler";

describe("Loom Application Workflow", () => {
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

  it("should handle a todo list scenario", async () => {
    const TodoApp = () => {
      const [todos, setTodos] = useState(["first todo", "second todo"]);
      const [text, setText] = useState("");

      const addTodo = () => {
        if (text) {
          setTodos([...todos, text]);
          setText("");
        }
      };

      const removeTodo = (index: number) => {
        setTodos(todos.filter((_, i) => i !== index));
      };

      return l.div({}, [
        l.input({
          type: "text",
          value: text,
          oninput: (e: any) => setText(e.target.value),
          "data-testid": "todo-input",
        }),
        l.button({ onclick: addTodo, "data-testid": "add-button" }, "Add"),
        l.ul(
          { "data-testid": "todo-list" },
          todos.map((todo, index) =>
            l.li({ key: index }, [
              todo,
              l.button(
                {
                  onclick: () => removeTodo(index),
                  "data-testid": `delete-button-${index}`,
                },
                "Delete"
              ),
            ])
          )
        ),
      ]);
    };

    render(l(TodoApp), container);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const list = container.querySelector('[data-testid="todo-list"]');
    expect(list?.children.length).toBe(2);
    expect(list?.children[0].textContent).toContain("first todo");
    expect(list?.children[1].textContent).toContain("second todo");

    // Add a new todo
    const input = container.querySelector(
      '[data-testid="todo-input"]'
    ) as HTMLInputElement;
    const addButton = container.querySelector(
      '[data-testid="add-button"]'
    ) as HTMLButtonElement;

    input.value = "third todo";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    addButton.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(list?.children.length).toBe(3);
    expect(list?.children[2].textContent).toContain("third todo");

    // Remove the first todo
    const deleteButton = container.querySelector(
      '[data-testid="delete-button-0"]'
    ) as HTMLButtonElement;
    deleteButton.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(list?.children.length).toBe(2);
    expect(list?.children[0].textContent).toContain("second todo");
    expect(list?.children[1].textContent).toContain("third todo");
  });
});
