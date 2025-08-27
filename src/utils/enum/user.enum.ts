// Unified role enum (extended to include previous worker roles)
export enum UserRoleEnum {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project_manager',
  WORKER = 'worker',
}

// Backward compatibility (deprecated): keep WorkerRoleEnum for existing imports
// TODO: Remove usages of WorkerRoleEnum and replace with UserRoleEnum everywhere.
export const WorkerRoleEnum = {
  WORKER: UserRoleEnum.WORKER,
  PROJECT_MANAGER: UserRoleEnum.PROJECT_MANAGER,
} as const;
export type WorkerRoleEnum = (typeof WorkerRoleEnum)[keyof typeof WorkerRoleEnum];

export enum language {
  UZ = 'uz',
  EN = 'en',
  RU = 'ru',
}
