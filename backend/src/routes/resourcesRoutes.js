import { Router } from "express";
import { listResources, getResource } from "../controllers/resourcesController.js";

const router = Router();

router.get("/", listResources);
router.get("/:id", getResource);

export default router;
