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
    const { project, family, line, crew } = req.body;

    const query = {};

    if (project) query.project = project;
    if (family) query.family = family;
    if (line) query.line = line;
    if (crew) query.crew = crew;

    const sortCriteria = { project: 1, family: 1, line: 1, crew: 1 };

    const data = await Location.find(query).sort(sortCriteria).exec();
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
    const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[1]]);
    const results = [];

    for (const row of xlsData) {
      const { PROJECT, FAMILY, LINE, CREW } = row;

      let location = await Location.findOne({
        project: PROJECT,
        crew: CREW,
      });

      if (!location) {
        location = new Location({
          project: PROJECT,
          family: FAMILY,
          line: LINE,
          crew: CREW,
        });
        await location.save();
        results.push({
          location,
          message: "Created new location successfully.",
        });
      } else {
        let updateNeeded = false;

        if (location.family !== FAMILY) {
          location.family = FAMILY;
          updateNeeded = true;
        }

        if (location.line !== LINE) {
          location.line = LINE;
          updateNeeded = true;
        }

        if (location.crew !== CREW) {
          location.crew = CREW;
          updateNeeded = true;
        }

        if (updateNeeded) {
          await location.save();
          results.push({
            location,
            message: "Updated location successfully.",
          });
        } else {
          results.push({
            location,
            message: "No updates required for this location.",
          });
        }
      }
    }

    res.status(201).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
