import express from "express";
import { getMisReport } from "../controllers/misReportController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";
import { getMisReportCount ,getMisReportTasks} from "../controllers/misReportOpenApiController.js";

const router = express.Router();

router.post("/report", authenticateJWT, getMisReport);
router.get("/batch-report/count", getMisReportCount);
router.get("/batch-report/tasks", getMisReportTasks);

export default router;
