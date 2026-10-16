import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters").trim(),
  code: z.string().min(2, "Department code must be at least 2 characters").trim(),
  hodUserId: z.string().uuid("Invalid HOD User ID").optional().nullable().or(z.literal('')),
  customFields: z.record(z.any()).nullish(),
});

// All routes require authentication and standard tenant resolution
router.use(authenticate);
router.use(resolveTenant);

// Only admins can create / update / delete departments
const adminOnly = authorize('admin', 'superadmin');
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');

// Helper function to extract user-friendly error message
const formatErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  if (error instanceof z.ZodError) {
    return error.issues?.[0]?.message || 'Validation failed';
  }
  return error?.message || fallback;
};

// Get all departments for the college
router.get('/', staffOnly, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { collegeId: req.tenant.collegeId },
      orderBy: { name: 'asc' }
    });
    res.json({ data: departments });
  } catch (error) {
    res.status(500).json({ error: { message: formatErrorMessage(error, 'Failed to fetch departments') } });
  }
});

// Create a new department
router.post('/', adminOnly, async (req, res) => {
  try {
    const data = departmentSchema.parse(req.body);
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const hodUserId = data.hodUserId && data.hodUserId !== '' ? data.hodUserId : null;
    const collegeId = req.tenant.collegeId;

    // Check if code already exists in this college (case-insensitive)
    const existingCode = await prisma.department.findFirst({
      where: { 
        collegeId,
        code: { equals: code, mode: 'insensitive' }
      }
    });

    if (existingCode) {
      return res.status(400).json({ error: { message: `Department code "${code}" already exists` } });
    }

    // Check if department name already exists in this college (case-insensitive)
    const existingName = await prisma.department.findFirst({
      where: { 
        collegeId,
        name: { equals: name, mode: 'insensitive' }
      }
    });

    if (existingName) {
      return res.status(400).json({ error: { message: `Department "${name}" already exists` } });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        hodUserId,
        collegeId,
        customFields: data.customFields || {}
      }
    });

    res.status(201).json({ data: department });
  } catch (error) {
    res.status(400).json({ error: { message: formatErrorMessage(error, 'Failed to create department') } });
  }
});

// Bulk import departments
router.post('/bulk', adminOnly, async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: { message: 'Data must be an array' } });
    }

    const collegeId = req.tenant.collegeId;
    const successful = [];
    const errors = [];
    const seenCodes = new Set(); // track codes seen within this file

    for (const [index, row] of data.entries()) {
      const rowNum = index + 2; // row 1 = header, row 2 = first data row
      const name = (row['Department Name'] || row['Department_Name'] || row['name'])?.toString().trim();
      const rawCode = (row['Department Code'] || row['Department_Code'] || row['code'])?.toString().trim();

      if (!name) {
        errors.push({ row: rowNum, reason: 'Department Name is required' });
        continue;
      }
      if (!rawCode) {
        errors.push({ row: rowNum, reason: 'Department Code is required' });
        continue;
      }

      const code = rawCode.toUpperCase();

      // Reject duplicate code within the same uploaded file
      if (seenCodes.has(code)) {
        errors.push({ row: rowNum, reason: `Duplicate code "${code}" in this file` });
        continue;
      }
      seenCodes.add(code);

      // Reject if code already exists in the college
      const existing = await prisma.department.findFirst({
        where: { collegeId, code: { equals: code, mode: 'insensitive' } }
      });
      if (existing) {
        errors.push({ row: rowNum, reason: `Department code "${code}" already exists in this college` });
        continue;
      }

      try {
        await prisma.department.create({
          data: { name, code, collegeId }
        });
        successful.push(code);
      } catch (err) {
        errors.push({ row: rowNum, reason: err?.message || 'Database error' });
      }
    }

    return res.json({
      data: {
        successful: successful.length,
        failed: errors.length,
        errors, // [{ row: 3, reason: '...' }, ...]
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: formatErrorMessage(error, 'Failed to bulk import departments') } });
  }
});

// Update a department
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const data = departmentSchema.parse(req.body);
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const hodUserId = data.hodUserId && data.hodUserId !== '' ? data.hodUserId : null;
    const collegeId = req.tenant.collegeId;

    // Verify ownership
    const existing = await prisma.department.findFirst({
      where: { id, collegeId }
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Department not found' } });
    }

    // Check for duplicate code on other departments
    const duplicateCode = await prisma.department.findFirst({
      where: {
        collegeId,
        code: { equals: code, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (duplicateCode) {
      return res.status(400).json({ error: { message: `Department code "${code}" is already in use by another department` } });
    }

    // Check for duplicate name on other departments
    const duplicateName = await prisma.department.findFirst({
      where: {
        collegeId,
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (duplicateName) {
      return res.status(400).json({ error: { message: `Department "${name}" is already in use by another department` } });
    }

    const existingCustom = (typeof existing.customFields === 'object' && existing.customFields !== null && !Array.isArray(existing.customFields)) ? existing.customFields : {};

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        hodUserId,
        customFields: { ...existingCustom, ...(data.customFields || {}) }
      }
    });

    res.json({ data: department });
  } catch (error) {
    res.status(400).json({ error: { message: formatErrorMessage(error, 'Failed to update department') } });
  }
});

// Delete a department
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.tenant.collegeId;

    // Verify ownership
    const existing = await prisma.department.findFirst({
      where: { id, collegeId }
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Department not found' } });
    }

    // Check if courses are attached
    const courseCount = await prisma.course.count({ where: { departmentId: id } });
    if (courseCount > 0) {
      return res.status(400).json({ 
        error: { message: `Cannot delete department: ${courseCount} course(s) are attached to it. Please reassign or delete the courses first.` } 
      });
    }

    // Check if students are attached
    const studentCount = await prisma.student.count({ where: { departmentId: id } });
    if (studentCount > 0) {
      return res.status(400).json({ 
        error: { message: `Cannot delete department: ${studentCount} student(s) are attached to it.` } 
      });
    }

    // Attempt to delete
    await prisma.department.delete({ where: { id } });

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: formatErrorMessage(error, 'Failed to delete department') } });
  }
});

export default router;