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
    const { role } = req.user;
    const { username, week, shift, crew } = req.query;

    // Construct query object
    const query = {};
    if (role === "Auditor") {
      query.username = req.user.username;
    } else {
      if (username) query.username = username;
    }
    if (week) query.week = week;
    if (shift) query.shift = shift;

    // Fetch planning data
    const plans = await Planning.find(query).populate({
      path: "plans",
      match: crew ? { crew: crew } : {},
      populate: {
        path: "tasks",
        match: req.query.task ? { task: req.query.task } : {},
      },
    });

    // Check if the data exists
    if (plans.length) {
      res.status(200).json(plans);
    } else {
      res.status(404).json({ message: "No planning data found." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, week, shift, plans } = req.body;

    // Fetch the existing planning document
    const existingPlan = await Planning.findOne({ week: week, username: username });

    if (!existingPlan) {
      // Filter out plans with empty tasks before any operations
      const validCrews = plans.filter((crew) => crew.tasks && crew.tasks.length > 0);

      if (validCrews.length > 0) {
        // Create a new plan with valid plans
        const newPlan = new Planning({ username, week, shift, plans: validCrews });
        const result = await newPlan.save();
        return res.status(201).json({ message: "Planning data created.", data: result });
      } else {
        // No valid plans to add, do not create an empty plan
        return res.status(400).json({ message: "No valid plans with tasks to add." });
      }
    }

    // If an existing plan was found, prepare to update
    const updatedCrews = existingPlan.plans.filter((ec) => {
      const incomingCrew = plans.find((c) => c.crew && ec.crew && c.crew.equals(ec.crew));
      return incomingCrew ? incomingCrew.tasks.length > 0 : true;
    });

    // Append new plans or update existing ones
    plans.forEach((crew) => {
      if (crew.tasks.length > 0) {
        const index = updatedCrews.findIndex((c) => c.crew && crew.crew && c.crew.equals(crew.crew));
        if (index === -1) {
          updatedCrews.push(crew); // Append new crew if it has tasks
        } else {
          updatedCrews[index] = crew; // Update existing crew
        }
      }
    });

    // Save the updated document
    existingPlan.plans = updatedCrews;
    existingPlan.shift = shift; // Update shift if needed
    const result = await existingPlan.save();

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      return res.status(200).json({ message: "Planning data updated.", data: result });
    } else {
      return res.status(200).json({ message: "No changes made to planning data.", data: result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
