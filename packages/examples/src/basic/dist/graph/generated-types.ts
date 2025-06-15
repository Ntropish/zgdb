import type { UserData, FamiliarData, PostData, TagData } from './generated-serializers.js';

export type NodeDataTypeMap = {
  'user': UserData;
  'familiar': FamiliarData;
  'post': PostData;
  'tag': TagData;
};
