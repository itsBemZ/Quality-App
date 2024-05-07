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
    const { username, role } = req.user;
    const { user, task, sequence, category } = req.body;

    const query = {};

    if (role === "Auditor") {
      query.users = username;
    } else if (user) {
      query.users = user;
    }

    if (task) query.task = task;
    if (sequence) query.sequence = sequence;
    if (category) query.category = category;

    const sortCriteria = { category: 1, sequence: 1 };

    const data = await TaskData.find(query).sort(sortCriteria).exec();
    res.status(200).json(data);
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
    const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[2]]);
    const results = [];

    for (const row of xlsData) {
      const { CATEGORY, SEQUENCE, TASK } = row;

      const taskData = await Task.findOneAndUpdate({ category: CATEGORY, sequence: SEQUENCE }, { task: TASK }, { new: true, upsert: true });

      results.push(taskData);
    }

    res.status(201).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
