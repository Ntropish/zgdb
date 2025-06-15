export interface UserData {
    id: string;
    type: 'user';
    createdAt: number;
    updatedAt: number;
    fields: {
        name: string;
        age: number;
    };
    relationIds: {
        posts: string[];
        familiars: string[];
    };
}
export interface FamiliarData {
    id: string;
    type: 'familiar';
    createdAt: number;
    updatedAt: number;
    fields: {
        name: string;
        age: number;
    };
    relationIds: {
        user: string;
    };
}
export interface PostData {
    id: string;
    type: 'post';
    createdAt: number;
    updatedAt: number;
    fields: {
        title: string;
        published: boolean;
        viewCount: number;
    };
    relationIds: {
        tags: string[];
        author: string;
    };
}
export interface TagData {
    id: string;
    type: 'tag';
    createdAt: number;
    updatedAt: number;
    fields: {
        name: string;
    };
    relationIds: {
        posts: string[];
    };
}
export interface PostTagEdgeData {
    id: string;
    type: 'post_tag_edge';
    from: string;
    to: string;
    createdAt: number;
}
export declare const serializeNode: {
    user: (data: UserData) => Uint8Array;
    familiar: (data: FamiliarData) => Uint8Array;
    post: (data: PostData) => Uint8Array;
    tag: (data: TagData) => Uint8Array;
};
export declare const deserializeNode: {
    user: (buffer: Uint8Array) => UserData;
    familiar: (buffer: Uint8Array) => FamiliarData;
    post: (buffer: Uint8Array) => PostData;
    tag: (buffer: Uint8Array) => TagData;
};
export declare const serializeEdge: {
    post_tag_edge: (data: PostTagEdgeData) => Uint8Array;
};
export declare const deserializeEdge: {
    post_tag_edge: (buffer: Uint8Array) => PostTagEdgeData;
};
export declare const supportedNodeTypes: readonly ["user", "familiar", "post", "tag"];
export declare const supportedEdgeTypes: readonly ["post_tag_edge"];
