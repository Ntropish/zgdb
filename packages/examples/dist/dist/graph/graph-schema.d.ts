import { z } from "zod";
declare const schema: {
    user: {
        fields: z.ZodObject<{
            name: z.ZodString;
            age: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            age: number;
        }, {
            name: string;
            age: number;
        }>;
        relations: {
            posts: string[];
            familiars: string[];
        };
    };
    familiar: {
        fields: z.ZodObject<{
            name: z.ZodString;
            age: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            age: number;
        }, {
            name: string;
            age: number;
        }>;
        relations: {
            user: string[];
        };
    };
    post: {
        fields: z.ZodObject<{
            title: z.ZodString;
            published: z.ZodBoolean;
            viewCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            title: string;
            published: boolean;
            viewCount: number;
        }, {
            title: string;
            published: boolean;
            viewCount: number;
        }>;
        relations: {
            tags: string[];
            author: string[];
        };
    };
    tag: {
        fields: z.ZodObject<{
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
        }, {
            name: string;
        }>;
        relations: {
            posts: string[];
        };
    };
};
export default schema;
