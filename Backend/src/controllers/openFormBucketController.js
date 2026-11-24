import mongoose from "mongoose";
import TaskBucket from "../models/TaskBucket.js";
import OpenFormBucketMaster from "../models/OpenFormBucketMaster.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { handleAsync } from "../utils/handleAsync.js";
import WorkShift from "../models/WorkShift.js";
import Role from "../models/Role.js";

// =========================================================================
// HELPER: Get or Auto-Create Hidden System Anonymous User for Open Form
// =========================================================================
const getOrCreateAnonymousOpenFormUser = async () => {
  const ANON_EMAIL = "openform.anonymous@system.local";
  const ANON_CODE = "SYS_OPENFORM";

  let anonUser = await User.findOne({
    $or: [{ email: ANON_EMAIL }, { employeeCode: ANON_CODE }],
  }).select("_id name email");

  if (!anonUser) {
    // 1. Pehle "Super" (jaise Super Admin / Super Role) dhoondein, na mile toh DB ka first Role record lein
    const defaultRole =
      (await Role.findOne({
        name: { $regex: /^super/i },
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean()) ||
      (await Role.findOne({ isDeleted: { $ne: true } })
        .sort({ _id: 1 })
        .select("_id")
        .lean());

    // 2. Pehle "General" shift dhoondein, na mile toh DB ka first WorkShift record lein
    const defaultShift =
      (await WorkShift.findOne({
        name: { $regex: /^general/i },
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean()) ||
      (await WorkShift.findOne({ isDeleted: { $ne: true } })
        .sort({ _id: 1 })
        .select("_id")
        .lean());

    if (!defaultRole || !defaultShift) {
      throw new Error(
        "Cannot create anonymous system user: At least one Role and WorkShift must exist in the database.",
      );
    }

    anonUser = await User.create({
      name: "Open Form (Anonymous)",
      email: ANON_EMAIL,
      employeeCode: ANON_CODE,
      phone: "0000000000",
      role: defaultRole._id,
      assignShift: defaultShift._id,
      password: "123456",
      isActive: false,
      isDeleted: true,
      isEmailNotificationEnabled: false,
      telegramNotificationsEnabled: false,
    });
  }

  return anonUser;
};

// =========================================================================
// 1. MASTER GET API (Fetch current Open Form Master settings)
// =========================================================================
export const getOpenFormBucketMaster = handleAsync(async (req, res) => {
  const master = await OpenFormBucketMaster.findOne()
    .populate("assignedTo", "name email employeeCode")
    .populate("updatedBy", "name email")
    .lean();

  return res.status(200).json({
    success: true,
    data: master || null,
  });
});

// =========================================================================
// 2. MASTER UPSERT API (Set / Update assignedTo & taskEndDays)
// =========================================================================
export const upsertOpenFormBucketMaster = handleAsync(
  async (req, res, next) => {
    const { assignedTo, taskEndDays } = req.body;

    if (!assignedTo || !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return next(new AppError("Valid assignedTo user ID is required", 400));
    }

    const days = Number(taskEndDays);
    if (!taskEndDays || Number.isNaN(days) || days < 1) {
      return next(
        new AppError("taskEndDays must be a positive number (>= 1)", 400),
      );
    }

    const targetUser = await User.findOne({
      _id: assignedTo,
      isDeleted: { $ne: true },
    }).select("_id name email");

    if (!targetUser) {
      return next(new AppError("Selected assignedTo user not found", 404));
    }

    const userId = req.cookies?.userId || req.user?._id || null;

    const master = await OpenFormBucketMaster.findOneAndUpdate(
      {},
      {
        $set: {
          assignedTo: targetUser._id,
          taskEndDays: days,
          updatedBy: userId,
        },
      },
      { new: true, upsert: true },
    )
      .populate("assignedTo", "name email employeeCode")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Open Form Bucket Master saved successfully",
      data: master,
    });
  },
);

// =========================================================================
// 3. OPEN FORM BUCKET CREATION API (Public / Open Form Endpoint)
// =========================================================================
export const createBucketFromOpenForm = handleAsync(async (req, res, next) => {
  const { title, description,location } = req.body;

  if (!title || !String(title).trim()) {
    return next(new AppError("Title is required", 400));
  }

  if (!description || !String(description).trim()) {
    return next(new AppError("Description is required", 400));
  }

  // 1. Master se default assignedTo aur taskEndDays uthayein
  const master = await OpenFormBucketMaster.findOne().lean();

  if (!master || !master.assignedTo || !master.taskEndDays) {
    return next(
      new AppError(
        "Open Form Bucket Master is not configured yet. Please set assignedTo and taskEndDays first.",
        400,
      ),
    );
  }

  // 2. Hidden Anonymous User fetch/create karein
  const anonUser = await getOrCreateAnonymousOpenFormUser();

  // 3. Submit date ko startDate aur createdAt ke roop mein use karein
  const submitDate = new Date();
  const targetUserId = master.assignedTo;

  // 4. TaskBucket create karein (pre-save hook automatically bucketId generate karega)
  const newBucket = await TaskBucket.create({
    title: String(title).trim(),
    description: String(description).trim(),
    location: location && String(location).trim() !== "" ? String(location).trim() : null,
    createdBy: anonUser._id,
    source: "OpenForm",
    assignmentMode: "Users",
    targetRole: null,
    targetUsers: [targetUserId],
    assignedTargetUsers: [targetUserId],
    targetUserDistribution: [
      {
        user: targetUserId,
        status: "Pending",
        distributedAt: null,
      },
    ],

    startDate: submitDate,
    taskEndDays: master.taskEndDays,
    status: "Pending",
    distributionStatus: "Pending",
  });

  return res.status(201).json({
    success: true,
    message: "Bucket created successfully from open form",
    data: {
      _id: newBucket._id,
      bucketId: newBucket.bucketId,
      title: newBucket.title,
      description: newBucket.description,
      startDate: newBucket.startDate,
      taskEndDays: newBucket.taskEndDays,
      createdAt: newBucket.createdAt,
    },
  });
});
