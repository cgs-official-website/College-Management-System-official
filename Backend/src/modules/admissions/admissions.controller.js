import { prisma, logger } from '../../server.js';
import { submitApplicationSchema, allotSeatSchema } from './admissions.schema.js';

export const submitApplication = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const data = submitApplicationSchema.parse(req.body);

    // Mock cutoff logic: Check if average marks > 60%
    const marks = Object.values(data.marksheetDetails);
    const avgMarks = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
    
    const cutoffCheckResult = {
      average: avgMarks,
      passed: avgMarks >= 60,
      notes: avgMarks >= 60 ? 'Meets standard cutoff' : 'Below cutoff requirement'
    };

    const status = cutoffCheckResult.passed ? 'shortlisted' : 'rejected';

    const admission = await prisma.admission.create({
      data: {
        collegeId,
        applicantName: data.applicantName,
        departmentId: data.departmentId,
        marksheetDetails: data.marksheetDetails,
        createdFromLeadId: data.createdFromLeadId,
        status,
        cutoffCheckResult
      }
    });

    res.status(201).json({ data: admission });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const allotSeat = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { admissionId } = allotSeatSchema.parse(req.body);

    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, collegeId }
    });

    if (!admission || admission.status !== 'shortlisted') {
      return res.status(400).json({ error: 'Application must be shortlisted to allot a seat' });
    }

    // Seat hold = exactly 3 days from allotment
    const seatHoldExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const updated = await prisma.admission.update({
      where: { id: admission.id },
      data: {
        status: 'seat_allotted',
        seatHoldExpiresAt
      }
    });

    res.json({ data: updated });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
