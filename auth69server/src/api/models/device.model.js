import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    deviceName: { type: String, default: "Web Browser" },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet"], default: "desktop" },
    browser: { type: String, default: "Chrome" },
    os: { type: String, default: "Windows" },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "" },
    lastActive: { type: Date, default: Date.now, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const Device = mongoose.models.Device || mongoose.model("Device", deviceSchema);
export default Device;
