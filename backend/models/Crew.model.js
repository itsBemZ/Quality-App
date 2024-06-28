const mongoose = require("mongoose");

const CrewSchema = new mongoose.Schema(
  {
    project: {
      type: String,
      required: true
    },
    family: {
      type: String,
      required: true,
    },
    crew: {
        type: String,
        required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Crew = mongoose.model("CREW", CrewSchema);

module.exports = Crew;