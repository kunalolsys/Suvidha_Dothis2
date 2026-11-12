import mongoose from "mongoose";
import User from "../models/User.js";
import { Task } from "../models/Task.js";

/**
 * Dynamic Date Ranges (Current Week & Last Week)
 */
const getMisDateRanges = () => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday...
  const distanceToMonday = (currentDay + 6) % 7;

  // Current Week Monday (00:00:00)
  const thisWeekMonday = new Date(now);
  thisWeekMonday.setDate(now.getDate() - distanceToMonday);
  thisWeekMonday.setHours(0, 0, 0, 0);

  // Current Week Sunday (23:59:59)
  const thisWeekSunday = new Date(thisWeekMonday);
  thisWeekSunday.setDate(thisWeekMonday.getDate() + 6);
  thisWeekSunday.setHours(23, 59, 59, 999);

  // Last Week Monday (00:00:00)
  const lastWeekMonday = new Date(thisWeekMonday);
  lastWeekMonday.setDate(thisWeekMonday.getDate() - 7);
  lastWeekMonday.setHours(0, 0, 0, 0);

  // Last Week Sunday (23:59:59)
  const lastWeekSunday = new Date(lastWeekMonday);
  lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);
  lastWeekSunday.setHours(23, 59, 59, 999);

  return {
    thisWeekMonday,
    thisWeekSunday,
    lastWeekMonday,
    lastWeekSunday,
    now,
  };
};

/**
 * Build Precise MongoDB Filter
 */
const buildTaskQueryFilter = async (emp_code, list) => {
  let userObjectId = null;

  // 1. User Filter (super / all ke alawa)
  if (emp_code && emp_code !== "super" && emp_code !== "all") {
    const cleanCode = String(emp_code).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(cleanCode);

    if (isObjectId) {
      userObjectId = new mongoose.Types.ObjectId(cleanCode);
    } else {
      const codeRegex = new RegExp(`^${cleanCode}$`, "i");
      const user = await User.findOne({
        $or: [
          { employeeCode: codeRegex },
          { companyCode: codeRegex },
          { email: codeRegex },
          { emp_code: cleanCode },
        ],
        isDeleted: { $ne: true },
        isActive: { $ne: false },
      }).select("_id");

      if (!user) {
        return { error: "user does not exist", filter: null };
      }
      userObjectId = user._id;
    }
  }

  const { thisWeekMonday, thisWeekSunday, lastWeekMonday, lastWeekSunday } =
    getMisDateRanges();

  // 2. Base Condition (Soft-deleted exclude, Delegation + Recurring dono shamil)
  const baseFilter = {
    isDeleted: { $ne: true },
    taskType: { $ne: "RecurringTask" },
  };

  if (userObjectId) {
    baseFilter.assignedTo = userObjectId;
  }

  const dateTargetExpr = {
    $ifNull: ["$dueDate", { $ifNull: ["$plannedDueDate", "$endDate"] }],
  };

  let filter = {};

  // ========================================================
  // TYPE 1: 'late' -> Last Week Completed Late
  // ========================================================
  if (list === "late") {
    filter = {
      ...baseFilter,
      $or: [{ status: "Completed" }, { completedAt: { $ne: null } }],
      completedAt: { $gte: lastWeekMonday, $lte: lastWeekSunday }, // Last week completed
      $expr: {
        $and: [
          { $ne: ["$completedAt", null] },
          { $ne: [dateTargetExpr, null] },
          { $gt: ["$completedAt", dateTargetExpr] }, // Completed late (completedAt > dueDate)
        ],
      },
    };
  }

  // ========================================================
  // TYPE 2: 'this_week_pending' -> Current Week Pending
  // ========================================================
  else if (list === "this_week_pending" || list === "thisweek") {
    filter = {
      ...baseFilter,
      status: { $ne: "Completed" },
      $or: [
        { dueDate: { $gte: thisWeekMonday, $lte: thisWeekSunday } },
        { plannedDueDate: { $gte: thisWeekMonday, $lte: thisWeekSunday } },
        { endDate: { $gte: thisWeekMonday, $lte: thisWeekSunday } },
      ],
    };
  }

  // ========================================================
  // TYPE 3: 'pending_overdue' -> Overall Tasks Pending or Overdue
  // ========================================================
  else if (
    list === "pending_overdue" ||
    list === "overdue" ||
    list === "pendingoverdue"
  ) {
    filter = {
      ...baseFilter,
      status: {
        $in: ["Pending", "Overdue", "Delayed", "Upcoming"],
      },
    };
  } else {
    filter = baseFilter;
  }

  return { error: null, filter };
};

// =======================================================
// API 1: ONLY COUNT RETURN KAREGA
// =======================================================
export const getMisReportCount = async (req, res) => {
  try {
    const emp_code = req.query.emp_code || req.body.emp_code;
    const list = req.query.list || req.body.list;

    if (!emp_code || !list) {
      return res.status(200).json({
        user_exist: false,
        message: "emp_code and list are required parameters",
        // percentage: "",
        count: 0,
      });
    }

    const { error, filter } = await buildTaskQueryFilter(emp_code, list);

    if (error) {
      return res.status(200).json({
        user_exist: false,
        message: "user does not exist",
        // percentage: "",
        count: 0,
      });
    }

    const count = await Task.countDocuments(filter);

    return res.status(200).json({
      user_exist: true,
    //   percentage: "",
      count: Number(count) || 0,
    });
  } catch (error) {
    return res.status(500).json({
      user_exist: false,
      message: error.message,
    //   percentage: "",
      count: 0,
    });
  }
};

// =======================================================
// API 2: EXACT MATCHING TASKS LIST (Details Jo Count Me Aayi)
// =======================================================
export const getMisReportTasks = async (req, res) => {
  try {
    const emp_code = req.query.emp_code || req.body.emp_code;
    const list = req.query.list || req.body.list;

    if (!emp_code || !list) {
      return res.status(400).json({
        success: false,
        message: "emp_code and list query parameters are required.",
        tasks: [],
      });
    }

    const { error, filter } = await buildTaskQueryFilter(emp_code, list);

    if (error) {
      return res.status(200).json({
        success: false,
        message: "user does not exist",
        total: 0,
        tasks: [],
      });
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email employeeCode companyCode")
      .populate("assignedBy", "name email")
      .populate("departmentOfAssignToUser", "name")
      .select(
        "TaskId title description status dueDate plannedDueDate endDate completedAt startDate taskType checklist createdAt",
      )
      .sort({ dueDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      listType: list,
      total: tasks.length,
      tasks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      tasks: [],
    });
  }
};
