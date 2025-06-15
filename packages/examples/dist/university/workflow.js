import { faker } from "@faker-js/faker";
import { createClient } from "./dist/graph/zgdb-client.js";
import { MapStoreAdapter } from "@zgdb/runtime";
const db = createClient(new MapStoreAdapter());
const NUM_STUDENTS = 50;
const SEMESTER = "Fall 2025";
async function main() {
    console.log("Setting up the university for the new semester...");
    // 1. Setup Departments, Professors, and Courses
    const { compSci, math, profAlan, profBetty, cs101, cs201, ma101 } = await db.transact(async (tx) => {
        // Departments
        const compSci = await tx.createNode("department", {
            fields: { name: "Computer Science" },
            relationIds: { professors: [], courses: [] },
        });
        const math = await tx.createNode("department", {
            fields: { name: "Mathematics" },
            relationIds: { professors: [], courses: [] },
        });
        // Professors
        const profAlan = await tx.createNode("professor", {
            fields: { name: "Dr. Alan Turing", email: "alan.t@university.edu" },
            relationIds: { department: compSci.id, courses: [] },
        });
        const profBetty = await tx.createNode("professor", {
            fields: {
                name: "Dr. Betty Holberton",
                email: "betty.h@university.edu",
            },
            relationIds: { department: math.id, courses: [] },
        });
        // Courses
        const cs101 = await tx.createNode("course", {
            fields: {
                title: "Intro to Programming",
                courseCode: "CS101",
                credits: 4,
            },
            relationIds: {
                department: compSci.id,
                professor: profAlan.id,
                enrollments: [],
            },
        });
        const cs201 = await tx.createNode("course", {
            fields: { title: "Data Structures", courseCode: "CS201", credits: 4 },
            relationIds: {
                department: compSci.id,
                professor: profAlan.id,
                enrollments: [],
            },
        });
        const ma101 = await tx.createNode("course", {
            fields: { title: "Calculus I", courseCode: "MA101", credits: 3 },
            relationIds: {
                department: math.id,
                professor: profBetty.id,
                enrollments: [],
            },
        });
        // Link back professors and courses to departments
        await tx.updateNode("department", compSci.id, (d) => {
            d.relationIds.professors.push(profAlan.id);
            d.relationIds.courses.push(cs101.id, cs201.id);
        });
        await tx.updateNode("department", math.id, (d) => {
            d.relationIds.professors.push(profBetty.id);
            d.relationIds.courses.push(ma101.id);
        });
        return { compSci, math, profAlan, profBetty, cs101, cs201, ma101 };
    });
    console.log("✅ University setup complete.");
    console.log(`\nGenerating and enrolling ${NUM_STUDENTS} students...`);
    // 2. Create and Enroll Students
    const studentIds = [];
    for (let i = 0; i < NUM_STUDENTS; i++) {
        const student = await db.transact((tx) => tx.createNode("student", {
            fields: {
                name: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                major: "Computer Science",
            },
            relationIds: { enrollments: [] },
        }));
        studentIds.push(student.id);
    }
    console.log(`✅ ${NUM_STUDENTS} students created.`);
    // Enroll each student in 1-3 random courses
    await db.transact(async (tx) => {
        const courses = [cs101, cs201, ma101];
        for (const studentId of studentIds) {
            const numCourses = faker.number.int({ min: 1, max: 3 });
            const coursesToEnroll = faker.helpers
                .shuffle(courses)
                .slice(0, numCourses);
            for (const course of coursesToEnroll) {
                const enrollment = await tx.createNode("enrollment", {
                    fields: { grade: "IN_PROGRESS", semester: SEMESTER },
                    relationIds: { student: studentId, course: course.id },
                });
                // Link enrollment back to student and course
                await tx.updateNode("student", studentId, (d) => {
                    d.relationIds.enrollments.push(enrollment.id);
                });
                await tx.updateNode("course", course.id, (d) => {
                    d.relationIds.enrollments.push(enrollment.id);
                });
            }
        }
    });
    console.log(`✅ All students enrolled in courses.`);
    // 3. End of Semester: Assign Grades
    console.log("\nEnd of semester! Assigning grades...");
    const firstStudentId = studentIds[0];
    await db.transact(async (tx) => {
        const student = await tx.getNode("student", firstStudentId);
        if (!student)
            return;
        for (const enrollmentId of student.relationIds.enrollments) {
            const grade = faker.helpers.arrayElement(["A", "B", "C", "D"]);
            await tx.updateNode("enrollment", enrollmentId, (d) => {
                d.fields.grade = grade;
            });
        }
    });
    console.log(`✅ Grades assigned for student ${firstStudentId}.`);
    // 4. Final Report: Calculate a student's GPA
    console.log(`\nCalculating GPA for student ${firstStudentId}...`);
    await db.transact(async (tx) => {
        const student = await tx.getNode("student", firstStudentId);
        let totalPoints = 0;
        let totalCredits = 0;
        const gradeToPoint = {
            A: 4,
            B: 3,
            C: 2,
            D: 1,
            F: 0,
        };
        console.log(`--- Transcript for ${student.fields.name} ---`);
        for (const enrollmentId of student.relationIds.enrollments) {
            const enrollment = await tx.getNode("enrollment", enrollmentId);
            const course = await tx.getNode("course", enrollment.relationIds.course);
            const grade = enrollment.fields.grade;
            const credits = course.fields.credits;
            const points = gradeToPoint[grade] || 0;
            console.log(`  ${course.fields.courseCode}: ${course.fields.title} | Grade: ${grade}`);
            if (points > 0) {
                totalPoints += points * credits;
                totalCredits += credits;
            }
        }
        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "N/A";
        console.log(`-------------------------------------------`);
        console.log(`  SEMESTER GPA: ${gpa}`);
        console.log(`-------------------------------------------`);
    });
}
main().catch(console.error);
