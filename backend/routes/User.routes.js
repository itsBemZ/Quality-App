const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const User = require("../models/User.model");

const { roleCheck } = require("../middlewares/roleCheck");

const upload = multer({ dest: "uploads/" });

// User routes

// Get all users
router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, role, fullname, email, isActive, isConfigured, isNotification, isBelongTo, belongTo } = req.query;

    const matchStage = {};

    if (isBelongTo === undefined && req.user.role === "Supervisor") {
      matchStage.belongTo = req.user.username;
    }

    if (isBelongTo === "true" || isBelongTo === "false") {
      matchStage.isBelongTo = isBelongTo === "true";
    }
    if (isActive === "true" || isActive === "false") {
      matchStage.isActive = isActive === "true";
    }
    if (isConfigured === "true" || isConfigured === "false") {
      matchStage.isConfigured = isConfigured === "true";
    }
    if (isNotification === "true" || isNotification === "false") {
      matchStage.isNotification = isNotification === "true";
    }

    if (username) matchStage.username = username;
    if (role) matchStage.role = role;
    if (fullname) matchStage.fullname = { $regex: fullname, $options: "i" };
    if (email) matchStage.email = { $regex: email, $options: "i" };
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

// Add a user to a supervisor
router.post("/belong-to/add/:id", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.locals.message = "User not found";
      return res.status(404).json({ message: res.locals.message });
    }
    if (["Supervisor", "Root", "Viewer"].includes(user.role)) {
      res.locals.message = `Cannot set belong to for ${user.role} users`;
      return res.status(403).json({ message: res.locals.message });
    } else {
      if (req.user.role === "Root") {
        const check = await User.findOne({ username: req.body.belongTo });
        if (check.role === "Supervisor") {
          user.belongTo = check.username;
        } else {
          res.locals.message = `Cannot set belong to ${check.role} user`;
          return res.status(403).json({ message: res.locals.message });
        }
      } else {
        user.belongTo = req.user.username;
      }
      user.isBelongTo = true;
      await user.save();
      res.locals.message = `User ${user.username} has been successfully assigned to ${user.belongTo}`;
      return res.status(200).json({ message: res.locals.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user from a supervisor
router.delete("/belong-to/delete/:id", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.locals.message = "User not found";
      return res.status(404).json({ message: res.locals.message });
    }
    if (user.belongTo === req.user.username || req.user.role === "Root") {
      const belongTo = user.belongTo;
      user.isBelongTo = false;
      user.belongTo = "";
      await user.save();
      res.locals.message = `User ${user.username} has been successfully unassigned from ${belongTo}`;
      return res.status(200).json({ message: res.locals.message });
    } else {
      res.locals.message = `Only ${user.belongTo} User or Root Users can unassign this User.`;
      return res.status(403).json({ message: res.locals.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user
router.delete("/delete/:id", roleCheck(["Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.locals.message = "User not found";
      return res.status(404).json({ message: res.locals.message });
    }
    if (user.role === "Root") {
      res.locals.message = "Cannot delete Root user";
      return res.status(403).json({ message: res.locals.message });
    } else {
      await User.deleteOne({ _id: req.params.id });
      res.locals.message = "User deleted successfully";
      return res.status(200).json({ message: res.locals.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import users from an Excel file
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

        // Check for invalid roles
        if (!["Auditor", "Supervisor", "Viewer"].includes(role)) {
          res.locals.message = `Invalid role for user ${username}`;
          //log
          results.push({ username, error: res.locals.message });
          continue;
        }

        // Check if user already exists
        let user = await User.findOne({ username: username });
        if (user) {
          res.locals.message = `User ${username} with ${user.role} Role already exists`;
          //log
          results.push({ username, error: res.locals.message });
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
        res.locals.message = `User ${username} created successfully`;
        //log
        results.push({ username, message: res.locals.message });
      }
    }
    res.locals.message = "Users created successfully";
    res.status(201).json({ results, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
