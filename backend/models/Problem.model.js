const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema(
  {
    source: {
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
    shift: {
      type: String,
      required: true,
    },
    crew: {
      type: String,
      required: true,
    },
    line: {
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
    PosteType: {
      type: String,
      default: "",
    },
    PosteNumber: {
      type: Number,
      default: null,
    },
    Poste: {
      type: String,
      default: "",
    },
    operator: {
      type: Number,
      default: null,
    },
    connector: {
      type: String,
      default: "",
    },
    voie: {
      type: Number,
      default: null,
    },
    details: {
      type: String,
      default: "",
    },
    auditor: {
      type: Number,
      default: null,
    },
    qualityClass: {
      type: Number,
      default: null,
    },
    drawingNumber: {
      type: Number,
      default: null,
    },
    reference: {
      type: Number,
      default: null,
    },
    autorefusNumber: {
      type: Number,
      default: null,
    },
    openDate: {
      type: Date,
      default: null,
    },
    closeDate: {
      type: Date,
      default: null,
    },
    repairer: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Problem = mongoose.model("Problem", ProblemSchema);

module.exports = Problem;