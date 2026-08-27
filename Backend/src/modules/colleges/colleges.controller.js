import { prisma } from '../../server.js';
import bcrypt from 'bcryptjs';
import { onboardCollegeSchema, updateCollegeStatusSchema } from './colleges.schema.js';

export const getAllColleges = async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: colleges });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const onboardCollege = async (req, res) => {
  try {
    const { adminUser, collegeData } = onboardCollegeSchema.parse(req.body);
    
    // Check if admin email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: adminUser.email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: { message: 'Email already in use' } });
    }

    // Generate a unique slug/shortName
    const slug = collegeData.shortName || collegeData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Create address string
    const addressParts = [collegeData.streetAddress, collegeData.city, collegeData.district, collegeData.state, collegeData.country, collegeData.pincode].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    // Perform transaction to create college and admin user
    const result = await prisma.$transaction(async (tx) => {
      const college = await tx.college.create({
        data: {
          name: collegeData.name,
          slug,
          status: 'pending',
          address: fullAddress || null,
          affiliationCode: collegeData.affiliationCode || null,
          aicteNumber: collegeData.aicteNumber || null,
          ugcCode: collegeData.ugcRecognition || null,
          logoUrl: collegeData.logoBase64 || null
        }
      });

      const passwordHash = await bcrypt.hash(adminUser.password, 10);
      
      const admin = await tx.user.create({
        data: {
          collegeId: college.id,
          email: adminUser.email,
          passwordHash,
          role: 'admin',
          accountStatus: 'active'
        }
      });

      return { collegeCode: college.id, adminEmail: admin.email };
    });

    res.status(201).json({ data: result });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

import { invalidateCollegeStatusCache } from '../../middleware/requireApprovedCollege.js';

export const getMyCollegeStatus = async (req, res) => {
  try {
    const collegeId = req.user?.collegeId;
    if (!collegeId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COLLEGE_ID', message: 'No college associated with this user' } });
    }

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        registrationNo: true
      }
    });

    if (!college) {
      return res.status(404).json({ success: false, error: { code: 'COLLEGE_NOT_FOUND', message: 'College not found' } });
    }

    res.json({
      success: true,
      data: {
        collegeId: college.id,
        collegeName: college.name,
        slug: college.slug,
        status: college.status,
        registrationNo: college.registrationNo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateCollegeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = updateCollegeStatusSchema.parse(req.body);
    
    const college = await prisma.college.update({
      where: { id },
      data: { status }
    });
    
    // Invalidate Redis cache for live status
    await invalidateCollegeStatusCache(id);

    res.json({ success: true, data: college });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.college.delete({
      where: { id }
    });
    
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const getCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await prisma.college.findUnique({
      where: { id }
    });
    if (!college) return res.status(404).json({ error: { message: 'College not found' } });
    res.json({ data: college });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, academicYear, affiliationCode, aicteNumber, logoUrl, ugcCode } = req.body;
    
    const college = await prisma.college.update({
      where: { id },
      data: {
        name,
        address,
        academicYear,
        affiliationCode,
        aicteNumber,
        logoUrl,
        ugcCode
      }
    });
    
    res.json({ data: college });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
