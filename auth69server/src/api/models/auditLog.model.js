import mongoose from "mongoose";
import { randomUUID } from "crypto";

const auditLogSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: { type: String, default: "" },
    ipAddress: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
