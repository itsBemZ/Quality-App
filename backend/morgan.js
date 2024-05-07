// morgan.js
const morgan = require("morgan");
const AccessLogData = require("./models/AccessLogData");

// ANSI color codes for console
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

// Function to get color based on method
function getColorByMethod(method) {
  switch (method) {
    case "GET":
      return colors.blue;
    case "POST":
      return colors.green;
    case "PUT":
      return colors.yellow;
    case "DELETE":
      return colors.red;
    default:
      return colors.reset;
  }
}

// Function to get color based on status code
function getColorByStatus(status) {
  if (status >= 200 && status < 300) {
    return colors.green;
  } else if (status >= 300 && status < 400) {
    return colors.cyan;
  } else if (status >= 400 && status < 500) {
    return colors.red;
  } else if (status >= 500) {
    return colors.magenta;
  }
  return colors.reset;
}

// Function to get color based on response time
function getColorByTime(time) {
  if (time < 100) {
    return colors.green;
  } else if (time < 500) {
    return colors.yellow;
  }
  return colors.red;
}

// Function to get color based on content length
function getColorByLength(length) {
  const size = parseInt(length, 10);
  if (size < 500) {
    return colors.cyan;
  } else if (size < 5000) {
    return colors.blue;
  }
  return colors.magenta;
}

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
      clientIP,
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

    const methodColor = getColorByMethod(method);
    const statusColor = getColorByStatus(parseInt(status, 10));
    const timeColor = getColorByTime(responseTime);
    const lengthColor = getColorByLength(contentLength);
    const reset = colors.reset;

    console.log(
      `${date} | User: ${username} | IP: ${clientIP} | Message: ${messageText} | Method: ${methodColor}${method}${reset} | Target: ${url} | Status: ${statusColor}${status}${reset} | Time: ${timeColor}${responseTime} ms${reset} | Length: ${lengthColor}${contentLength}${reset}`
    );

    const logEntry = new AccessLogData({
      username,
      isActive: isActive === true,
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
  },
};

const morganStructured = morgan(morganFormat, { stream: logStream });
module.exports = { morganStructured };
