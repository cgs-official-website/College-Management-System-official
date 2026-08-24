import { prisma, logger } from '../../server.js';
import { createRoleSchema, updateRoleSchema, updateRolePermissionsSchema } from './roles.schema.js';

export const getModules = async (req, res) => {
  const modules = await prisma.module.findMany({
    orderBy: { key: 'asc' }
  });
  res.json({ success: true, data: modules });
};

export const getRoles = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

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
  const { name } = createRoleSchema.parse(req.body);

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

  const role = await prisma.$transaction(async (tx) => {
    const newRole = await tx.role.create({
      data: {
        name,
        collegeId,
        isSystemRole: false
      }
    });

    if (allModules.length > 0) {
      await tx.rolePermission.createMany({
        data: allModules.map(m => ({
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
  const allModules = await prisma.module.findMany({ orderBy: { key: 'asc' } });
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
  const { name } = updateRoleSchema.parse(req.body);

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

  const updated = await prisma.role.update({
    where: { id },
    data: { name }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} roleId=${id} actor=${actorId} Renamed role to '${name}'`);
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

  logger.info(`[info] req=${req.id || ''} college=${collegeId} roleId=${id} actor=${actorId} Updated permission matrix (${permissions.length} modules)`);
  res.json({ success: true, message: 'Permissions updated successfully' });
};
