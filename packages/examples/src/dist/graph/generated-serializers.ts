import * as flatbuffers from 'flatbuffers';
import { NodeData, Edge, FlatBufferSerializers } from './interfaces';
import { User, Familiar, Post, Tag, PostTagEdge } from './graph-db';

export class GeneratedFlatBufferSerializers implements FlatBufferSerializers {

  serializeNode(type: string, data: NodeData): Uint8Array {
    const builder = new flatbuffers.Builder(1024);
    let root: number;

    switch (type) {
      case 'user': {
        const id = builder.createString(data.id);
        const name = builder.createString(data.fields.name);
        let postsVector: number | undefined;
        if (data.relationIds.posts) {
          const relationIds = (data.relationIds.posts as string[]).map(id => builder.createString(id));
          postsVector = User.createPostsIdsVector(builder, relationIds);
        }
        let familiarsVector: number | undefined;
        if (data.relationIds.familiars) {
          const relationIds = (data.relationIds.familiars as string[]).map(id => builder.createString(id));
          familiarsVector = User.createFamiliarsIdsVector(builder, relationIds);
        }

        User.startUser(builder);
        User.addId(builder, id);
        User.addName(builder, name);
        User.addAge(builder, data.fields.age);
        User.addCreatedAt(builder, BigInt(data.createdAt));
        User.addUpdatedAt(builder, BigInt(data.updatedAt));
        if (postsVector) {
            User.addPostsIds(builder, postsVector);
        }
        if (familiarsVector) {
            User.addFamiliarsIds(builder, familiarsVector);
        }
        root = User.endUser(builder);
        break;
      }
      case 'familiar': {
        const id = builder.createString(data.id);
        const name = builder.createString(data.fields.name);
        let userVector: number | undefined;
        if (data.relationIds.user) {
          const relationIds = (data.relationIds.user as string[]).map(id => builder.createString(id));
          userVector = Familiar.createUserIdsVector(builder, relationIds);
        }

        Familiar.startFamiliar(builder);
        Familiar.addId(builder, id);
        Familiar.addName(builder, name);
        Familiar.addAge(builder, data.fields.age);
        Familiar.addCreatedAt(builder, BigInt(data.createdAt));
        Familiar.addUpdatedAt(builder, BigInt(data.updatedAt));
        if (userVector) {
            Familiar.addUserIds(builder, userVector);
        }
        root = Familiar.endFamiliar(builder);
        break;
      }
      case 'post': {
        const id = builder.createString(data.id);
        const title = builder.createString(data.fields.title);
        let tagsVector: number | undefined;
        if (data.relationIds.tags) {
          const relationIds = (data.relationIds.tags as string[]).map(id => builder.createString(id));
          tagsVector = Post.createTagsIdsVector(builder, relationIds);
        }
        let authorVector: number | undefined;
        if (data.relationIds.author) {
          const relationIds = (data.relationIds.author as string[]).map(id => builder.createString(id));
          authorVector = Post.createAuthorIdsVector(builder, relationIds);
        }

        Post.startPost(builder);
        Post.addId(builder, id);
        Post.addTitle(builder, title);
        Post.addPublished(builder, data.fields.published);
        Post.addViewCount(builder, data.fields.viewCount);
        Post.addCreatedAt(builder, BigInt(data.createdAt));
        Post.addUpdatedAt(builder, BigInt(data.updatedAt));
        if (tagsVector) {
            Post.addTagsIds(builder, tagsVector);
        }
        if (authorVector) {
            Post.addAuthorIds(builder, authorVector);
        }
        root = Post.endPost(builder);
        break;
      }
      case 'tag': {
        const id = builder.createString(data.id);
        const name = builder.createString(data.fields.name);
        let postsVector: number | undefined;
        if (data.relationIds.posts) {
          const relationIds = (data.relationIds.posts as string[]).map(id => builder.createString(id));
          postsVector = Tag.createPostsIdsVector(builder, relationIds);
        }

        Tag.startTag(builder);
        Tag.addId(builder, id);
        Tag.addName(builder, name);
        Tag.addCreatedAt(builder, BigInt(data.createdAt));
        Tag.addUpdatedAt(builder, BigInt(data.updatedAt));
        if (postsVector) {
            Tag.addPostsIds(builder, postsVector);
        }
        root = Tag.endTag(builder);
        break;
      }
      default:
        throw new Error(`Unknown node type: ${type}`);
    }

    builder.finish(root);
    return builder.asUint8Array();
  }

  deserializeNode(type: string, buffer: Uint8Array): NodeData {
    const buf = new flatbuffers.ByteBuffer(buffer);

    switch (type) {
      case 'user': {
        const table = User.getRootAsUser(buf);
        const relationIds: Record<string, string | string[]> = {};
        const postsLength = table.postsIdsLength();
        if(postsLength > 0) {
          relationIds.posts = Array.from({ length: postsLength }, (_, i) => table.postsIds(i)!);
        }
        const familiarsLength = table.familiarsIdsLength();
        if(familiarsLength > 0) {
          relationIds.familiars = Array.from({ length: familiarsLength }, (_, i) => table.familiarsIds(i)!);
        }
        return {
          id: table.id()!,
          type: 'user',
          createdAt: Number(table.createdAt()),
          updatedAt: Number(table.updatedAt()),
          fields: {
            name: table.name()!,
            age: table.age()!
          },
          relationIds
        };
      }
      case 'familiar': {
        const table = Familiar.getRootAsFamiliar(buf);
        const relationIds: Record<string, string | string[]> = {};
        const userLength = table.userIdsLength();
        if(userLength > 0) {
          relationIds.user = Array.from({ length: userLength }, (_, i) => table.userIds(i)!);
        }
        return {
          id: table.id()!,
          type: 'familiar',
          createdAt: Number(table.createdAt()),
          updatedAt: Number(table.updatedAt()),
          fields: {
            name: table.name()!,
            age: table.age()!
          },
          relationIds
        };
      }
      case 'post': {
        const table = Post.getRootAsPost(buf);
        const relationIds: Record<string, string | string[]> = {};
        const tagsLength = table.tagsIdsLength();
        if(tagsLength > 0) {
          relationIds.tags = Array.from({ length: tagsLength }, (_, i) => table.tagsIds(i)!);
        }
        const authorLength = table.authorIdsLength();
        if(authorLength > 0) {
          relationIds.author = Array.from({ length: authorLength }, (_, i) => table.authorIds(i)!);
        }
        return {
          id: table.id()!,
          type: 'post',
          createdAt: Number(table.createdAt()),
          updatedAt: Number(table.updatedAt()),
          fields: {
            title: table.title()!,
            published: table.published()!,
            viewCount: table.viewCount()!
          },
          relationIds
        };
      }
      case 'tag': {
        const table = Tag.getRootAsTag(buf);
        const relationIds: Record<string, string | string[]> = {};
        const postsLength = table.postsIdsLength();
        if(postsLength > 0) {
          relationIds.posts = Array.from({ length: postsLength }, (_, i) => table.postsIds(i)!);
        }
        return {
          id: table.id()!,
          type: 'tag',
          createdAt: Number(table.createdAt()),
          updatedAt: Number(table.updatedAt()),
          fields: {
            name: table.name()!
          },
          relationIds
        };
      }
      default:
        throw new Error(`Unknown node type: ${type}`);
    }
  }

  serializeEdge(edge: Edge): Uint8Array { throw new Error('Not implemented'); }

  deserializeEdge(buffer: Uint8Array): Edge { throw new Error('Not implemented'); }

  getSupportedNodeTypes(): string[] {
    return ['user', 'familiar', 'post', 'tag'];
  }

  getSupportedEdgeTypes(): string[] {
    return ['post_tag_edge'];
  }
}
