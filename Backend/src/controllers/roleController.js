import Role, { ALL_SUBMODULE_KEYS, SYSTEM_MODULES } from "../models/Role.js";
import { handleAsync } from "../utils/handleAsync.js";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";

// Helper: Submodule and Action Payload Validation
const validatePermissionsPayload = (permissions) => {
  if (!Array.isArray(permissions)) return false;

  for (const item of permissions) {
    if (
      !item.submoduleKey ||
      !item.parentModuleKey ||
      !ALL_SUBMODULE_KEYS.includes(item.submoduleKey)
    ) {
      return false;
    }
  }
  return true;
};

// 1. Get all roles
export const getAllRoles = handleAsync(async (req, res, next) => {
  const roles = await Role.find({ name: { $ne: "super" } })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: roles.length,
    data: roles,
  });
});

// 2. Get Single Role by ID
export const getRoleById = handleAsync(async (req, res, next) => {
  const { id } = req.params;
  const role = await Role.findById(id).lean();

  if (!role) {
    return next(new AppError("Role not found", 404));
  }

  return res.status(200).json({
    success: true,
    data: role,
  });
});

// 3. Create a new custom role
export const createRole = handleAsync(async (req, res, next) => {
  const { name, displayName, description, permissions } = req.body;

  if (!name || !displayName) {
    return next(new AppError("Role name and display title are required", 400));
  }

  const formattedName = name.trim().toLowerCase().replace(/\s+/g, "_");

  // Duplicate Role Name Check
  const existingRole = await Role.findOne({ name: formattedName });
  if (existingRole) {
    return next(new AppError("Role with this name already exists", 400));
  }

  // Permissions Structure Validation
  if (permissions && !validatePermissionsPayload(permissions)) {
    return next(
      new AppError(
        "Invalid submodule structure passed in permissions array",
        400,
      ),
    );
  }

  // 🔥 DIRECT SAVE: Submodules array me se REMOVE NAHI HONGE (False bhi save honge)
  const newRole = await Role.create({
    name: formattedName,
    displayName: displayName.trim(),
    description: description || "",
    permissions: permissions || [],
  });

  return res.status(201).json({
    success: true,
    message: "Role created successfully",
    data: newRole,
  });
});

// 4. Update Role
export const updateRole = handleAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, displayName, description, permissions } = req.body;

  const role = await Role.findById(id);

  if (!role) {
    return next(new AppError("Role not found", 404));
  }

  // Prevent modifying critical system key names of fixed roles
  if (role.isSystemRole && name) {
    const formattedName = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (formattedName !== role.name) {
      return next(new AppError("System role key name cannot be renamed", 400));
    }
  }

  // Name duplicate check
  if (name) {
    const formattedName = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (formattedName !== role.name) {
      const duplicateCheck = await Role.findOne({ name: formattedName });
      if (duplicateCheck) {
        return next(
          new AppError("Another role with this name already exists", 400),
        );
      }
      role.name = formattedName;
    }
  }

  // Permission structure validation check
  if (permissions !== undefined) {
    if (!validatePermissionsPayload(permissions)) {
      return next(
        new AppError(
          "Invalid submodule structure passed in permissions array",
          400,
        ),
      );
    }

    // 🔥 DIRECT ASSIGNMENT: Submodule saare false ho tab bhi array me hi rahenge
    role.permissions = permissions;
  }

  if (displayName) role.displayName = displayName.trim();
  if (description !== undefined) role.description = description;

  await role.save();

  return res.status(200).json({
    success: true,
    message: "Role updated successfully",
    data: role,
  });
});

// 5. Delete a role
export const deleteRole = handleAsync(async (req, res, next) => {
  const { id } = req.params;
  const role = await Role.findById(id);

  if (!role) {
    return next(new AppError("Role not found", 404));
  }

  if (role.canDelete === false || role.isSystemRole) {
    return next(new AppError("This fixed system role cannot be deleted", 400));
  }

  const usersWithRole = await User.countDocuments({
    role: id,
    isDeleted: false,
  });

  if (usersWithRole > 0) {
    return next(
      new AppError(
        `Cannot delete role. ${usersWithRole} active user(s) are assigned to this role.`,
        400,
      ),
    );
  }

  await role.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Role deleted successfully",
    data: null,
  });
});

// 6. Utility Helper: Fetch System Modules Tree
export const getSystemModules = handleAsync(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: SYSTEM_MODULES,
  });
});

// 🔥 7. Get Current Authenticated User's Permissions (On-Demand Refresh Re-hydration)
// Helper: Role permissions + User customPermissions merge (User overrides Role)
export const mergeRoleAndUserPermissions = (
  rolePermissions = [],
  userCustomPermissions = [],
) => {
  const permMap = new Map();

  // 1. Pehle Role ki saari permissions load karein
  for (const item of rolePermissions) {
    permMap.set(item.submoduleKey, {
      parentModuleKey: item.parentModuleKey,
      submoduleKey: item.submoduleKey,
      actions: {
        create: Boolean(item.actions?.create),
        read: Boolean(item.actions?.read),
        update: Boolean(item.actions?.update),
        delete: Boolean(item.actions?.delete),
      },
    });
  }

  // 2. User-wise customPermissions se override karein (Grant ya Revoke dono)
  for (const item of userCustomPermissions) {
    permMap.set(item.submoduleKey, {
      parentModuleKey: item.parentModuleKey,
      submoduleKey: item.submoduleKey,
      actions: {
        create: Boolean(item.actions?.create),
        read: Boolean(item.actions?.read),
        update: Boolean(item.actions?.update),
        delete: Boolean(item.actions?.delete),
      },
    });
  }

  return Array.from(permMap.values());
};

// 🔥 7. Get Current Authenticated User's Effective Permissions (Role + User Override)
export const getMyPermissions = handleAsync(async (req, res, next) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError("User authentication token missing", 401));
  }

  const user = await User.findById(userId).populate("role").lean();

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Super User Bypass Access
  if (user.role?.name === "super") {
    return res.status(200).json({
      success: true,
      isSuper: true,
      permissions: [],
    });
  }

  const effectivePermissions = mergeRoleAndUserPermissions(
    user.role?.permissions || [],
    user.customPermissions || [],
  );

  return res.status(200).json({
    success: true,
    isSuper: false,
    permissions: effectivePermissions,
  });
});

// 🔥 8. Admin API: Get Specific User's Role + Custom + Effective Permissions
export const getUserPermissions = handleAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .select("name email employeeCode role customPermissions")
    .populate("role", "name displayName permissions")
    .lean();

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const rolePermissions = user.role?.permissions || [];
  const customPermissions = user.customPermissions || [];
  const effectivePermissions = mergeRoleAndUserPermissions(
    rolePermissions,
    customPermissions,
  );

  return res.status(200).json({
    success: true,
    data: {
      userId: user._id,
      name: user.name,
      role: {
        _id: user.role?._id,
        name: user.role?.name,
        displayName: user.role?.displayName,
      },
      rolePermissions,
      customPermissions,
      effectivePermissions, // UI checkbox matrix ko pre-fill karne ke liye
    },
  });
});

// 🔥 9. Admin API: Save / Update User-Wise Custom Permissions (Full User Priority)
export const updateUserPermissions = handleAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { permissions, resetToRole } = req.body;

  const user = await User.findById(userId).populate("role");
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Agar explicit Reset kiya jaye tabhi wapas Role ke sath sync hoga
  if (resetToRole === true) {
    user.customPermissions = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User permissions reset to role defaults",
      data: {
        customPermissions: [],
        effectivePermissions: user.role?.permissions || [],
      },
    });
  }

  if (!Array.isArray(permissions) || !validatePermissionsPayload(permissions)) {
    return next(
      new AppError(
        "Invalid submodule structure passed in permissions array",
        400,
      ),
    );
  }

  // ✅ Saare submodules explicit save honge — taaki Role mein baad mein kuch bhi add/change ho,
  // is user ko sirf wahi mile jo User-Wise mein set kiya gaya hai!
  user.customPermissions = permissions.map((item) => ({
    parentModuleKey: item.parentModuleKey,
    submoduleKey: item.submoduleKey,
    actions: {
      create: Boolean(item.actions?.create),
      read: Boolean(item.actions?.read),
      update: Boolean(item.actions?.update),
      delete: Boolean(item.actions?.delete),
    },
  }));

  await user.save();

  const effectivePermissions = mergeRoleAndUserPermissions(
    user.role?.permissions || [],
    user.customPermissions,
  );

  return res.status(200).json({
    success: true,
    message: "User permissions updated successfully",
    data: {
      customPermissions: user.customPermissions,
      effectivePermissions,
    },
  });
});
