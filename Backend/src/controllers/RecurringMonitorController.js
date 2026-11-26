import moment from "moment-timezone";
import { RecurringTask, DelegationTask } from "../models/Task.js";
import User from "../models/User.js";
import {
  nextWorkingShiftDate,
  isWorkingDay,
  isHoliday,
} from "../utils/dateCalculator.js";
import { generateRecurringTasks } from "../cron/assignRecurringTask.js";

// Helper: Monthly week-wise occurrence check
const isMonthlyWeekWiseMatch = (targetMoment, occurrence, weekDay) => {
  if (!occurrence || !weekDay) return false;
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const targetDayIndex = days.indexOf(String(weekDay).toLowerCase());
  if (targetDayIndex === -1 || targetMoment.day() !== targetDayIndex)
    return false;

  const normalizedOcc = String(occurrence).toLowerCase();
  const dateOfMonth = targetMoment.date();
  const daysInMonth = targetMoment.daysInMonth();

  if (normalizedOcc === "last") return dateOfMonth + 7 > daysInMonth;

  const occurrenceMap = { first: 1, second: 2, third: 3, fourth: 4 };
  const targetOccurrence = occurrenceMap[normalizedOcc];
  if (!targetOccurrence) return false;

  return Math.ceil(dateOfMonth / 7) === targetOccurrence;
};

// Dynamic Date Due Checker
const isTaskDueOnDate = (task, targetDateMoment) => {
  const targetDay = targetDateMoment.clone().startOf("day");
  const start = moment(task.startDate).tz("Asia/Kolkata").startOf("day");

  if (!task.startDate || targetDay.isBefore(start)) return false;
  if (
    task.endDate &&
    targetDay.isAfter(moment(task.endDate).tz("Asia/Kolkata").endOf("day"))
  ) {
    return false;
  }

  switch (task.frequency) {
    case "Daily":
      return true;
    case "Weekly": {
      const dayName = targetDay.format("dddd").toLowerCase();
      return Array.isArray(task.weekDays) && task.weekDays.includes(dayName);
    }
    case "Bi-weekly": {
      if (!task.weekStartDay) return false;
      const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const startDay = days.indexOf(task.weekStartDay.toLowerCase());
      const offset = Number(task.repeatAfter || 0);
      if (offset < 0 || offset > 6) return false;
      const secondDay = (startDay + offset) % 7;
      return targetDay.day() === startDay || targetDay.day() === secondDay;
    }
    case "Fortnightly":
      return targetDay.diff(start, "days") % 14 === 0;
    case "Monthly":
      if (task.monthlyScheduleType === "week") {
        return isMonthlyWeekWiseMatch(
          targetDay,
          task.monthlyOccurrence,
          task.monthlyWeekDay,
        );
      }
      return targetDay.date() === start.date();
    case "Quarterly":
      return (
        targetDay.diff(start, "months") % 3 === 0 &&
        targetDay.date() === start.date()
      );
    case "Half Yearly":
      return (
        targetDay.diff(start, "months") % 6 === 0 &&
        targetDay.date() === start.date()
      );
    case "Yearly":
      return (
        targetDay.month() === start.month() && targetDay.date() === start.date()
      );
    default:
      return false;
  }
};

// =========================================================================
// API 1: GET ONLY MISSING / FAILED RECURRING TASKS FOR THE DAY
// GET /api/recurring-monitor/audit?date=YYYY-MM-DD
// =========================================================================
export const getRecurringAuditReport = async (req, res) => {
  try {
    const queryDate = req.query.date
      ? moment.tz(req.query.date, "YYYY-MM-DD", "Asia/Kolkata")
      : moment().tz("Asia/Kolkata");

    if (!queryDate.isValid()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format (YYYY-MM-DD)" });
    }

    const dateStr = queryDate.format("YYYY-MM-DD");
    const dayName = queryDate.format("dddd");
    const baseDateObj = queryDate.clone().startOf("day").toDate();

    const recurringTasks = await RecurringTask.find({
      isDeleted: { $ne: true },
    })
      .populate(
        "assignedTo",
        "name email employeeCode isDeleted isActive status assignShift",
      )
      .populate("departmentOfAssignToUser", "name")
      .lean();

    const missingTasks = [];
    let totalDueCount = 0;
    let generatedCount = 0;

    for (const task of recurringTasks) {
      // 1. Check karein kya ye task is din banna chahiye tha
      if (!isTaskDueOnDate(task, queryDate)) continue;

      const assignedUser = task.assignedTo;

      // 2. Agar assigned user missing, deleted, ya inactive hai toh skip karein
      const isUserInactive =
        !assignedUser ||
        assignedUser.isDeleted === true ||
        assignedUser.isActive === false ||
        String(assignedUser.status || "").toLowerCase() === "inactive";

      if (isUserInactive) {
        continue;
      }

      totalDueCount++;

      const instanceKey = `${task._id}_${dateStr}`;
      const existingInstance = await DelegationTask.findOne({ instanceKey })
        .select("TaskId status isDeleted")
        .lean();

      // 3. Agar task successfully ban chuka hai (aur deleted nahi hai), toh ise list mein mat bhejo
      if (existingInstance && !existingInstance.isDeleted) {
        generatedCount++;
        continue;
      }

      // 4. Yahan sirf wahi tasks aayenge jo NAHI bane hain
      let statusType = "NOT_GENERATED"; // "NOT_GENERATED" (Cron miss) | "SKIPPED" (Rule/Holiday)
      let reasonMessage =
        "Task was due but has not been generated yet (cron missed or pending).";
      let canRetry = true;

      if (existingInstance && existingInstance.isDeleted) {
        statusType = "SKIPPED";
        reasonMessage = `Instance (${existingInstance.TaskId}) was already created and has been soft-deleted.`;
        canRetry = false;
      } else if (!assignedUser.assignShift) {
        statusType = "SKIPPED";
        reasonMessage = `User (${assignedUser.name}) has no work shift assigned.`;
        canRetry = false;
      } else {
        const userWithShift = await User.findById(assignedUser._id)
          .populate("assignShift")
          .lean();
        const workShift = userWithShift?.assignShift;
        const taskDeptId =
          task.departmentOfAssignToUser?._id || assignedUser._id;

        let shiftStart = await nextWorkingShiftDate(
          baseDateObj,
          workShift._id,
          {},
          taskDeptId,
        );

        const calcStr = moment(shiftStart)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        if (calcStr !== dateStr) {
          const timePart = moment(shiftStart)
            .tz("Asia/Kolkata")
            .format("HH:mm:ss");
          shiftStart = moment
            .tz(`${dateStr} ${timePart}`, "YYYY-MM-DD HH:mm:ss", "Asia/Kolkata")
            .toDate();
        }

        const endDateCheck = task.endDate
          ? moment(task.endDate).tz("Asia/Kolkata").endOf("day").toDate()
          : null;

        const holidayFlag = await isHoliday(shiftStart, taskDeptId);
        const workingFlag = await isWorkingDay(
          shiftStart,
          workShift,
          taskDeptId,
        );

        if (endDateCheck && shiftStart > endDateCheck) {
          statusType = "SKIPPED";
          reasonMessage =
            "Calculated shift start time exceeds the task's end date.";
          canRetry = false;
        } else if (holidayFlag) {
          statusType = "SKIPPED";
          reasonMessage = `${dateStr} is declared as a holiday.`;
          canRetry = false;
        } else if (!workingFlag) {
          statusType = "SKIPPED";
          reasonMessage = `${dayName} (${dateStr}) is a non-working day / week-off for the user or department.`;
          canRetry = false;
        }
      }

      missingTasks.push({
        _id: task._id,
        recurringTaskId: task.TaskId,
        title: task.title,
        frequency: task.frequency,
        expectedDate: dateStr,
        expectedDay: dayName,
        assignedTo: {
          name: assignedUser.name,
          employeeCode: assignedUser.employeeCode,
        },
        department: task.departmentOfAssignToUser?.name || "-",
        statusType,
        reasonMessage,
        canRetry,
      });
    }

    return res.status(200).json({
      success: true,
      summary: {
        date: dateStr,
        day: dayName,
        totalDue: totalDueCount,
        generated: generatedCount,
        pendingOrSkipped: missingTasks.length,
      },
      data: missingTasks, // Sirf wahi tasks jo nahi bane
    });
  } catch (error) {
    console.error("Audit Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch missing recurring tasks",
      error: error.message,
    });
  }
};

// =========================================================================
// API 2: MANUAL CRON TRIGGER (SINGLE TASK OR FULL CRON)
// POST /api/recurring-monitor/trigger
// Body: { recurringTaskId?: "..." }  (null/empty = run full cron)
// =========================================================================
export const triggerRecurringCronManually = async (req, res) => {
  try {
    const { recurringTaskId = null } = req.body || {};

    await generateRecurringTasks(recurringTaskId || null);

    return res.status(200).json({
      success: true,
      message: recurringTaskId
        ? "Selected recurring task processed successfully."
        : "Full recurring task cron executed successfully.",
    });
  } catch (error) {
    console.error("Manual Cron Trigger Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger recurring cron",
      error: error.message,
    });
  }
};
