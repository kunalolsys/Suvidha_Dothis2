import cron from "node-cron";
import moment from "moment-timezone";
import { RecurringTask, DelegationTask } from "../models/Task.js";
import User from "../models/User.js";
import {
  nextWorkingShiftDate,
  isWorkingDay,
  isHoliday,
} from "../utils/dateCalculator.js";
import bot from "../services/telegram/telegramBOT.js";

const TARGET_TELEGRAM_USERNAME = "Kumar_HK0";

// ── Helper: Escape HTML characters for Telegram HTML parse_mode ───────────────
const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// ── Helper: Monthly week-wise occurrence check ───────────────────────────────
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

// ── Dynamic Date Due Checker ─────────────────────────────────────────────────
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

// ── Main Audit & Telegram Alert Function ─────────────────────────────────────
export const checkAndNotifyMissingRecurringTasks = async () => {
  try {
    const queryDate = moment().tz("Asia/Kolkata");
    const dateStr = queryDate.format("YYYY-MM-DD");
    const displayDate = queryDate.format("DD MMM YYYY");
    const dayName = queryDate.format("dddd");
    const baseDateObj = queryDate.clone().startOf("day").toDate();

    const recurringTasks = await RecurringTask.find({
      isDeleted: { $ne: true },
    })
      .populate("assignedTo", "name email employeeCode isDeleted assignShift")
      .populate("departmentOfAssignToUser", "name")
      .lean();

    const missingTasks = [];

    for (const task of recurringTasks) {
      if (!isTaskDueOnDate(task, queryDate)) continue;

      const instanceKey = `${task._id}_${dateStr}`;
      const existingInstance = await DelegationTask.findOne({ instanceKey })
        .select("TaskId status isDeleted")
        .lean();

      // Task ban chuka hai -> skip
      if (existingInstance && !existingInstance.isDeleted) {
        continue;
      }

      let statusType = "NOT_GENERATED";
      let reasonMessage = "Cron missed or pending generation.";

      if (existingInstance && existingInstance.isDeleted) {
        statusType = "SKIPPED";
        reasonMessage = `Instance (${existingInstance.TaskId}) was soft-deleted.`;
      } else {
        const assignedUser = task.assignedTo;

        if (!assignedUser) {
          statusType = "SKIPPED";
          reasonMessage = "Assigned user ID missing.";
        } else if (assignedUser.isDeleted) {
          statusType = "SKIPPED";
          reasonMessage = `Assigned user (${assignedUser.name}) is deleted/inactive.`;
        } else if (!assignedUser.assignShift) {
          statusType = "SKIPPED";
          reasonMessage = `User (${assignedUser.name}) has no work shift assigned.`;
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
              .tz(
                `${dateStr} ${timePart}`,
                "YYYY-MM-DD HH:mm:ss",
                "Asia/Kolkata",
              )
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
            reasonMessage = "Shift start exceeds task end date.";
          } else if (holidayFlag) {
            statusType = "SKIPPED";
            reasonMessage = `${dateStr} is a declared holiday.`;
          } else if (!workingFlag) {
            statusType = "SKIPPED";
            reasonMessage = `${dayName} is a week-off / non-working day.`;
          }
        }
      }

      missingTasks.push({
        recurringTaskId: task.TaskId || "-",
        title: task.title || "Untitled",
        frequency: task.frequency || "-",
        assignedToName: task.assignedTo?.name || "Unassigned",
        statusType,
        reasonMessage,
      });
    }

    // ✅ Agar saare tasks ban gaye hain (0 missing), toh koi message nahi bhejenge
    if (missingTasks.length === 0) {
      console.log(
        `[Recurring Audit Cron] ${dateStr}: All due recurring tasks generated. No alert sent.`,
      );
      return;
    }

    // ── Target User (Kumar_Hk1) ko DB mein dhundhein ─────────────────────────
    const targetUser = await User.findOne({
      telegramUserName: {
        $regex: new RegExp(`^@?${TARGET_TELEGRAM_USERNAME}$`, "i"),
      },
      isDeleted: { $ne: true },
    })
      .select("name telegramChatId telegramNotificationsEnabled")
      .lean();

    if (!targetUser?.telegramChatId) {
      console.warn(
        `[Recurring Audit Cron] User @${TARGET_TELEGRAM_USERNAME} has no linked telegramChatId. Ask them to send /start to the bot.`,
      );
      return;
    }

    // ── Telegram Message Format Karein (4096 char limit safe) ───────────────
    const missedCount = missingTasks.filter(
      (t) => t.statusType === "NOT_GENERATED",
    ).length;
    const skippedCount = missingTasks.length - missedCount;

    const header =
      `🚨 <b>SYSTEM ALERT: RECURRING TASK FAILURE</b> 🚨\n` +
      `<code>STATUS: ACTION REQUIRED</code>\n\n` +
      `📅 <b>Date:</b> ${displayDate} (${dayName})\n` +
      `❌ <b>Missed:</b> ${missedCount}   |   ⏭️ <b>Skipped:</b> ${skippedCount}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    let body = "";
    let includedCount = 0;

    for (let i = 0; i < missingTasks.length; i++) {
      const t = missingTasks[i];
      const isMissed = t.statusType === "NOT_GENERATED";
      const alertIcon = isMissed ? "❗" : "⚠️";
      const alertTag = isMissed ? "FAILED TO GENERATE" : "SKIPPED";

      const block =
        `${alertIcon} <b>[${alertTag}] ${escapeHtml(t.title)}</b>\n` +
        `ID: <code>${escapeHtml(t.recurringTaskId)}</code> | ${escapeHtml(t.frequency)} | ${escapeHtml(t.assignedToName)}\n` +
        `Reason: <i>${escapeHtml(t.reasonMessage)}</i>\n\n`;

      if ((header + body + block).length > 3820) {
        const remaining = missingTasks.length - includedCount;
        body += `⚠️ <i>+${remaining} additional alerts hidden. Open dashboard to view all.</i>\n\n`;
        break;
      }

      body += block;
      includedCount++;
    }

    const footer =
      `━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <b>Action:</b> Open <b>Recurring Monitor</b> & trigger pending tasks immediately.`;

    await bot.sendMessage(targetUser.telegramChatId, header + body + footer, {
      parse_mode: "HTML",
    });

    console.log(
      `[Recurring Audit Cron] Alert sent to @${TARGET_TELEGRAM_USERNAME} (${missingTasks.length} missing tasks).`,
    );
  } catch (error) {
    console.error("[Recurring Audit Cron] Error:", error);
  }
};

// ── Schedule Cron: Har subah 9:00 AM IST ─────────────────────────────────────
export const startRecurringAuditAlertCron = () => {
  const isPrimaryWorker =
    !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === "0";

  if (!isPrimaryWorker) return;

  // "0 9 * * *" -> Roz subah 9:00 AM (Asia/Kolkata)
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[Recurring Audit Cron] Running morning audit check...");
      await checkAndNotifyMissingRecurringTasks();
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log("✅ Recurring Audit Alert Cron scheduled (09:00 AM IST daily)");
};
