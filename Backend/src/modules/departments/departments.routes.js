import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  code: z.string().min(2, "Department code must be at least 2 characters"),
  hodUserId: z.string().uuid().optional().nullable()
});

// All routes require authentication
router.use(authenticate);

// Middleware to enforce collegeId scoping
router.use((req, res, next) => {
  if (!req.tenant || !req.tenant.collegeId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
});

// Get all departments for the college
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { collegeId: req.tenant.collegeId },
      orderBy: { name: 'asc' }
    });
    res.json({ data: departments });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Create a new department
router.post('/', async (req, res) => {
  try {
    const data = departmentSchema.parse(req.body);
    
    // Check if code already exists in this college
    const existing = await prisma.department.findFirst({
      where: { 
        collegeId: req.tenant.collegeId,
        code: data.code
      }
    });

    if (existing) {
      return res.status(400).json({ error: { message: 'Department code already exists' } });
    }

    const department = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code,
        hodUserId: data.hodUserId || null,
        collegeId: req.tenant.collegeId
      }
    });

    res.status(201).json({ data: department });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

// Update a department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = departmentSchema.parse(req.body);

    // Verify ownership
    const existing = await prisma.department.findFirst({
      where: { id, collegeId: req.tenant.collegeId }
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Department not found' } });
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        hodUserId: data.hodUserId || null,
      }
    });

    res.json({ data: department });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

// Delete a department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.department.findFirst({
      where: { id, collegeId: req.tenant.collegeId }
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Department not found' } });
    }

    // Attempt to delete
    await prisma.department.delete({ where: { id } });

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;
