const express = require("express");
const router = express.Router();

const Location = require("../models/Location.model");
const Planning = require("../models/Planning.model");
const Result = require("../models/Result.model");
const User = require("../models/User.model");
const Task = require("../models/Task.model");

const { roleCheck } = require("../middlewares/roleCheck");
const { getWeekNumber, getShift, getShiftDate } = require("../utils");


// Result routes

// Create a result
router.post("/", roleCheck(["Auditor", "Root"]), async (req, res) => {
  try {
    const { username, role } = req.user;
    const { date, shift, crew, taskId, result, user } = req.body;

    const missingFields = [];
    if (!crew) missingFields.push("crew");
    if (!taskId) missingFields.push("taskId");
    if (!result) missingFields.push("result");
    if (role !== "Auditor") {
      if (!username) missingFields.push("username");
      if (!shift) missingFields.push("shift");
      if (!date) missingFields.push("date");
    }

    if (missingFields.length > 0) {
      res.locals.message = "Missing required fields:" + missingFields.join(", ");
      return res.status(400).json({ message: res.locals.message });
    }

    const currentHour = new Date().getHours();
    const currentShift = getShift(currentHour);
    const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const currentShiftDate = getShiftDate(currentHour, currentDate);
    const currentShiftweek = getWeekNumber(currentShiftDate);
    const dateFromat = new Date(date);
    const week = getWeekNumber(dateFromat);

    const resultFilter = { crew: crew };
    const planningFilter = { crew: crew };
    planningFilter.tasks = { $in: [taskId] };

    if (role === "Auditor") {
      planningFilter.username = username;
      planningFilter.week = currentShiftweek;
      planningFilter.shift = currentShift;
      resultFilter.date = currentShiftDate;
      resultFilter.shift = currentShift;
    } else {
      planningFilter.username = user;
      planningFilter.week = week;
      planningFilter.shift = shift;
      resultFilter.date = dateFromat;
      resultFilter.shift = shift;
    }


    const planning = await Planning.findOne(planningFilter);
    if (!planning) {
      // You can customize the JSON response here
      res.locals.message = "No planning found for the specified criteria.";
      return res.status(404).json({
        message: res.locals.message,
        planningStatus: "Not Found"  // Specific value indicating not found status
      });
    }

    const locationData = await Location.findOne({ crew });
    if (!locationData) {
      res.locals.message = `No location data found for crew: ${crew}`;
      return res.status(404).json({ message: res.locals.message });
    }

    const { project, family, line, } = locationData;

    const resultWithTaskId = await Result.findOne(resultFilter, { tasks: { $elemMatch: { taskId } } });

    // console.log(resultWithTaskId);
    if (resultWithTaskId && resultWithTaskId.tasks.length > 0) {
      const update = {
        $set: {
          "tasks.$.result": result,
          "tasks.$.username": planningFilter.username
        }
      };
      const options = { new: true }; // Option to return the updated document
      const updatedResult = await Result.findOneAndUpdate({ _id: resultWithTaskId._id, "tasks.taskId": taskId }, update, options);
      res.status(200).json(updatedResult);
    } else {
      // Task with taskId doesn't exist, add new task
      const update = {
        week: planningFilter.week,
        date: resultFilter.date,
        project,
        family,
        line,
        $addToSet: {
          tasks: { taskId: taskId, result: result, username: planningFilter.username }
        }
      };
      const options = { upsert: true, new: true };
      const updatedResult = await Result.findOneAndUpdate(resultFilter, update, options);
      res.status(200).json(updatedResult);
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all results
router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, role } = req.user;
    const { week, startDate, endDate, date, shift, project, family, line, crew, tasks, user } = req.query;

    const matchQuery = {};

    if (date) matchQuery.date = date;
    if (shift) matchQuery.shift = shift;
    if (project) matchQuery.project = project;
    if (family) matchQuery.family = family;
    if (crew) matchQuery.crew = crew;
    if (tasks) {
      matchQuery["tasks.taskId"] = { $in: tasks };
    }

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) {
        const start = new Date(startDate);
        matchQuery.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.date.$lte = end;
      }
    }
    let supervisedUsernames = [];

    // Supervisor specific filter for tasks
    if (role === "Supervisor") {
      const supervisedUsers = await User.find({ belongTo: username }).select('username');
      supervisedUsernames = supervisedUsers.map(user => user.username); // Properly scoped within the try block
      matchQuery["tasks.username"] = { $in: supervisedUsernames };
    }
    console.log(supervisedUsernames);

    const sortCriteria = {
      week: 1,
      date: 1,
      project: 1,
      family: 1,
      line: 1,
      crew: 1,
    };

    const data = await Result.find(matchQuery).sort(sortCriteria).exec();

    let filteredData = data;
    
    // Apply task filtering only if the user is a Supervisor
    if (role === "Supervisor") {
      filteredData = data.map(doc => {
        doc.tasks = doc.tasks.filter(task => supervisedUsernames.includes(task.username));
        return doc;
      });
    }
    
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/rrr", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { week, startDate, endDate, date, shift, project, family, line, crew, tasks, username } = req.body;

    const matchQuery = {};

    // if (week) matchQuery.week = week;
    if (date) matchQuery.date = date;
    if (shift) matchQuery.shift = shift;
    if (project) matchQuery.project = project;
    if (family) matchQuery.family = family;
    // if (line) matchQuery.line = line;
    if (crew) matchQuery.crew = crew;
    if (tasks) {
      matchQuery["tasks.taskId"] = { $in: tasks };
    }
    if (username) {
      matchQuery["tasks.username"] = { $in: username };
    }

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) {
        const start = new Date(startDate);
        matchQuery.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.date.$lte = end;
      }
    }

    const aggregation = [
      { $match: matchQuery },
      { $unwind: "$tasks" },
      {
        $group: {
          _id: {
            project: "$project",
            family: "$family",
            crew: "$crew",
            result: "$tasks.result"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            project: "$_id.project",
            family: "$_id.family",
            crew: "$_id.crew"
          },
          results: {
            $push: {
              result: "$_id.result",
              count: "$count"
            }
          }
        }
      },
      {
        $sort: {
          "_id.project": 1,
          "_id.family": 1,
          "_id.crew": 1
        }
      }
    ];

    const data = await Result.aggregate(aggregation).exec();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
