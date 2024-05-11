const express = require("express");
const router = express.Router();

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");


const Task = require("../models/Task.model");


const { roleCheck } = require("../middlewares/roleCheck");

const upload = multer({ dest: "uploads/" });

// Task routers

router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { task, sequence, category } = req.body;

    const query = {};

    if (task) query.task = task;
    if (sequence) query.sequence = sequence;
    if (category) query.category = category;

    // Fetch sorted data
    const sortCriteria = { category: 1, sequence: 1 };
    const tasks = await Task.find(query).sort(sortCriteria).exec();

    // Group tasks by category
    const categorizedData = tasks.reduce((acc, task) => {
      // Initialize category array if it doesn't exist
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    }, {});

    res.status(200).json(categorizedData);
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
