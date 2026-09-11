import { prisma } from '../../server.js';

// ==========================================
// 1. Facilities / Infrastructure Assets
// ==========================================

export const getAssets = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const assets = await prisma.infrastructureAsset.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: assets });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createAsset = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { name, type, capacity, location, status } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: { message: 'Facility name is required' } });
    }

    const asset = await prisma.infrastructureAsset.create({
      data: { 
        collegeId, 
        name: name.trim(), 
        type: type || 'other', 
        capacity: capacity ? parseInt(capacity, 10) : 0, 
        location: location || '', 
        status: status || 'active' 
      }
    });
    res.status(201).json({ data: asset });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;
    const { name, type, capacity, location, status } = req.body;

    const asset = await prisma.infrastructureAsset.update({
      where: { id, collegeId },
      data: {
        ...(name && { name: name.trim() }),
        ...(type && { type }),
        ...(capacity !== undefined && { capacity: parseInt(capacity, 10) || 0 }),
        ...(location !== undefined && { location }),
        ...(status && { status })
      }
    });
    res.json({ data: asset });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    await prisma.infrastructureAsset.delete({
      where: { id: req.params.id, collegeId }
    });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

// ==========================================
// 2. Facility Permission & Booking Requests
// ==========================================

export const getBookingRequests = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const user = req.user;

    const whereClause = { collegeId };

    // If requester is not admin, only show their own or their department's requests
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      whereClause.requesterUserId = user.id;
    }

    const requests = await prisma.infrastructureBooking.findMany({
      where: whereClause,
      include: {
        facility: true,
        department: true,
        requester: {
          select: { id: true, name: true, email: true, role: true }
        },
        reviewer: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createBookingRequest = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const user = req.user;
    const { 
      facilityId, 
      departmentId, 
      eventName, 
      purpose, 
      eventDate, 
      startTime, 
      endTime, 
      expectedAttendees, 
      specialRequirements 
    } = req.body;

    if (!facilityId || !eventName || !eventDate || !startTime || !endTime) {
      return res.status(400).json({ 
        error: { message: 'Facility, event name, date, start time, and end time are required.' } 
      });
    }

    // Verify facility belongs to this college
    const facility = await prisma.infrastructureAsset.findFirst({
      where: { id: facilityId, collegeId }
    });

    if (!facility) {
      return res.status(404).json({ error: { message: 'Selected facility does not exist.' } });
    }

    // Resolve department if not passed explicitly
    let resolvedDeptId = departmentId;
    if (!resolvedDeptId) {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.id, collegeId }
      });
      if (teacher?.departmentId) resolvedDeptId = teacher.departmentId;
    }

    const booking = await prisma.infrastructureBooking.create({
      data: {
        collegeId,
        facilityId,
        departmentId: resolvedDeptId || null,
        requesterUserId: user.id,
        eventName: eventName.trim(),
        purpose: purpose?.trim() || '',
        eventDate: new Date(eventDate),
        startTime,
        endTime,
        expectedAttendees: expectedAttendees ? parseInt(expectedAttendees, 10) : 0,
        specialRequirements: specialRequirements || '',
        status: 'pending'
      },
      include: {
        facility: true,
        department: true,
        requester: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    // Automatically create In-App Notification for College Admin
    const deptName = booking.department?.name || 'Department';
    await prisma.notification.create({
      data: {
        collegeId,
        targetRole: 'admin',
        title: `🔔 Facility Request: ${facility.name}`,
        message: `${user.name || 'HOD'} (${deptName}) requested "${facility.name}" for "${booking.eventName}" on ${new Date(eventDate).toLocaleDateString()}.`,
        type: 'booking_request',
        link: '/admin/infrastructure'
      }
    }).catch(err => console.error('Error creating admin notification:', err));

    res.status(201).json({ data: booking });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const reviewBookingRequest = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const adminUser = req.user;
    const { id } = req.params;
    const { status, adminRemarks } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: { message: "Status must be 'approved' or 'rejected'." } });
    }

    const existingBooking = await prisma.infrastructureBooking.findFirst({
      where: { id, collegeId },
      include: { facility: true }
    });

    if (!existingBooking) {
      return res.status(404).json({ error: { message: 'Booking request not found.' } });
    }

    const updatedBooking = await prisma.infrastructureBooking.update({
      where: { id },
      data: {
        status,
        adminRemarks: adminRemarks || null,
        reviewedByUserId: adminUser.id,
        reviewedAt: new Date()
      },
      include: {
        facility: true,
        department: true,
        requester: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } }
      }
    });

    // Create Notification Alert for the Requester (HOD)
    const isApproved = status === 'approved';
    const alertTitle = isApproved 
      ? `✅ Facility Request Approved: ${existingBooking.facility.name}`
      : `❌ Facility Request Rejected: ${existingBooking.facility.name}`;
    
    const alertMessage = isApproved
      ? `Your permission request for "${existingBooking.facility.name}" on ${new Date(existingBooking.eventDate).toLocaleDateString()} has been APPROVED by the administration.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`
      : `Your permission request for "${existingBooking.facility.name}" on ${new Date(existingBooking.eventDate).toLocaleDateString()} was REJECTED.${adminRemarks ? ` Reason: ${adminRemarks}` : ''}`;

    await prisma.notification.create({
      data: {
        collegeId,
        userId: existingBooking.requesterUserId,
        title: alertTitle,
        message: alertMessage,
        type: isApproved ? 'booking_approval' : 'booking_rejection',
        link: '/teacher/facility-requests'
      }
    }).catch(err => console.error('Error creating HOD notification:', err));

    res.json({ data: updatedBooking });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
