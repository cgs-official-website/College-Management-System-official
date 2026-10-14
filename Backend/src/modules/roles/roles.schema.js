import { z } from 'zod';

const roleCategory = z.enum(['teaching', 'non_teaching']);

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(50),
  category: roleCategory.default('non_teaching'),
});

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(50).optional(),
    category: roleCategory.optional(),
  })
  .refine((v) => v.name !== undefined || v.category !== undefined, {
    message: 'Provide a name or a category to update.',
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