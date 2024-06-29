const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const { roleCheck } = require("../middlewares/roleCheck");
const { excelDateToJSDate } = require("../utils");
const upload = multer({ dest: "uploads/" });

const Target = require("../models/Target.model");
const Volume = require("../models/Volume.model");
const FTQ = require("../models/FTQ.model");
const AB = require("../models/AB.model");
const Crew = require("../models/Crew.model");

// Import routes

// Import from an Excel file
router.post(
  "/excel/crew/",
  roleCheck(["Root", "Viewer"]),
  upload.single("excel"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel file." });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets["CREW"];
      const xlsCrew = xlsx.utils.sheet_to_json(worksheet);

      const xlsCrewResults = [];

      for (const row of xlsCrew) {
        const project = row["Project"];
        const family = row["Family"];
        const crew = row["Crew"];
        if (crew) {
          const crewData = {
            project,
            family,
            crew,
          };
          const crewDB = await Crew.findOneAndUpdate(
            { crew },
            { $set: crewData },
            { new: true, upsert: true }
          );
          xlsCrewResults.push(crewDB);
        }
      }
      res.status(201).json(xlsCrewResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/excel/target/",
  roleCheck(["Root", "Viewer"]),
  upload.single("excel"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel file." });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets["TARGET"]; // Assuming the data is in the first worksheet
      const xlsTarget = xlsx.utils.sheet_to_json(worksheet);

      const xlsTargetResults = [];

      for (const row of xlsTarget) {
        const type = row["Type"];
        const project = row["Project"];
        const target = row["Target"];
        for (let month = 1; month <= 12; month++) {
          const monthKey = month.toString();
          let value = row[monthKey] || 0;

          // Check if the value is not a number or if it's null or undefined, and set it to 0
          if (isNaN(value) || value === null || value === undefined) {
            value = 0;
          }
          if (type && project && target) {
            // Update or create Target
            const targetData = {
              type,
              project,
              month,
              target,
              value,
            };

            const targetDB = await Target.findOneAndUpdate(
              { type, project, month, target },
              { $set: targetData },
              { new: true, upsert: true }
            );
            xlsTargetResults.push(targetDB);
          }
        }
      }

      res.status(201).json(xlsTargetResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/excel/volume/",
  roleCheck(["Root", "Viewer"]),
  upload.single("excel"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel file." });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets["VOLUME"];
      const xlsVolume = xlsx.utils.sheet_to_json(worksheet);

      const xlsVolumeResults = [];

      for (const row of xlsVolume) {
        const project = row["Project"];
        const family = row["Family"];
        const crew = row["Crew"];

        const dates = Object.keys(row).filter(
          (key) => key !== "Project" && key !== "Family" && key !== "Crew"
        );

        for (const dateKey of dates) {
          const dateValue = row[dateKey];
          let volume = 0;

          if (!isNaN(dateValue)) {
            volume = parseFloat(dateValue);
          }
          const date = new Date(dateKey);

          if (
            project &&
            family &&
            crew &&
            date instanceof Date &&
            !isNaN(date.getTime())
          ) {
            // Update or create Volume
            const volumeData = {
              project,
              family,
              crew,
              date,
              volume,
            };

            const volumeDB = await Volume.findOneAndUpdate(
              { project, family, crew, date },
              { $set: volumeData },
              { new: true, upsert: true }
            );
            xlsVolumeResults.push(volumeDB);
          }
        }
      }

      res.status(201).json(xlsVolumeResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/excel/ab/",
  roleCheck(["Root", "Viewer"]),
  upload.single("excel"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel file." });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets["AB"];
      const xlsAB = xlsx.utils.sheet_to_json(worksheet);

      const xlsABResults = [];

      for (const row of xlsAB) {
        const project = row["Project"];
        const family = row["Family"];
        const crew = row["Equipe"];
        const poste = row["Workstation"] ?? "";
        const week = row["Wk"];
        const date = row["Absent To"];
        const month = row["MONTH"];
        const matricule = row["Mle"] ?? "";
        const reason = row["Reason"] ?? "";
        const newDate = excelDateToJSDate(date);

        const ab = new AB({
          project,
          family,
          crew,
          poste,
          week,
          date: newDate,
          month,
          matricule,
          reason,
        });
        await ab.save();

        // const query = {
        //   project,
        //   family,
        //   crew,
        //   poste,
        //   week,
        //   date: newDate,
        //   month,
        //   matricule,
        //   reason,
        // };

        // const ab = await AB.findOneAndUpdate(query, query, { new: true, upsert: true });
        xlsABResults.push(ab);
      }

      res.status(201).json(xlsABResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/excel/ftq/",
  roleCheck(["Root", "Viewer"]),
  upload.single("excel"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel file." });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets["FTQ"];
      const xlsFTQ = xlsx.utils.sheet_to_json(worksheet);

      const xlsFTQResults = [];

      for (const row of xlsFTQ) {
        const source = row["Source"];
        const project = row["Projet"];
        const family = row["Famille"];
        const date = row["Date"];
        const week = row["Semaine"];
        const month = new Date(row["Date"]).getMonth() + 1;
        const crew = row["Équipe"];
        const shift = row["Shift"];
        const cableType = row["Type Câble"] ?? "";
        const problem = row["Anomalie"] ?? "";
        const poste = row["POSTE"] ?? "";
        const connector = row["Connecteur"] ?? "";
        const voie = String(row["Voie"] ?? "");
        const details = row["Détails"] ?? "";
        const newDate = excelDateToJSDate(date);

        const ftq = new FTQ({
          source,
          project,
          family,
          date: newDate,
          week,
          crew,
          shift,
          cableType,
          problem,
          poste,
          connector,
          voie,
          details,
        });
        await ftq.save();

        // const query = {
        //   source,
        //   project,
        //   family,
        //   date: newDate,
        //   week,
        //   crew,
        //   shift,
        //   cableType,
        //   problem,
        //   poste,
        //   connector,
        //   voie,
        //   details,
        // };

        // const ftq = await FTQ.findOneAndUpdate(query, query, { new: true, upsert: true });

        xlsFTQResults.push(ftq);
      }

      res.status(201).json(xlsFTQResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
