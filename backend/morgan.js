// morgan.js
const morgan = require("morgan");
const Log = require("./models/Log.model");
const { formatIPAddress, morganConsoleLog } = require("./utils");

// Custom tokens for morgan
morgan.token("username", (req) => (req.user ? req.user.username : "Unknown"));
morgan.token("isActive", (req) => (req.user ? req.user.isActive : false));
morgan.token("message", (req, res) => {
  return res.locals.message || "No message";
});
morgan.token("serverHost", (req) => req.hostname);
morgan.token("serverPort", (req) => req.socket.localPort || null);
morgan.token("requestBody", (req) => JSON.stringify(req.body));
morgan.token("referrer", (req) => req.headers["referrer"] || "No referrer");
morgan.token("userAgent", (req) => req.headers["user-agent"] || "No user-agent");

// Define a custom morgan format using the custom tokens
const morganFormat =
  ":username | :isActive | :remote-addr | :message | :method | :url | :requestBody | :status | :response-time | :res[content-length] | :referrer | :user-agent | :serverHost | :serverPort | [:date[web]]";

// Stream function to save log entries
const logStream = {
  write: async (message) => {
    const [
      username,
      isActive,
      ip,
      messageText,
      method,
      url,
      requestBody,
      status,
      responseTime,
      contentLength,
      referrer,
      userAgent,
      serverHost,
      serverPort,
      date,
    ] = message.trim().split(" | ");

    if (method !== "OPTIONS") {
      const clientIP = formatIPAddress(ip);

      morganConsoleLog(method, status, responseTime, contentLength, username, clientIP, messageText, url);

      const logEntry = new Log({
        username,
        isActive: isActive === "true" ? true : false,
        clientIP,
        message: messageText,
        httpMethod: method,
        requestPath: url,
        requestBody,
        responseStatus: status,
        responseTime,
        contentLength,
        referrer,
        userAgent,
        serverHost,
        serverPort: parseInt(serverPort, 10),
      });

      try {
        await logEntry.save();
      } catch (err) {
        console.error("Error saving log entry:", err);
      }
    }
  },
};

const morganStructured = morgan(morganFormat, { stream: logStream });
module.exports = { morganStructured };
