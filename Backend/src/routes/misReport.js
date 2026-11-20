import express from "express";
import { getMisReport } from "../controllers/misReportController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";
import { getMisReportCount ,getMisReportTasks} from "../controllers/misReportOpenApiController.js";
import { checkEmployeeStatus } from "../controllers/userController.js";

const router = express.Router();

router.post("/report", authenticateJWT, getMisReport);
router.get("/batch-report/count", getMisReportCount);
router.get("/batch-report/tasks", getMisReportTasks);
router.get("/employee-status", checkEmployeeStatus);

export default router;
