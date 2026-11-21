import User from "../models/user.model.js";
import AuditLog from "../models/auditLog.model.js";
import { generateSalt, hashPassword, verifyPassword } from "../../utils/password.utils.js";
import { generateToken } from "../../utils/jwt.utils.js";
import { randomUUID } from "crypto";

export const registerUserService = async ({ email, password, name = "" }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    throw new Error("User already exists with this email.");
  }

  const salt = generateSalt();
  const hashedPassword = await hashPassword(password, salt);
  const userId = randomUUID();

  const user = new User({
    id: userId,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    password: hashedPassword,
    salt,
    twoFactorEnabled: false,
    twoFactorMethod: "number",
  });

  const savedUser = await user.save();
  const userObj = savedUser.toObject();
  delete userObj.password;
  delete userObj.salt;
  delete userObj.__v;

  const token = generateToken(userObj);

  // Add audit log
  await AuditLog.create({
    userId: userObj.id,
    action: "USER_REGISTERED",
    details: `User registered with email: ${userObj.email}`,
  });

  return { user: userObj, token, _id: userObj._id, id: userObj.id, email: userObj.email };
};

export const loginUserService = async ({ email, password, ipAddress = "127.0.0.1", userAgent = "unknown" }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error("User does not exist with this email.");
  }

  const isValidPassword = await verifyPassword(password, user.salt, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid email or password.");
  }

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.salt;
  delete userObj.__v;

  // Add audit log
  await AuditLog.create({
    userId: userObj.id,
    action: "USER_LOGIN_SUCCESS",
    details: `User logged in from IP: ${ipAddress}`,
    ipAddress,
    userAgent,
  });

  const token = generateToken(userObj);
  return {
    _id: userObj._id,
    id: userObj.id,
    email: userObj.email,
    name: userObj.name,
    twoFactorEnabled: userObj.twoFactorEnabled,
    twoFactorMethod: userObj.twoFactorMethod,
    token,
    user: userObj,
    message: "User logged in successfully",
  };
};

export const getUserProfileService = async (userId) => {
  const user = await User.findOne({
    $or: [{ id: userId }, { _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null }],
  })
    .select("-password -salt -__v")
    .lean();

  if (!user) {
    return null;
  }

  const auditLogs = await AuditLog.find({ userId: user.id })
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();

  return { user, auditLogs };
};

export const toggle2FAService = async (userId, enabled, method = "number") => {
  const validMethods = ["number", "alphabet", "otp", "totp"];
  const chosenMethod = validMethods.includes(method) ? method : "number";

  const user = await User.findOneAndUpdate(
    { $or: [{ id: userId }, { _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null }] },
    { $set: { twoFactorEnabled: Boolean(enabled), twoFactorMethod: chosenMethod } },
    { returnDocument: "after" }
  )
    .select("-password -salt -__v")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  await AuditLog.create({
    userId: user.id,
    action: "2FA_TOGGLED",
    details: `2-Step Verification ${enabled ? "ENABLED (" + chosenMethod.toUpperCase() + ")" : "DISABLED"}`,
  });

  return user;
};

export const set2FAMethodService = async (userId, method) => {
  const validMethods = ["number", "alphabet", "otp", "totp"];
  if (!validMethods.includes(method)) {
    throw new Error(`Invalid method. Allowed methods: ${validMethods.join(", ")}`);
  }

  const user = await User.findOneAndUpdate(
    { $or: [{ id: userId }, { _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null }] },
    { $set: { twoFactorMethod: method } },
    { returnDocument: "after" }
  )
    .select("-password -salt -__v")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  await AuditLog.create({
    userId: user.id,
    action: "2FA_METHOD_CHANGED",
    details: `2-Step Verification method changed to ${method.toUpperCase()}`,
  });

  return user;
};
