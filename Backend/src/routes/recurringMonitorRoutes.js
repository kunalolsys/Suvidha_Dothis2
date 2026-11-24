import express from "express";
import { getRecurringAuditReport, triggerRecurringCronManually } from "../controllers/RecurringMonitorController.js";


const router = express.Router();

router.get("/audit", getRecurringAuditReport);
router.post("/trigger", triggerRecurringCronManually);

export default router;