const mongoose = require("mongoose");

const ABSchema = new mongoose.Schema(
  {
    project: {
      type: String,
      required: true
    },
    week: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
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
    poste: {
      type: String,
      default: "",
    },
    matricule: {
      type: Number,
      default: "",
    },
    reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AB = mongoose.model("AB", ABSchema);

module.exports = AB;