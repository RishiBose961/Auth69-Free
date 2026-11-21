import express from "express";
import dotenv from "@dotenvx/dotenvx";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();

import authRoutes from "./api/routes/auth.routes.js";
import userRoutes from "./api/routes/user.routes.js";
import qrRoutes from "./api/routes/qr.routes.js";
import mobileRoutes from "./api/routes/mobile.routes.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Server health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Auth69 REST API",
    version: "2.0.0",
    features: ["Email/Password", "2-Step Verification", "Number Match", "Alphabet Match", "WhatsApp-style QR"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/mobile", mobileRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

export default app;
