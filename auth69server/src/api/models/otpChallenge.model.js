import mongoose from "mongoose";

const otpChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    userName: { type: String, default: "" },
    mode: { type: String, enum: ["number", "alphabet", "otp", "totp"], default: "number" },
    otp: { type: String, required: true },
    matchNumber: { type: Number },
    numberOptions: [{ type: Number }],
    alphabet4: { type: String },
    alphabetOptions: [{ type: String }],
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DENIED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false, index: true },
    attempts: { type: Number, default: 0 },
    ipAddress: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
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

// Automatic TTL cleanup index for MongoDB
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OTPChallenge =
  mongoose.models.OTPChallenge || mongoose.model("OTPChallenge", otpChallengeSchema);
export default OTPChallenge;
