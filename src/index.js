require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/database");
const { initSocket } = require("./socket");
const { startExpiryWatcher } = require("./services/expiryService");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);
  startExpiryWatcher();

  server.listen(PORT, () => {
    console.log(`[server] running on port ${PORT} (${process.env.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});
