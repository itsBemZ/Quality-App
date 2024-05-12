const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["Viewer", "Auditor", "Supervisor", "Root"],
    },
    fullname: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    imageURL: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
    isNotification: {
      type: Boolean,
      default: false,
    },
    isBelongTo: {
      type: Boolean,
      default: false,
    },
    belongTo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: {
      currentTime: () => {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        return now.toLocaleString("en-US", {
          timeZone: "Africa/Casablanca",
          hour12: true,
        });
      },
    },
  }
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
