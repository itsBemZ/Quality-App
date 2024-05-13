const express = require("express");
const router = express.Router();


const Planning = require("../models/Planning.model");
const Result = require("../models/Result.model");
const Task = require("../models/Task.model");


const { roleCheck } = require("../middlewares/roleCheck");
const { getWeekNumber, getShift, getShiftDate } = require("../utils");

// Planning routes

// Get  planning
router.get("/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { role } = req.user;
    const { username, week, date, shift } = req.query;

    const missingFields = [];
    if (role !== "Auditor") {
      if (!week) missingFields.push("week");
      if (!date) missingFields.push("date");
      if (!shift) missingFields.push("shift");
    }

    if (missingFields.length > 0) {
      res.locals.message = "Missing required fields: " + missingFields.join(", ");
      return res.status(400).json({ message: res.locals.message });
    }

    const currentHour = new Date().getHours();
    const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const currentShiftDate = getShiftDate(currentHour, currentDate);
    const currentShift = getShift(currentHour);
    const currentWeek = getWeekNumber(currentShiftDate);
    const dateFromat = new Date(date);

    const resultFilter = {};
    const planningFilter = {};

    if (role === "Auditor") {
      planningFilter.username = req.user.username;
      planningFilter.week = currentWeek;
      resultFilter.date = currentShiftDate;
      // planningFilter.shift = currentShift;
      // resultFilter.shift = currentShift;
    } else {
      if (username) planningFilter.username = username;
      planningFilter.week = week;
      if (shift) planningFilter.shift = shift;
      resultFilter.date = dateFromat;
      // resultFilter.shift = shift;
    }

    const plans = await Planning.find(planningFilter).populate({
      path: "tasks",
      model: "Task",
      select: "_id category sequence task",
      options: { lean: true },
      // transform: doc => {
      //   doc.result = "NA";
      //   return doc;
      // }
    });

    console.log(plans);

    const crewsResults = await Result.find(resultFilter);
    console.log("crewsResults", crewsResults);
    const plansWithResults = plans.map(crewPlan => {
      const crewResults = crewsResults.find(cr => cr.crew === crewPlan.crew && cr.shift === crewPlan.shift);
      if (crewResults) {
        crewPlan.tasks = crewPlan.tasks.map(task => {
          const taskResult = crewResults.tasks.find(t => t.taskId._id.toString() === task._id.toString());
          return { ...task, result: taskResult ? taskResult.result : "NA" };
        });
      }
      return crewPlan;
    });
    return res.status(200).json(plansWithResults);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a planning
router.post("/", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  try {
    const { username, week, shift, plans } = req.body;
    const updatedPlans = [];

    for (const plan of plans) {
      const filter = { week, username, crew: plan.crew };

      if (plan.tasks.length === 0) {
        await Planning.deleteOne(filter);
      } else {
        const update = { shift, tasks: plan.tasks };
        await Planning.updateOne(filter, update, { upsert: true });
        updatedPlans.push({ crew: plan.crew, tasks: plan.tasks });
      }
    }

    return res.status(200).json({ username, week, shift, plans: updatedPlans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
