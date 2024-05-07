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

router.get("/locations/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { project, family, line, crew } = req.body;

    const query = {};

    if (project) query.project = project;
    if (family) query.family = family;
    if (line) query.line = line;
    if (crew) query.crew = crew;

    const sortCriteria = { project: 1, family: 1, line: 1, crew: 1 };

    const data = await LocationData.find(query).sort(sortCriteria).exec();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/planning/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, role } = req.user;
    const { week, shift, project, family, line, crew, user } = req.body;
    const targetRole = "Auditor";

    if (!week) {
      return res.status(400).json({ error: "Week parameter is required." });
    }

    const planningData = await PlanningData.findOne({ week });
    if (!planningData) {
      return res.status(404).json({ error: "No planning data found for the given week." });
    }

    let usersInShift = [];
    if (shift) {
      const shiftData = planningData.shifts.find((s) => s.shift === shift);
      if (!shiftData) {
        return res.status(404).json({ error: "Shift does not exist." });
      }
      usersInShift = shiftData.users;
      if (!usersInShift.includes(username) && role === targetRole) {
        return res.status(403).json({ error: "User not authorized for this shift." });
      }
      if (!usersInShift.includes(user) && user) {
        return res.status(403).json({ error: "User not authorized for this shift." });
      }
    }

    const filterCrews = (crewCondition) => {
      return planningData.crews
        .filter(
          (crew) =>
            (!shift || role != targetRole || crew.users.some((user) => usersInShift.includes(user))) &&
            (role !== targetRole || crew.users.includes(username)) &&
            (!user || crew.users.includes(user)) &&
            (!crewCondition || crew.crew === crewCondition)
        )
        .map((crew) => crew.crew);
    };

    let crewsFilteredByUser = [];
    if (!crew) {
      crewsFilteredByUser = filterCrews();
    } else {
      const specificCrew = filterCrews(crew);
      if (specificCrew.length > 0) {
        crewsFilteredByUser = specificCrew;
      } else {
        return res.status(403).json({ error: "User not authorized for this crew." });
      }
    }

    let query = {};
    if (crewsFilteredByUser.length > 0) {
      query.crew = { $in: crewsFilteredByUser };
    }

    if (project) query.project = project;
    if (family) query.family = family;
    if (line) query.line = line;

    const sortCriteria = { project: 1, family: 1, line: 1, crew: 1 };
    const locationData = await LocationData.find(query).sort(sortCriteria).exec();

    if (locationData.length === 0) {
      return res.status(404).json({ error: "No matching location data found." });
    }

    const enhancedLocationData = await Promise.all(
      locationData.map(async (location) => {
        const crewInfo = planningData.crews.find((c) => c.crew === location.crew);
        const usersFiltered = crewInfo
          ? shift || username
            ? crewInfo.users.filter((u) => (!shift || usersInShift.includes(u)) && (!user || u === user))
            : crewInfo.users
          : [];
        return {
          ...location._doc,
          users: usersFiltered,
          isPlanned: crewInfo ? usersFiltered.length > 0 : false,
        };
      })
    );

    res.status(200).json(enhancedLocationData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/results/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
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

router.get("/tasks/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, role } = req.user;
    const { user, task, sequence, category } = req.body;

    const query = {};

    if (role === "Auditor") {
      query.users = username;
    } else if (user) {
      query.users = user;
    }

    if (task) query.task = task;
    if (sequence) query.sequence = sequence;
    if (category) query.category = category;

    const sortCriteria = { category: 1, sequence: 1 };

    const data = await TaskData.find(query).sort(sortCriteria).exec();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, fullname, email, isActive, notif, role } = req.body;

    const matchStage = {};
    if (username) matchStage.username = username;
    if (role) matchStage.role = role;
    if (fullname) matchStage.fullname = { $regex: fullname, $options: "i" };
    if (email) matchStage.email = { $regex: email, $options: "i" };
    if (isActive !== undefined) matchStage.isActive = isActive ? true : false;
    if (notif !== undefined) matchStage.notif = notif ? true : false;

    // Aggregate pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          sortUsername: {
            $convert: {
              input: "$username",
              to: "int",
              onError: "$username",
              onNull: "$username",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          fullname: 1,
          email: 1,
          role: 1,
          isActive: 1,
          notif: 1,
          tags: 1,
          sortUsername: 1,
        },
      },
      { $sort: { role: 1, sortUsername: 1 } },
      { $project: { sortUsername: 0 } }, // remove the sorting field from final output
    ];

    const users = await User.aggregate(pipeline).exec();
    const count = await User.countDocuments(matchStage);
    res.status(200).json({ usersCount: count, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
