import { GeneratedFlatBufferSerializers } from "./dist/graph/generated-serializers";
import { ProllyStorage } from "@zgdb/runtime";
import { PTree } from "prolly-gunna";

const serializers = new GeneratedFlatBufferSerializers();
const storage = new ProllyStorage(serializers, new PTree());

storage.setNode({
  id: "1",
  type: "user",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  fields: {
    name: "John Doe",
  },
  relationIds: {
    posts: [],
    familiars: [],
  },
});
