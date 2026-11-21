import mongoose from "mongoose";
import { ENV } from "./env.config.js";

export const connectDB = async () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    const conn = await mongoose.connect(ENV.MONGO_URL, {
      maxPoolSize: 10,
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("🍃 MongoDB disconnected.");
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error.message}`);
  }
};

export default connectDB;
