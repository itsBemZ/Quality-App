const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const User = require("../models/User.model");
const Location = require("../models/Location.model");
const Task = require("../models/Task.model");
const Planning = require("../models/Planning.model");
const Result = require("../models/Result.model");
const Log = require("../models/Log.model");

const { roleCheck } = require("../middlewares/roleCheck");

const upload = multer({ dest: "uploads/" });

// router

router.delete("/user/:id", roleCheck(["Root"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "Root") {
      return res.status(403).json({ message: "Cannot delete Root user" });
    } else {
      await User.deleteOne({ _id: req.params.id });
      return res.status(200).json({ message: "User deleted successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import/users/excel", upload.single("excel"), roleCheck(["Root"]), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload an Excel file." });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;
    const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
    const results = [];

    for (const row of xlsData) {
      if (row["MLLE"] && row["ROLE"]) {
        const username = row["MLLE"].toString();
        const fullname = row["FULLNAME"] ? row["FULLNAME"].toString() : "";
        const role = row["ROLE"].toString();
        let message = "";

        // Check for invalid roles
        if (!["Auditor", "Supervisor", "Viewer"].includes(role)) {
          message = `Invalid role for user ${username}`;
          //log
          results.push({ username, error: message });
          continue;
        }

        // Check if user already exists
        let user = await User.findOne({ username: username });
        if (user) {
          message = `User ${username} with ${user.role} Role already exists`;
          //log
          results.push({ username, error: message });
          continue;
        }

        // Create user
        const hashedPassword = await bcrypt.hash(username, 10);
        user = new User({
          username: username,
          fullname: fullname,
          role: role,
          password: hashedPassword,
        });

        await user.save();
        message = `User ${username} created successfully`;
        //log
        results.push({ username, message: message });
      }
    }
    res.status(201).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import/locations/excel", upload.single("excel"), roleCheck(["Root"]), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload an Excel file." });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;
    const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[1]]);
    const results = [];

    // Process each row of the Excel sheet
    for (const row of xlsData) {
      const { PROJECT, FAMILY, LINE, CREW } = row;

      // Check for the existence of the project and create if it doesn't exist
      let location = await Location.findOne({
        project: PROJECT,
        crew: CREW,
      });

      if (!location) {
        location = new Location({
          project: PROJECT,
          family: FAMILY,
          line: LINE,
          crew: CREW,
        });
        await location.save();
        results.push({
          location,
          message: "Created new location successfully.",
        });
      } else {
        // Project exists, update other fields if necessary
        let updateNeeded = false;

        if (location.family !== FAMILY) {
          location.family = FAMILY;
          updateNeeded = true;
        }

        if (location.line !== LINE) {
          location.line = LINE;
          updateNeeded = true;
        }

        if (location.crew !== CREW) {
          location.crew = CREW;
          updateNeeded = true;
        }

        if (updateNeeded) {
          await location.save();
          results.push({
            location,
            message: "Updated location successfully.",
          });
        } else {
          results.push({
            location,
            message: "No updates required for this location.",
          });
        }
      }
    }

    res.status(201).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import/tasks/excel", upload.single("excel"), roleCheck(["Root"]), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload an Excel file." });
  }
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;
    const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[2]]);
    const results = [];

    for (const row of xlsData) {
      const { CATEGORY, SEQUENCE, TASK } = row;

      const taskData = await Task.findOneAndUpdate({ category: CATEGORY, sequence: SEQUENCE }, { task: TASK }, { new: true, upsert: true });

      results.push(taskData);
    }

    res.status(201).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export/accesslog/excel/", roleCheck(["Root"]), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      username,
      isActive,
      clientIP,
      httpMethod,
      requestPath,
      requestBody,
      serverHost,
      message,
      limit = 100000,
      sortField = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (isActive !== undefined) query.isActive = isActive;
    if (username) query.username = username;
    if (clientIP) query.clientIP = clientIP;
    if (httpMethod) query.httpMethod = httpMethod;
    if (requestPath) query.requestPath = requestPath;
    if (requestBody) query.requestBody = requestBody;
    if (serverHost) query.serverHost = serverHost;
    if (message) query.message = message;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    let sortOptions = {};
    if (["asc", "desc"].includes(sortOrder.toLowerCase())) {
      sortOptions[sortField] = sortOrder.toLowerCase() === "asc" ? 1 : -1;
    } else {
      return res.status(400).json({ error: "Invalid sort order" });
    }

    const data = await AccessLogData.find(query).sort(sortOptions).limit(parseInt(limit, 10)).exec();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Access Log Data");

    const headerGroups = [
      { name: "Personnel Informations", span: 6 },
      { name: "Request Details", span: 4 },
    ];

    sheet.columns = [
      // Personnel Informations
      { header: "Created At", key: "createdAt" },
      { header: "Time", key: "time" },
      { header: "Username", key: "username" },
      { header: "Is Active", key: "isActive" },
      { header: "Client IP", key: "clientIP" },
      { header: "Message", key: "message" },
      // Request Details
      { header: "HTTP Method", key: "httpMethod" },
      { header: "Request Path", key: "requestPath" },
      { header: "Request Body", key: "requestBody" },
      { header: "Server Host", key: "serverHost" },
    ];

    const applyHeaderGroups = (worksheet, groups) => {
      let currentColumn = 1;
      groups.forEach((group) => {
        const startColumn = currentColumn;
        const endColumn = currentColumn + group.span - 1;
        worksheet.mergeCells(1, startColumn, 1, endColumn);
        worksheet.getCell(1, startColumn).value = group.name;
        worksheet.getCell(1, startColumn).alignment = {
          horizontal: "center",
        };
        worksheet.getCell(1, startColumn).font = { bold: true, size: 14 };
        worksheet.getCell(1, startColumn).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFF00" },
        };
        currentColumn += group.span;
      });
    };

    applyHeaderGroups(sheet, headerGroups);

    const tableRows = data.map((item) => {
      if (item.createdAt) {
        const [datePart, timePart] = item.createdAt.toISOString().split("T");
        item.createdAt = datePart;
        item.time = timePart.split(".")[0];
      }
      return sheet.columns.map((column) => item[column.key]);
    });

    const getMaxColumnLengths = (worksheet, tableRows) => {
      const maxLengths = [];

      worksheet.columns.forEach((column, index) => {
        maxLengths[index] = column.header.length;
      });

      tableRows.forEach((row) => {
        row.forEach((cell, index) => {
          if (cell instanceof Date) {
            maxLengths[index] = Math.max(maxLengths[index], 10);
          } else if (cell != null) {
            const cellLength = cell.toString().replace(/\s/g, "").length;
            if (cellLength > maxLengths[index]) {
              maxLengths[index] = cellLength;
            }
          }
        });
      });

      return maxLengths;
    };

    const maxColumnLengths = getMaxColumnLengths(sheet, tableRows);

    sheet.columns.forEach((column, index) => {
      column.width = maxColumnLengths[index] + 6;
      const cell = sheet.getCell(2, index + 1);
      cell.value = column.header;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    });

    sheet.getRow(2).font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" },
    };

    const borderStyle = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    sheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
      row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
        cell.border = borderStyle;
      });
    });

    const tableName = "AccessLogDataTable";
    const table = {
      name: tableName,
      ref: "A2",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true,
      },
      columns: sheet.columns.map((column) => ({
        name: column.header,
        filterButton: true,
      })),
      rows: tableRows,
    };
    sheet.addTable(table);

    function getFillColor(httpMethod, isActive) {
      let fill;
      let color = "000000";

      if (httpMethod === "GET") {
        fill = "00AC9E";
      } else if (httpMethod === "POST") {
        fill = "6579E2";
      } else if (httpMethod === "PUT") {
        fill = "FFA211";
      } else if (httpMethod === "DELETE") {
        fill = "CF3335";
      } else if (httpMethod === "PATCH") {
        fill = "4E7C88";
      } else if (httpMethod === "OPTIONS") {
        fill = "929D96";
      } else if (httpMethod === "HEAD") {
        fill = "E5E1DA";
        color = "343a40";
      }
      if (!isActive) {
        fill = "#343a40";
        color = "CED4DA";
      }

      return fill ? { fill, color } : null;
    }

    sheet.eachRow(function (row, rowNumber) {
      if (rowNumber <= 2) return;
      const httpMethodCell = row.getCell(sheet.columns.findIndex((col) => col.key === "httpMethod") + 1);
      const isActiveCell = row.getCell(sheet.columns.findIndex((col) => col.key === "isActive") + 1);

      const fillColor = getFillColor(httpMethodCell.value, isActiveCell.value);
      if (fillColor) {
        row.eachCell({ includeEmpty: true }, function (cell) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor.fill },
          };
          cell.font = { color: { argb: fillColor.color } };
        });
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Access-Log.xlsx"`);

    await workbook.xlsx.write(res);
    
    // await workbook.xlsx.writeFile("excel/Access-Log.xlsx").then(() => console.log("Export complete.")).catch((error) => console.error("Something went wrong:", error));
    
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



// router.post("/import/planning/excel", upload.single("excel"), roleCheck(["Root"]), async (req, res) => {
  //   const week = req.query.week;
  
  //   if (!week) {
    //     return res.status(400).json({ error: "Week parameter is required." });
//   }

//   // Example validation for week format 'YYYY-WW'
//   const weekRegex = /^\d{4}-W\d{2}$/;
//   if (!weekRegex.test(week)) {
//     return res.status(400).json({ error: "Invalid week format. Please use 'YYYY-WW' format." });
//   }

//   if (!req.file) {
//     return res.status(400).json({ error: "Please upload an Excel file." });
//   }

//   try {
//     const workbook = xlsx.readFile(req.file.path);
//     const sheetNames = workbook.SheetNames;
//     const xlsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[1]]);
//     const planningResults = [];

//     let planningData = await PlanningData.findOne({ week: week });
//     if (!planningData) {
//       planningData = new PlanningData({
//         week: week,
//         shifts: [],
//         crews: [],
//       });
//     }

//     for (const row of xlsData) {
//       const { CREW, AUDITOR, SHIFT } = row;
//       const auditorIds = AUDITOR.split(",").map((id) => id.trim());

//       let existingCrew = planningData.crews.find((c) => c.crew === CREW);
//       if (existingCrew) {
//         existingCrew.users = Array.from(new Set([...existingCrew.users, ...auditorIds]));
//       } else {
//         planningData.crews.push({
//           crew: CREW,
//           users: auditorIds,
//         });
//       }

//       let existingShift = planningData.shifts.find((s) => s.shift === SHIFT);
//       if (existingShift) {
//         existingShift.users = Array.from(new Set([...existingShift.users, ...auditorIds]));
//       } else {
//         planningData.shifts.push({
//           shift: SHIFT,
//           users: auditorIds,
//         });
//       }
//     }

//     await planningData.save();
//     planningResults.push(planningData);

//     res.status(201).json({ planningResults });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


