import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { created, ok, ApiError } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/errorHandler.js";

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: "7d" });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  const token = signToken(user);
  return created(res, { user: safeUser(user), token });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) throw new ApiError(401, "Invalid email or password");

  const token = signToken(user);
  return ok(res, { user: safeUser(user), token });
});
