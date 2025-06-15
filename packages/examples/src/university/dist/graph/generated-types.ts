import type { DepartmentData, ProfessorData, StudentData, CourseData, EnrollmentData } from './generated-serializers.js';

export type NodeDataTypeMap = {
  'department': DepartmentData;
  'professor': ProfessorData;
  'student': StudentData;
  'course': CourseData;
  'enrollment': EnrollmentData;
};
