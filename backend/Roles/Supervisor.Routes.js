const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const AccessLogData = require("../models/AccessLogData");
const LocationData = require("../models/LocationData");
const PlanningData = require("../models/PlanningData");
const ResultData = require("../models/ResultData");
const TaskData = require("../models/TaskData");
const User = require("../models/User");

const { excelDateToJSDate, log } = require("../utils");
const { roleCheck } = require("../middlewares/roleCheck");

const upload = multer({ dest: "uploads/" });

// router

router.post("/planning/", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const { week, shifts, crews } = req.body;

    // Construct the update object
    const update = { shifts, crews };

    // Find a document by 'week' and update it with the new shifts and crews data
    // or insert it if it does not exist
    const result = await PlanningData.updateOne(
      { week: week }, // Filter by 'week'
      { $set: update }, // Use $set to update the provided fields
      { upsert: true } // Option to insert if it doesn't exist
    );

    if (result.upsertedCount > 0) {
      return res.status(201).json({ message: "Planning data created.", data: result });
    } else if (result.modifiedCount > 0) {
      return res.status(200).json({ message: "Planning data updated.", data: result });
    } else {
      return res.status(200).json({ message: "No changes made to planning data.", data: result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
