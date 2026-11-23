import fs from "fs";
import path from "path";
import csv from "csv-parser";
import XLSX from "xlsx";
import { Parser } from "json2csv";
import { startOfDay } from "date-fns";
import TaskBucket from "../../models/TaskBucket.js";
import User from "../../models/User.js";
import Role from "../../models/Role.js";
import Task, { DelegationTask, RecurringTask } from "../../models/Task.js";
import { handleAsync } from "../../utils/handleAsync.js";
import AppError from "../../utils/AppError.js";
import TaskBucketRequest from "../../models/TaskBucketRequest.js";

// ── Flexible date parser (DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY) ─────────────
const parseFlexibleDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  // Excel serial number
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const fallback = new Date(s);
  return isNaN(fallback) ? null : fallback;
};

// ── Normalize header string for comparison ────────────────────────────────
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// ── Required headers per template type ────────────────────────────────────
const REQUIRED = {
  delegation: [
    "title",
    "description",
    "assignmentmode",
    "startdate",
    "taskenddays",
  ],
  recurring: [
    "title",
    "description",
    "assignmentmode",
    "startdate",
    "frequency",
  ],
  dependent: [
    "title",
    "description",
    "assignmentmode",
    "parenttaskid",
    "starttimesetting",
    "dependencyfrequency",
    "xvalue",
  ],
};

// ── Detect template type from header set ──────────────────────────────────
const detectTemplate = (normalizedHeaders) => {
  if (normalizedHeaders.includes("parenttaskid")) return "dependent";
  if (
    normalizedHeaders.includes("frequency") &&
    normalizedHeaders.includes("enddate")
  )
    return "recurring";
  return "delegation";
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER (ONLY TARGET USERS BASED IMPORT)
// ─────────────────────────────────────────────────────────────────────────────
export const importTaskBuckets = handleAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError("No file uploaded.", 400));

  const filePath = req.file.path;
  const importLog = []; // one entry per row — imported | skipped | error
  const created = []; // TaskBucket instances to bulk-insert
  const seenInBatch = new Set(); // title|audience dedup within file
  let rows = [];
  let rowCount = 0;

  try {
    // ── 1. Parse ────────────────────────────────────────────────────────────
    if (
      req.file.mimetype === "text/csv" ||
      req.file.originalname.toLowerCase().endsWith(".csv")
    ) {
      rows = await new Promise((resolve, reject) => {
        const acc = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (d) => acc.push(d))
          .on("end", () => resolve(acc))
          .on("error", (e) => reject(e));
      });
    } else {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }

    if (rows.length === 0) {
      fs.unlinkSync(filePath);
      return next(
        new AppError("The uploaded file is empty or unsupported.", 400),
      );
    }

    // ── 2. Header validation (Only Target Users required, no Role/Assignment Mode) ──
    const rawHeaders = Object.keys(rows[0] || {}).map((h) => String(h).trim());
    const normHeaders = rawHeaders.map(norm);
    const detected = detectTemplate(normHeaders);

    const requiredHeaders = [
      "title",
      "description",
      "targetusers",
      "startdate",
      "taskenddays",
    ];
    const missing = requiredHeaders.filter((h) => !normHeaders.includes(h));

    if (missing.length > 0) {
      fs.unlinkSync(filePath);
      return next(
        new AppError(
          `Missing required column(s) for bucket import: ${missing.join(", ")}.`,
          400,
        ),
      );
    }

    // ── Helper: find raw value by normalized header name ─────────────────────
    const getVal = (row, normKey) => {
      const rawKey = rawHeaders.find((h) => norm(h) === normKey);
      return rawKey ? String(row[rawKey] || "").trim() : "";
    };

    // ── Pre-load active Users cache to minimise DB round-trips ───────────────
    const allUsers = await User.find({ isDeleted: false, isActive: true })
      .select("_id name email role department assignShift")
      .lean();

    const userByName = new Map(allUsers.map((u) => [u.name.toLowerCase(), u]));
    const userByEmail = new Map(
      allUsers.map((u) => [u.email.toLowerCase(), u]),
    );

    // Resolve a single name-or-email string to a User doc
    const resolveUser = (raw) => {
      const s = raw.trim().toLowerCase();
      return userByEmail.get(s) || userByName.get(s) || null;
    };

    // ── 3. Process each row independently ────────────────────────────────────
    for (const row of rows) {
      rowCount++;
      try {
        // ── Extract values ─────────────────────────────────────────────────
        const title = getVal(row, "title");
        const description = getVal(row, "description");
        const targetUsersRaw = getVal(row, "targetusers"); // comma-separated names/emails
        const startDateRaw = getVal(row, "startdate");
        const taskEndDaysRaw = getVal(row, "taskenddays");
        const remarkRaw = getVal(row, "remark");

        // ── Required field check ────────────────────────────────────────────
        if (!title) throw new Error("Title is required.");
        if (!description) throw new Error("Description is required.");
        if (!targetUsersRaw)
          throw new Error("Target Users is required (name or email).");

        // ── Resolve Target Users ────────────────────────────────────────────
        const names = targetUsersRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (names.length === 0) throw new Error("Target Users list is empty.");

        let resolvedUsers = [];
        for (const name of names) {
          const found = resolveUser(name);
          if (!found)
            throw new Error(
              `User "${name}" not found. Use exact name or email.`,
            );
          resolvedUsers.push(found);
        }

        // Dedup users within row
        const seen = new Set();
        resolvedUsers = resolvedUsers.filter((u) => {
          const id = String(u._id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        const resolvedUserIds = resolvedUsers.map((u) => u._id);
        const audienceKey = `users:${resolvedUserIds.map(String).sort().join(",")}`;

        // ── Date & End Days validation ──────────────────────────────────────
        const isDependent = detected === "dependent";
        const isRecurrent = detected === "recurring";

        const startDate = parseFlexibleDate(startDateRaw);
        if (!startDate)
          throw new Error(
            `Invalid Start Date "${startDateRaw}". Use DD-MM-YYYY.`,
          );

        const taskEndDays = Number(taskEndDaysRaw);
        if (isNaN(taskEndDays) || taskEndDays < 1)
          throw new Error(
            `Task End Days "${taskEndDaysRaw}" must be a positive number ≥ 1.`,
          );

        // ── Batch-level dedup ────────────────────────────────────────────────
        const batchKey = `${title.toLowerCase()}|Users|${audienceKey}`;
        if (seenInBatch.has(batchKey)) {
          importLog.push({
            row: rowCount,
            status: "skipped",
            reason: `Duplicate in this file: same title + target users combination already queued.`,
            title,
            assignmentMode: "Users",
          });
          continue;
        }

        // ── DB-level dedup (same title + same target users within last 24h) ─
        const recentDupe = await TaskBucket.findOne({
          title: new RegExp(
            `^${title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
          assignmentMode: "Users",
          targetUsers: { $all: resolvedUserIds, $size: resolvedUserIds.length },
          isDeleted: false,
          createdAt: { $gte: new Date(Date.now() - 86400000) },
        });
        if (recentDupe) {
          importLog.push({
            row: rowCount,
            status: "skipped",
            reason: `Duplicate: a bucket with the same title and target users was created in the last 24 hours (ID: ${recentDupe.bucketId}).`,
            title,
            assignmentMode: "Users",
          });
          continue;
        }

        // ── Build distribution arrays (ONLY for targetUsers) ─────────────────
        const assignedTargetUsers = resolvedUserIds;
        const targetUserDistribution = resolvedUserIds.map((uId) => ({
          user: uId,
          status: "Pending",
          distributedAt: null,
        }));

        // ── Build bucket document ────────────────────────────────────────────
        const bucketDoc = new TaskBucket({
          title: title.trim(),
          description: description.trim(),
          createdBy: req.cookies.userId || req.user._id,

          assignmentMode: "Users",
          targetRole: null,
          targetUsers: resolvedUserIds,
          assignedTargetUsers,
          targetUserDistribution,

          startDate: isDependent ? null : startDate,
          taskEndDays: isRecurrent || !taskEndDays ? null : taskEndDays,
          remark: remarkRaw || "",
        });

        seenInBatch.add(batchKey);
        created.push(bucketDoc);

        importLog.push({
          row: rowCount,
          status: "imported",
          reason: "OK",
          title,
          assignmentMode: "Users",
          audience: resolvedUsers.map((u) => u.name).join(", "),
          type: detected,
        });
      } catch (rowErr) {
        importLog.push({
          row: rowCount,
          status: "error",
          reason: rowErr.message,
          title: String(row["Title"] || row["title"] || ""),
          assignmentMode: "Users",
          audience: String(row["Target Users"] || row["targetusers"] || ""),
          type: detected,
        });
      }
    } // end for

    // ── 4. Insert valid buckets (Using .create so pre-save hook generates bucketId) ──
    let insertedCount = 0;
    if (created.length > 0) {
      for (const bucketDoc of created) {
        try {
          await bucketDoc.save();
          insertedCount++;
        } catch (saveErr) {
          const logIdx = importLog.findIndex(
            (l) =>
              l.status === "imported" &&
              l.title?.toLowerCase() === bucketDoc?.title?.toLowerCase(),
          );
          if (logIdx >= 0) {
            importLog[logIdx].status = "error";
            importLog[logIdx].reason =
              saveErr.message || "Database insert error";
          }
        }
      }
    }

    // ── 5. Build summary and error CSV ──────────────────────────────────────
    const importedRows = importLog.filter((l) => l.status === "imported");
    const skippedRows = importLog.filter((l) => l.status === "skipped");
    const errorRows = importLog.filter((l) => l.status === "error");

    let errorFile = null;
    const failedRows = [...skippedRows, ...errorRows];
    if (failedRows.length > 0) {
      const parser = new Parser({
        fields: [
          "row",
          "status",
          "reason",
          "title",
          "assignmentMode",
          "audience",
          "type",
        ],
      });
      const csvContent = parser.parse(failedRows);
      const errorFileName = `${Date.now()}-bucket-import-errors.csv`;
      fs.writeFileSync(
        path.join(process.cwd(), "uploads", errorFileName),
        csvContent,
      );
      errorFile = errorFileName;
    }

    // ── 6. Response ──────────────────────────────────────────────────────────
    return res.status(200).json({
      success: insertedCount > 0,
      message:
        insertedCount > 0
          ? `Import complete. ${insertedCount} bucket(s) created.`
          : "No buckets were imported. All rows had errors or duplicates.",
      summary: {
        totalRows: rowCount,
        imported: importedRows.length,
        skipped: skippedRows.length,
        errors: errorRows.length,
        templateType: detected,
      },
      log: importLog,
      errorFile,
    });
  } catch (topErr) {
    return next(new AppError(topErr.message, 500));
  } finally {
    fs.unlink(filePath, (e) => {
      if (e) console.error("Failed to delete uploaded file:", e);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD TEMPLATE CONTROLLER (ONLY TARGET USERS)
// ─────────────────────────────────────────────────────────────────────────────
export const downloadBucketImportTemplate = (req, res) => {
  const type = (req.query.type || "delegation").toLowerCase();

  const tpl = {
    filename: "bucket_delegation_template.xlsx",
    headers: [
      "Title",
      "Description",
      "Target Users",
      "Start Date",
      "Task End Days",
    ],
    example: [
      "Monthly Vendor Audit",
      "Review all vendor invoices",
      "Rahul Singh",
      "01-06-2026",
      "5",
    ],
    example2: [
      "Server Backup Check",
      "Verify backup integrity",
      "Rahul Singh, Priya Verma",
      "02-06-2026",
      "3",
    ],
    notes: [
      "Target Users: exact user full name or email address (comma-separated for multiple users)",
      "Start Date format: DD-MM-YYYY",
      "Task End Days: positive number (>= 1)",
    ],
  };

  const wb = XLSX.utils.book_new();

  // ── Data sheet ─────────────────────────────────────────────────────────────
  const dataSheet = XLSX.utils.aoa_to_sheet([
    tpl.headers,
    tpl.example,
    tpl.example2,
  ]);

  const range = XLSX.utils.decode_range(dataSheet["!ref"]);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c });
    if (dataSheet[cell]) {
      dataSheet[cell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "DBEAFE" } },
      };
    }
  }
  XLSX.utils.book_append_sheet(wb, dataSheet, "Import Data");

  // ── Notes sheet ────────────────────────────────────────────────────────────
  const notesData = [
    ["Field Notes for: " + type + " template"],
    [""],
    ...tpl.notes.map((n) => [n]),
    [""],
    ["General Rules"],
    ["Do not change column header names"],
    ["Dates must be in DD-MM-YYYY format"],
    ["Target Users: use exact full name or email address, comma-separated"],
  ];
  const notesSheet = XLSX.utils.aoa_to_sheet(notesData);
  XLSX.utils.book_append_sheet(wb, notesSheet, "Notes");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${tpl.filename}"`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.send(buffer);
};

export const exportTaskBuckets = handleAsync(async (req, res, next) => {
  try {
    const buckets = await TaskBucket.find({ isDeleted: false })
      .populate("targetRole", "name")
      .populate("targetUsers", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const data = buckets.map((bucket) => ({
      BucketId: bucket.bucketId,
      Title: bucket.title || "",
      Description: bucket.description || "",
      "Assignment Mode": bucket.assignmentMode || "",
      "Target Role":
        bucket.assignmentMode === "Role" ? bucket.targetRole?.name || "" : "",
      "Target Users":
        bucket.assignmentMode === "Users"
          ? (bucket.targetUsers || []).map((u) => u.name || u.email).join(", ")
          : "",
      "Start Date": bucket.startDate
        ? new Date(bucket.startDate)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-")
        : "",
      "Task End Days": bucket.taskEndDays || "",
      // Remark: bucket.remark || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Task Buckets");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="task-buckets.xlsx"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
});

export const exportPendingTaskBuckets = handleAsync(async (req, res, next) => {
  try {
    const buckets = await TaskBucketRequest.find({})
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const data = buckets.map((bucket) => ({
      Title: bucket.title || "",
      Description: bucket.description || "",
      "Start Date": bucket.startDate
        ? new Date(bucket.startDate)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-")
        : "",
      "Task End Days": bucket.taskEndDays || "",
      Status: bucket.status || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Task Buckets");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="task-buckets.xlsx"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
});
