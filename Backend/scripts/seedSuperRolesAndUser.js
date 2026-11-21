import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import Role, { SYSTEM_MODULES } from "../src/models/Role.js";
import User from "../src/models/User.js";

import ModuleSetting from "../src/models/ModuleSetting.js";
import WorkShift from "../src/models/WorkShift.js";
import Department from "../src/models/Department.js";
import WorkingWeek from "../src/models/WorkingWeek.js";
import TaskExtensionMaster from "../src/models/TaskExtensionMaster.js";
import TaskBucketAgingMaster from "../src/models/TaskBucketAgingMaster.js";

dotenv.config();

// Helper: Generates full CRUD access mapped across all submodules in SYSTEM_MODULES
const getFullAccessPermissions = (modulesTree) =>
  modulesTree.flatMap((parent) =>
    parent.submodules.map((sub) => ({
      parentModuleKey: parent.key,
      submoduleKey: sub.key,
      actions: { create: true, read: true, update: true, delete: true },
    })),
  );

async function ensureDefaultModules() {
  const modules = ["DO_THIS2", "FMS_ENGINE", "COMPANY_SETUP"];

  const operations = modules.map((moduleKey) => ({
    updateOne: {
      filter: { moduleKey },
      update: {
        $setOnInsert: {
          moduleKey,
          isEnabled: true,
          updatedBy: null,
        },
      },
      upsert: true,
    },
  }));

  await ModuleSetting.bulkWrite(operations);
  console.log("Default module settings ensured.");
}

async function ensureDefaultWorkingWeek() {
  let workingWeek = await WorkingWeek.findOne();

  if (!workingWeek) {
    workingWeek = await WorkingWeek.create({
      workingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      },
    });
    console.log("Default working week created.");
  }

  return workingWeek;
}

async function ensureOpenDepartment() {
  let department = await Department.findOne({
    name: "Open Department",
    isDeleted: false,
  });

  if (!department) {
    department = await Department.create({
      name: "Open Department",
      workingWeekDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      },
    });
    console.log("Open Department created.");
  }

  return department;
}

// 🟢 Seed Default TaskExtensionMaster (Only if not already present)
async function ensureTaskExtensionMaster(updatedBy = null) {
  let master = await TaskExtensionMaster.findOne();

  if (!master) {
    master = await TaskExtensionMaster.create({
      daysBeforeDueDate: 2,
      isActive: true,
      updatedBy,
    });
    console.log("Default TaskExtensionMaster created (daysBeforeDueDate: 2).");
  } else {
    console.log("TaskExtensionMaster already exists. Skipping.");
  }

  return master;
}

// 🟢 Seed Default TaskBucketAgingMaster (Only if not already present)
async function ensureTaskBucketAgingMaster(updatedBy = null) {
  let agingMaster = await TaskBucketAgingMaster.findOne();

  if (!agingMaster) {
    agingMaster = await TaskBucketAgingMaster.create({
      pendingDaysThreshold: 2,
      updatedBy,
    });
    console.log(
      "Default TaskBucketAgingMaster created (pendingDaysThreshold: 2).",
    );
  } else {
    console.log("TaskBucketAgingMaster already exists. Skipping.");
  }

  return agingMaster;
}

// 🟢 FIXED: Preserves existing database permissions on re-run instead of wiping them!
async function ensureRole({
  name,
  displayName,
  permissions,
  isFullAccess = false,
}) {
  const formattedName = name.trim().toLowerCase().replace(/\s+/g, "_");

  let role = await Role.findOne({ name: formattedName });

  if (!role) {
    return await Role.create({
      name: formattedName,
      displayName: displayName || name,
      permissions,
      isSystemRole: true,
      canDelete: false,
    });
  }

  role.canDelete = false;
  role.isSystemRole = true;

  if (isFullAccess) {
    role.permissions = permissions;
  } else {
    if (!role.permissions || role.permissions.length === 0) {
      role.permissions = permissions;
    }
  }

  await role.save();
  return role;
}

async function ensureDefaultShift() {
  let shift = await WorkShift.findOne({
    name: "General Shift",
    isDeleted: false,
  });

  if (!shift) {
    shift = await WorkShift.create({
      name: "General Shift",
      startTime: "09:00",
      endTime: "18:00",
      workingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
    });

    console.log("Default shift created.");
  }

  return shift;
}

async function ensureUser({
  employeeCode,
  name,
  email,
  phone,
  password,
  roleId,
  assignShift,
  departmentIds,
  reportingManager = null,
}) {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { employeeCode }],
    isDeleted: false,
  });

  if (existing) {
    console.log(
      `User already exists (${existing.email} | ${existing.employeeCode}). Skipping.`,
    );
    return existing;
  }

  const salt = await bcrypt.genSalt(10);

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    employeeCode,
    companyCode: "",
    department: departmentIds,
    role: roleId,
    reportingManager: reportingManager,
    assignShift,
    password,
    isActive: true,
    isEmailNotificationEnabled: false,
    mainEmailType: "email",
    secondaryEmail: "",
    refreshToken: null,
  });

  console.log(`User created: ${name}`);
  return user;
}

async function main() {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/dothis2";

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log("MongoDB connected for seeding.");
    }

    // 1. Initialize System Module Settings
    await ensureDefaultModules();

    // 2. Prepare Permissions Array
    const fullPermissions = getFullAccessPermissions(SYSTEM_MODULES);

    // 3. Ensure Fixed System Roles
    const superRole = await ensureRole({
      name: "super",
      displayName: "Super",
      permissions: fullPermissions,
      isFullAccess: true,
    });

    const adminRole = await ensureRole({
      name: "admin",
      displayName: "Admin",
      permissions: fullPermissions,
      isFullAccess: true,
    });

    const dmRole = await ensureRole({
      name: "delegator",
      displayName: "Delegator",
      permissions: [],
      isFullAccess: false,
    });

    const memberRole = await ensureRole({
      name: "employee",
      displayName: "Employee",
      permissions: [],
      isFullAccess: false,
    });

    // 4. Ensure Organizational Defaults
    const defaultShift = await ensureDefaultShift();
    const openDepartment = await ensureOpenDepartment();
    await ensureDefaultWorkingWeek();

    const assignShift = defaultShift._id.toString();
    const departmentIds = [openDepartment._id];

    // 5. Seed Super User FIRST
    const superUser = await ensureUser({
      employeeCode: "SUPER001",
      name: "Super User",
      email: process.env.SUPERUSER_EMAIL || "super@gmail.com",
      phone: "1234567890",
      password: process.env.SUPERUSER_PASSWORD || "Super@123",
      roleId: superRole._id,
      assignShift,
      departmentIds,
      reportingManager: null,
    });

    const superId = superUser ? superUser._id : null;

    // 6. Seed Admin User SECOND
    const adminUser = await ensureUser({
      employeeCode: "ADMIN001",
      name: "Admin User",
      email: "admin@dothis2.com",
      phone: "1234567810",
      password: "Admin@123",
      roleId: adminRole._id,
      assignShift,
      departmentIds,
      reportingManager: superId,
    });

    const adminId = adminUser ? adminUser._id : null;

    // 7. Ensure Default Masters (After Admin/Super User so updatedBy is linked)
    await ensureTaskExtensionMaster(adminId || superId);
    await ensureTaskBucketAgingMaster(adminId || superId);

    // 8. Seed Remaining Users
    await ensureUser({
      employeeCode: "DELEGATOR001",
      name: "Delegator User",
      email: "delegator@dothis2.com",
      phone: "1234567812",
      password: "Delegator@123",
      roleId: dmRole._id,
      assignShift,
      departmentIds,
      reportingManager: adminId,
    });

    await ensureUser({
      employeeCode: "EMPLOYEE001",
      name: "Employee User",
      email: "employee@dothis2.com",
      phone: "1234567813",
      password: "Employee@123",
      roleId: memberRole._id,
      assignShift,
      departmentIds,
      reportingManager: adminId,
    });

    console.log("Seeding process completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
  }
}

main();