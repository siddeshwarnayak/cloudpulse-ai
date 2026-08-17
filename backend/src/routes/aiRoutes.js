import { Router } from "express";
import { analyze, recommend } from "../controllers/aiController.js";

const router = Router();

router.post("/analyze", analyze);
router.post("/recommend", recommend);

export default router;
