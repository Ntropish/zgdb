import schema from './graph-schema.js';
import type { DepartmentData, ProfessorData, StudentData, CourseData, EnrollmentData } from './generated-serializers.js';
import { uuidv7 as uuid } from 'uuidv7';
import { produce, Draft } from 'immer';

// ============================================
//  Create Node Data Helpers
// ============================================

export const createNodeData = {
  department: (data: { fields: DepartmentData['fields'], relationIds: DepartmentData['relationIds'] }): DepartmentData => ({
    id: uuid(),
    type: 'department',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.department.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  professor: (data: { fields: ProfessorData['fields'], relationIds: ProfessorData['relationIds'] }): ProfessorData => ({
    id: uuid(),
    type: 'professor',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.professor.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  student: (data: { fields: StudentData['fields'], relationIds: StudentData['relationIds'] }): StudentData => ({
    id: uuid(),
    type: 'student',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.student.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  course: (data: { fields: CourseData['fields'], relationIds: CourseData['relationIds'] }): CourseData => ({
    id: uuid(),
    type: 'course',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.course.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  enrollment: (data: { fields: EnrollmentData['fields'], relationIds: EnrollmentData['relationIds'] }): EnrollmentData => ({
    id: uuid(),
    type: 'enrollment',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.enrollment.fields.parse(data.fields),
    relationIds: data.relationIds,
  })
};

// ============================================
//  Update Node Data Helpers (with Immer)
// ============================================

export const updateNodeData = {
  department: (
    node: DepartmentData,
    recipe: (draft: Draft<DepartmentData>) => void
  ): DepartmentData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.department.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  professor: (
    node: ProfessorData,
    recipe: (draft: Draft<ProfessorData>) => void
  ): ProfessorData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.professor.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  student: (
    node: StudentData,
    recipe: (draft: Draft<StudentData>) => void
  ): StudentData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.student.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  course: (
    node: CourseData,
    recipe: (draft: Draft<CourseData>) => void
  ): CourseData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.course.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  enrollment: (
    node: EnrollmentData,
    recipe: (draft: Draft<EnrollmentData>) => void
  ): EnrollmentData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.enrollment.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  }
};
