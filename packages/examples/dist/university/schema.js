import { z } from "zod";
const schema = {
    department: {
        fields: z.object({
            name: z.string(),
        }),
        relations: {
            professors: ["many", "professor"],
            courses: ["many", "course"],
        },
    },
    professor: {
        fields: z.object({
            name: z.string(),
            email: z.string().email(),
        }),
        relations: {
            department: ["one", "department"],
            courses: ["many", "course"],
        },
    },
    student: {
        fields: z.object({
            name: z.string(),
            email: z.string().email(),
            major: z.string(),
        }),
        relations: {
            enrollments: ["many", "enrollment"],
        },
    },
    course: {
        fields: z.object({
            title: z.string(),
            courseCode: z.string(), // e.g., CS101
            credits: z.number().int().min(1).max(5),
        }),
        relations: {
            department: ["one", "department"],
            professor: ["one", "professor"],
            enrollments: ["many", "enrollment"],
        },
    },
    enrollment: {
        // This is the join table between Student and Course
        fields: z.object({
            grade: z.enum(["A", "B", "C", "D", "F", "W", "IN_PROGRESS"]),
            semester: z.string(), // e.g., "Fall 2025"
        }),
        relations: {
            student: ["one", "student"],
            course: ["one", "course"],
        },
    },
};
export default schema;
