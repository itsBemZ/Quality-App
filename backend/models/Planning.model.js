const mongoose = require("mongoose");

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
    crew: {
      type: String,
      ref: 'Location',
      required: true,
      unique: true,
    },
    tasks: {
      type: [String],
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

const Planning = mongoose.model("Planning", PlanningSchema);

module.exports = Planning;
