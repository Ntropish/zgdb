export function safeStringify(value: any): string {
  if (value === undefined) {
    return '"undefined"';
  }
  const cache = new Set();
  const result = JSON.stringify(
    value,
    (key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (typeof value === "object" && value !== null) {
        if (cache.has(value)) {
          // Circular reference found, return a placeholder
          return "[Circular]";
        }
        // Store value in our collection
        cache.add(value);
      }
      return value;
    },
    2
  );

  if (result === undefined) {
    return '"undefined"';
  }

  return result;
}
