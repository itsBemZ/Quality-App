const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const Location = require("../models/Location.model");


const { roleCheck } = require("../middlewares/roleCheck");
// const { getWeekNumber } = require("../utils");

const upload = multer({ dest: "uploads/" });

// Locations routes

// Get all locations
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

// Create a location
router.post("/", roleCheck(["Root"]), async (req, res) => {
  try {
    const { project, family, line, crew } = req.body;

    let location = await Location.findOne({ project: project, family: family, line: line, crew: crew });
    if (location) {
      res.locals.message = "Location already exists";
      return res.status(400).json({ message: res.locals.message });
    }

    location = new Location({
      project: project,
      family: family,
      line: line,
      crew: crew
    });

    await location.save();
    res.locals.message = "Location created successfully";

    res.status(201).json({ data: location, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a location
router.put("/update/:id", roleCheck(["Root"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { project, family, line, crew } = req.body;

    let location = await Location.findById(id);

    if (!location) {
      res.locals.message = "Location not found";
      return res.status(404).json({ message: res.locals.message });
    }

    // Update the location fields if provided
    location.project = project || location.project;
    location.family = family || location.family;
    location.line = line || location.line;
    location.crew = crew || location.crew;

    await location.save();
    res.locals.message = "Location updated successfully";
    res.status(200).json({ data: location, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a location
router.delete("/delete/:id", roleCheck(["Root"]), async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);

    if (!location) {
      res.locals.message = "Location not found";
      return res.status(404).json({ message: res.locals.message });
    }

    await location.remove();
    res.locals.message = "Location deleted successfully";
    res.status(200).json({ message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import locations from an Excel file
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
        res.locals.message = "Created new location successfully";
        results.push({
          location,
          message: res.locals.message,
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
          res.locals.message = "Updated location successfully";
          results.push({
            location,
            message: res.locals.message,
          });
        } else {
          res.locals.message = "No updates required for this location";
          results.push({
            location,
            message: res.locals.message,
          });
        }
      }
    }
    res.locals.message = "Locations created successfully";
    res.status(201).json({ results, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
