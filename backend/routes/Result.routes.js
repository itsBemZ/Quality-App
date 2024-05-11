const express = require("express");
const router = express.Router();

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const Location = require("../models/Location.model");
const Planning = require("../models/Planning.model");
const Result = require("../models/Result.model");
const Task = require("../models/Task.model");

const { roleCheck } = require("../middlewares/roleCheck");
const { getWeekNumber } = require("../utils");

const upload = multer({ dest: "uploads/" });

// router

router.post("/", roleCheck(["Auditor", "Root"]), async (req, res) => {
  try {
    const { crew, taskId, shift, result } = req.body;
    const username = req.user.username;

    const currentDate = new Date();
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    date.setHours(date.getHours() + 1);
    const week = getWeekNumber(date);

    if (req.user.role === "Auditor") {
      const username = req.user.username;
    }
  else{
    const username = "41";
  }

    const planning = await Planning.findOne({ week: week, shift: shift, username: username });
    if (!planning) {
      return res.status(404).json({ message: `No planning found for week: ${week} and shift: ${shift} of ${username} User` });
    }

    const locationData = await Location.findOne({ crew });
    if (!locationData) {
      return res.status(404).json({ message: `No location data found for crew: ${crew}` });
    }

    const taskData = await Task.findById(taskId);
    // const { category, sequence, task } = taskData;
    if (!taskData) {
      return res.status(404).json({ message: `Task with ID ${taskId} not found` });
    }

    const { project, family, line, } = locationData;

    const filter = { date, shift, crew };
    console.log(filter);
    const resultWithTaskId = await Result.findOne(filter, { tasks: { $elemMatch: { taskId } } });

    // console.log(resultWithTaskId);
    if (resultWithTaskId && resultWithTaskId.tasks.length > 0) {
      resultWithTaskId.tasks[0].result = result;
      resultWithTaskId.tasks[0].username = username;
      resultWithTaskId.save();
      res.status(200).json(resultWithTaskId);
    } else {
      console.log("im here");
      // Task with taskId doesn't exist, add new task
      const update = {
        week,
        project,
        family,
        line,
        $addToSet: {
          tasks: { taskId: taskId, result: result, username: username }
        }
      };
      const options = { upsert: true, new: true };
      const updatedResult = await Result.findOneAndUpdate(filter, update, options);
      res.status(200).json(updatedResult);
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, role } = req.user;
    const { week, date, startDate, endDate, shift, project, family, line, crew, tasks, user } = req.body;

    const query = {};

    if (week) query.week = week;
    if (date) query.date = date;
    if (shift) query.shift = shift;
    if (project) query.project = project;
    if (family) query.family = family;
    if (line) query.line = line;
    if (crew) query.crew = crew;
    if (tasks) {
      query["tasks.taskId"] = { $in: tasks };
    }
    if (user) query.user = user;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const sortCriteria = {
      week: 1,
      date: 1,
      project: 1,
      family: 1,
      line: 1,
      crew: 1,
    };

    const data = await Result.find(query).sort(sortCriteria).exec();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
