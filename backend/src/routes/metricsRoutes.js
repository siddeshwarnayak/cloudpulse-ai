import { Router } from "express";
import { listRecentMetrics, listMetricsForResource } from "../controllers/metricsController.js";

const router = Router();

router.get("/", listRecentMetrics);
router.get("/:resourceId", listMetricsForResource);

export default router;
