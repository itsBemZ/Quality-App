const mongoose = require("mongoose");

const TargetSchema = new mongoose.Schema(
  {
    for: {
      type: String,
      required: true,
    },
    project: {
      type: String,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    target: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Target = mongoose.model("Target", TargetSchema);

module.exports = Target;