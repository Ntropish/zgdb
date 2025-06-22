import { Mouse, Key } from "./types.js";

const SGR_MOUSE_REGEX = /^\x1b\[<(\d+);(\d+);(\d+)([mM])$/;

const KEY_SEQUENCES: { [key: string]: Omit<Key, "sequence"> } = {
  "\r": { name: "enter", ctrl: false, alt: false, shift: false },
  "\n": { name: "enter", ctrl: false, alt: false, shift: false },
  "\t": { name: "tab", ctrl: false, alt: false, shift: false },
  "\b": { name: "backspace", ctrl: false, alt: false, shift: false },
  "\x7f": { name: "backspace", ctrl: false, alt: false, shift: false },
  "\x1b": { name: "escape", ctrl: false, alt: false, shift: false },
  " ": { name: "space", ctrl: false, alt: false, shift: false },

  // Arrows
  "\x1b[A": { name: "up", ctrl: false, alt: false, shift: false },
  "\x1b[B": { name: "down", ctrl: false, alt: false, shift: false },
  "\x1b[C": { name: "right", ctrl: false, alt: false, shift: false },
  "\x1b[D": { name: "left", ctrl: false, alt: false, shift: false },

  // Shift + Tab
  "\x1b[Z": { name: "backtab", ctrl: false, alt: false, shift: true },

  // Special keys
  "\x1b[1~": { name: "home", ctrl: false, alt: false, shift: false },
  "\x1b[4~": { name: "end", ctrl: false, alt: false, shift: false },
  "\x1b[5~": { name: "pageup", ctrl: false, alt: false, shift: false },
  "\x1b[6~": { name: "pagedown", ctrl: false, alt: false, shift: false },
  "\x1b[7~": { name: "home", ctrl: false, alt: false, shift: false }, // xterm
  "\x1b[8~": { name: "end", ctrl: false, alt: false, shift: false }, // xterm

  // Function keys
  "\x1bOP": { name: "f1", ctrl: false, alt: false, shift: false },
  "\x1bOQ": { name: "f2", ctrl: false, alt: false, shift: false },
  "\x1bOR": { name: "f3", ctrl: false, alt: false, shift: false },
  "\x1bOS": { name: "f4", ctrl: false, alt: false, shift: false },
  "\x1b[15~": { name: "f5", ctrl: false, alt: false, shift: false },
  "\x1b[17~": { name: "f6", ctrl: false, alt: false, shift: false },
  "\x1b[18~": { name: "f7", ctrl: false, alt: false, shift: false },
  "\x1b[19~": { name: "f8", ctrl: false, alt: false, shift: false },
  "\x1b[20~": { name: "f9", ctrl: false, alt: false, shift: false },
  "\x1b[21~": { name: "f10", ctrl: false, alt: false, shift: false },
  "\x1b[23~": { name: "f11", ctrl: false, alt: false, shift: false },
  "\x1b[24~": { name: "f12", ctrl: false, alt: false, shift: false },
};

const ALT_SHIFT_CTRL_REGEX = /^\x1b\[(\d+);(\d+)([A-Z])$/;

export function parseKey(s: string): Key | undefined {
  // Option 1: Simple key sequence
  if (KEY_SEQUENCES[s]) {
    return { ...KEY_SEQUENCES[s], sequence: s };
  }

  // Option 2: Ctrl+letter
  if (/^[\x01-\x1A]$/.test(s)) {
    return {
      name: String.fromCharCode(s.charCodeAt(0) + 96),
      sequence: s,
      ctrl: true,
      alt: false,
      shift: false,
    };
  }

  // Option 3: Alt+char
  if (/^\x1b[a-zA-Z]$/.test(s)) {
    return {
      name: s[1],
      sequence: s,
      ctrl: false,
      alt: true,
      shift: false,
    };
  }

  // Option 4: A single character
  if (s.length === 1 && s >= " ") {
    return {
      name: s,
      sequence: s,
      ctrl: false,
      alt: false,
      shift: s.toUpperCase() === s && s.toLowerCase() !== s,
    };
  }

  // Modifier keys (alt, shift, ctrl)
  const modifierMatch = s.match(ALT_SHIFT_CTRL_REGEX);
  if (modifierMatch) {
    const [_, charCode, modifier, key] = modifierMatch;
    // Tilde keys like home, end, pageup, pagedown are not handled here yet
    // but arrow keys with modifiers are.
    const mod = parseInt(modifier, 10);
    const keyName = key.toLowerCase();

    // This mapping is based on common terminal emulator behavior.
    const keyMap: { [key: string]: string } = {
      a: "up",
      b: "down",
      c: "right",
      d: "left",
    };

    return {
      name: keyMap[keyName] || keyName,
      sequence: s,
      shift: (mod - 1) & 1 ? true : false,
      alt: (mod - 1) & 2 ? true : false,
      ctrl: (mod - 1) & 4 ? true : false,
    };
  }

  return undefined;
}

export function parseSgrMouse(sequence: string): Mouse | undefined {
  const match = sequence.match(SGR_MOUSE_REGEX);
  if (!match) {
    return undefined;
  }

  const [_, s_code, s_x, s_y, s_state] = match;
  const code = parseInt(s_code, 10);
  const x = parseInt(s_x, 10) - 1;
  const y = parseInt(s_y, 10) - 1;
  const state = s_state === "m";

  const event: Mouse = {
    type: "mousemove",
    x,
    y,
    button: "none",
    alt: (code & 8) !== 0,
    ctrl: (code & 16) !== 0,
    shift: (code & 4) !== 0,
  };

  const button = code & 3;
  if (code & 64) {
    event.type = "wheel";
    event.button = button === 0 ? "wheelUp" : "wheelDown";
  } else if ((code & 32) !== 0) {
    event.type = "mousemove";
    if (button === 0) {
      event.button = "left";
    } else if (button === 1) {
      event.button = "middle";
    } else if (button === 2) {
      event.button = "right";
    }
  } else if (state) {
    event.type = "mousedown";
  } else {
    event.type = "mouseup";
  }

  if (event.type === "mousedown" || event.type === "mouseup") {
    if (button === 0) {
      event.button = "left";
    } else if (button === 1) {
      event.button = "middle";
    } else if (button === 2) {
      event.button = "right";
    }
  }

  return event;
}
