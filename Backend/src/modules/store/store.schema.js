import { z } from 'zod';

const baseItem = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(200),
  categoryId: z.string().uuid('Invalid category').nullish(),
  price: z.number({ error: 'Price must be a number' }).min(0, 'Price cannot be negative').max(9999999),
  lowStockAt: z.number().int().min(0).max(100000),
  imageUrl: z.string().url().nullish(),
  imagePublicId: z.string().max(300).nullish(),
  isActive: z.boolean(),
});

export const createStoreItemSchema = baseItem.partial({
  categoryId: true, lowStockAt: true, imageUrl: true, imagePublicId: true, isActive: true,
}).extend({
  stock: z.number().int().min(0, 'Stock cannot be negative').max(10000000).optional(),
});

export const updateStoreItemSchema = baseItem.partial();

export const createStoreCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z.string().trim().min(1, 'Category code is required').max(20).transform((v) => v.toUpperCase()),
  description: z.string().trim().max(500).nullish().transform((v) => (v === undefined ? undefined : v || null)),
  isActive: z.boolean().optional(),
});

export const updateStoreCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()).optional(),
  description: z.string().trim().max(500).nullish().transform((v) => (v === undefined ? undefined : v || null)),
  isActive: z.boolean().optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), {
  message: 'At least one field must be provided for update',
});

export const restockSchema = z.object({
  quantity: z.number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000000),
  note: z.string().trim().max(300).nullish().transform((v) => v || null),
});

export const adjustSchema = z.object({
  newStock: z.number({ error: 'Counted stock must be a number' })
    .int('Counted stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .max(10000000),
  note: z.string().trim().min(3, 'Please give a reason (at least 3 characters)').max(300),
});

// ---- sales ----
const reqText = (max, label) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const optText = (max) =>
  z.string().trim().max(max).nullish().transform((v) => v || null);

const saleLine = z.object({
  itemId: z.string().uuid('Invalid item'),
  quantity: z.number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100000),
});

const saleCommon = {
  items: z.array(saleLine).min(1, 'Add at least one item').max(50, 'Too many items in one sale'),
  discount: z.number({ error: 'Discount must be a number' }).min(0, 'Discount cannot be negative').max(100000000).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD'], { error: 'Choose a payment method' }),
  paymentRef: optText(100),
};

export const createSaleSchema = z.discriminatedUnion('customerType', [
  z.object({
    ...saleCommon,
    customerType: z.literal('STUDENT'),
    customerName: reqText(100, 'Student name'),
    rollNo: optText(30),
    department: reqText(100, 'Department'),
    year: reqText(20, 'Year'),
    section: reqText(20, 'Section'),
  }),
  z.object({
    ...saleCommon,
    customerType: z.literal('STAFF'),
    customerName: reqText(100, 'Staff name'),
    department: reqText(100, 'Department'),
  }),
  z.object({
    ...saleCommon,
    customerType: z.literal('OTHER'),
    customerName: reqText(150, 'Customer details'),
  }),
]);