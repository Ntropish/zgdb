/**
 * Performs a deep equality check between two values.
 * Supports primitives, objects, and arrays.
 * @param a The first value.
 * @param b The second value.
 * @returns True if the values are deeply equal, false otherwise.
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a.constructor !== b.constructor) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (a instanceof Object) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      if (!keysA.every((key) => keysB.includes(key))) return false;

      for (const key of keysA) {
        if (!deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
  }

  return false;
}
