const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { morganStructured } = require("./morgan");
const helmet = require("helmet");

const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const STATUS = process.env.STATUS;
const PORT = process.env.PROD_PORT || process.env.DEV_PORT;

const app = express();

const server = http.createServer(app);
const io = new Server(server, { cors: { credentials: true } });

app.use(helmet());
app.use(morganStructured);
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

// Middlewares:
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Error handling for bodyParser:
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).send({ error: "Could not decode JSON" });
  }
  next();
});


require("./db");

// Test route
app.get("/", (req, res) => {
  res.status(200).json({ message: "API developed by @BemZ ", status: "success" });
});

// Auth route
const authRoutes = require("./auth");
app.use("/api/auth", authRoutes);

// Import the routes

const location = require("./routes/Location.routes");
const log = require("./routes/Log.routes");
const planning = require("./routes/Planning.routes");
const result = require("./routes/Result.routes");
const task = require("./routes/Task.routes");
const user = require("./routes/User.routes");

// Use the routes
app.use("/api/location", location);
app.use("/api/log", log);
app.use("/api/planning", planning);
app.use("/api/result", result);
app.use("/api/task", task);
app.use("/api/user", user);

app.listen(PORT, () => {
  console.log(
    `\x1b[1m\x1b[33m***\x1b[32m app running in \x1b[34m${STATUS}\x1b[32m mode, Listening on port *\x1b[34m:${PORT}\x1b[32m \x1b[33m***\x1b[0m`
  );
});
