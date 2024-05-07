const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
    },
    clientIP: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
    httpMethod: {
      type: String,
      default: "",
    },
    requestPath: {
      type: String,
      default: "",
    },
    requestBody: {
      type: String,
      default: "",
    },
    responseStatus: {
      type: String,
      default: "",
    },
    responseTime: {
      type: String,
      default: "",
    },
    contentLength: {
      type: String,
      default: "",
    },
    referrer: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    serverHost: {
      type: String,
      default: "",
    },
    serverPort: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model("log", LogSchema);

module.exports = Log;
