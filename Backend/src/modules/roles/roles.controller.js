import { prisma, logger } from '../../server.js';
import { createRoleSchema, updateRoleSchema, updateRolePermissionsSchema } from './roles.schema.js';
import { invalidateRolePermissionsCache } from '../../middleware/requirePermission.js';

export const getModules = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  // Ensure core system modules exist in DB
  const coreModules = [
    { key: 'students', label: 'Students Directory' },
    { key: 'staff', label: 'HR & Staff Management' },
    { key: 'attendance', label: 'Attendance Management' },
    { key: 'fees', label: 'Fees & Financials' },
    { key: 'exams', label: 'Exams & Marks' },
    { key: 'library', label: 'Library Management' },
    { key: 'hostel', label: 'Hostel Management' },
    { key: 'transport', label: 'Transport & Routes' },
    { key: 'infrastructure', label: 'Infrastructure & Facilities' },
    { key: 'notices', label: 'Notice Board' },
    { key: 'academic', label: 'Academic Structure' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'calendar', label: 'Academic & Events Calendar' },
    { key: 'payroll', label: 'Payroll Management' },
    { key: 'inventory', label: 'Inventory Management' },
    { key: 'store', label: 'Campus Store' },
    { key: 'api_integration', label: 'API Integrations' },
    { key: 'admission', label: 'Admission' },
    { key: 'reports', label: 'Reports' },
  ];

  for (const cm of coreModules) {
    await prisma.module.upsert({
      where: { key: cm.key },
      update: {},
      create: { key: cm.key, label: cm.label }
    }).catch(() => {});
  }

  const allModules = await prisma.module.findMany({
    orderBy: { key: 'asc' }
  });
  const modules = allModules.filter(m => !m.key.startsWith('custom_') || m.key.startsWith(`custom_${collegeId}_`));
  res.json({ success: true, data: modules });
};

export const getRoles = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

  if (collegeId) {
    // Ensure default HOD role exists for this college so College Admin can customize its permissions
    const existingHod = await prisma.role.findFirst({
      where: { collegeId, name: { equals: 'HOD', mode: 'insensitive' } }
    });

    if (!existingHod) {
      try {
        const allModules = await prisma.module.findMany();
        const collegeModules = allModules.filter(m => !m.key.startsWith('custom_') || m.key.startsWith(`custom_${collegeId}_`));
        const hodDefaultModules = ['students', 'staff', 'academic', 'timetable', 'attendance', 'exams', 'notices'];

        await prisma.$transaction(async (tx) => {
          const newHod = await tx.role.create({
            data: {
              name: 'HOD',
              category: 'teaching',
              collegeId,
              isSystemRole: false
            }
          });

          if (collegeModules.length > 0) {
            await tx.rolePermission.createMany({
              data: collegeModules.map(m => {
                const isDefault = hodDefaultModules.includes(m.key);
                return {
                  roleId: newHod.id,
                  moduleId: m.id,
                  canCreate: isDefault,
                  canRead: isDefault,
                  canUpdate: isDefault,
                  canDelete: false
                };
              })
            });
          }

          // Link any existing unlinked HOD users in this college
          await tx.user.updateMany({
            where: {
              collegeId,
              role: 'hod',
              customRoleId: null
            },
            data: {
              customRoleId: newHod.id
            }
          });
        });
      } catch (seedErr) {
        logger.warn(`[getRoles] HOD auto-seed skipped or already handled: ${seedErr.message}`);
      }
    }
  }

  const roles = await prisma.role.findMany({
    where: { collegeId },
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }]
  });

  const formatted = roles.map(r => ({
    id: r.id,
    name: r.name,
    collegeId: r.collegeId,
    isSystemRole: r.isSystemRole,
    category: r.category,
    userCount: r._count.users,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Listed ${roles.length} roles`);
  res.json({ success: true, data: formatted });
};

export const createRole = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { name, category } = createRoleSchema.parse(req.body);

  // Check if role name already exists in this college
  const existing = await prisma.role.findFirst({
    where: { collegeId, name: { equals: name, mode: 'insensitive' } }
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'ROLE_ALREADY_EXISTS', message: `Role '${name}' already exists in your college.` }
    });
  }

  // Create role and seed blank permissions for all modules
  const allModules = await prisma.module.findMany();
  const collegeModules = allModules.filter(m => !m.key.startsWith('custom_') || m.key.startsWith(`custom_${collegeId}_`));

  const role = await prisma.$transaction(async (tx) => {
    const newRole = await tx.role.create({
      data: {
        name,
        category, 
        collegeId,
        isSystemRole: false
      }
    });

    if (collegeModules.length > 0) {
      await tx.rolePermission.createMany({
        data: collegeModules.map(m => ({
          roleId: newRole.id,
          moduleId: m.id,
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false,
        }))
      });
    }

    return newRole;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} roleId=${role.id} actor=${actorId} Created role '${name}'`);
  res.status(201).json({ success: true, data: role });
};

export const getRoleById = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  const role = await prisma.role.findFirst({
    where: { id, collegeId },
    include: {
      permissions: {
        include: { module: true }
      },
      _count: {
        select: { users: true }
      }
    }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' }
    });
  }

  // Ensure all modules are represented in response
  const rawModules = await prisma.module.findMany({ orderBy: { key: 'asc' } });
  const allModules = rawModules.filter(m => !m.key.startsWith('custom_') || m.key.startsWith(`custom_${collegeId}_`));
  const permissionsMap = new Map();
  role.permissions.forEach(p => permissionsMap.set(p.moduleId, p));

  const permissions = allModules.map(m => {
    const existing = permissionsMap.get(m.id);
    return {
      moduleId: m.id,
      moduleKey: m.key,
      moduleLabel: m.label,
      canCreate: role.isSystemRole ? true : (existing ? existing.canCreate : false),
      canRead: role.isSystemRole ? true : (existing ? existing.canRead : false),
      canUpdate: role.isSystemRole ? true : (existing ? existing.canUpdate : false),
      canDelete: role.isSystemRole ? true : (existing ? existing.canDelete : false),
    };
  });

  res.json({
    success: true,
    data: {
      id: role.id,
      name: role.name,
      collegeId: role.collegeId,
      isSystemRole: role.isSystemRole,
      category: role.category,
      userCount: role._count.users,
      permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }
  });
};

export const updateRole = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { name, category } = updateRoleSchema.parse(req.body);

  const role = await prisma.role.findFirst({
    where: { id, collegeId }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' }
    });
  }

  if (role.isSystemRole) {
    return res.status(403).json({
      success: false,
      error: { code: 'SYSTEM_ROLE_PROTECTED', message: 'System roles cannot be renamed.' }
    });
  }

    if (name && name.toLowerCase() !== role.name.toLowerCase()) {
    const clash = await prisma.role.findFirst({
      where: { collegeId, name: { equals: name, mode: 'insensitive' }, NOT: { id } }
    });
    if (clash) {
      return res.status(409).json({
        success: false,
        error: { code: 'ROLE_ALREADY_EXISTS', message: `Role '${name}' already exists in your college.` }
      });
    }
  }

  if (category && category !== role.category) {
    const inUse = await prisma.user.count({ where: { customRoleId: id } });
    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'ROLE_IN_USE', message: `Cannot change category: ${inUse} user(s) have this role.` }
      });
    }
  }

  const updated = await prisma.role.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(category ? { category } : {}) }
  });

  invalidateRolePermissionsCache(id);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} roleId=${id} actor=${actorId} Updated role`);
  res.json({ success: true, data: updated });
};

export const deleteRole = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const role = await prisma.role.findFirst({
    where: { id, collegeId },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' }
    });
  }

  if (role.isSystemRole) {
    return res.status(403).json({
      success: false,
      error: { code: 'SYSTEM_ROLE_PROTECTED', message: 'System roles cannot be deleted.' }
    });
  }

  const userCount = role._count.users;
  if (userCount > 0) {
    return res.status(409).json({
      success: false,
      count: userCount,
      error: {
        code: 'ROLE_IN_USE',
        message: `Cannot delete role '${role.name}'. It is currently assigned to ${userCount} user(s). Please reassign them first.`
      }
    });
  }

  await prisma.role.delete({
    where: { id }
  });

  invalidateRolePermissionsCache(id);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} roleId=${id} actor=${actorId} Deleted role '${role.name}'`);
  res.json({ success: true, message: `Role '${role.name}' deleted successfully.` });
};

export const updateRolePermissions = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { permissions } = updateRolePermissionsSchema.parse(req.body);

  const role = await prisma.role.findFirst({
    where: { id, collegeId }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' }
    });
  }

  // Bulk upsert the permissions within a transaction
  await prisma.$transaction(
    permissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_moduleId: {
            roleId: id,
            moduleId: perm.moduleId
          }
        },
        update: {
          canCreate: perm.canCreate,
          canRead: perm.canRead,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
        },
        create: {
          roleId: id,
          moduleId: perm.moduleId,
          canCreate: perm.canCreate,
          canRead: perm.canRead,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
        }
      })
    )
  );

  // Invalidate cache immediately so new permissions take effect right away
  invalidateRolePermissionsCache(id);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} roleId=${id} actor=${actorId} Updated permission matrix (${permissions.length} modules)`);
  res.json({ success: true, message: 'Permissions updated successfully' });
};
