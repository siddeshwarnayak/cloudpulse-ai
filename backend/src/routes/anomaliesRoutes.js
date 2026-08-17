import { Router } from "express";
import { listAnomalies, analyzeAnomalyOnDemand, resolveIncident } from "../controllers/anomaliesController.js";

const router = Router();

router.get("/", listAnomalies);
router.post("/analyze", analyzeAnomalyOnDemand);
router.post("/:id/resolve", resolveIncident);

export default router;
