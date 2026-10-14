import { z } from 'zod';

export const createEntitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export const createFieldSchema = z.object({
  entityId: z.string().uuid().optional(),
  hardcodedModel: z.string().optional(),
  name: z.string().min(1),
  key: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'select', 'boolean']),
  options: z.any().optional(),
  isRequired: z.boolean().default(false),
  sectionId: z.string().uuid().optional(),
  order: z.number().default(0),
}).refine(data => data.entityId || data.hardcodedModel, {
  message: "Either entityId or hardcodedModel must be provided"
});

export const createSectionSchema = z.object({
  entityId: z.string().uuid().optional(),
  hardcodedModel: z.string().optional(),
  name: z.string().min(1),
  order: z.number().int().default(0),
});

export const updateFieldSchema = z.object({
  name: z.string().trim().min(1, 'Field label cannot be empty').optional(),
  isRequired: z.boolean().optional(),
  options: z.any().optional(),
  sectionId: z.string().uuid().nullable().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  order: z.number().int().optional(),
});
