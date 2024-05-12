const mongoose = require("mongoose");

const VolumeSchema = new mongoose.Schema(
  {
    crew: {
      type: String,
    },
    date: {
      type: Date,
    },
    output: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Volume = mongoose.model("Volume", VolumeSchema);

module.exports = Volume;