import { expectType, expectError } from "tsd";
import { createSignal, Signal } from "./index";

// Test basic signal creation and types
const stringSignal = createSignal("hello");
expectType<Signal<string>>(stringSignal);
expectType<string>(stringSignal.value);

const numberSignal = createSignal(123);
expectType<Signal<number>>(numberSignal);
expectType<number>(numberSignal.value);

// Test set method
numberSignal.set(456);
expectError(numberSignal.set("not a number"));

// Test subscribe method
const unsubscribe = numberSignal.subscribe(({ value, oldValue }) => {
  expectType<number>(value);
  expectType<number>(oldValue);
});
expectType<() => void>(unsubscribe);

// Test readonly value
expectError((stringSignal.value = "new value"));
