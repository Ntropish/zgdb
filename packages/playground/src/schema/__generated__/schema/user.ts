// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';



export class User {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):User {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUser(bb:flatbuffers.ByteBuffer, obj?:User):User {
  return (obj || new User()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUser(bb:flatbuffers.ByteBuffer, obj?:User):User {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new User()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():string|null
id(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
id(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

publicKey():string|null
publicKey(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
publicKey(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

displayName():string|null
displayName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
displayName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

avatarUrl():string|null
avatarUrl(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
avatarUrl(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startUser(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addId(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, idOffset, 0);
}

static addPublicKey(builder:flatbuffers.Builder, publicKeyOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, publicKeyOffset, 0);
}

static addDisplayName(builder:flatbuffers.Builder, displayNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, displayNameOffset, 0);
}

static addAvatarUrl(builder:flatbuffers.Builder, avatarUrlOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, avatarUrlOffset, 0);
}

static endUser(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static finishUserBuffer(builder:flatbuffers.Builder, offset:flatbuffers.Offset) {
  builder.finish(offset);
}

static finishSizePrefixedUserBuffer(builder:flatbuffers.Builder, offset:flatbuffers.Offset) {
  builder.finish(offset, undefined, true);
}

static createUser(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset, publicKeyOffset:flatbuffers.Offset, displayNameOffset:flatbuffers.Offset, avatarUrlOffset:flatbuffers.Offset):flatbuffers.Offset {
  User.startUser(builder);
  User.addId(builder, idOffset);
  User.addPublicKey(builder, publicKeyOffset);
  User.addDisplayName(builder, displayNameOffset);
  User.addAvatarUrl(builder, avatarUrlOffset);
  return User.endUser(builder);
}
}
