import { produce, Draft } from '@zgdb/runtime';
import { ulid } from '@zgdb/runtime';
import { z } from '@zgdb/runtime';
import GraphSchema from './graph-schema.js';
import type { DepartmentData, ProfessorData, StudentData, CourseData, EnrollmentData } from './generated-serializers.js';


// --- Async Helpers ---
export const createNodeData = {
  department: (data: { fields: DepartmentData['fields'], relationIds: DepartmentData['relationIds'] }): DepartmentData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'department',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  professor: (data: { fields: ProfessorData['fields'], relationIds: ProfessorData['relationIds'] }): ProfessorData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'professor',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  student: (data: { fields: StudentData['fields'], relationIds: StudentData['relationIds'] }): StudentData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'student',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  course: (data: { fields: CourseData['fields'], relationIds: CourseData['relationIds'] }): CourseData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'course',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  enrollment: (data: { fields: EnrollmentData['fields'], relationIds: EnrollmentData['relationIds'] }): EnrollmentData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'enrollment',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
};

export const updateNodeData = {
  department: (
    base: DepartmentData,
    recipe: (draft: Draft<DepartmentData>) => void
  ): DepartmentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  professor: (
    base: ProfessorData,
    recipe: (draft: Draft<ProfessorData>) => void
  ): ProfessorData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  student: (
    base: StudentData,
    recipe: (draft: Draft<StudentData>) => void
  ): StudentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  course: (
    base: CourseData,
    recipe: (draft: Draft<CourseData>) => void
  ): CourseData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  enrollment: (
    base: EnrollmentData,
    recipe: (draft: Draft<EnrollmentData>) => void
  ): EnrollmentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};


// --- Sync Helpers ---
export const createNodeDataSync = {
  department: (data: { fields: DepartmentData['fields'], relationIds: DepartmentData['relationIds'] }): DepartmentData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'department',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  professor: (data: { fields: ProfessorData['fields'], relationIds: ProfessorData['relationIds'] }): ProfessorData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'professor',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  student: (data: { fields: StudentData['fields'], relationIds: StudentData['relationIds'] }): StudentData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'student',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  course: (data: { fields: CourseData['fields'], relationIds: CourseData['relationIds'] }): CourseData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'course',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  enrollment: (data: { fields: EnrollmentData['fields'], relationIds: EnrollmentData['relationIds'] }): EnrollmentData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'enrollment',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
};

export const updateNodeDataSync = {
  department: (
    base: DepartmentData,
    recipe: (draft: Draft<DepartmentData>) => void
  ): DepartmentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  professor: (
    base: ProfessorData,
    recipe: (draft: Draft<ProfessorData>) => void
  ): ProfessorData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  student: (
    base: StudentData,
    recipe: (draft: Draft<StudentData>) => void
  ): StudentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  course: (
    base: CourseData,
    recipe: (draft: Draft<CourseData>) => void
  ): CourseData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  enrollment: (
    base: EnrollmentData,
    recipe: (draft: Draft<EnrollmentData>) => void
  ): EnrollmentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};