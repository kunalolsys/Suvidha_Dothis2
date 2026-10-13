import bcrypt from "bcrypt";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { handleAsync } from "../utils/handleAsync.js";
import AppError from "../utils/AppError.js";
import Department from "../models/Department.js";
import WorkShift from "../models/WorkShift.js";
import sendEmail from "../services/emailService.js";
import fs from "fs";
import csvParser from "csv-parser";
import {
  greetingTemplate,
  taskAssignedTemplate,
} from "../services/templates.js";
import { createLog } from "./logController.js";
import mongoose from "mongoose";
import TaskAudienceMaster from "../models/TaskAudienceMaster.js";
// Get all users
async function getAllSubordinates(managerId) {
  const subordinates = await User.find({
    reportingManager: managerId,
    isDeleted: { $ne: true },
  }).select("_id");
  const subordinateIds = subordinates.map((user) => user._id);

  let allSubordinates = [...subordinateIds];

  for (const subId of subordinateIds) {
    const deeperSubordinates = await getAllSubordinates(subId);
    allSubordinates = allSubordinates.concat(deeperSubordinates);
  }

  return allSubordinates;
}
export const getAllUsers = handleAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    active,
    managerId,
    role,
    department,
    assignShift,
    search,
  } = req.body;

  const filter = { isDeleted: { $ne: true } };

  // ✅ Active filter
  if (active === true || active === "true") {
    filter.isActive = true;
  }

  // ✅ Manager + subordinates filter
  if (managerId) {
    const subordinateIds = await getAllSubordinates(managerId);
    subordinateIds.push(managerId);
    filter._id = { $in: subordinateIds };
  }

  // ✅ SEARCH FILTER
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeCode: { $regex: search, $options: "i" } },
    ];
  }

  // 🟢 ROLE FILTER FIX: Prevent Overwriting
  const superRole = await Role.findOne({ name: "Super" }).select("_id");

  if (role) {
    // Agar explicit role passed ho, to vahi role filter me jayega
    filter.role = role;
  } else if (superRole) {
    // Agar explicit role pass nahi hai, to Super role skip hoga
    filter.role = { $ne: superRole._id };
  }

  // ✅ Department filter
  if (department) {
    if (Array.isArray(department)) {
      filter.department = { $in: department };
    } else {
      filter.department = department;
    }
  }

  // ✅ Assign Shift filter
  if (assignShift) {
    filter.assignShift = assignShift;
  }

  // ✅ Fetch users directly using MongoDB Pagination (Performance Optimized)
  const skip = (page - 1) * limit;

  const total = await User.countDocuments(filter);

  const users = await User.find(filter, "-password")
    .populate("department", "name")
    .populate("reportingManager", "name")
    .populate("role", "name displayName")
    .populate("assignShift")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  return res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});
export const getAllUsersForDrop = handleAsync(async (req, res, next) => {
  const filter = { isDeleted: { $ne: true }, isActive: true };
  // ✅ Fetch users
  const superRole = await Role.findOne({
    name: "Super",
  }).select("_id");

  if (superRole) {
    filter.role = { $ne: superRole._id };
  }
  const users = await User.find(filter, "-password")
    .populate("department", "name")
    .populate("role", "name displayName")
    .populate("assignShift")
    .sort({ createdAt: -1 });
  const totalUser = await User.countDocuments(filter);
  return res.status(200).json({
    success: true,
    data: users,
    totalUser,
  });
});
export const dashboardUserCount = handleAsync(async (req, res, next) => {
  const filter = { isDeleted: { $ne: true }, isActive: true };
  const superRole = await Role.findOne({
    name: "Super",
  }).select("_id");

  if (superRole) {
    filter.role = { $ne: superRole._id };
  }
  const totalUser = await User.countDocuments(filter);
  return res.status(200).json({
    success: true,
    totalUser,
  });
});
export const exportUsers = handleAsync(async (req, res) => {
  const { role, department, assignShift, search } = req.body;

  const filter = { isDeleted: { $ne: true } };

  if (role) filter.role = role;

  if (department) {
    if (Array.isArray(department) && department.length > 0) {
      filter.department = { $in: department };
    } else {
      filter.department = department;
    }
  }

  if (assignShift) filter.assignShift = assignShift;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeCode: { $regex: search, $options: "i" } },
    ];
  }

  // 🔥 NO PAGINATION HERE
  const users = await User.find(filter, "-password")
    .populate("department", "name")
    .populate("role", "name displayName")
    .populate("assignShift");

  return res.status(200).json({
    success: true,
    data: users,
  });
});

export const getAllUserForDrops = handleAsync(async (req, res) => {
  const filter = { isDeleted: { $ne: true } };
  // 🔥 NO PAGINATION HERE
  const superRole = await Role.findOne({
    name: "Super",
  }).select("_id");

  if (superRole) {
    filter.role = { $ne: superRole._id };
  }
  const users = await User.find(filter)
    .select("department role assignShift name _id")
    .populate("department", "name")
    .populate("role", "name displayName")
    .populate("assignShift");

  return res.status(200).json({
    success: true,
    data: users,
  });
});
export const getAllFilterUserForDrops = handleAsync(async (req, res) => {
  const userId = req.cookies.userId || req.user._id || null;
  const loggedInUser = await User.findById(userId).populate(
    "role",
    "name displayName",
  );

  if (!loggedInUser) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Base filter: non-deleted users
  let filter = {
    isDeleted: { $ne: true },
  };

  // Exclude Super role if present
  const superRole = await Role.findOne({
    name: { $regex: /^super$/i },
  }).select("_id");

  if (superRole) {
    filter.role = { $ne: superRole._id };
  }

  // Fetch all users without department/reporting restrictions
  const users = await User.find(filter)
    .select("department role assignShift name _id reportingManager email")
    .populate("department", "name")
    .populate("role", "name displayName")
    .populate("assignShift");

  return res.status(200).json({
    success: true,
    data: users,
  });
});
// export const getAllFilterUserForDrops = handleAsync(async (req, res) => {
//   const userId = req.cookies.userId || req.user._id || null;
//   const loggedInUser = await User.findById(userId).populate("role", "name");

//   if (!loggedInUser) {
//     return res.status(404).json({
//       success: false,
//       message: "User not found",
//     });
//   }

//   const roleName = loggedInUser.role?.name?.toLowerCase();

//   const isSuperUser = roleName === "admin" || roleName === "owner";
//   const isMember = roleName === "member";

//   let filter = {
//     isDeleted: { $ne: true },
//   };

//   // ✅ Non-admin users only see reporting users
//   if (!isSuperUser) {
//     // ✅ Member → only himself
//     if (isMember) {
//       filter._id = loggedInUser._id;
//     }

//     // ✅ Manager / Sr.Manager → reporting users
//     else {
//       filter.reportingManager = loggedInUser._id;
//     }
//   }
//   const superRole = await Role.findOne({
//     name: "Super",
//   }).select("_id");

//   if (superRole) {
//     filter.role = { $ne: superRole._id };
//   }
//   const users = await User.find(filter)
//     .select("department role assignShift name _id reportingManager")
//     .populate("department", "name")
//     .populate("role", "name")
//     .populate("assignShift");

//   return res.status(200).json({
//     success: true,
//     data: users,
//   });
// });
export const createUser = handleAsync(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    telegramUserName,
    department,
    role,
    // reportingManager, // Removed from destructuring
    assignShift,
    password,
    employeeCode,
    secondaryEmail,
    mainEmailType,
    isEmailNotificationEnabled,
    telegramNotificationsEnabled,
  } = req.body;

  if (!name || !email || !phone || !password) {
    return next(new AppError("Please provide all required fields", 400));
  }

  // Validate unique employeeCode if provided
  if (employeeCode) {
    const existingCode = await User.findOne({
      employeeCode: {
        $regex: `^${String(employeeCode).trim()}$`,
        $options: "i",
      },
    });
    if (existingCode) {
      return next(new AppError("Employee code already exists", 400));
    }
  }

  if (mainEmailType === "secondaryEmail" && !secondaryEmail) {
    return next(
      new AppError("Secondary email required when selected as main", 400),
    );
  }

  // 🚀 Fetch Admin Role User to set as default Reporting Manager
  const adminRole = await Role.findOne({ name: "admin" });
  let adminUser = null;

  if (adminRole) {
    adminUser = await User.findOne({ role: adminRole._id, isDeleted: false });
  }

  let singleDeptId = undefined;
  if (Array.isArray(department) && department.length > 0) {
    singleDeptId = department[0];
  } else if (department && typeof department === "string") {
    singleDeptId = department;
  }

  const newUser = await User.create({
    name,
    email,
    phone,
    telegramUserName,
    telegramNotificationsEnabled,
    employeeCode,
    department: singleDeptId,
    role,
    // 🚀 Always set Admin User ID as reportingManager
    reportingManager: adminUser ? adminUser._id : undefined,
    assignShift,
    password: password,
    isEmailNotificationEnabled: isEmailNotificationEnabled,
    mainEmailType: mainEmailType || "email",
  });

  await createLog({
    action: "CREATE",
    module: "USER",
    documentId: newUser._id,
    performedBy: req.cookies.userId || req.user._id || null,
    newData: newUser,
    message: "User created",
  });

  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
    message: "User registered successfully",
  });
});
// Update user

const deleteFile = (filePath) => {
  if (!filePath) return;

  const fullPath = `.${filePath}`;

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
export const updateUser = handleAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    telegramUserName,
    telegramNotificationsEnabled,
    password,
    department,
    role,
    isActive,
    reportingManager,
    assignShift,
    employeeCode,
    secondaryEmail,
    mainEmailType,
    isEmailNotificationEnabled,
  } = req.body;

  const user = await User.findById(id);
  const oldData = user.toObject();
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (mainEmailType === "secondaryEmail" && !secondaryEmail) {
    return next(
      new AppError("Secondary email required when selected as main", 400),
    );
  }
  // console.log("email@@@@",typeof email)
  if (name !== undefined) user.name = name;
  if (telegramUserName !== undefined) user.telegramUserName = telegramUserName;
  if (telegramNotificationsEnabled !== undefined)
    user.telegramNotificationsEnabled = telegramNotificationsEnabled;
  if (email !== undefined) {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      user.email = undefined; // or reject
    } else {
      user.email = cleanEmail.toLowerCase();
    }
  }
  if (isEmailNotificationEnabled !== undefined) {
    user.isEmailNotificationEnabled = isEmailNotificationEnabled;
  }
  if (secondaryEmail !== undefined) user.secondaryEmail = secondaryEmail;
  if (mainEmailType) {
    user.mainEmailType = mainEmailType || "email";
  }
  if (phone !== undefined) user.phone = phone;
  if (employeeCode !== undefined) {
    const codeTrim = String(employeeCode).trim();
    if (codeTrim) {
      // if changed, ensure uniqueness
      if (
        String(user.employeeCode || "").toLowerCase() !== codeTrim.toLowerCase()
      ) {
        const exists = await User.findOne({
          employeeCode: { $regex: `^${codeTrim}$`, $options: "i" },
          _id: { $ne: user._id },
        });
        if (exists)
          return next(new AppError("Employee code already exists", 400));
      }
      user.employeeCode = codeTrim;
    } else {
      // allow clearing
      user.employeeCode = codeTrim;
    }
  }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = password;
  }

  if (department !== undefined) {
    if (Array.isArray(department)) {
      user.department = department.length > 0 ? department[0] : null;
    } else {
      user.department = department || null;
    }
  }
  // Prevent role change if user is referenced in Task Audience Master
  if (role && String(role) !== String(user.role)) {
    const linkedAudience = await TaskAudienceMaster.findOne({
      $or: [{ targetUsers: user._id }, { targetRole: user.role }],
    }).populate("targetRole", "name");

    if (linkedAudience) {
      return next(
        new AppError(
          `Cannot change this user's role because the user or their current role is linked to Task Audience "${linkedAudience.name}".`,
          400,
        ),
      );
    }
  }
  if (role) {
    const roleExists = await Role.findById(role);
    if (!roleExists) {
      return next(new AppError("Invalid role ID", 400));
    }
    user.role = role;
  }
  if (reportingManager) {
    user.reportingManager = reportingManager;
  }
  if (assignShift) {
    const shiftExists = await WorkShift.findById(assignShift);
    if (!shiftExists) {
      return next(new AppError("Invalid shift ID", 400));
    }
    user.assignShift = assignShift;
  }
  if (isActive !== undefined) user.isActive = isActive;
  if (req.files?.profilePhoto?.[0]) {
    deleteFile(user.profilePhoto);
    user.profilePhoto = `/${req.files.profilePhoto[0].path.replace(/\\/g, "/")}`;
  }
  // if (isEmailNotificationEnabled) {
  //   await sendEmail({
  //     from: user.email,
  //     subject: "Greeting Mail",
  //     html: greetingTemplate(user.name),
  //   });
  // }
  await user.save();
  await createLog({
    action: "UPDATE",
    module: "USER",
    documentId: user._id,
    performedBy: req.cookies.userId || req.user._id || null,
    oldData,
    newData: user,
    message: "User updated",
  });
  // await sendEmail()
  const updatedUser = await User.findById(user._id)
    .populate("department", "name")
    .populate("role", "name displayName")
    .populate("assignShift");

  const userObj = updatedUser.toObject();
  delete userObj.password;

  res.status(200).json({
    status: "success",
    message: "User updated successfully",
    user: userObj,
  });
});

// Delete user
export const deleteUser = handleAsync(async (req, res, next) => {
  const { id } = req.params;
  const currentUserId = req.cookies.userId || req.user._id || null;
  const user = await User.findById(id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  user.isDeleted = true;
  user.isActive = false;
  user.deletedAt = new Date();
  user.deletedBy = currentUserId;

  await user.save();
  await createLog({
    action: "DELETE",
    module: "USER",
    documentId: user._id,
    performedBy: req.cookies.userId || req.user._id || null,
    oldData: user,
    message: "User deleted",
  });
  res.status(200).json({
    status: "success",
    message: "User deleted successfully",
  });
});

// Get single user by ID
export const getSingleUser = handleAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate("department", "name")
    .populate("role", "name displayName")
    .populate("assignShift")
    .populate("reportingManager", "name");
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const userObj = user.toObject();
  delete userObj.password; // Remove password from response

  res.status(200).json({
    success: true,
    data: userObj,
  });
});

export const importUsersCSV = handleAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload a CSV file.", 400));
  }

  const filePath = req.file.path;
  const rawRows = [];

  // 1. Read & Parse CSV File into Memory
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data) => rawRows.push(data))
        .on("end", resolve)
        .on("error", reject);
    });
  } catch (parseErr) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return next(new AppError("Failed to parse CSV file format.", 400));
  }

  // File cleanup
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  if (rawRows.length === 0) {
    return next(new AppError("CSV file is empty.", 400));
  }

  // 🟢 CLEAN CSV KEYS (Remove UTF-8 BOM mark `` and trim whitespace from Header Keys)
  const rows = rawRows.map((row) => {
    const cleanRow = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key.replace(/^\uFEFF/, "").trim(); // Strip BOM
      cleanRow[cleanKey] = row[key];
    });
    return cleanRow;
  });

  // 2. Pre-fetch Masters
  const [allRoles, allShifts, allDepartments, existingUsers] =
    await Promise.all([
      Role.find({}),
      WorkShift.find({ isDeleted: false }),
      Department.find({ isDeleted: false }),
      User.find({ isDeleted: false }).select(
        "email phone employeeCode role _id",
      ),
    ]);

  // Lookup Maps (Case-insensitive & Trimmed)
  const roleMap = new Map(
    allRoles.map((r) => [r.name.trim().toLowerCase(), r]),
  );
  const shiftMap = new Map(
    allShifts.map((s) => [s.name.trim().toLowerCase(), s._id]),
  );
  const deptMap = new Map(
    allDepartments.map((d) => [d.name.trim().toLowerCase(), d._id]),
  );

  // Standard hierarchy lookup (matching createUser logic)
  const superRole = allRoles.find((r) => r.name.toLowerCase() === "super");
  const adminRole = allRoles.find((r) => r.name.toLowerCase() === "admin");

  const superUser = existingUsers.find(
    (u) => String(u.role) === String(superRole?._id),
  );
  const adminUser = existingUsers.find(
    (u) => String(u.role) === String(adminRole?._id),
  );

  // Duplicates tracking sets
  const existingEmails = new Set(
    existingUsers.map((u) => u.email?.toLowerCase()).filter(Boolean),
  );
  const existingEmpCodes = new Set(
    existingUsers
      .map((u) => u.employeeCode?.trim().toLowerCase())
      .filter(Boolean),
  );

  const emailsInCSV = new Set();
  const validUsersToCreate = [];
  const errorRows = [];

  // 3. Process Rows using exact createUser logic
  for (const row of rows) {
    const name = (row.Name || "").trim();
    const email = (row.Email || "").trim().toLowerCase();
    const phone = (row.Phone || "").trim();
    const password = (row.Password || "").trim();
    const empCode = (row["Employee Code"] || row["Employee"] || "").trim();
    const roleName = (row.Role || "").trim().toLowerCase();
    const shiftName = (row.Shift || "").trim().toLowerCase();
    const deptString = (row.Departme || row.Department || "").trim();

    let errorReason = "";

    // 🟢 Exact createUser validations
    if (!name || !email || !phone || !password) {
      errorReason =
        "Please provide all required fields (Name, Email, Phone, Password).";
    } else if (empCode && existingEmpCodes.has(empCode.toLowerCase())) {
      errorReason = `Employee code '${empCode}' already exists in system.`;
    } else if (emailsInCSV.has(email) || existingEmails.has(email)) {
      errorReason = `User with email '${email}' already exists.`;
    }

    if (errorReason) {
      errorRows.push({ ...row, "Error Reason": errorReason });
      continue;
    }

    // Resolve Role & Shift
    const matchedRoleObj = roleMap.get(roleName);
    const shiftId = shiftMap.get(shiftName);

    if (!matchedRoleObj) {
      errorRows.push({
        ...row,
        "Error Reason": `Role '${row.Role}' not found.`,
      });
      continue;
    }
    if (!shiftId) {
      errorRows.push({
        ...row,
        "Error Reason": `Shift '${row.Shift}' not found.`,
      });
      continue;
    }

    // Parse Departments (Single ObjectId mapping)
    const firstDeptName = deptString.split(",")[0]?.trim().toLowerCase();
    const singleDeptId = firstDeptName ? deptMap.get(firstDeptName) : undefined;

    // Reporting Manager Resolution (Matching createUser)
    let resolvedReportingManager = undefined;
    if (matchedRoleObj.name === "admin") {
      resolvedReportingManager = superUser ? superUser._id : undefined;
    } else if (matchedRoleObj.name !== "super") {
      resolvedReportingManager = adminUser ? adminUser._id : undefined;
    }

    // Mark as checked
    emailsInCSV.add(email);
    if (empCode) existingEmpCodes.add(empCode.toLowerCase());

    validUsersToCreate.push({
      originalRow: row,
      payload: {
        name,
        email,
        phone,
        employeeCode: empCode || undefined,
        department: singleDeptId,
        role: matchedRoleObj._id,
        reportingManager: resolvedReportingManager,
        assignShift: shiftId,
        password,
        isActive: true,
        isEmailNotificationEnabled: false,
        mainEmailType: "email",
      },
    });
  }

  // 4. Safe Creation with SrNo Pre-calculation
  const createdUsers = [];
  const lastUser = await User.findOne({}, {}, { sort: { srNo: -1 } });
  let nextSrNo = lastUser && lastUser.srNo ? lastUser.srNo + 1 : 1;

  for (const item of validUsersToCreate) {
    try {
      // 🟢 Assign next explicit srNo to avoid Duplicate E11000 Error on Save Hook
      item.payload.srNo = nextSrNo++;

      const newUser = await User.create(item.payload);
      createdUsers.push(newUser);

      // Async Log
      createLog({
        action: "CREATE",
        module: "USER",
        documentId: newUser._id,
        performedBy: req.cookies?.userId || req.user?._id || null,
        newData: newUser,
        message: "User created via CSV import",
      }).catch((e) => console.error("Log error:", e.message));
    } catch (dbErr) {
      let dbErrorMsg = dbErr.message || "Failed to create user.";
      if (dbErr.code === 11000) {
        const field = Object.keys(dbErr.keyPattern || {})[0] || "index";
        dbErrorMsg = `Duplicate entry error on field '${field}' in database.`;
      }
      errorRows.push({
        ...item.originalRow,
        "Error Reason": dbErrorMsg,
      });
    }
  }

  res.status(201).json({
    status: "success",
    data: {
      validCount: createdUsers.length,
      errorCount: errorRows.length,
      errorRows,
    },
    message: `${createdUsers.length} user(s) registered successfully`,
  });
});
