const express = require("express");
const router = express.Router();


const { roleCheck } = require("../middlewares/roleCheck");

const Target = require("../models/Target.model");
const Volume = require("../models/Volume.model");
const FTQ = require("../models/FTQ.model");
const AB = require("../models/AB.model");

// Indicator routes

router.get("/target/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
      const targetData = await Target.find();

    res.status(200).json(targetData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/volume/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
      const volumeData = await Volume.find();

    res.status(200).json(volumeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ftq/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
      const ftqData = await FTQ.find();

    res.status(200).json(ftqData);j
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ab/", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
      const abData = await AB.find();

    res.status(200).json(abData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/chart-ftq-crew-month", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Date parameter is required in format YYYY-MM-DD" });
    }

    const queryDate = new Date(date);
    const year = queryDate.getFullYear();
    const month = queryDate.getMonth() + 1;

    const ftqData = await FTQ.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $year: "$date" }, year] },
              { $eq: [{ $month: "$date" }, month] }
            ]
          }
        }
      },
      {
        $group: {
          _id: { crew: "$crew", project: "$project", family: "$family" },
          ftqCount: { $sum: 1 }
        }
      },
      {
        $project: {
          crew: "$_id.crew",
          project: "$_id.project",
          family: "$_id.family",
          ftqCount: 1,
          _id: 0
        }
      },
      { $sort: { crew: 1 } }
    ]);

    const volumeData = await Volume.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $year: "$date" }, year] },
              { $eq: [{ $month: "$date" }, month] }
            ]
          }
        }
      },
      {
        $group: {
          _id: { crew: "$crew", family: "$family" },
          totalVolume: { $sum: "$volume" }
        }
      }
    ]);

    const targetData = await Target.find({ month, type: "FTQ" });

    const chartData = ftqData.map(ftq => {
      const volume = volumeData.find(v => v._id.crew === ftq.crew);
      const target = targetData.find(t => t.project === ftq.project && t.target === ftq.family);
      const ftqValue = volume && volume.totalVolume > 0 
        ? (ftq.ftqCount / volume.totalVolume) * 1000000 
        : 0;

      return {
        crew: ftq.crew,
        project: ftq.project,
        family: ftq.family,
        ftqCount: ftq.ftqCount,
        volume: volume ? volume.totalVolume : 0,
        ftq: ftqValue,
        target: target ? target.value : 0
      };
    });

    res.status(200).json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/chart-ftq-project-month", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Date parameter is required in format YYYY-MM-DD" });
    }

    const queryDate = new Date(date);
    const year = queryDate.getFullYear();
    const month = queryDate.getMonth() + 1;

    const ftqData = await FTQ.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $year: "$date" }, year] },
              { $eq: [{ $month: "$date" }, month] }
            ]
          }
        }
      },
      {
        $group: {
          _id: { project: "$project"},
          ftqCount: { $sum: 1 }
        }
      },
      {
        $project: {
          project: "$_id.project",
          ftqCount: 1,
          _id: 0
        }
      },
      { $sort: { project: 1 } }
    ]);

    const volumeData = await Volume.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $year: "$date" }, year] },
              { $eq: [{ $month: "$date" }, month] }
            ]
          }
        }
      },
      {
        $group: {
          _id: { project: "$project" },
          totalVolume: { $sum: "$volume" }
        }
      }
    ]);

    const targetData = await Target.find({ month, type: "FTQ" });

    const chartData = ftqData.map(ftq => {
      const volume = volumeData.find(v => v._id.project === ftq.project);
      const target = targetData.find(t => t.project === ftq.project && t.target === "Project");
      const ftqValue = volume && volume.totalVolume > 0 
        ? (ftq.ftqCount / volume.totalVolume) * 1000000 
        : 0;

      return {
        project: ftq.project,
        ftqCount: ftq.ftqCount,
        volume: volume ? volume.totalVolume : 0,
        ftq: ftqValue,
        target: target ? target.value : 0
      };
    });

    res.status(200).json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/chart-ftq-family-month", roleCheck(["Viewer", "Auditor", "Supervisor", "Root"]), async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Date parameter is required in format YYYY-MM-DD" });
    }

    const queryDate = new Date(date);
    const year = queryDate.getFullYear();
    const month = queryDate.getMonth() + 1;

    const ftqData = await FTQ.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $year: "$date" }, year] },
              { $eq: [{ $month: "$date" }, month] }
            ]
          }
        }
      },
      {
        $group: {
          _id: { project: "$project", family: "$family" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          project: "$_id.project",
          family: "$_id.family",
          count: 1,
          _id: 0
        }
      },
      { $sort: { project: 1, family: 1 } }
    ]);

    const targetData = await Target.find({ month, type: "FTQ" });

    const chartData = ftqData.map(ftq => {
      const target = targetData.find(t => t.project === ftq.project && t.target === ftq.family);
      return {
        project: ftq.project,
        family: ftq.family,
        ftqCount: ftq.count,
        target: target ? target.value : 0
      };
    });

    res.status(200).json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
