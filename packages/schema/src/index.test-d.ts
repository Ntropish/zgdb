import { expectType } from "tsd";
import { s, validate } from "./s";
import { Schema, ValidationIssue } from "./index";

// Test schema creation and type
const stringSchema = s.string;
expectType<Schema<string, string>>(stringSchema);

const numberSchema = s.number;
expectType<Schema<number, number>>(numberSchema);

// Test validate function type inference
async function testValidation() {
  const strResult = await validate(s.string, "hello");
  if (strResult.success) {
    expectType<string>(strResult.data);
  } else {
    expectType<ValidationIssue[]>(strResult.error);
  }

  const numResult = await validate(s.number, 123);
  if (numResult.success) {
    expectType<number>(numResult.data);
  }
}

// Test schema composition
const composedSchema = s(s.string);
expectType<Schema<string, string>>(composedSchema);
