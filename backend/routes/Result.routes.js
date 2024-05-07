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
// const { getWeekNumber } = require("../utils");

const upload = multer({ dest: "uploads/" });

// router

router.post("/", roleCheck(["Auditor", "Root"]), async (req, res) => {
  try {
    const { date, shift, crew, tasks } = req.body;
    const user = req.user.username;

    // Convert string date to Date object
    const dateObj = new Date(date);
    const week = getWeekNumber(dateObj);

    // Fetch location information based on the crew
    const locationData = await LocationData.findOne({ crew });
    if (!locationData) {
      return res
        .status(404)
        .json({ message: "No location data found for the given crew." });
    }

    // Extract project, family, and line from locationData
    const { project, family, line } = locationData;

    const planningData = await Planning.findOne({ week });
    if (!planningData) {
      return res
        .status(404)
        .json({ message: "No planning data found for the given crew." });
    }

    // Check if the user has a plan on that crew and shift
    const hasPlan =
      planningData.crews.some(
        (c) => c.crew === crew && c.users.includes(user)
      ) &&
      planningData.shifts.some(
        (s) => s.shift === shift && s.users.includes(user)
      );

    if (!hasPlan) {
      return res
        .status(404)
        .json({
          message:
            "No plan found for this user with the specified crew and shift.",
        });
    }

    // Fetch task details for each taskId
    const taskDetails = await Promise.all(
      tasks.map(async ({ taskId, result }) => {
        const taskData = await TaskData.findById(taskId);
        if (!taskData) {
          throw new Error(`Task with ID ${taskId} not found`);
        }
        return {
          taskId: taskData._id,
          task: taskData.task,
          category: taskData.category,
          sequence: taskData.sequence,
          result: result,
        };
      })
    );

    // Find the document or create a new one if it doesn't exist
    const existingResult = await ResultData.findOne({ date, shift, crew });

    if (existingResult) {
      // Merge tasks: update existing tasks or push new tasks
      const updatedTasks = taskDetails
        .map((newTask) => {
          const existingTaskIndex = existingResult.tasks.findIndex((t) =>
            t.taskId.equals(newTask.taskId)
          );
          if (existingTaskIndex > -1) {
            existingResult.tasks[existingTaskIndex] = newTask; // Update existing task
            return null; // Return null to filter out later
          } else {
            return newTask; // Return new task to be added
          }
        })
        .filter((task) => task !== null); // Filter out nulls (updated tasks)

      // Update the document with new and updated tasks
      existingResult.tasks.push(...updatedTasks);
      existingResult.week = week;
      existingResult.project = project;
      existingResult.family = family;
      existingResult.line = line;
      existingResult.user = user;
      await existingResult.save();
    } else {
      // Create a new document if not found
      const resultData = new ResultData({
        week,
        date,
        shift,
        project,
        family,
        line,
        crew,
        tasks: taskDetails,
        user,
      });
      await resultData.save();
      res.status(201).json(resultData);
      return;
    }

    res.status(200).json(existingResult);
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

    const data = await ResultData.find(query).sort(sortCriteria).exec();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
