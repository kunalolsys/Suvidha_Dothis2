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
} from "../controllers/taskBucketController.js";

import { authenticateJWT } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import {
  downloadBucketImportTemplate,
  exportPendingTaskBuckets,
  exportTaskBuckets,
  importTaskBuckets,
} from "../services/imports/importBucket.js";
import { getEmployeeAgingBucketList, getEmployeeWiseAgingBucketCounts, getTaskBucketAgingMaster, upsertTaskBucketAgingMaster } from "../controllers/taskBucketAgingController.js";
const router = express.Router();
router.post(
  "/import",
  authenticateJWT,
  upload.single("file"),
  importTaskBuckets,
);
router.get("/downloadTemp", authenticateJWT, downloadBucketImportTemplate);

router.post(
  "/",
  authenticateJWT,
  upload.array("attachmentFile"),
  createTaskBucket,
);

router.get("/", authenticateJWT, getTaskBuckets);
router.get("/list", authenticateJWT, getAllTaskBuckets);

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
router.get("/bucket/export", authenticateJWT, exportTaskBuckets);
router.get("/bucket/export-pending", authenticateJWT, exportPendingTaskBuckets);

// Master GET & SET (pendingDaysThreshold)
router.get("/aging/master", getTaskBucketAgingMaster);
router.put("/aging/master", upsertTaskBucketAgingMaster);

// API 1: All Employees Pending Aging Bucket Counts (No employeeCode param)
router.get(
  "/aging/employee-counts",
  getEmployeeWiseAgingBucketCounts,
);

// API 2: Specific Employee Pending Aging Buckets List (By employeeCode param)
router.get(
  "/aging/employee/:employeeCode/list",
  getEmployeeAgingBucketList,
);
export default router;
