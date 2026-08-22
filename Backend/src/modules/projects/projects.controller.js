import { prisma } from '../../server.js';

export const getProjects = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    
    // For now, fetch all active projects
    const projects = await prisma.project.findMany({
      where: { collegeId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: projects });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getTimesheets = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId } = req.user;

    const timesheets = await prisma.timesheet.findMany({
      where: { 
        userId,
        project: { collegeId }
      },
      include: { project: true },
      orderBy: { date: 'desc' }
    });

    res.json({ data: timesheets });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const logTimesheet = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId } = req.user;
    const { projectId, date, hoursSpent, activityDescription } = req.body;

    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        projectId,
        date: new Date(date),
        hoursSpent: parseFloat(hoursSpent),
        activityDescription
      },
      include: { project: true }
    });

    res.status(201).json({ data: timesheet });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
