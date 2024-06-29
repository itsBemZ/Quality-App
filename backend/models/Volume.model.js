const mongoose = require("mongoose");

const VolumeSchema = new mongoose.Schema(
  {
    project: {
      type: String,
      required: true,
    },
    family: {
      type: String,
      required: true,
    },
    crew: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    volume: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Volume = mongoose.model("Volume", VolumeSchema);

module.exports = Volume;