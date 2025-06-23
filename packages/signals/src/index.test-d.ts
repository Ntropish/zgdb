import { expectType, expectError } from "tsd";
import { createSignal, Signal } from "./index";

// Test basic signal creation and types
const stringSignal = createSignal("hello");
expectType<Signal<string>>(stringSignal);
expectType<string>(stringSignal.read());

const numberSignal = createSignal(123);
expectType<Signal<number>>(numberSignal);
expectType<number>(numberSignal.read());

// Test write method
numberSignal.write(456);
expectError(numberSignal.write("not a number"));

// Test subscribe method
const unsubscribe = numberSignal.subscribe((value) => {
  expectType<number>(value);
});
expectType<() => void>(unsubscribe);

// Test readonly - this is now implicit as there's no direct setter
// The following would be a compile-time error if we tried to reassign read, for example.
// stringSignal.read = () => "new";
