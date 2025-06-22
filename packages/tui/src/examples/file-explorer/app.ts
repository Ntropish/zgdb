import { ComponentFactory, VNode } from "@tsmk/kernel";
import { createSignal } from "@tsmk/signals";
import { use } from "@tsmk/reconciler";
import { Key } from "@tsmk/tty";
import { FileExplorer } from "./components/FileExplorer.js";
import { Places } from "./components/Places.js";
import { box, createText } from "../../ui.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { FlexDirection } from "yoga-layout";

type File = { name: string; isDirectory: boolean };
type Place = { name: string; path: string };

const focusedId = createSignal<"places" | "fileExplorer">("fileExplorer");
const currentPath = createSignal(process.cwd());
const files = createSignal<File[]>([]);
const selectedIndex = createSignal(0);
const scrollTop = createSignal(0);
const errorMessage = createSignal<string | null>(null);

const places = createSignal<Place[]>([
  { name: "Home", path: os.homedir() },
  { name: "Root", path: "/" },
]);
const selectedPlaceIndex = createSignal(0);

// --- Side Effect Subscription ---
// When the current path changes, we subscribe to it and load the new directory contents.
currentPath.subscribe(async (pathVal) => {
  try {
    const dirContents = await fs.readdir(pathVal, {
      withFileTypes: true,
    });
    files.write(
      dirContents.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory(),
      }))
    );
    selectedIndex.write(0);
    scrollTop.write(0);
    errorMessage.write(null);
  } catch (err: any) {
    errorMessage.write(err.message);
    files.write([]);
  }
});
// Trigger initial load
currentPath.write(process.cwd());

export const App: ComponentFactory = () => {
  const focused = use(focusedId);
  const filesValue = use(files);
  const selected = use(selectedIndex);
  const scroll = use(scrollTop);
  const error = use(errorMessage);
  const pathValue = use(currentPath);
  const placesValue = use(places);
  const selectedPlace = use(selectedPlaceIndex);

  const handleKeyPress = (key: Key) => {
    if (key.name === "tab") {
      focusedId.write(focused === "fileExplorer" ? "places" : "fileExplorer");
      return;
    }

    if (focused === "fileExplorer") {
      let newIndex = selected;
      if (key.name === "up") newIndex = Math.max(0, newIndex - 1);
      if (key.name === "down")
        newIndex = Math.min(filesValue.length - 1, newIndex + 1);
      selectedIndex.write(newIndex);
      // TODO: Add scroll logic

      if (key.name === "enter") {
        const file = filesValue[newIndex];
        if (file?.isDirectory) {
          currentPath.write(path.join(pathValue, file.name));
        }
      } else if (key.name === "backspace") {
        currentPath.write(path.dirname(pathValue));
      }
    } else if (focused === "places") {
      let newIndex = selectedPlace;
      if (key.name === "up") newIndex = Math.max(0, newIndex - 1);
      if (key.name === "down")
        newIndex = Math.min(placesValue.length - 1, newIndex + 1);
      selectedPlaceIndex.write(newIndex);

      if (key.name === "enter") {
        const place = placesValue[newIndex];
        if (place) {
          currentPath.write(place.path);
          focusedId.write("fileExplorer");
        }
      }
    }
  };

  return box({
    onKeyPress: (e: any) => handleKeyPress(e.detail.key),
    isFocused: true,
    focusable: true,
    flexDirection: FlexDirection.Row,
    width: "100%",
    height: "100%",
    children: [
      box({
        flexBasis: "20%",
        borderRightWidth: 1,
        children: [
          {
            factory: Places,
            props: {
              isFocused: focused === "places",
              onSelect: (path: string) => currentPath.write(path),
              places: placesValue,
              selectedIndex: selectedPlace,
            },
          },
        ],
      }),
      box({
        flexGrow: 1,
        children: [
          {
            factory: FileExplorer,
            props: {
              isFocused: focused === "fileExplorer",
              path: pathValue,
              files: filesValue,
              selectedIndex: selected,
              scrollTop: scroll,
              errorMessage: error,
            },
          },
        ],
      }),
    ],
  });
};
