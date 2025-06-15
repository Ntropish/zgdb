import { Builder, ByteBuffer } from 'flatbuffers';
import { z } from 'zod';
import { User } from './graph-db/user.js';
import { Familiar } from './graph-db/familiar.js';
import { Post } from './graph-db/post.js';
import { Tag } from './graph-db/tag.js';
import GraphSchema from './graph-schema.js';

// ============================================
//  Node Data Types
// ============================================
export type UserData = {
  id: string;
  type: 'user';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.user['fields']>;
  relationIds: {
    posts: string[];
    familiars: string[];
  };
};

export type FamiliarData = {
  id: string;
  type: 'familiar';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.familiar['fields']>;
  relationIds: {
    user: string;
  };
};

export type PostData = {
  id: string;
  type: 'post';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.post['fields']>;
  relationIds: {
    tags: string[];
    author: string;
  };
};

export type TagData = {
  id: string;
  type: 'tag';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.tag['fields']>;
  relationIds: {
    posts: string[];
  };
};


// ============================================
//  Supported Node Types
// ============================================
export const supportedNodeTypes = ['user', 'familiar', 'post', 'tag'] as const;

// ============================================
//  Serialize Logic
// ============================================
export const serializeNode = {
  user: (node: UserData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const postsIdOffsets = (node.relationIds.posts || []).map(id => builder.createString(id));
    const postsIdsVectorOffset = User.createPostsIdsVector(builder, postsIdOffsets);
    const familiarsIdOffsets = (node.relationIds.familiars || []).map(id => builder.createString(id));
    const familiarsIdsVectorOffset = User.createFamiliarsIdsVector(builder, familiarsIdOffsets);

    User.startUser(builder);
    User.addId(builder, idOffset);
    User.addCreatedAt(builder, BigInt(node.createdAt));
    User.addUpdatedAt(builder, BigInt(node.updatedAt));
    User.addName(builder, nameOffset);
    User.addAge(builder, node.fields.age);
    User.addPostsIds(builder, postsIdsVectorOffset);
    User.addFamiliarsIds(builder, familiarsIdsVectorOffset);
    const userOffset = User.endUser(builder);
    builder.finish(userOffset);
    return builder.asUint8Array();
  },
  familiar: (node: FamiliarData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const userIdOffsets = (node.relationIds.user ? [node.relationIds.user] : []).map(id => builder.createString(id));
    const userIdsVectorOffset = Familiar.createUserIdsVector(builder, userIdOffsets);

    Familiar.startFamiliar(builder);
    Familiar.addId(builder, idOffset);
    Familiar.addCreatedAt(builder, BigInt(node.createdAt));
    Familiar.addUpdatedAt(builder, BigInt(node.updatedAt));
    Familiar.addName(builder, nameOffset);
    Familiar.addAge(builder, node.fields.age);
    Familiar.addUserIds(builder, userIdsVectorOffset);
    const familiarOffset = Familiar.endFamiliar(builder);
    builder.finish(familiarOffset);
    return builder.asUint8Array();
  },
  post: (node: PostData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const titleOffset = builder.createString(node.fields.title || '');
    const contentOffset = builder.createString(node.fields.content || '');
    const tagsIdOffsets = (node.relationIds.tags || []).map(id => builder.createString(id));
    const tagsIdsVectorOffset = Post.createTagsIdsVector(builder, tagsIdOffsets);
    const authorIdOffsets = (node.relationIds.author ? [node.relationIds.author] : []).map(id => builder.createString(id));
    const authorIdsVectorOffset = Post.createAuthorIdsVector(builder, authorIdOffsets);

    Post.startPost(builder);
    Post.addId(builder, idOffset);
    Post.addCreatedAt(builder, BigInt(node.createdAt));
    Post.addUpdatedAt(builder, BigInt(node.updatedAt));
    Post.addTitle(builder, titleOffset);
    Post.addContent(builder, contentOffset);
    Post.addPublished(builder, node.fields.published);
    Post.addViewCount(builder, node.fields.viewCount);
    Post.addTagsIds(builder, tagsIdsVectorOffset);
    Post.addAuthorIds(builder, authorIdsVectorOffset);
    const postOffset = Post.endPost(builder);
    builder.finish(postOffset);
    return builder.asUint8Array();
  },
  tag: (node: TagData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const postsIdOffsets = (node.relationIds.posts || []).map(id => builder.createString(id));
    const postsIdsVectorOffset = Tag.createPostsIdsVector(builder, postsIdOffsets);

    Tag.startTag(builder);
    Tag.addId(builder, idOffset);
    Tag.addCreatedAt(builder, BigInt(node.createdAt));
    Tag.addUpdatedAt(builder, BigInt(node.updatedAt));
    Tag.addName(builder, nameOffset);
    Tag.addPostsIds(builder, postsIdsVectorOffset);
    const tagOffset = Tag.endTag(builder);
    builder.finish(tagOffset);
    return builder.asUint8Array();
  },
};

// ============================================
//  Deserialize Logic
// ============================================
export const deserializeNode = {
  user: (buffer: Uint8Array): UserData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = User.getRootAsUser(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    fields.age = node.age();
    const relationIds: any = {};
    const postsIds = Array.from({ length: node.postsIdsLength() }, (_, i) => node.postsIds(i));
    relationIds.posts = postsIds;
    const familiarsIds = Array.from({ length: node.familiarsIdsLength() }, (_, i) => node.familiarsIds(i));
    relationIds.familiars = familiarsIds;
    return {
      id: node.id()!,
      type: 'user',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as UserData['fields'],
      relationIds: relationIds as UserData['relationIds'],
    };
  },
  familiar: (buffer: Uint8Array): FamiliarData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Familiar.getRootAsFamiliar(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    fields.age = node.age();
    const relationIds: any = {};
    const userIds = Array.from({ length: node.userIdsLength() }, (_, i) => node.userIds(i));
    relationIds.user = userIds[0] || '';
    return {
      id: node.id()!,
      type: 'familiar',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as FamiliarData['fields'],
      relationIds: relationIds as FamiliarData['relationIds'],
    };
  },
  post: (buffer: Uint8Array): PostData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Post.getRootAsPost(byteBuffer);
    const fields: any = {};
    fields.title = node.title();
    fields.content = node.content();
    fields.published = node.published();
    fields.viewCount = node.viewCount();
    const relationIds: any = {};
    const tagsIds = Array.from({ length: node.tagsIdsLength() }, (_, i) => node.tagsIds(i));
    relationIds.tags = tagsIds;
    const authorIds = Array.from({ length: node.authorIdsLength() }, (_, i) => node.authorIds(i));
    relationIds.author = authorIds[0] || '';
    return {
      id: node.id()!,
      type: 'post',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as PostData['fields'],
      relationIds: relationIds as PostData['relationIds'],
    };
  },
  tag: (buffer: Uint8Array): TagData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Tag.getRootAsTag(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    const relationIds: any = {};
    const postsIds = Array.from({ length: node.postsIdsLength() }, (_, i) => node.postsIds(i));
    relationIds.posts = postsIds;
    return {
      id: node.id()!,
      type: 'tag',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as TagData['fields'],
      relationIds: relationIds as TagData['relationIds'],
    };
  },
};