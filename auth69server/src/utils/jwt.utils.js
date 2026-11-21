import jwt from "jsonwebtoken";
import { ENV } from "../config/env.config.js";

export const generateToken = (user) => {
  const userId = user.id || user._id?.toString();
  const payload = {
    id: userId,
    userId: userId,
    email: user.email,
    name: user.name || "",
  };
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET);
  } catch (err) {
    return null;
  }
};
