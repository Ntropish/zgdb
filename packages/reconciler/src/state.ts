import { Fiber } from "./fiber";
import { HostConfig } from "./hostConfig";

// This file centralizes the mutable state of the reconciler.
// Instead of exporting the raw `let` variables, we export getters and setters
// to make state modifications more explicit and traceable.

let _nextUnitOfWork: Fiber | null = null;
let _currentRoot: Fiber | null = null;
let _workInProgressRoot: Fiber | null = null;
let _deletions: Fiber[] | null = null;
let _currentlyRenderingFiber: Fiber | null = null;
let _hookIndex = 0;
let __hostConfig: HostConfig | null = null;
let _renderCallback: (() => void) | undefined;

export const getNextUnitOfWork = () => _nextUnitOfWork;
export const setNextUnitOfWork = (fiber: Fiber | null) => {
  _nextUnitOfWork = fiber;
};

export const getCurrentRoot = () => _currentRoot;
export const setCurrentRoot = (fiber: Fiber | null) => {
  _currentRoot = fiber;
};

export const getWorkInProgressRoot = () => _workInProgressRoot;
export const setWorkInProgressRoot = (fiber: Fiber | null) => {
  _workInProgressRoot = fiber;
};

export const getDeletions = () => _deletions;
export const setDeletions = (newDeletions: Fiber[] | null) => {
  _deletions = newDeletions;
};
export const addDeletion = (deletion: Fiber) => {
  if (!_deletions) {
    _deletions = [];
  }
  _deletions.push(deletion);
};

export const getCurrentlyRenderingFiber = () => _currentlyRenderingFiber;
export const setCurrentlyRenderingFiber = (fiber: Fiber | null) => {
  _currentlyRenderingFiber = fiber;
};

export const getHookIndex = () => _hookIndex;
export const setHookIndex = (index: number) => {
  _hookIndex = index;
};
export const incrementHookIndex = () => {
  _hookIndex++;
};

export const getHostConfig = () => __hostConfig;
export const setHostConfig = (config: HostConfig | null) => {
  __hostConfig = config;
};

export const getRenderCallback = () => _renderCallback;
export const setRenderCallback = (cb: (() => void) | undefined) => {
  _renderCallback = cb;
};
