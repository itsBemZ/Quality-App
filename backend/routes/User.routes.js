const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const Location = require("../models/Location.model");
const Log = require("../models/Log.model");
const Planning = require("../models/Planning.model");
const Result = require("../models/Result.model");
const Task = require("../models/Task.model");
const User = require("../models/User.model");

const { roleCheck } = require("../middlewares/roleCheck");
const { getWeekNumber } = require("../utils");

const upload = multer({ dest: "uploads/" });

// router

router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, role, fullname, email, isActive, isConfigured, isNotification, isBelongTo, belongTo } = req.body;

    const matchStage = {};
    if (username) matchStage.username = username;
    if (role) matchStage.role = role;
    if (fullname) matchStage.fullname = { $regex: fullname, $options: "i" };
    if (email) matchStage.email = { $regex: email, $options: "i" };
    if (isActive !== undefined) matchStage.isActive = isActive ? true : false;
    if (isConfigured !== undefined) matchStage.isConfigured = isConfigured ? true : false;
    if (isNotification !== undefined) matchStage.isNotification = isNotification ? true : false;
    if (isBelongTo !== undefined) matchStage.isBelongTo = isBelongTo ? true : false;
    if (belongTo) matchStage.belongTo = belongTo;

    // Aggregate pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          sortUsername: {
            $convert: {
              input: "$username",
              to: "int",
              onError: "$username",
              onNull: "$username",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          fullname: 1,
          email: 1,
          role: 1,
          isActive: 1,
          isConfigured: 1,
          isNotification: 1,
          isBelongTo: 1,
          belongTo: 1,
          sortUsername: 1,
        },
      },
      { $sort: { role: 1, sortUsername: 1 } },
      { $project: { sortUsername: 0 } }, // remove the sorting field from final output
    ];

    const users = await User.aggregate(pipeline).exec();
    const count = await User.countDocuments(matchStage);
    res.status(200).json({ usersCount: count, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/belong-to/add/:id", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (["Supervisor", "Root", "Viewer"].includes(user.role)) {
      return res.status(403).json({ message: `Cannot set belong to for ${user.role} users` });
    } else {
      user.isBelongTo = true;
      user.belongTo = req.user.username;
      await user.save();
      return res.status(200).json({ message: `User ${user.username} has been successfully assigned to ${req.user.username}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/belong-to/delete/:id", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.belongTo === req.user.username || req.user.role === "Root") {
      const belongTo = user.belongTo;
      user.isBelongTo = false;
      user.belongTo = "";
      await user.save();
      return res.status(200).json({ message: `User ${user.username} has been successfully unassigned from ${belongTo}` });
    } else {
      return res.status(403).json({ message: `Only ${user.belongTo} User or Root Users can unassign this User.` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", roleCheck(["Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "Root") {
      return res.status(403).json({ message: "Cannot delete Root user" });
    } else {
      await User.deleteOne({ _id: req.params.id });
      return res.status(200).json({ message: "User deleted successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import/excel", upload.single("excel"), roleCheck(["Root"]), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload an Excel file." });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;
    const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
    const results = [];

    for (const row of xlsData) {
      if (row["MLLE"] && row["ROLE"]) {
        const username = row["MLLE"].toString();
        const fullname = row["FULLNAME"] ? row["FULLNAME"].toString() : "";
        const role = row["ROLE"].toString();
        let message = "";

        // Check for invalid roles
        if (!["Auditor", "Supervisor", "Viewer"].includes(role)) {
          message = `Invalid role for user ${username}`;
          //log
          results.push({ username, error: message });
          continue;
        }

        // Check if user already exists
        let user = await User.findOne({ username: username });
        if (user) {
          message = `User ${username} with ${user.role} Role already exists`;
          //log
          results.push({ username, error: message });
          continue;
        }

        // Create user
        const hashedPassword = await bcrypt.hash(username, 10);
        user = new User({
          username: username,
          fullname: fullname,
          role: role,
          password: hashedPassword,
        });

        await user.save();
        message = `User ${username} created successfully`;
        //log
        results.push({ username, message: message });
      }
    }
    res.status(201).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
