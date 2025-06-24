import { h } from "./h";

/**
 * The `l` export is the public alias for the hyperscript function `h`,
 * used for creating VNodes in a user-friendly way.
 * e.g., l('div', { id: 'foo' }, 'Hello')
 */
export const l = h;

// Export the main render function from the DOM implementation.
export { render } from "./dom";

/**
 * Re-export the hooks from the reconciler. This is a convenience so that
 * end-users only need to import from a single package (`@tsmk/loom`) to
 * build components.
 */
export { useState, useEffect, use } from "@tsmk/reconciler";
