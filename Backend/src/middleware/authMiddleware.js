import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.isDeleted) {
      return res.status(403).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User inactive" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};

export const authenticateOpenForm = (req, res, next) => {
  const expectedToken = process.env.OPEN_FORM_SECRET_TOKEN;

  if (!expectedToken) {
    return res.status(500).json({
      success: false,
      message: "Open Form token is not configured on server",
    });
  }

  // Authorization: Bearer <token> ya custom x-open-form-token header dono support karega
  const authHeader = req.headers.authorization;
  const incomingToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]?.trim()
    : req.headers["x-open-form-token"]?.trim();

  if (!incomingToken) {
    return res.status(401).json({
      success: false,
      message: "Open Form token is required",
    });
  }

  // Timing-safe comparison taaki token securely verify ho
  const expectedBuf = Buffer.from(expectedToken, "utf8");
  const incomingBuf = Buffer.from(incomingToken, "utf8");

  const isValid =
    expectedBuf.length === incomingBuf.length &&
    crypto.timingSafeEqual(expectedBuf, incomingBuf);

  if (!isValid) {
    return res.status(403).json({
      success: false,
      message: "Invalid Open Form token",
    });
  }

  next();
};