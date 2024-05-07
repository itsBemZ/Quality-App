const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    task: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
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

const Task = mongoose.model("Task", TaskSchema);

module.exports = Task;
