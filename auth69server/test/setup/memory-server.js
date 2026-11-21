import mongoose from "mongoose";

export async function connectMemoryDB() {
  const uri = process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27017/auth69_test";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

export async function disconnectMemoryDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    // Ignore teardown errors
  }
}

export async function clearDB() {
  try {
    if (mongoose.connection && mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  } catch (err) {
    // Ignore clear errors
  }
}
