import { Router } from "express";
import { getCostSummary, getCostRecommendations } from "../controllers/costController.js";

const router = Router();

router.get("/", getCostSummary);
router.get("/recommendations", getCostRecommendations);

export default router;
