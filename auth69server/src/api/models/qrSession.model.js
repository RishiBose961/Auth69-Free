import mongoose from "mongoose";

const qrSessionSchema = new mongoose.Schema(
  {
    qrId: { type: String, required: true, unique: true, index: true },
    rawPayload: { type: String, required: true },
    qrCodeDataUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "SCANNED", "AUTHORIZED", "DENIED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
    userId: { type: String },
    userEmail: { type: String },
    deviceId: { type: String },
    token: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Automatic TTL cleanup index for MongoDB (removes old QR sessions after 10 mins)
qrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

export const QRSession =
  mongoose.models.QRSession || mongoose.model("QRSession", qrSessionSchema);
export default QRSession;
