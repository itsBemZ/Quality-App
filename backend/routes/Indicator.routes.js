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

    res.status(200).json(ftqData);
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

module.exports = router;
