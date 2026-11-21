import express from "express";
import {
  getPendingOTPs,
  approveLogin,
  handlePromptResponse,
  getMobileStatus,
} from "../controllers/mobile.controller.js";
import { authenticateUser } from "../middleware/authenticateUser.middleware.js";

const router = express.Router();

// Optional auth: allows token in header or email in query
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authenticateUser(req, res, next);
  }
  next();
};

router.get("/pending-otps", optionalAuth, getPendingOTPs);
router.post("/approve", approveLogin);
router.post("/prompt-respond", handlePromptResponse);
router.post("/prompt-response", handlePromptResponse);
router.get("/status", getMobileStatus);

export default router;
