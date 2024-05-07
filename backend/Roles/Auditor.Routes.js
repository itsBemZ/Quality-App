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

const { excelDateToJSDate, log, getWeekNumber } = require("../utils");
const { roleCheck } = require("../middlewares/roleCheck");

const upload = multer({ dest: "uploads/" });

// router

router.post("/result/", roleCheck(["Auditor", "Root"]), async (req, res) => {
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

    const planningData = await PlanningData.findOne({ week });
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

module.exports = router;
