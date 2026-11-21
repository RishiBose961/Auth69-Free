import app from "./app.js";
import connectDB, { disconnectDB } from "./config/db.config.js";
import { ENV } from "./config/env.config.js";

const PORT = ENV.PORT;

// Connect to DB and start server
connectDB().then(() => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("========================================================");
    console.log(`🚀 Auth69 Server running on: http://localhost:${PORT}`);
    console.log(`🍃 Database connected to: ${ENV.MONGO_URL}`);
    console.log(`⚡ WebSocket gateway target: ${ENV.SOCKET_URL}`);
    console.log("========================================================");
  });

  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log("Server closed cleanly.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
});
