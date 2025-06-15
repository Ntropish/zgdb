import { Builder, ByteBuffer } from '@zgdb/runtime';
import { z } from 'zod';
import { Department } from './graph-db/department.js';
import { Professor } from './graph-db/professor.js';
import { Student } from './graph-db/student.js';
import { Course } from './graph-db/course.js';
import { Enrollment } from './graph-db/enrollment.js';
import GraphSchema from './graph-schema.js';

// ============================================
//  Node Data Types
// ============================================
export type DepartmentData = {
  id: string;
  type: 'department';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.department['fields']>;
  relationIds: {
    professors: string[];
    courses: string[];
  };
};

export type ProfessorData = {
  id: string;
  type: 'professor';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.professor['fields']>;
  relationIds: {
    department: string;
    courses: string[];
  };
};

export type StudentData = {
  id: string;
  type: 'student';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.student['fields']>;
  relationIds: {
    enrollments: string[];
  };
};

export type CourseData = {
  id: string;
  type: 'course';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.course['fields']>;
  relationIds: {
    department: string;
    professor: string;
    enrollments: string[];
  };
};

export type EnrollmentData = {
  id: string;
  type: 'enrollment';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.enrollment['fields']>;
  relationIds: {
    student: string;
    course: string;
  };
};


// ============================================
//  Supported Node Types
// ============================================
export const supportedNodeTypes = ['department', 'professor', 'student', 'course', 'enrollment'] as const;

// ============================================
//  Serialize Logic
// ============================================
export const serializeNode = {
  department: (node: DepartmentData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const professorsIdOffsets = (node.relationIds.professors || []).map(id => builder.createString(id));
    const professorsIdsVectorOffset = Department.createProfessorsIdsVector(builder, professorsIdOffsets);
    const coursesIdOffsets = (node.relationIds.courses || []).map(id => builder.createString(id));
    const coursesIdsVectorOffset = Department.createCoursesIdsVector(builder, coursesIdOffsets);

    Department.startDepartment(builder);
    Department.addId(builder, idOffset);
    Department.addCreatedAt(builder, BigInt(node.createdAt));
    Department.addUpdatedAt(builder, BigInt(node.updatedAt));
    Department.addName(builder, nameOffset);
    Department.addProfessorsIds(builder, professorsIdsVectorOffset);
    Department.addCoursesIds(builder, coursesIdsVectorOffset);
    const departmentOffset = Department.endDepartment(builder);
    builder.finish(departmentOffset);
    return builder.asUint8Array();
  },
  professor: (node: ProfessorData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const emailOffset = builder.createString(node.fields.email || '');
    const departmentIdOffsets = (node.relationIds.department ? [node.relationIds.department] : []).map(id => builder.createString(id));
    const departmentIdsVectorOffset = Professor.createDepartmentIdsVector(builder, departmentIdOffsets);
    const coursesIdOffsets = (node.relationIds.courses || []).map(id => builder.createString(id));
    const coursesIdsVectorOffset = Professor.createCoursesIdsVector(builder, coursesIdOffsets);

    Professor.startProfessor(builder);
    Professor.addId(builder, idOffset);
    Professor.addCreatedAt(builder, BigInt(node.createdAt));
    Professor.addUpdatedAt(builder, BigInt(node.updatedAt));
    Professor.addName(builder, nameOffset);
    Professor.addEmail(builder, emailOffset);
    Professor.addDepartmentIds(builder, departmentIdsVectorOffset);
    Professor.addCoursesIds(builder, coursesIdsVectorOffset);
    const professorOffset = Professor.endProfessor(builder);
    builder.finish(professorOffset);
    return builder.asUint8Array();
  },
  student: (node: StudentData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const emailOffset = builder.createString(node.fields.email || '');
    const majorOffset = builder.createString(node.fields.major || '');
    const enrollmentsIdOffsets = (node.relationIds.enrollments || []).map(id => builder.createString(id));
    const enrollmentsIdsVectorOffset = Student.createEnrollmentsIdsVector(builder, enrollmentsIdOffsets);

    Student.startStudent(builder);
    Student.addId(builder, idOffset);
    Student.addCreatedAt(builder, BigInt(node.createdAt));
    Student.addUpdatedAt(builder, BigInt(node.updatedAt));
    Student.addName(builder, nameOffset);
    Student.addEmail(builder, emailOffset);
    Student.addMajor(builder, majorOffset);
    Student.addEnrollmentsIds(builder, enrollmentsIdsVectorOffset);
    const studentOffset = Student.endStudent(builder);
    builder.finish(studentOffset);
    return builder.asUint8Array();
  },
  course: (node: CourseData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const titleOffset = builder.createString(node.fields.title || '');
    const courseCodeOffset = builder.createString(node.fields.courseCode || '');
    const departmentIdOffsets = (node.relationIds.department ? [node.relationIds.department] : []).map(id => builder.createString(id));
    const departmentIdsVectorOffset = Course.createDepartmentIdsVector(builder, departmentIdOffsets);
    const professorIdOffsets = (node.relationIds.professor ? [node.relationIds.professor] : []).map(id => builder.createString(id));
    const professorIdsVectorOffset = Course.createProfessorIdsVector(builder, professorIdOffsets);
    const enrollmentsIdOffsets = (node.relationIds.enrollments || []).map(id => builder.createString(id));
    const enrollmentsIdsVectorOffset = Course.createEnrollmentsIdsVector(builder, enrollmentsIdOffsets);

    Course.startCourse(builder);
    Course.addId(builder, idOffset);
    Course.addCreatedAt(builder, BigInt(node.createdAt));
    Course.addUpdatedAt(builder, BigInt(node.updatedAt));
    Course.addTitle(builder, titleOffset);
    Course.addCourseCode(builder, courseCodeOffset);
    Course.addCredits(builder, node.fields.credits);
    Course.addDepartmentIds(builder, departmentIdsVectorOffset);
    Course.addProfessorIds(builder, professorIdsVectorOffset);
    Course.addEnrollmentsIds(builder, enrollmentsIdsVectorOffset);
    const courseOffset = Course.endCourse(builder);
    builder.finish(courseOffset);
    return builder.asUint8Array();
  },
  enrollment: (node: EnrollmentData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const gradeOffset = builder.createString(node.fields.grade || '');
    const semesterOffset = builder.createString(node.fields.semester || '');
    const studentIdOffsets = (node.relationIds.student ? [node.relationIds.student] : []).map(id => builder.createString(id));
    const studentIdsVectorOffset = Enrollment.createStudentIdsVector(builder, studentIdOffsets);
    const courseIdOffsets = (node.relationIds.course ? [node.relationIds.course] : []).map(id => builder.createString(id));
    const courseIdsVectorOffset = Enrollment.createCourseIdsVector(builder, courseIdOffsets);

    Enrollment.startEnrollment(builder);
    Enrollment.addId(builder, idOffset);
    Enrollment.addCreatedAt(builder, BigInt(node.createdAt));
    Enrollment.addUpdatedAt(builder, BigInt(node.updatedAt));
    Enrollment.addGrade(builder, gradeOffset);
    Enrollment.addSemester(builder, semesterOffset);
    Enrollment.addStudentIds(builder, studentIdsVectorOffset);
    Enrollment.addCourseIds(builder, courseIdsVectorOffset);
    const enrollmentOffset = Enrollment.endEnrollment(builder);
    builder.finish(enrollmentOffset);
    return builder.asUint8Array();
  },
};

// ============================================
//  Deserialize Logic
// ============================================
export const deserializeNode = {
  department: (buffer: Uint8Array): DepartmentData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Department.getRootAsDepartment(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    const relationIds: any = {};
    const professorsIds = Array.from({ length: node.professorsIdsLength() }, (_, i) => node.professorsIds(i));
    relationIds.professors = professorsIds;
    const coursesIds = Array.from({ length: node.coursesIdsLength() }, (_, i) => node.coursesIds(i));
    relationIds.courses = coursesIds;
    return {
      id: node.id()!,
      type: 'department',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as DepartmentData['fields'],
      relationIds: relationIds as DepartmentData['relationIds'],
    };
  },
  professor: (buffer: Uint8Array): ProfessorData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Professor.getRootAsProfessor(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    fields.email = node.email();
    const relationIds: any = {};
    const departmentIds = Array.from({ length: node.departmentIdsLength() }, (_, i) => node.departmentIds(i));
    relationIds.department = departmentIds[0] || '';
    const coursesIds = Array.from({ length: node.coursesIdsLength() }, (_, i) => node.coursesIds(i));
    relationIds.courses = coursesIds;
    return {
      id: node.id()!,
      type: 'professor',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as ProfessorData['fields'],
      relationIds: relationIds as ProfessorData['relationIds'],
    };
  },
  student: (buffer: Uint8Array): StudentData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Student.getRootAsStudent(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    fields.email = node.email();
    fields.major = node.major();
    const relationIds: any = {};
    const enrollmentsIds = Array.from({ length: node.enrollmentsIdsLength() }, (_, i) => node.enrollmentsIds(i));
    relationIds.enrollments = enrollmentsIds;
    return {
      id: node.id()!,
      type: 'student',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as StudentData['fields'],
      relationIds: relationIds as StudentData['relationIds'],
    };
  },
  course: (buffer: Uint8Array): CourseData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Course.getRootAsCourse(byteBuffer);
    const fields: any = {};
    fields.title = node.title();
    fields.courseCode = node.courseCode();
    fields.credits = node.credits();
    const relationIds: any = {};
    const departmentIds = Array.from({ length: node.departmentIdsLength() }, (_, i) => node.departmentIds(i));
    relationIds.department = departmentIds[0] || '';
    const professorIds = Array.from({ length: node.professorIdsLength() }, (_, i) => node.professorIds(i));
    relationIds.professor = professorIds[0] || '';
    const enrollmentsIds = Array.from({ length: node.enrollmentsIdsLength() }, (_, i) => node.enrollmentsIds(i));
    relationIds.enrollments = enrollmentsIds;
    return {
      id: node.id()!,
      type: 'course',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as CourseData['fields'],
      relationIds: relationIds as CourseData['relationIds'],
    };
  },
  enrollment: (buffer: Uint8Array): EnrollmentData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Enrollment.getRootAsEnrollment(byteBuffer);
    const fields: any = {};
    fields.grade = node.grade();
    fields.semester = node.semester();
    const relationIds: any = {};
    const studentIds = Array.from({ length: node.studentIdsLength() }, (_, i) => node.studentIds(i));
    relationIds.student = studentIds[0] || '';
    const courseIds = Array.from({ length: node.courseIdsLength() }, (_, i) => node.courseIds(i));
    relationIds.course = courseIds[0] || '';
    return {
      id: node.id()!,
      type: 'enrollment',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as EnrollmentData['fields'],
      relationIds: relationIds as EnrollmentData['relationIds'],
    };
  },
};