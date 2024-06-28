const mongoose = require("mongoose");

const FTQSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true
    },
    month: {
      type: Number,
      required: true,
    },
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
    crew: {
      type: String,
      required: true,
    },
    family: {
      type: String,
      required: true,
    },
    project: {
      type: String,
      required: true,
    },
    cableType: {
      type: String,
      default: "",
    },
    problem: {
      type: String,
      required: true,
    },
    poste: {
      type: String,
      default: "",
    },
    connector: {
      type: String,
      default: "",
    },
    voie: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const FTQ = mongoose.model("FTQ", FTQSchema);

module.exports = FTQ;