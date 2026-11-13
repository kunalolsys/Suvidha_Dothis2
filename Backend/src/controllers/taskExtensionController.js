import TaskExtensionMaster from "../models/TaskExtensionMaster.js";
import TaskExtensionRequest from "../models/TaskExtensionRequest.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

import { sendNotificationAlert } from "../utils/notificationHelper.js";
import moment from "moment";
import { handleAsync } from "../utils/handleAsync.js";
import AppError from "../utils/AppError.js";
import Role from "../models/Role.js";

// 1. Get/Update Master Configuration (Admin Only)
export const getMasterConfig = handleAsync(async (req, res) => {
  let master = await TaskExtensionMaster.findOne({ isActive: true });
  if (!master) {
    master = await TaskExtensionMaster.create({
      daysBeforeDueDate: 2,
      // maxExtensionDays: 3,
    });
  }
  res.status(200).json({ success: true, data: master });
});

export const updateMasterConfig = handleAsync(async (req, res) => {
  const {
    daysBeforeDueDate,
    // maxExtensionDays
  } = req.body;

  const parsedDays = Number(daysBeforeDueDate);
  if (Number.isNaN(parsedDays) || parsedDays < 0) {
    throw new AppError(
      "daysBeforeDueDate must be a valid non-negative number.",
      400,
    );
  }

  let master = await TaskExtensionMaster.findOne({ isActive: true });
  if (!master) {
    master = new TaskExtensionMaster();
  }
  master.daysBeforeDueDate = parsedDays;
  // master.maxExtensionDays = Number(maxExtensionDays);
  master.updatedBy = req.user?._id;
  await master.save();

  res.status(200).json({
    success: true,
    message: "Master setting updated successfully.",
    data: master,
  });
});

// 2. Fetch eligible tasks for the user (whose due date falls within master's daysBeforeDueDate window)
export const getEligibleTasksForExtension = handleAsync(async (req, res) => {
  const userId = req.user?._id || req.body.userId;
  let master = (await TaskExtensionMaster.findOne({
    isActive: true,
  }).lean())
  if (!master) {
    master = await TaskExtensionMaster.create({
      daysBeforeDueDate: 2,
      // maxExtensionDays: 3,
    });
  }
  const daysWindow = Number(master.daysBeforeDueDate ?? 2);
  const startWindow = moment().startOf("day").toDate();
  const thresholdDate = moment().add(daysWindow, "days").endOf("day").toDate();

  // Fetch active delegation tasks that are not completed and fall within the extension window
  const tasks = await Task.find({
    assignedTo: userId,
    taskType: "DelegationTask",
    isDeleted: { $ne: true },
    status: { $nin: ["Completed", "Stopped", "Not Done", "Overdue"] },
    dueDate: { $gte: startWindow, $lte: thresholdDate },
  })
    .populate("assignedBy", "name email")
    .populate("departmentOfAssignToUser", "name")
    .sort({ dueDate: 1 })
    .lean();

  // Check if any of these tasks already have a PENDING extension request
  const pendingRequests = await TaskExtensionRequest.find({
    taskId: { $in: tasks.map((t) => t._id) },
    status: "PENDING",
  }).select("taskId requestedExtensionDays");

  const pendingMap = new Map(pendingRequests.map((r) => [String(r.taskId), r]));

  const result = tasks.map((t) => ({
    ...t,
    hasPendingRequest: pendingMap.has(String(t._id)),
    pendingDetails: pendingMap.get(String(t._id)) || null,
    // maxAllowedDays: master.maxExtensionDays,
  }));

  res.status(200).json({ success: true, data: result, master });
});

// 3. Submit Task Extension Request
export const requestTaskExtension = handleAsync(async (req, res, next) => {
  const { taskId, extensionDays, reason } = req.body;
  const userId = req.user?._id;

  const parsedExtensionDays = Number(extensionDays);
  if (!parsedExtensionDays || parsedExtensionDays < 1) {
    return next(new AppError("Extension days must be at least 1.", 400));
  }

  // 🟢 Null-safe fallback agar DB me active master doc na ho
  const master = (await TaskExtensionMaster.findOne({
    isActive: true,
  }).lean()) || { daysBeforeDueDate: 2 };

  const task = await Task.findById(taskId);
  if (!task || task.isDeleted) {
    return next(new AppError("Task not found.", 404));
  }

  if (["Completed", "Stopped", "Not Done"].includes(task.status)) {
    return next(
      new AppError(
        `Cannot request extension for a task with status "${task.status}".`,
        400,
      ),
    );
  }

  // Verify task due date is within the allowed daysBeforeDueDate window
  const daysWindow = Number(master.daysBeforeDueDate ?? 2);
  const startWindow = moment().startOf("day");
  const thresholdDate = moment().add(daysWindow, "days").endOf("day");
  const taskDue = moment(task.dueDate);

  if (
    !task.dueDate ||
    taskDue.isBefore(startWindow) ||
    taskDue.isAfter(thresholdDate)
  ) {
    return next(
      new AppError(
        `This task is not eligible for extension. Extension requests are only allowed within ${daysWindow} day(s) before the due date.`,
        400,
      ),
    );
  }

  const existingPending = await TaskExtensionRequest.findOne({
    taskId,
    status: "PENDING",
  });
  if (existingPending) {
    return next(
      new AppError(
        "An extension request for this task is already pending.",
        400,
      ),
    );
  }

  const currentUser = await User.findById(userId).populate("reportingManager");

  const newRequest = await TaskExtensionRequest.create({
    taskId: task._id,
    requestedBy: userId,
    reportingManager: currentUser?.reportingManager?._id || null,
    currentDueDate: task.dueDate,
    requestedExtensionDays: parsedExtensionDays,
    reason: reason || "",
  });

  // 🟢 FIX: Role collection se Admin/Super Admin IDs fetch karein
  const adminRoles = await Role.find({
    name: { $regex: /^(admin|super\s*admin)$/i },
  })
    .select("_id")
    .lean();

  const adminRoleIds = adminRoles.map((r) => r._id);

  const admins =
    adminRoleIds.length > 0
      ? await User.find({
          isDeleted: { $ne: true },
          isActive: true,
          role: { $in: adminRoleIds },
        })
      : [];

  const notifyUsers = [];
  if (
    currentUser?.reportingManager &&
    !currentUser.reportingManager.isDeleted
  ) {
    notifyUsers.push(currentUser.reportingManager);
  }

  admins.forEach((adm) => {
    if (!notifyUsers.some((u) => String(u._id) === String(adm._id))) {
      notifyUsers.push(adm);
    }
  });

  const io = req.app.get("io");

  for (const manager of notifyUsers) {
    await sendNotificationAlert({
      io,
      user: manager,
      title: "Action Required: Task Extension Request",
      message: [
        `👤 <b>${currentUser?.name || "A team member"}</b> has submitted a due date extension request for task <b>${task.title}</b> (${task.TaskId || "N/A"}).`,
        `⏳ <b>Requested Extension:</b> ${parsedExtensionDays} day(s)`,
        `📅 <b>Current Due Date:</b> ${moment(task.dueDate).format("DD MMM YYYY, hh:mm A")}`,
        `📝 <b>Reason:</b> ${reason || "Not provided"}`,
      ].join("\n"),
    });
  }

  res.status(201).json({
    success: true,
    message: "Extension request submitted successfully.",
    data: newRequest,
  });
});

// 4. Admin / Manager: View Pending Extension Requests
export const getPendingExtensionRequests = handleAsync(async (req, res) => {
  const requests = await TaskExtensionRequest.find({ status: "PENDING" })
    .populate("taskId", "TaskId title dueDate description status")
    .populate("requestedBy", "name email employeeCode")
    .populate("reportingManager", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// 5. Admin / Manager: Single-Click Approval or Rejection
export const reviewExtensionRequest = handleAsync(async (req, res, next) => {
  const { requestId, action, approvedDays } = req.body; // 🟢 Added approvedDays
  const reviewerId = req.user?._id;

  if (!["APPROVE", "REJECT"].includes(action)) {
    return next(
      new AppError("Invalid action. Allowed values are APPROVE or REJECT.", 400),
    );
  }

  const extRequest = await TaskExtensionRequest.findById(requestId)
    .populate("taskId")
    .populate("requestedBy");

  if (!extRequest || extRequest.status !== "PENDING") {
    return next(new AppError("Valid pending request not found.", 404));
  }

  const task = extRequest.taskId;
  const user = extRequest.requestedBy;
  const io = req.app.get("io");

  if (action === "APPROVE") {
    const finalDays =
      approvedDays !== undefined && approvedDays !== null
        ? Number(approvedDays)
        : Number(extRequest.requestedExtensionDays);

    if (!finalDays || Number.isNaN(finalDays) || finalDays < 1) {
      return next(new AppError("Approved days must be at least 1.", 400));
    }

    const newDueDate = moment(task.dueDate).add(finalDays, "days").toDate();

    task.dueDate = newDueDate;
    if (task.plannedDueDate) {
      task.plannedDueDate = newDueDate;
    }

    if (task.status === "Overdue" && newDueDate > new Date()) {
      task.status = "Pending";
    }
    await task.save();

    extRequest.status = "APPROVED";
    extRequest.approvedExtensionDays = finalDays; // Optional: save final approved days
    extRequest.reviewedBy = reviewerId;
    extRequest.reviewedAt = new Date();
    await extRequest.save();

   const isAdjusted = finalDays !== extRequest.requestedExtensionDays;
    const extensionSummary = isAdjusted
      ? `<b>${finalDays} day(s)</b> (adjusted from ${extRequest.requestedExtensionDays} requested day(s))`
      : `<b>${finalDays} day(s)</b>`;

    await sendNotificationAlert({
      io,
      user,
      title: "Task Due Date Extension Approved",
      message: [
        `Your request for a due date extension on task <b>${task.title}</b> (${task.TaskId || "N/A"}) has been approved.`,
        `⏳ <b>Approved Extension:</b> ${extensionSummary}`,
        `📅 <b>Original Due Date:</b> ${moment(extRequest.currentDueDate).format("DD MMM YYYY, hh:mm A")}`,
        `🗓️ <b>Revised Due Date:</b> ${moment(newDueDate).format("DD MMM YYYY, hh:mm A")}`,
      ].join("\n"),
    });

    return res.status(200).json({
      success: true,
      message: `Task due date extended by ${finalDays} day(s).`,
    });
  } else {
    extRequest.status = "REJECTED";
    extRequest.reviewedBy = reviewerId;
    extRequest.reviewedAt = new Date();
    await extRequest.save();

 await sendNotificationAlert({
      io,
      user,
      title: "Task Due Date Extension Declined",
      message: [
        `Your request for a <b>${extRequest.requestedExtensionDays}-day</b> due date extension on task <b>${task.title}</b> (${task.TaskId || "N/A"}) has been declined.`,
        `📅 Please ensure the task is completed by the scheduled due date: <b>${moment(extRequest.currentDueDate).format("DD MMM YYYY, hh:mm A")}</b>.`,
      ].join("\n"),
    });
    return res
      .status(200)
      .json({ success: true, message: "Extension request rejected." });
  }
});
