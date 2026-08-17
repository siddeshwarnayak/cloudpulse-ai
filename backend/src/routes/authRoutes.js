import { Router } from "express";
import { register, login } from "../controllers/authController.js";
import { validateBody, isNonEmptyString, isEmail, isMinLength } from "../middleware/validate.js";

const router = Router();

router.post(
  "/register",
  validateBody({ name: isNonEmptyString, email: isEmail, password: isMinLength(8) }),
  register
);

router.post("/login", validateBody({ email: isEmail, password: isNonEmptyString }), login);

export default router;
