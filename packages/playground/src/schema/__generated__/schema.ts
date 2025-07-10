// @generated
// Automatically generated. Don't change this file manually.
// Name: schema.ts



// --- Imports ---
import { 
  ZgClient, 
  ZgTransaction, 
  ZgBaseNode, 
  ZgDatabase, 
  ZgAuthContext,
  NodeSchema,
  ZgCollection,
  ZgDbConfiguration,
} from '@zgdb/client';
import { Builder, ByteBuffer } from 'flatbuffers';

import * as UserFB from './schema/user.js';
import * as PostFB from './schema/post.js';
import * as CommentFB from './schema/comment.js';
import * as FollowFB from './schema/follow.js';
import * as ImageMetadataFB from './schema/image-metadata.js';
import * as ImageFB from './schema/image.js';
import * as ReactionFB from './schema/reaction.js';
import * as TagFB from './schema/tag.js';
import * as PostTagFB from './schema/post-tag.js';


// --- Interfaces ---
export interface IUser {
  id: string;
  publicKey: string;
  displayName: string;
  avatarUrl: string;
}

export interface IPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: bigint;
}

export interface IComment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  createdAt: bigint;
}

export interface IFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: bigint;
}

export interface IImageMetadata {
  width: bigint;
  height: bigint;
  format: string;
  createdAt: bigint;
}

export interface IImage {
  id: string;
  url: string;
  fartCount: bigint;
  altText: string;
  metadata: any;
  postId: string;
  userId: string;
}

export interface IReaction {
  id: string;
  type: string;
  authorId: string;
  targetId: string;
  targetType: string;
}

export interface ITag {
  id: string;
  name: string;
}

export interface IPostTag {
  id: string;
  postId: string;
  tagId: string;
}

// --- Create Input Types ---
export type CreateUserInput = { publicKey: string, displayName: string, avatarUrl: string };
export type CreatePostInput = { title: string, content: string, authorId: string, createdAt: bigint };
export type CreateCommentInput = { content: string, authorId: string, postId: string, createdAt: bigint };
export type CreateFollowInput = { followerId: string, followingId: string, createdAt: bigint };
export type CreateImageMetadataInput = { width: bigint, height: bigint, format: string, createdAt: bigint };
export type CreateImageInput = { url: string, fartCount: bigint, altText: string, metadata: any, postId: string, userId: string };
export type CreateReactionInput = { type: string, authorId: string, targetId: string, targetType: string };
export type CreateTagInput = { name: string };
export type CreatePostTagInput = { postId: string, tagId: string };

// --- Node Classes ---

const UserSchema: NodeSchema = {
  name: 'User',
  fields: ['id', 'publicKey', 'displayName', 'avatarUrl'],
  create: (builder, data) => {
      const avatarUrlOffset = data.avatarUrl ? builder.createString(data.avatarUrl) : 0;
      const displayNameOffset = data.displayName ? builder.createString(data.displayName) : 0;
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const publicKeyOffset = data.publicKey ? builder.createString(data.publicKey) : 0;
      UserFB.User.startUser(builder);
      UserFB.User.addAvatarUrl(builder, avatarUrlOffset);
      UserFB.User.addDisplayName(builder, displayNameOffset);
      UserFB.User.addId(builder, idOffset);
      UserFB.User.addPublicKey(builder, publicKeyOffset);
      const entityOffset = UserFB.User.endUser(builder);
      return entityOffset;
   },
  getRootAs: (bb) => UserFB.User.getRootAsUser(bb),
};

export class UserNode<TActor> extends ZgBaseNode<
  UserFB.User,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IUser {
  declare public publicKey: string;
  declare public displayName: string;
  declare public avatarUrl: string;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: UserFB.User,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, UserSchema, authContext);
  }

  // --- Relationships ---
  get posts(): PostNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.posts);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.authorId();
      return fkValue === this.id;
    });
  }

  get comments(): CommentNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.comments);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.authorId();
      return fkValue === this.id;
    });
  }

  get reactions(): ReactionNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.reactions);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.authorId();
      return fkValue === this.id;
    });
  }

  get following(): FollowNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.follows);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.followerId();
      return fkValue === this.id;
    });
  }

  get followers(): FollowNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.follows);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.followingId();
      return fkValue === this.id;
    });
  }
}



const PostSchema: NodeSchema = {
  name: 'Post',
  fields: ['id', 'title', 'content', 'authorId', 'createdAt'],
  create: (builder, data) => {
      const authorIdOffset = data.authorId ? builder.createString(data.authorId) : 0;
      const contentOffset = data.content ? builder.createString(data.content) : 0;
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const titleOffset = data.title ? builder.createString(data.title) : 0;
      PostFB.Post.startPost(builder);
      PostFB.Post.addAuthorId(builder, authorIdOffset);
      PostFB.Post.addContent(builder, contentOffset);
      PostFB.Post.addCreatedAt(builder, BigInt(data.createdAt || 0));
      PostFB.Post.addId(builder, idOffset);
      PostFB.Post.addTitle(builder, titleOffset);
      const entityOffset = PostFB.Post.endPost(builder);
      return entityOffset;
   },
  getRootAs: (bb) => PostFB.Post.getRootAsPost(bb),
};

export class PostNode<TActor> extends ZgBaseNode<
  PostFB.Post,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IPost {
  declare public title: string;
  declare public content: string;
  declare public authorId: string;
  declare public createdAt: bigint;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: PostFB.Post,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, PostSchema, authContext);
  }

  // --- Relationships ---
  get author(): UserNode<TActor> | null {
    const id = this.fbb.authorId();
    if (!id) return null;
    return this.tx.get(
      'User',
       id,
       (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => UserFB.User.getRootAsUser(bb),
       this.authContext
    ) as UserNode<TActor> | null;
  }

  get comments(): CommentNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.comments);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.postId();
      return fkValue === this.id;
    });
  }

  get images(): ImageNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.images);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.postId();
      return fkValue === this.id;
    });
  }

  get reactions(): ReactionNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.reactions);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.targetId();
      return fkValue === this.id;
    });
  }
}



const CommentSchema: NodeSchema = {
  name: 'Comment',
  fields: ['id', 'content', 'authorId', 'postId', 'createdAt'],
  create: (builder, data) => {
      const authorIdOffset = data.authorId ? builder.createString(data.authorId) : 0;
      const contentOffset = data.content ? builder.createString(data.content) : 0;
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const postIdOffset = data.postId ? builder.createString(data.postId) : 0;
      CommentFB.Comment.startComment(builder);
      CommentFB.Comment.addAuthorId(builder, authorIdOffset);
      CommentFB.Comment.addContent(builder, contentOffset);
      CommentFB.Comment.addCreatedAt(builder, BigInt(data.createdAt || 0));
      CommentFB.Comment.addId(builder, idOffset);
      CommentFB.Comment.addPostId(builder, postIdOffset);
      const entityOffset = CommentFB.Comment.endComment(builder);
      return entityOffset;
   },
  getRootAs: (bb) => CommentFB.Comment.getRootAsComment(bb),
};

export class CommentNode<TActor> extends ZgBaseNode<
  CommentFB.Comment,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IComment {
  declare public content: string;
  declare public authorId: string;
  declare public postId: string;
  declare public createdAt: bigint;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: CommentFB.Comment,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, CommentSchema, authContext);
  }

  // --- Relationships ---
  get author(): UserNode<TActor> | null {
    const id = this.fbb.authorId();
    if (!id) return null;
    return this.tx.get(
      'User',
       id,
       (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => UserFB.User.getRootAsUser(bb),
       this.authContext
    ) as UserNode<TActor> | null;
  }

  get post(): PostNode<TActor> | null {
    const id = this.fbb.postId();
    if (!id) return null;
    return this.tx.get(
      'Post',
       id,
       (tx, fbb: PostFB.Post, ac) => new PostNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => PostFB.Post.getRootAsPost(bb),
       this.authContext
    ) as PostNode<TActor> | null;
  }

  get reactions(): ReactionNode<TActor>[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.reactions);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.targetId();
      return fkValue === this.id;
    });
  }
}



const FollowSchema: NodeSchema = {
  name: 'Follow',
  fields: ['id', 'followerId', 'followingId', 'createdAt'],
  create: (builder, data) => {
      const followerIdOffset = data.followerId ? builder.createString(data.followerId) : 0;
      const followingIdOffset = data.followingId ? builder.createString(data.followingId) : 0;
      const idOffset = data.id ? builder.createString(data.id) : 0;
      FollowFB.Follow.startFollow(builder);
      FollowFB.Follow.addCreatedAt(builder, BigInt(data.createdAt || 0));
      FollowFB.Follow.addFollowerId(builder, followerIdOffset);
      FollowFB.Follow.addFollowingId(builder, followingIdOffset);
      FollowFB.Follow.addId(builder, idOffset);
      const entityOffset = FollowFB.Follow.endFollow(builder);
      return entityOffset;
   },
  getRootAs: (bb) => FollowFB.Follow.getRootAsFollow(bb),
};

export class FollowNode<TActor> extends ZgBaseNode<
  FollowFB.Follow,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IFollow {
  declare public followerId: string;
  declare public followingId: string;
  declare public createdAt: bigint;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: FollowFB.Follow,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, FollowSchema, authContext);
  }

  // --- Relationships ---
  get follower(): UserNode<TActor> | null {
    const id = this.fbb.followerId();
    if (!id) return null;
    return this.tx.get(
      'User',
       id,
       (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => UserFB.User.getRootAsUser(bb),
       this.authContext
    ) as UserNode<TActor> | null;
  }

  get following(): UserNode<TActor> | null {
    const id = this.fbb.followingId();
    if (!id) return null;
    return this.tx.get(
      'User',
       id,
       (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => UserFB.User.getRootAsUser(bb),
       this.authContext
    ) as UserNode<TActor> | null;
  }
}



const ImageSchema: NodeSchema = {
  name: 'Image',
  fields: ['id', 'url', 'fartCount', 'altText', 'metadata', 'postId', 'userId'],
  create: (builder, data) => {
      const altTextOffset = data.altText ? builder.createString(data.altText) : 0;
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const metadataOffset = (() => {
        const formatOffset = data.metadata.format ? builder.createString(data.metadata.format) : 0;
        ImageMetadataFB.ImageMetadata.startImageMetadata(builder);
        
        
        ImageMetadataFB.ImageMetadata.addFormat(builder, formatOffset);
        
        return ImageMetadataFB.ImageMetadata.endImageMetadata(builder);
      })();
      const postIdOffset = data.postId ? builder.createString(data.postId) : 0;
      const urlOffset = data.url ? builder.createString(data.url) : 0;
      const userIdOffset = data.userId ? builder.createString(data.userId) : 0;
      ImageFB.Image.startImage(builder);
      ImageFB.Image.addAltText(builder, altTextOffset);
      ImageFB.Image.addFartCount(builder, BigInt(data.fartCount || 0));
      ImageFB.Image.addId(builder, idOffset);
      ImageFB.Image.addMetadata(builder, metadataOffset);
      ImageFB.Image.addPostId(builder, postIdOffset);
      ImageFB.Image.addUrl(builder, urlOffset);
      ImageFB.Image.addUserId(builder, userIdOffset);
      const entityOffset = ImageFB.Image.endImage(builder);
      return entityOffset;
   },
  getRootAs: (bb) => ImageFB.Image.getRootAsImage(bb),
};

export class ImageNode<TActor> extends ZgBaseNode<
  ImageFB.Image,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IImage {
  declare public url: string;
  declare public fartCount: bigint;
  declare public altText: string;
  declare public metadata: any;
  declare public postId: string;
  declare public userId: string;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: ImageFB.Image,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, ImageSchema, authContext);
  }

  // --- Relationships ---
  get post(): PostNode<TActor> | null {
    const id = this.fbb.postId();
    if (!id) return null;
    return this.tx.get(
      'Post',
       id,
       (tx, fbb: PostFB.Post, ac) => new PostNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => PostFB.Post.getRootAsPost(bb),
       this.authContext
    ) as PostNode<TActor> | null;
  }

  get user(): UserNode<TActor> | null {
    const id = this.fbb.userId();
    if (!id) return null;
    return this.tx.get(
      'User',
       id,
       (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => UserFB.User.getRootAsUser(bb),
       this.authContext
    ) as UserNode<TActor> | null;
  }
}



const ReactionSchema: NodeSchema = {
  name: 'Reaction',
  fields: ['id', 'type', 'authorId', 'targetId', 'targetType'],
  create: (builder, data) => {
      const authorIdOffset = data.authorId ? builder.createString(data.authorId) : 0;
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const targetIdOffset = data.targetId ? builder.createString(data.targetId) : 0;
      const targetTypeOffset = data.targetType ? builder.createString(data.targetType) : 0;
      const typeOffset = data.type ? builder.createString(data.type) : 0;
      ReactionFB.Reaction.startReaction(builder);
      ReactionFB.Reaction.addAuthorId(builder, authorIdOffset);
      ReactionFB.Reaction.addId(builder, idOffset);
      ReactionFB.Reaction.addTargetId(builder, targetIdOffset);
      ReactionFB.Reaction.addTargetType(builder, targetTypeOffset);
      ReactionFB.Reaction.addType(builder, typeOffset);
      const entityOffset = ReactionFB.Reaction.endReaction(builder);
      return entityOffset;
   },
  getRootAs: (bb) => ReactionFB.Reaction.getRootAsReaction(bb),
};

export class ReactionNode<TActor> extends ZgBaseNode<
  ReactionFB.Reaction,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IReaction {
  declare public type: string;
  declare public authorId: string;
  declare public targetId: string;
  declare public targetType: string;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: ReactionFB.Reaction,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, ReactionSchema, authContext);
  }

  // --- Relationships ---
  get author(): UserNode<TActor> | null {
    const id = this.fbb.authorId();
    if (!id) return null;
    return this.tx.get(
      'User',
       id,
       (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => UserFB.User.getRootAsUser(bb),
       this.authContext
    ) as UserNode<TActor> | null;
  }
}



const TagSchema: NodeSchema = {
  name: 'Tag',
  fields: ['id', 'name'],
  create: (builder, data) => {
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const nameOffset = data.name ? builder.createString(data.name) : 0;
      TagFB.Tag.startTag(builder);
      TagFB.Tag.addId(builder, idOffset);
      TagFB.Tag.addName(builder, nameOffset);
      const entityOffset = TagFB.Tag.endTag(builder);
      return entityOffset;
   },
  getRootAs: (bb) => TagFB.Tag.getRootAsTag(bb),
};

export class TagNode<TActor> extends ZgBaseNode<
  TagFB.Tag,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements ITag {
  declare public name: string;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: TagFB.Tag,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, TagSchema, authContext);
  }

  // --- Relationships ---

}



const PostTagSchema: NodeSchema = {
  name: 'PostTag',
  fields: ['id', 'postId', 'tagId'],
  create: (builder, data) => {
      const idOffset = data.id ? builder.createString(data.id) : 0;
      const postIdOffset = data.postId ? builder.createString(data.postId) : 0;
      const tagIdOffset = data.tagId ? builder.createString(data.tagId) : 0;
      PostTagFB.PostTag.startPostTag(builder);
      PostTagFB.PostTag.addId(builder, idOffset);
      PostTagFB.PostTag.addPostId(builder, postIdOffset);
      PostTagFB.PostTag.addTagId(builder, tagIdOffset);
      const entityOffset = PostTagFB.PostTag.endPostTag(builder);
      return entityOffset;
   },
  getRootAs: (bb) => PostTagFB.PostTag.getRootAsPostTag(bb),
};

export class PostTagNode<TActor> extends ZgBaseNode<
  PostTagFB.PostTag,
  ZgTransactionWithCollections<TActor>,
  TActor
> implements IPostTag {
  declare public postId: string;
  declare public tagId: string;

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
    fbb: PostTagFB.PostTag,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, PostTagSchema, authContext);
  }

  // --- Relationships ---
  get post(): PostNode<TActor> | null {
    const id = this.fbb.postId();
    if (!id) return null;
    return this.tx.get(
      'Post',
       id,
       (tx, fbb: PostFB.Post, ac) => new PostNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => PostFB.Post.getRootAsPost(bb),
       this.authContext
    ) as PostNode<TActor> | null;
  }

  get tag(): TagNode<TActor> | null {
    const id = this.fbb.tagId();
    if (!id) return null;
    return this.tx.get(
      'Tag',
       id,
       (tx, fbb: TagFB.Tag, ac) => new TagNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => TagFB.Tag.getRootAsTag(bb),
       this.authContext
    ) as TagNode<TActor> | null;
  }
}

// --- Collection Classes ---


export class UserCollection<TActor> extends ZgCollection<UserFB.User, UserNode<TActor>> {
  
  add(data: CreateUserInput & { id: string }): UserNode<TActor> {
    if (!this['tx'].checkPolicy('User', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const publicKeyOffset = data.publicKey ? builder.createString(data.publicKey) : 0;
    const displayNameOffset = data.displayName ? builder.createString(data.displayName) : 0;
    const avatarUrlOffset = data.avatarUrl ? builder.createString(data.avatarUrl) : 0;

    UserFB.User.startUser(builder);
        UserFB.User.addId(builder, idOffset);
    UserFB.User.addPublicKey(builder, publicKeyOffset);
    UserFB.User.addDisplayName(builder, displayNameOffset);
    UserFB.User.addAvatarUrl(builder, avatarUrlOffset);
    const entityOffset = UserFB.User.endUser(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('User', data.id, buffer);

    const fbb = UserFB.User.getRootAsUser(new ByteBuffer(buffer));

    return new UserNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class PostCollection<TActor> extends ZgCollection<PostFB.Post, PostNode<TActor>> {
  
  add(data: CreatePostInput & { id: string }): PostNode<TActor> {
    if (!this['tx'].checkPolicy('Post', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const titleOffset = data.title ? builder.createString(data.title) : 0;
    const contentOffset = data.content ? builder.createString(data.content) : 0;
    const authorIdOffset = data.authorId ? builder.createString(data.authorId) : 0;

    PostFB.Post.startPost(builder);
        PostFB.Post.addId(builder, idOffset);
    PostFB.Post.addTitle(builder, titleOffset);
    PostFB.Post.addContent(builder, contentOffset);
    PostFB.Post.addAuthorId(builder, authorIdOffset);
    PostFB.Post.addCreatedAt(builder, data.createdAt);
    const entityOffset = PostFB.Post.endPost(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('Post', data.id, buffer);

    const fbb = PostFB.Post.getRootAsPost(new ByteBuffer(buffer));

    return new PostNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class CommentCollection<TActor> extends ZgCollection<CommentFB.Comment, CommentNode<TActor>> {
  
  add(data: CreateCommentInput & { id: string }): CommentNode<TActor> {
    if (!this['tx'].checkPolicy('Comment', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const contentOffset = data.content ? builder.createString(data.content) : 0;
    const authorIdOffset = data.authorId ? builder.createString(data.authorId) : 0;
    const postIdOffset = data.postId ? builder.createString(data.postId) : 0;

    CommentFB.Comment.startComment(builder);
        CommentFB.Comment.addId(builder, idOffset);
    CommentFB.Comment.addContent(builder, contentOffset);
    CommentFB.Comment.addAuthorId(builder, authorIdOffset);
    CommentFB.Comment.addPostId(builder, postIdOffset);
    CommentFB.Comment.addCreatedAt(builder, data.createdAt);
    const entityOffset = CommentFB.Comment.endComment(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('Comment', data.id, buffer);

    const fbb = CommentFB.Comment.getRootAsComment(new ByteBuffer(buffer));

    return new CommentNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class FollowCollection<TActor> extends ZgCollection<FollowFB.Follow, FollowNode<TActor>> {
  
  add(data: CreateFollowInput & { id: string }): FollowNode<TActor> {
    if (!this['tx'].checkPolicy('Follow', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const followerIdOffset = data.followerId ? builder.createString(data.followerId) : 0;
    const followingIdOffset = data.followingId ? builder.createString(data.followingId) : 0;

    FollowFB.Follow.startFollow(builder);
        FollowFB.Follow.addId(builder, idOffset);
    FollowFB.Follow.addFollowerId(builder, followerIdOffset);
    FollowFB.Follow.addFollowingId(builder, followingIdOffset);
    FollowFB.Follow.addCreatedAt(builder, data.createdAt);
    const entityOffset = FollowFB.Follow.endFollow(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('Follow', data.id, buffer);

    const fbb = FollowFB.Follow.getRootAsFollow(new ByteBuffer(buffer));

    return new FollowNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class ImageCollection<TActor> extends ZgCollection<ImageFB.Image, ImageNode<TActor>> {
  
  add(data: CreateImageInput & { id: string }): ImageNode<TActor> {
    if (!this['tx'].checkPolicy('Image', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const urlOffset = data.url ? builder.createString(data.url) : 0;
    const altTextOffset = data.altText ? builder.createString(data.altText) : 0;
    const postIdOffset = data.postId ? builder.createString(data.postId) : 0;
    const userIdOffset = data.userId ? builder.createString(data.userId) : 0;

    ImageFB.Image.startImage(builder);
        ImageFB.Image.addId(builder, idOffset);
    ImageFB.Image.addUrl(builder, urlOffset);
    ImageFB.Image.addFartCount(builder, data.fartCount);
    ImageFB.Image.addAltText(builder, altTextOffset);
    ImageFB.Image.addMetadata(builder, data.metadata);
    ImageFB.Image.addPostId(builder, postIdOffset);
    ImageFB.Image.addUserId(builder, userIdOffset);
    const entityOffset = ImageFB.Image.endImage(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('Image', data.id, buffer);

    const fbb = ImageFB.Image.getRootAsImage(new ByteBuffer(buffer));

    return new ImageNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class ReactionCollection<TActor> extends ZgCollection<ReactionFB.Reaction, ReactionNode<TActor>> {
  
  add(data: CreateReactionInput & { id: string }): ReactionNode<TActor> {
    if (!this['tx'].checkPolicy('Reaction', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const typeOffset = data.type ? builder.createString(data.type) : 0;
    const authorIdOffset = data.authorId ? builder.createString(data.authorId) : 0;
    const targetIdOffset = data.targetId ? builder.createString(data.targetId) : 0;
    const targetTypeOffset = data.targetType ? builder.createString(data.targetType) : 0;

    ReactionFB.Reaction.startReaction(builder);
        ReactionFB.Reaction.addId(builder, idOffset);
    ReactionFB.Reaction.addType(builder, typeOffset);
    ReactionFB.Reaction.addAuthorId(builder, authorIdOffset);
    ReactionFB.Reaction.addTargetId(builder, targetIdOffset);
    ReactionFB.Reaction.addTargetType(builder, targetTypeOffset);
    const entityOffset = ReactionFB.Reaction.endReaction(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('Reaction', data.id, buffer);

    const fbb = ReactionFB.Reaction.getRootAsReaction(new ByteBuffer(buffer));

    return new ReactionNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class TagCollection<TActor> extends ZgCollection<TagFB.Tag, TagNode<TActor>> {
  
  add(data: CreateTagInput & { id: string }): TagNode<TActor> {
    if (!this['tx'].checkPolicy('Tag', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const nameOffset = data.name ? builder.createString(data.name) : 0;

    TagFB.Tag.startTag(builder);
        TagFB.Tag.addId(builder, idOffset);
    TagFB.Tag.addName(builder, nameOffset);
    const entityOffset = TagFB.Tag.endTag(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('Tag', data.id, buffer);

    const fbb = TagFB.Tag.getRootAsTag(new ByteBuffer(buffer));

    return new TagNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class PostTagCollection<TActor> extends ZgCollection<PostTagFB.PostTag, PostTagNode<TActor>> {
  
  add(data: CreatePostTagInput & { id: string }): PostTagNode<TActor> {
    if (!this['tx'].checkPolicy('PostTag', 'create', undefined, data)) {
      throw new Error("Unauthorized");
    }
    const builder = new Builder(1024);
    const idOffset = data.id ? builder.createString(data.id) : 0;
    const postIdOffset = data.postId ? builder.createString(data.postId) : 0;
    const tagIdOffset = data.tagId ? builder.createString(data.tagId) : 0;

    PostTagFB.PostTag.startPostTag(builder);
        PostTagFB.PostTag.addId(builder, idOffset);
    PostTagFB.PostTag.addPostId(builder, postIdOffset);
    PostTagFB.PostTag.addTagId(builder, tagIdOffset);
    const entityOffset = PostTagFB.PostTag.endPostTag(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('PostTag', data.id, buffer);

    const fbb = PostTagFB.PostTag.getRootAsPostTag(new ByteBuffer(buffer));

    return new PostTagNode<TActor>(this['tx'], fbb, this['authContext']);
  }

}
  


export class ZgTransactionWithCollections<TActor> extends ZgTransaction {
  public readonly users: UserCollection<TActor>;
  public readonly posts: PostCollection<TActor>;
  public readonly comments: CommentCollection<TActor>;
  public readonly follows: FollowCollection<TActor>;
  public readonly images: ImageCollection<TActor>;
  public readonly reactions: ReactionCollection<TActor>;
  public readonly tags: TagCollection<TActor>;
  public readonly postTags: PostTagCollection<TActor>;

  constructor(
    db: ZgDatabase,
    tree: any,
    authContext: ZgAuthContext<TActor> | null,
    config: ZgDbConfiguration,
  ) {
    super(db, tree, authContext, config);
    this.users = new UserCollection<TActor>(this, 'User', (tx, fbb: UserFB.User, ac) => new UserNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => UserFB.User.getRootAsUser(bb), this.authContext);
    this.posts = new PostCollection<TActor>(this, 'Post', (tx, fbb: PostFB.Post, ac) => new PostNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => PostFB.Post.getRootAsPost(bb), this.authContext);
    this.comments = new CommentCollection<TActor>(this, 'Comment', (tx, fbb: CommentFB.Comment, ac) => new CommentNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => CommentFB.Comment.getRootAsComment(bb), this.authContext);
    this.follows = new FollowCollection<TActor>(this, 'Follow', (tx, fbb: FollowFB.Follow, ac) => new FollowNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => FollowFB.Follow.getRootAsFollow(bb), this.authContext);
    this.images = new ImageCollection<TActor>(this, 'Image', (tx, fbb: ImageFB.Image, ac) => new ImageNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => ImageFB.Image.getRootAsImage(bb), this.authContext);
    this.reactions = new ReactionCollection<TActor>(this, 'Reaction', (tx, fbb: ReactionFB.Reaction, ac) => new ReactionNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => ReactionFB.Reaction.getRootAsReaction(bb), this.authContext);
    this.tags = new TagCollection<TActor>(this, 'Tag', (tx, fbb: TagFB.Tag, ac) => new TagNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => TagFB.Tag.getRootAsTag(bb), this.authContext);
    this.postTags = new PostTagCollection<TActor>(this, 'PostTag', (tx, fbb: PostTagFB.PostTag, ac) => new PostTagNode<TActor>(tx as ZgTransactionWithCollections<TActor>, fbb, ac), (bb) => PostTagFB.PostTag.getRootAsPostTag(bb), this.authContext);
  }
}

export const DB = {
  Transaction: ZgTransactionWithCollections,
};
