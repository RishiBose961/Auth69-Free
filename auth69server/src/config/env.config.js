import dotenv from "@dotenvx/dotenvx";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGO_URL: process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/auth69",
  JWT_SECRET: process.env.JWT_SECRET || "auth69-ultra-secure-jwt-secret-key-production-2026",
  SOCKET_URL: process.env.SOCKET_URL || "http://localhost:5002",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
};

export default ENV;
