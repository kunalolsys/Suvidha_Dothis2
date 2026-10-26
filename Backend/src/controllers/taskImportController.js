import fs from "fs";
import csv from "csv-parser";
import XLSX from "xlsx";
import Department from "../models/Department.js";
import Task, { DelegationTask, RecurringTask } from "../models/Task.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { handleAsync } from "../utils/handleAsync.js";

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

// Smart Name Cleaner: removes brackets, codes like "( 3461 )" or "[1234]", extra spaces, and lowercase
const normalizeName = (nameStr) => {
  if (!nameStr) return "";
  return String(nameStr)
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

// Date & Time parser for formats:
// "20-10-2026 12 AM", "20-10-2026 11 PM", "2020-10-21 09", ISO string, or Date objects
const parseDateTime = (val) => {
  if (!val || val === "NULL" || val === "null") return null;
  if (val instanceof Date && !isNaN(val)) return val;

  const str = String(val).trim();

  // Handle format: "YYYY-MM-DD HH" or "YYYY-MM-DD HH:mm:ss"
  const isoHourMatch = str.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2})(?::(\d{2}))?)?/,
  );
  if (isoHourMatch) {
    const [, y, m, d, h] = isoHourMatch;
    return new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      h ? parseInt(h, 10) : 0,
      0,
      0,
    );
  }

  // Handle format: DD-MM-YYYY hh AM/PM or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2})\s*(AM|PM))?/i,
  );
  if (ddmmyyyyMatch) {
    const [, day, month, year, rawHour, meridiem] = ddmmyyyyMatch;
    let hour = 0;
    if (rawHour && meridiem) {
      hour = parseInt(rawHour, 10);
      if (meridiem.toUpperCase() === "PM" && hour < 12) hour += 12;
      if (meridiem.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
    const d = new Date(year, parseInt(month, 10) - 1, day, hour, 0, 0);
    return isNaN(d) ? null : d;
  }

  const standardDate = new Date(str);
  return isNaN(standardDate) ? null : standardDate;
};

// Normalize Recurring Frequency
const normalizeFrequency = (freq) => {
  if (!freq || freq === "NULL") return "Weekly";
  const f = String(freq).trim().toLowerCase();
  if (f.includes("daily")) return "Daily";
  if (f.includes("weekly")) return "Weekly";
  if (f.includes("bi-weekly")) return "Bi-weekly";
  if (f.includes("fortnight")) return "Fortnightly";
  if (f.includes("monthly")) return "Monthly";
  if (f.includes("quarter")) return "Quarterly";
  if (f.includes("half")) return "Half Yearly";
  if (f.includes("yearly")) return "Yearly";
  return "Weekly";
};

// ==========================================
// 1. IMPORT DELEGATION TASKS API
// ==========================================
export const importDelegationTasks = handleAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No Excel file uploaded.", 400));
  }

  const filePath = req.file.path;
  const skippedList = [];
  const validTasks = [];

  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
    });

    if (rows.length === 0) {
      return next(new AppError("The uploaded sheet is empty.", 400));
    }

    // In-memory cache for fast lookups
    const allUsers = await User.find({}, "_id name email department").lean();
    const allDepartments = await Department.find({}, "_id name").lean();

    const userMap = new Map();
    allUsers.forEach((u) => {
      if (u.name) {
        const rawName = String(u.name).trim().toLowerCase();
        const cleanName = normalizeName(u.name);

        userMap.set(rawName, u);
        if (cleanName && !userMap.has(cleanName)) {
          userMap.set(cleanName, u);
        }
      }
    });

    const deptMap = new Map();
    allDepartments.forEach((d) => {
      if (d.name) deptMap.set(d.name.trim().toLowerCase(), d._id);
    });

    const loggedInId = req.user?._id || req.cookies?.userId;

    let rowNumber = 1;
    for (const row of rows) {
      rowNumber++;

      const rawTaskId = row["Task ID"] || row["TaskId"];
      const taskType = row["Task Type"] || ""; // Department name
      let title = row["Title"] ? String(row["Title"]).trim() : "";
      let description = row["Description"]
        ? String(row["Description"]).trim()
        : "";
      const assignedToRaw = row["Assigned To"] || "";
      const assignedByRaw = row["Assigned By"] || "";
      const recurringRefId = row["Recurring ID"] || null;
      const startDateRaw = row["Start Date"];
      const dueDateRaw = row["Due Date"];
      const statusRaw = row["Status"] || "Pending";
      const completeDateRaw = row["Complete Date"];

      // 🔹 If description missing, set title. If title missing, set description.
      if (!description && title) {
        description = title;
      } else if (!title && description) {
        title = description;
      }

      if (!title && !description) {
        skippedList.push({
          row: rowNumber,
          taskId: rawTaskId,
          reason: "Both Title and Description are missing",
        });
        continue;
      }

      // Smart User Match (Matches "Sumit Sharma" even if DB has "Sumit Sharma ( 3461 )")
      const cleanSheetName = normalizeName(assignedToRaw);
      const rawSheetName = String(assignedToRaw).trim().toLowerCase();

      let user = userMap.get(cleanSheetName) || userMap.get(rawSheetName);

      if (!user && cleanSheetName) {
        user = allUsers.find((u) => {
          if (!u.name) return false;
          const dbClean = normalizeName(u.name);
          return (
            dbClean === cleanSheetName ||
            dbClean.startsWith(cleanSheetName) ||
            cleanSheetName.startsWith(dbClean)
          );
        });
      }

      if (!user) {
        skippedList.push({
          row: rowNumber,
          taskId: rawTaskId,
          assignedTo: assignedToRaw,
          reason: `User "${assignedToRaw}" not found in database (Skipped)`,
        });
        continue;
      }

      // Assigned By lookup
      let assignedByUserId = loggedInId || user._id;
      if (assignedByRaw) {
        const cleanBy = normalizeName(assignedByRaw);
        const rawBy = String(assignedByRaw).trim().toLowerCase();
        const assignedByUser = userMap.get(cleanBy) || userMap.get(rawBy);
        if (assignedByUser) {
          assignedByUserId = assignedByUser._id;
        }
      }

      // Department Lookup (Task Type = Department)
      let departmentId = null;
      if (taskType) {
        departmentId = deptMap.get(String(taskType).trim().toLowerCase());
        if (!departmentId && user.department && user.department.length > 0) {
          departmentId = user.department[0];
        }
      }

      // Dates and Task End Days
      const startDate = parseDateTime(startDateRaw);
      const dueDate = parseDateTime(dueDateRaw);
      const completedAt = parseDateTime(completeDateRaw);

      let taskEndDays = null;
      if (startDate && dueDate) {
        const diffMs = dueDate.getTime() - startDate.getTime();
        taskEndDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Retain sheet status
      let finalStatus = "Pending";
      const validStatuses = [
        "Pending",
        "Completed",
        "Delayed",
        "Upcoming",
        "Overdue",
      ];
      if (validStatuses.includes(String(statusRaw).trim())) {
        finalStatus = String(statusRaw).trim();
      }

      validTasks.push({
        TaskId: rawTaskId ? String(rawTaskId).trim() : undefined,
        title: title,
        description: description,
        assignedTo: user._id,
        assignedBy: assignedByUserId,
        createdBy: loggedInId || assignedByUserId,
        departmentOfAssignToUser: departmentId,
        startDate: startDate,
        dueDate: dueDate,
        plannedStartDate: startDate,
        plannedDueDate: dueDate,
        taskEndDays: taskEndDays,
        status: finalStatus,
        completedAt: completedAt,
        recurringRefId: recurringRefId ? String(recurringRefId).trim() : null,
        isVisible: true,
        taskType: "DelegationTask",
      });
    }

    // Batch Insert (1000 tasks per chunk)
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < validTasks.length; i += BATCH_SIZE) {
      const batch = validTasks.slice(i, i + BATCH_SIZE);
      await DelegationTask.insertMany(batch, { ordered: false });
      totalInserted += batch.length;
    }

    return res.status(200).json({
      success: true,
      message: `Delegation import complete. ${totalInserted} task(s) imported, ${skippedList.length} row(s) skipped.`,
      summary: {
        totalRowsInSheet: rows.length,
        imported: totalInserted,
        skipped: skippedList.length,
      },
      skippedDetails: skippedList.slice(0, 100),
    });
  } catch (err) {
    return next(new AppError(err.message, 500));
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// ==========================================
// 2. IMPORT RECURRING TASKS API (FOR NEW MAPPED CSV & XLSX)
// ==========================================
export const importRecurringTasks = handleAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded.", 400));
  }

  const filePath = req.file.path;
  const skippedList = [];
  const validTasks = [];
  let rows = [];

  try {
    const isCsv =
      req.file.mimetype === "text/csv" ||
      req.file.originalname.toLowerCase().endsWith(".csv");

    if (isCsv) {
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("end", () => resolve(results))
          .on("error", (err) => reject(err));
      });
    } else {
      const workbook = XLSX.readFile(filePath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });
    }

    if (rows.length === 0) {
      return next(new AppError("The uploaded file is empty.", 400));
    }

    // Cache Users & Departments (Lookup support by name, email, employeeId, SQL id)
    const allUsers = await User.find(
      {},
      "_id name email department empCode employeeId userId id",
    ).lean();
    const allDepartments = await Department.find({}, "_id name id").lean();

    const userMap = new Map();
    allUsers.forEach((u) => {
      if (u.name) {
        userMap.set(String(u.name).trim().toLowerCase(), u);
        const clean = normalizeName(u.name);
        if (clean) userMap.set(clean, u);
      }
      if (u.email) userMap.set(String(u.email).trim().toLowerCase(), u);
      if (u.empCode) userMap.set(String(u.empCode).trim().toLowerCase(), u);
      if (u.employeeId)
        userMap.set(String(u.employeeId).trim().toLowerCase(), u);
      if (u.userId) userMap.set(String(u.userId).trim().toLowerCase(), u);
      if (u.id) userMap.set(String(u.id).trim().toLowerCase(), u);
      userMap.set(String(u._id), u);
    });

    const deptMap = new Map();
    allDepartments.forEach((d) => {
      if (d.name) deptMap.set(String(d.name).trim().toLowerCase(), d._id);
      if (d.id) deptMap.set(String(d.id).trim().toLowerCase(), d._id);
      deptMap.set(String(d._id), d._id);
    });

    const loggedInId = req.user?._id || req.cookies?.userId;

    let rowNumber = 1;
    for (const row of rows) {
      rowNumber++;

      // Columns extraction (Priority given to new mapped columns: username & department_name)
      const rawTaskId = row["taskid"] || row["Task ID"] || row["TaskId"];
      const rawDept =
        row["department_name"] || row["department"] || row["Task Type"] || "";
      let title = row["task_title"] || row["Title"] || "";
      let description = row["taskdesc"] || row["Description"] || "";
      const assignedToRaw =
        row["username"] || row["task_asign_to"] || row["Assigned To"] || "";
      const assignedByRaw = row["task_asign_by"] || row["Assigned By"] || "";
      const frequencyRaw = row["frequency"] || row["Frequency"] || "Weekly";
      const dayRaw = row["day"] || row["Day"] || "";
      const startDateRaw = row["start_date"] || row["Start Date"];
      const endDateRaw = row["end_date"] || row["End Date"];
      const dueTime = row["weekendtime"] || row["Due Time"] || null;

      title = title ? String(title).trim() : "";
      description = description ? String(description).trim() : "";

      // 🔹 If description is missing then insert title in description
      if (!description && title) {
        description = title;
      } else if (!title && description) {
        title = description;
      }

      if (!title && !description) {
        skippedList.push({
          row: rowNumber,
          taskId: rawTaskId,
          reason: "Both Title and Description are missing",
        });
        continue;
      }

      // Smart User Match using the mapped username
      const cleanSheetUser = normalizeName(assignedToRaw);
      const rawSheetUser = String(assignedToRaw).trim().toLowerCase();

      let user = userMap.get(cleanSheetUser) || userMap.get(rawSheetUser);

      if (!user && cleanSheetUser) {
        user = allUsers.find((u) => {
          if (!u.name) return false;
          const dbClean = normalizeName(u.name);
          return (
            dbClean === cleanSheetUser ||
            dbClean.startsWith(cleanSheetUser) ||
            cleanSheetUser.startsWith(dbClean)
          );
        });
      }

      if (!user) {
        skippedList.push({
          row: rowNumber,
          taskId: rawTaskId,
          assignedTo: assignedToRaw,
          reason: `User "${assignedToRaw}" not found in database (Skipped)`,
        });
        continue;
      }

      // Assigned By / Created By user setup
      let assignedByUserId = loggedInId || user._id;
      if (assignedByRaw) {
        const cleanBy = normalizeName(assignedByRaw);
        const rawBy = String(assignedByRaw).trim().toLowerCase();
        const byUser = userMap.get(cleanBy) || userMap.get(rawBy);
        if (byUser) {
          assignedByUserId = byUser._id;
        }
      }

      // Department mapping
      let departmentId = null;
      if (rawDept) {
        departmentId = deptMap.get(String(rawDept).trim().toLowerCase());
      }
      if (!departmentId && user.department && user.department.length > 0) {
        departmentId = user.department[0];
      }

      // Week Days formatting
      const weekDays =
        dayRaw && dayRaw !== "NULL"
          ? String(dayRaw)
              .split(",")
              .map((d) => d.trim().toLowerCase())
              .filter((d) =>
                [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].includes(d),
              )
          : [];

      const parsedStartDate = parseDateTime(startDateRaw) || new Date();
      const parsedEndDate = parseDateTime(endDateRaw);

      validTasks.push({
        TaskId: rawTaskId ? String(rawTaskId).trim() : undefined,
        title: title,
        description: description,
        assignedTo: user._id,
        assignedBy: assignedByUserId,
        createdBy: loggedInId || assignedByUserId,
        departmentOfAssignToUser: departmentId,
        frequency: normalizeFrequency(frequencyRaw),
        weekDays: weekDays,
        startDate: parsedStartDate,
        plannedStartDate: parsedStartDate,
        endDate: parsedEndDate,
        taskEndTime: dueTime ? String(dueTime).trim() : null,
        status: "Pending",
        isVisible: true,
        waitingForParent: false,
        taskType: "RecurringTask",
      });
    }

    // Batch Insert (500 records chunk)
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < validTasks.length; i += BATCH_SIZE) {
      const batch = validTasks.slice(i, i + BATCH_SIZE);
      await RecurringTask.insertMany(batch, { ordered: false });
      totalInserted += batch.length;
    }

    return res.status(200).json({
      success: true,
      message: `Recurring import complete. ${totalInserted} task(s) imported, ${skippedList.length} row(s) skipped.`,
      summary: {
        totalRowsInFile: rows.length,
        imported: totalInserted,
        skipped: skippedList.length,
      },
      skippedDetails: skippedList.slice(0, 100),
    });
  } catch (err) {
    return next(new AppError(err.message, 500));
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

export const updateRecurringTaskEndDates = handleAsync(
  async (req, res, next) => {
    // Monthly aur Yearly frequencies ko target karenge (case-insensitive regex ke sath)
    const result = await RecurringTask.updateMany(
      {
        isDeleted: { $ne: true },
      },
      {
        $set: { endDate: null },
      },
    );

    return res.status(200).json({
      success: true,
      message: `Updated successfully. ${result.modifiedCount} recurring task(s) ki endDate null set ho gayi hai.`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  },
);
