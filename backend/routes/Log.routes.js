const express = require("express");
const router = express.Router();

const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const Log = require("../models/Log.model");

const { roleCheck } = require("../middlewares/roleCheck");

// Log routes

// Get all logs
router.get("/export/excel/", roleCheck(["Root"]), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      username,
      isActive,
      clientIP,
      message,
      httpMethod,
      requestPath,
      requestBody,
      responseStatus,
      responseTime,
      contentLength,
      referrer,
      userAgent,
      serverHost,
      serverPort,
      limit = 100000,
      sortField = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (username) query.username = username;
    if (isActive !== undefined) query.isActive = isActive;
    if (clientIP) query.clientIP = clientIP;
    if (message) query.message = message;
    if (httpMethod) query.httpMethod = httpMethod;
    if (requestPath) query.requestPath = requestPath;
    if (requestBody) query.requestBody = requestBody;
    if (responseStatus) query.responseStatus = responseStatus;
    if (responseTime) query.responseTime = responseTime;
    if (contentLength) query.contentLength = contentLength;
    if (referrer) query.referrer = referrer;
    if (userAgent) query.userAgent = userAgent;
    if (serverHost) query.serverHost = serverHost;
    if (serverPort) query.serverHost = serverPort;

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

    const data = await Log.find(query).sort(sortOptions).limit(parseInt(limit, 10)).exec();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Log-Data");

    const headerGroups = [
      { name: "Personnel Informations", span: 7 },
      { name: "Request Details", span: 9 },
    ];

    sheet.columns = [
      // Personnel Informations
      { header: "Created At", key: "createdAt" },
      { header: "Time", key: "time" },
      { header: "Username", key: "username" },
      { header: "Is Active", key: "isActive" },
      { header: "Client IP", key: "clientIP" },
      { header: "Message", key: "message" },
      { header: "User Agent", key: "userAgent" },
      // Request Details
      { header: "HTTP Method", key: "httpMethod" },
      { header: "Request Path", key: "requestPath" },
      { header: "Request Body", key: "requestBody" },
      { header: "Response Status", key: "responseStatus" },
      { header: "Response Time", key: "responseTime" },
      { header: "Content Length", key: "contentLength" },
      { header: "Referrer", key: "referrer" },
      { header: "Server Host", key: "serverHost" },
      { header: "Server Port", key: "serverPort" },
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
    res.setHeader("Content-Disposition", `attachment; filename="Log.xlsx"`);

    await workbook.xlsx.write(res);

    // await workbook.xlsx.writeFile("excel/Log.xlsx").then(() => console.log("Export complete.")).catch((error) => console.error("Something went wrong:", error));

    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
