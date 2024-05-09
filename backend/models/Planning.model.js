const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  crew: {
    type: String,
    ref: 'Location',
    required: true,
    unique: true,
  },
  tasks: {
    type: [],
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
  }
);

const Planning = mongoose.model("planning", PlanningSchema);

module.exports = Planning;
