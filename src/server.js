import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { app } from "./app.js";
import connectDB from "./config/db.js";
import { createServer } from "http";           // Node's built-in http module
import { initializeSocket } from "./config/socket.js";

const PORT = process.env.PORT || 8000;


const httpServer = createServer(app);


const io = initializeSocket(httpServer);

connectDB()
  .then(() => {
    // Listen on the HTTP server, NOT app.listen()
    httpServer.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` WebSocket server ready`);
    });
  })
  .catch((err) => {
    console.error("Server failed to start:", err);
  });