const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    project: {
      type: String,
    },
    family: {
      type: String,
    },
    line: {
      type: String,
    },
    crew: {
      type: String,
      unique: true,
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

const Location = mongoose.model("location", LocationSchema);

module.exports = Location;
