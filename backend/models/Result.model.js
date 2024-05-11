const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      unique: true
    },
    result: {
      type: String,
      default: "NA",
      enum: ["OK", "NOK", "NA"],
    },
    username: {
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

const ResultSchema = new mongoose.Schema(
  {
    week: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      required: true,
    },

    project: {
      type: String,
      required: true,
    },

    family: {
      type: String,
      required: true,
    },

    line: {
      type: String,
      required: true,
    },
    crew: {
      type: String,
      required: true,
    },

    tasks: {
      type: [TaskSchema],
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


const Result = mongoose.model("result", ResultSchema);

module.exports = Result;
