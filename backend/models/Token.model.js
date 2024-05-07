const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema(
  {
    username: {
      type: String,
    },
    token: {
      type: String,
    },
    expired_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Token = mongoose.model("token", TokenSchema);

module.exports = Token;
