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
  result: {
    type: String,
    default: "",
  },
  username: {
    type: String,
    default: "",
  },
});

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
      default: "",
    },

    crewID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      unique: true,
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
