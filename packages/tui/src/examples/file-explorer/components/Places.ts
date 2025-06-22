import { VNode } from "@tsmk/kernel";
import { box, text } from "../../../ui.js";
import { FlexDirection } from "yoga-layout";

export type Place = { name: string; path: string };

export type PlacesProps = {
  isFocused: boolean;
  onSelect: (path: string) => void;
  places: Place[];
  selectedIndex: number;
};

export const Places = (props: PlacesProps): VNode => {
  return box({
    border: { type: "single" },
    isFocused: props.isFocused,
    flexDirection: FlexDirection.Column,
    padding: 1,
    children: props.places.map((place, index) =>
      text({
        style:
          index === props.selectedIndex
            ? { bg: "blue", fg: "white" }
            : undefined,
        content: place.name,
      })
    ),
  });
};
