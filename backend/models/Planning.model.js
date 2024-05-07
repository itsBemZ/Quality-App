const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    unique: true,
  },
  task: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  sequence: {
    type: Number,
    required: true,
  },
});

const PlanSchema = new mongoose.Schema({
  crew: {
    type: String,
    required: true,
    unique: true,
  },
  tasks: {
    type: [TaskSchema],
    default: [],
  },
});

const PlanningSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    week: {
      type: String,
      required: true,
    },
    shift: {
      type: String,
      required: true,
    },
    plans: {
      type: [PlanSchema],
      default: [],
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

const Planning = mongoose.model("planning", PlanningSchema);

module.exports = Planning;
