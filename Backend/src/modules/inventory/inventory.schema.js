import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name cannot exceed 100 characters'),
  code: z.string().trim().min(1, 'Category code is required').max(20, 'Category code cannot exceed 20 characters').transform(val => val.toUpperCase()),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name cannot be empty').max(100).optional(),
  code: z.string().trim().min(1, 'Category code cannot be empty').max(20).transform(val => val.toUpperCase()).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(200, 'Item name cannot exceed 200 characters'),
  sku: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID format').optional().nullable(),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  departmentLocation: z.string().trim().optional().nullable(),
  unitOfMeasure: z.string().trim().optional().nullable(),
  reorderLevel: z.number().int().min(0).optional().nullable(),
  vendorName: z.string().trim().optional().nullable(),
  purchaseDate: z.union([z.string(), z.date()]).optional().nullable(),
  warrantyExpiry: z.union([z.string(), z.date()]).optional().nullable(),
  assetTagNo: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
  isArchived: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateInventoryItemSchema = inventoryItemSchema.partial();

export const stockMovementSchema = z.object({
  inventoryItemId: z.string().uuid('Invalid inventory item ID'),
  movementType: z.enum(['INBOUND', 'OUTBOUND'], {
    errorMap: () => ({ message: "movementType must be either 'INBOUND' or 'OUTBOUND'" })
  }),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().trim().min(1, 'Reason is required').max(200, 'Reason cannot exceed 200 characters'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  referenceType: z.string().trim().max(100).optional().nullable(),
  referenceId: z.string().trim().max(100).optional().nullable(),
});
