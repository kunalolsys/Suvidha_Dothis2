// routes/taskBucketRoutes.js

import express from "express";

import {
  createTaskBucket,
  getTaskBuckets,
  getSingleTaskBucket,
  distributeTaskBucket,
  deleteTaskBucket,
  getBucketReportingUsers,
  completeTaskBucket,
  getAllTaskBuckets,
  updateTaskBucket,
  exportTaskBucketsFiltered,
} from "../controllers/taskBucketController.js";

import { authenticateJWT } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import {
  downloadBucketImportTemplate,
  exportPendingTaskBuckets,
  exportTaskBuckets,
  importTaskBuckets,
} from "../services/imports/importBucket.js";
import {
  getEmployeeAgingBucketList,
  getEmployeeWiseAgingBucketCounts,
  getTaskBucketAgingMaster,
  upsertTaskBucketAgingMaster,
} from "../controllers/taskBucketAgingController.js";

const router = express.Router();

// =========================================================
// 1. STATIC ROUTES (MUST BE ABOVE ALL "/:id" ROUTES)
// =========================================================
router.post(
  "/import",
  authenticateJWT,
  upload.single("file"),
  importTaskBuckets,
);
router.get("/downloadTemp", authenticateJWT, downloadBucketImportTemplate);

router.get("/list", authenticateJWT, getAllTaskBuckets);
router.get("/export-bucket", authenticateJWT, exportTaskBucketsFiltered);
router.get("/bucket/export", authenticateJWT, exportTaskBuckets);
router.get("/bucket/export-pending", authenticateJWT, exportPendingTaskBuckets);

// Aging Master & Reports
router.get("/aging/master", getTaskBucketAgingMaster);
router.put("/aging/master", upsertTaskBucketAgingMaster);
router.get("/aging/employee-counts", getEmployeeWiseAgingBucketCounts);
router.get("/aging/employee/:employeeCode/list", getEmployeeAgingBucketList);

// =========================================================
// 2. ROOT ROUTES ("/")
// =========================================================
router.post(
  "/",
  authenticateJWT,
  upload.array("attachmentFile"),
  createTaskBucket,
);
router.get("/", authenticateJWT, getTaskBuckets);

// =========================================================
// 3. DYNAMIC ":id" ROUTES (ALWAYS AT THE BOTTOM)
// =========================================================
router.get("/:id", authenticateJWT, getSingleTaskBucket);
router.post("/:id/distribute", authenticateJWT, distributeTaskBucket);
router.delete("/:id", authenticateJWT, deleteTaskBucket);
router.put(
  "/:id",
  authenticateJWT,
  upload.array("attachmentFile"),
  updateTaskBucket,
);
router.patch("/:id/complete", authenticateJWT, completeTaskBucket);
router.get("/:id/reporting-users", authenticateJWT, getBucketReportingUsers);

export default router;