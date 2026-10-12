import { prisma } from '../../server.js';

/**
 * Resolves the authenticated parent profile and strictly enforces
 * parent-student linkage and college tenant isolation.
 * Must run AFTER authenticate middleware.
 */
export const resolveParent = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const collegeId = req.user?.collegeId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    if (req.user?.role !== 'parent' && req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access restricted to parent accounts' }
      });
    }

    // Lookup Parent profile scoped by authenticated user and college
    let parent = await prisma.parent.findFirst({
      where: {
        userId,
        ...(collegeId ? { collegeId } : {})
      },
      include: {
        college: true,
        students: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                department: true,
                course: true,
                section: true,
                hostelBlock: true
              }
            }
          }
        }
      }
    });

    // Fallback: If user has role 'parent' but no Parent record was created yet,
    // look for a student referencing this parent's email/contact, or auto-create parent record if collegeId exists
    if (!parent && collegeId && req.user?.role === 'parent') {
      try {
        parent = await prisma.parent.create({
          data: {
            collegeId,
            userId
          },
          include: {
            college: true,
            students: {
              include: {
                student: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    department: true,
                    course: true,
                    section: true,
                    hostelBlock: true
                  }
                }
              }
            }
          }
        });
      } catch (err) {
        // Ignore unique constraint race conditions
        parent = await prisma.parent.findFirst({
          where: { userId },
          include: {
            college: true,
            students: {
              include: {
                student: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    department: true,
                    course: true,
                    section: true,
                    hostelBlock: true
                  }
                }
              }
            }
          }
        });
      }
    }

    const linkedStudents = parent?.students?.map(s => s.student).filter(Boolean) || [];

    // Optional child selection by query param, strictly verified against linked students
    const requestedStudentId = req.query?.studentId;
    let selectedChild = linkedStudents[0] || null;
    if (requestedStudentId) {
      const match = linkedStudents.find(s => s.id === requestedStudentId);
      if (match) {
        selectedChild = match;
      }
    }

    req.parent = parent;
    req.linkedStudents = linkedStudents;
    req.child = selectedChild;
    req.tenant = { collegeId: parent?.collegeId || collegeId };

    next();
  } catch (error) {
    console.error('Error resolving parent:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
