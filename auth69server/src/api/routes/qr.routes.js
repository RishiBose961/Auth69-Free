import express from "express";
import {
  createQRSession,
  checkQRStatus,
  scanQR,
  authorizeQR,
  denyQR,
} from "../controllers/qr.controller.js";
import { authenticateUser } from "../middleware/authenticateUser.middleware.js";

const router = express.Router();

router.post("/create", createQRSession);
router.get("/status/:qrId", checkQRStatus);

// Mobile authorized operations
router.post("/scan", authenticateUser, scanQR);
router.post("/authorize", authenticateUser, authorizeQR);
router.post("/deny", authenticateUser, denyQR);

export default router;
