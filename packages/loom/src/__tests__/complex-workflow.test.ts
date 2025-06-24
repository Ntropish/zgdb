import { render, l } from "..";
import { _reset as resetReconciler, useState } from "@tsmk/reconciler";

describe("Loom Complex Application Workflow", () => {
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

  it("should handle a complex user profile update scenario", async () => {
    const ProfileEditor = () => {
      const [user, setUser] = useState({
        name: "John Doe",
        email: "john.doe@example.com",
      });
      const [formState, setFormState] = useState({ name: "", email: "" });
      const [isEditing, setIsEditing] = useState(false);
      const [status, setStatus] = useState("Idle");

      const handleEdit = () => {
        setFormState(user);
        setIsEditing(true);
      };

      const handleSave = async () => {
        setStatus("Saving...");
        await new Promise((resolve) => setTimeout(resolve, 50));
        setUser(formState);
        setIsEditing(false);
        setStatus("Saved!");
      };

      const handleCancel = () => {
        setIsEditing(false);
      };

      if (!isEditing) {
        return l.div({}, [
          l.p({ "data-testid": "user-name" }, `Name: ${user.name}`),
          l.p({}, `Email: ${user.email}`),
          l.button(
            { onclick: handleEdit, "data-testid": "edit-button" },
            "Edit"
          ),
          l.p({ "data-testid": "status" }, `Status: ${status}`),
        ]);
      }

      return l.div({}, [
        l.div({}, [
          l.label({}, "Name: "),
          l.input({
            "data-testid": "name-input",
            value: formState.name,
            oninput: (e: any) =>
              setFormState({ ...formState, name: e.target.value }),
          }),
        ]),
        l.button({ onclick: handleSave, "data-testid": "save-button" }, "Save"),
        l.button(
          { onclick: handleCancel, "data-testid": "cancel-button" },
          "Cancel"
        ),
        l.p({ "data-testid": "status" }, `Status: ${status}`),
      ]);
    };

    render(l(ProfileEditor), container);

    // Initial render
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      container.querySelector('[data-testid="user-name"]')?.textContent
    ).toBe("Name: John Doe");
    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(
      "Status: Idle"
    );

    // Click edit
    (
      container.querySelector(
        '[data-testid="edit-button"]'
      ) as HTMLButtonElement
    ).click();

    // Allow the DOM to update
    await new Promise((resolve) => setTimeout(resolve, 50));

    const nameInput = container.querySelector(
      '[data-testid="name-input"]'
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("John Doe");

    // Change name and save
    nameInput.value = "Jane Doe";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    (
      container.querySelector(
        '[data-testid="save-button"]'
      ) as HTMLButtonElement
    ).click();

    // Check saving status
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(
      "Status: Saving..."
    );

    // Check final state after save
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      container.querySelector('[data-testid="user-name"]')?.textContent
    ).toBe("Name: Jane Doe");
    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(
      "Status: Saved!"
    );

    // Edit again, but cancel
    (
      container.querySelector(
        '[data-testid="edit-button"]'
      ) as HTMLButtonElement
    ).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const nameInput2 = container.querySelector(
      '[data-testid="name-input"]'
    ) as HTMLInputElement;
    nameInput2.value = "Will Smit";
    await new Promise((resolve) => setTimeout(resolve, 50));
    nameInput2.value = "Will Smith";
    nameInput2.dispatchEvent(new Event("input", { bubbles: true }));
    (
      container.querySelector(
        '[data-testid="cancel-button"]'
      ) as HTMLButtonElement
    ).click();

    // Check that the state reverted
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      container.querySelector('[data-testid="user-name"]')?.textContent
    ).toBe("Name: Jane Doe");
  });
});
