import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
});

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      moduleId: z.string().uuid(),
      canCreate: z.boolean().default(false),
      canRead: z.boolean().default(false),
      canUpdate: z.boolean().default(false),
      canDelete: z.boolean().default(false),
    })
  )
});

export const assignUserRoleSchema = z.object({
  customRoleId: z.string().uuid().nullable().optional(),
});
