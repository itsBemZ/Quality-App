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
const { getWeekNumber, getShift } = require("../utils");

const upload = multer({ dest: "uploads/" });

// router:

router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { role } = req.user;
    const { username, week, date, shift } = req.query;

    const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const currentHour = new Date().getHours();
    const currentShift = await getShift(currentHour);
    const currentWeek = await getWeekNumber(currentDate);

    const query = {};

    if (week) {
      query.week = week;
    } else {
      query.week = currentWeek;
    }

    if (shift) {
      query.shift = shift;
    } else {
      query.shift = currentShift;
    }

    if (role === "Auditor") {
      query.username = req.user.username;
    } else {
      if (username) query.username = username;
    }

    const plans = await Planning.find(query).populate({
      path: "plans",
      populate: {
        path: "tasks",
        model: "Task",
        select: "_id category sequence task",
        options: { lean: true },
        transform: doc => {
          doc.result = "NA";
          return doc;
        }
      }
    });

    const resultFilter = {
      week: week ? week : currentWeek,
      date: date ? date : currentDate,
      shift: shift ? shift : currentShift,
    };
    const crewsResults = await Result.find(resultFilter).populate({
      path: "tasks.taskId",
      model: "Task"
    });


    // Map results to tasks
    const plansWithResults = plans.map(plan => {
      plan.plans = plan.plans.map(crewPlan => {
        const crewResults = crewsResults.find(cr => cr.crew === crewPlan.crew);
        if (crewResults) {
          crewPlan.tasks = crewPlan.tasks.map(task => {
            const taskResult = crewResults.tasks.find(t => t.taskId._id.toString() === task._id.toString());
            return { ...task, result: taskResult ? taskResult.result : "NA" };
          });
        }
        return crewPlan;
      });
      return plan;
    });

    res.status(200).json(plansWithResults);
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
      // Filter out plans with empty tasks
      const validCrews = plans.filter(crew => crew.tasks && crew.tasks.length > 0);

      if (validCrews.length > 0) {
        // Create a new plan with valid crews
        const newPlan = new Planning({ username, week, shift, plans: validCrews });
        const result = await newPlan.save();
        return res.status(201).json({ message: "Planning data created.", data: result });
      } else {
        return res.status(400).json({ message: "No valid plans with tasks to add." });
      }
    } else {
      // Filter and update existing crews or append new ones
      const updatedCrews = existingPlan.plans.filter(ec => {
        const incomingCrew = plans.find(c => c.crew === ec.crew);
        return !(incomingCrew && incomingCrew.tasks.length === 0);
      });

      plans.forEach(crew => {
        if (crew.tasks && crew.tasks.length > 0) {
          const index = updatedCrews.findIndex(c => c.crew === crew.crew);
          if (index === -1) {
            updatedCrews.push(crew); // Append new crew
          } else {
            updatedCrews[index].tasks = crew.tasks; // Update existing crew's tasks
          }
        }
      });

      // Update the document
      existingPlan.plans = updatedCrews;
      existingPlan.shift = shift;
      const result = await existingPlan.save();

      return res.status(200).json({ message: "Planning data updated.", data: result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
