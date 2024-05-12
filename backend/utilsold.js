const fs = require('fs');
const User = require("./Models/User");
const AccessLogData = require('./Models/AccessLogData');
const colorLib = require('@kurkle/color');

const bcrypt = require("bcryptjs");

const multer = require("multer");
const ExcelJS = require("exceljs");
const xlsx = require("xlsx");

const { roleCheck } = require("./middlewares/roleCheck");
const EmployeeData = require('./Models/EmployeeData');

const upload = multer({ dest: "uploads/" });


async function getCurrentShiftUser() {
  const currentHour = new Date().getHours();
  let username;
  if (currentHour >= 6 && currentHour < 14) {
    username = "M";
  } else if (currentHour >= 14 && currentHour < 22) {
    username = "S";
  } else {
    username = "N";
  }
  return await User.findOne({ username: username });
}

const getCurrentShift = (InitialWeekNumber) => {
  const currentHour = new Date().getHours();
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const diff = new Date() - startOfYear;
  const oneDay = 86400000;
  const dayOfYear = Math.floor(diff / oneDay);
  const currentWeekOfYear = Math.ceil(dayOfYear / 7);

  const rotations = currentWeekOfYear - InitialWeekNumber;
  let shifts = ["M", "S", "N"];

  for (let i = 0; i < rotations; i++) {
    if (shifts[0] === "M") {
      shifts = ["N", "M", "S"];
    } else if (shifts[0] === "N") {
      shifts = ["S", "N", "M"];
    } else if (shifts[0] === "S") {
      shifts = ["M", "S", "N"];
    }
  }

  if (currentHour >= 6 && currentHour < 14) {
    return shifts[0];
  } else if (currentHour >= 14 && currentHour < 22) {
    return shifts[1];
  } else {
    return shifts[2];
  }
};

const getISOWeekNumber = (timestamp) => {
  const date = new Date(timestamp);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return weekNum;
};

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;

  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
    hours,
    minutes,
    seconds
  );
}

/**
 * Calculates the crews for a given shift based on the overtime (OT) schedule.
 * @param {Object} data - The main data object containing shiftData.
 * @return {Array} The list of crews.
 */
function getCrewsForShift(data) {
  const currentHour = new Date().getHours();
  const shiftType = currentHour >= 6 && currentHour < 18 ? 'M' : 'N';
  const InitialWeekNumber = getISOWeekNumber(data.updatedAt);
  const currentShift = getCurrentShift(InitialWeekNumber);
  let shiftData = data.shiftData.find(shift => shift.shift === currentShift);
  let crews = shiftData ? shiftData.crews : [];

  data.shiftData.forEach(shiftInfo => {
    if (shiftInfo.shift === shiftType) {
      shiftInfo.ot.forEach(ot => {
        const currentDate = new Date();
        let otStartDate = new Date(ot.startDate);
        let otEndDate = new Date(ot.endDate);

        if (shiftType === 'M') {
          otStartDate.setHours(6);
          otEndDate.setHours(18);
        } else if (shiftType === 'N') {
          otStartDate.setHours(18);
          otEndDate.setDate(otEndDate.getDate() + 1);
          otEndDate.setHours(6);
        }

        if (otStartDate <= currentDate && currentDate <= otEndDate) {
          crews.push(ot.crew);
        }
      });
    }
  });

  return [...new Set(crews)]; // Remove duplicates
}



// function generateBorderColor(name) {
//   let hash = 0;
//   for (let i = 0; i < name.length; i++) {
//     // Combine character code with its position and a larger multiplier
//     hash = name.charCodeAt(i) * (i + 1) * 19 + ((hash << 5) - hash);
//   }
//   const color = (hash & 0x00ffffff).toString(16).toUpperCase().padStart(6, "0");
//   return `#${color}`;
// }

// function generateBorderColor(name) {
//   // Predefined list of distinct colors
//   const colors = [
//     "#006B63", 
//     "#E5E1DA", 
//     "#4E7C88", 
//     "#929D96",
//     "#00AC9E",
//   ];

//   // Logic to determine the index based on the name
//   let uniquePart = name.slice(-1); // Assuming the unique identifier is the last character
//   let index;

//   // If the unique part is a letter, convert it to an index based on alphabetical order
//   if (uniquePart.match(/[A-Z]/i)) {
//     index = uniquePart.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
//   } else {
//     // Direct conversion if it's a number or fallback logic for other cases
//     index = parseInt(uniquePart, 10) || 0; // Using 0 as a fallback
//   }

//   // Calculate the color index using the determined index
//   let colorIndex = index % colors.length;

//   return colors[colorIndex];
// }

// function generateBorderColor(name) {
//   const colors = [
//     "#006B63",
//     "#E5E1DA",
//     "#4E7C88",
//     "#929D96",
//     "#00AC9E",
//   ];
//   let index = 0;
//   for (let i = 0; i < name.length; i++) {
//     const character = name[i];
//     if (character.match(/[A-Z]/i)) {
//       index += character.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
//     } else if (!isNaN(parseInt(character, 10))) {

//       index += parseInt(character, 10);
//     } else {
//       index += 1;
//     }
//   }
//   let colorIndex = index % colors.length;
//   return colors[colorIndex];
// }

function generateBorderColor(name) {
  // const COLORS = [ "#006B63", "#E5E1DA", "#4E7C88", "#929D96", "#00AC9E", ];
  // const COLORS = [ '#4dc9f6','#f67019', '#f53794', '#537bc4', '#acc236', '#166a8f', '#00a950', '#58595b', '#8549ba' ];
  const COLORS = ['#3BC6EB', '#00AC9E', '#FFA211', '#CF3335', '#6579E2'];

  let index = 0;
  for (let i = 0; i < name.length; i++) {
    const character = name[i];
    if (character.match(/[A-Z]/i)) {
      index += character.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    } else if (!isNaN(parseInt(character, 10))) {
      index += parseInt(character, 10);
    } else {
      index += 1;
    }
  }
  let colorIndex = index % COLORS.length;
  return COLORS[colorIndex];
}

function transparentize(name, opacity) {
  var alpha = opacity === undefined ? 0.5 : 1 - opacity;
  return colorLib(generateBorderColor(name)).alpha(alpha).rgbString();
}

function generateLabelFromId(id, timeFrame) {
  switch (timeFrame) {
    case "daily":
      return `Day ${id.day}`;
    case "monthly":
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return monthNames[id.month - 1];
    case "weekly":
      return `Week ${id.week}`;
    default:
      return "";
  }
}

function parseQueryParams(query) {
  const parseList = (value) =>
    value ? value.split(",").map((item) => item.trim()) : undefined;
  return {
    cableStatuses: parseList(query.cableStatus),
    crews: parseList(query.crews),
    problems: parseList(query.problems),
  };
}

function buildMatchQuery(cableStatuses, crews, problems, year, month) {
  const matchQuery = {};
  if (cableStatuses) {
    matchQuery.cableStatus = { $in: cableStatuses };
  }
  if (crews) {
    matchQuery.crew = { $in: crews };
  }
  if (problems) {
    matchQuery.problem = { $in: problems };
  }
  return matchQuery;
}

function calculateStartDate(timeFrame, year, month) {
  switch (timeFrame) {
    case "daily":
      return new Date(year, month - 1, 1);
    case "weekly":
    case "monthly":
    case "yearly":
      return new Date(year, 0, 1);
    default:
      throw new Error("Invalid time frame");
  }
}

function calculateEndDate(timeFrame, year, month) {
  switch (timeFrame) {
    case "daily":
    case "weekly":
      return new Date(year, month, 0);
    // return new Date(year, 12, 0); 
    case "monthly":
    case "yearly":
      return new Date(year, 11, 31);
    default:
      throw new Error("Invalid time frame");
  }
}


function getDateGroupingField(timeFrame) {
  switch (timeFrame) {
    case "daily":
      return "day";
    case "monthly":
      return "month";
    case "weekly":
      return "week";
    case "yearly":
      return "year";
    default:
      throw new Error("Invalid time frame");
  }
}

function buildAggregationQuery(matchQuery, chartType, timeFrame) {
  let dateGroupingField = getDateGroupingField(timeFrame);
  let date = dateGroupingField === "day" ? "dayOfMonth" : dateGroupingField;

  let initialGroup = {
    _id: {
      [dateGroupingField]: { [`$${date}`]: "$createdAt" },
      problem: "$problem",
      cableStatus: "$cableStatus",
      crew: "$crew",
    },
    count: { $sum: 1 },
  };
  const aggregationQuery = [
    { $match: matchQuery },
    ...(chartType === "problem" ? [{ $unwind: "$problem" }] : []),
    { $group: initialGroup },
    { $sort: { [`_id.${dateGroupingField}`]: 1, [`_id.${chartType}`]: 1 } },
    {
      $group: {
        _id: {
          [dateGroupingField]: `$_id.${dateGroupingField}`,
          [chartType]: `$_id.${chartType}`,
        },
        tooltips: {
          $push: {
            crew: {
              $cond: {
                if: { $ne: [chartType, "crew"] },
                then: "$_id.crew",
                else: "$$REMOVE",
              },
            },
            status: {
              $cond: {
                if: { $ne: [chartType, "cableStatus"] },
                then: "$_id.cableStatus",
                else: "$$REMOVE",
              },
            },
            count: "$count",
          },
        },
        total: { $sum: "$count" },
      },
    },
    { $sort: { [`_id.${chartType}`]: 1, [`_id.${dateGroupingField}`]: 1 } },
  ];

  return aggregationQuery;
}

function sortLabels(labels, timeFrame) {
  if (timeFrame === 'daily' || timeFrame === 'weekly') {
    // Sort numerically (e.g., Day 1, Day 2, ..., Day 31 or Week 1, Week 2, ...)
    return labels.sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
  } else if (timeFrame === 'monthly') {
    // Sort by month order
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return labels.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b));
  }
  // If the timeFrame does not match any case, return the labels unsorted (should not happen)
  return labels;
}

function transformResultsToDatasets(results, timeFrame, chartType) {
  const datasets = {};
  let labels = new Set();

  results.forEach((item) => {
    const name = item._id[chartType];
    const x = generateLabelFromId(item._id, timeFrame);
    const y = item.total;

    // Add x to labels set
    labels.add(x);

    if (!datasets[name]) {
      datasets[name] = {
        label: name,
        data: [],
        tooltips: {},
        backgroundColor: "#F84018",
        fill: false,
        tension: 0.3,
        backgroundColor: transparentize(name),
        borderColor: generateBorderColor(name),
        borderCapStyle: "round",
        borderWidth: 3,
        pointBackgroundColor: transparentize(name),
        pointBorderColor: generateBorderColor(name),
        pointBorderWidth: 6,
        pointHoverBackgroundColor: transparentize(name),
        pointHoverBorderColor: generateBorderColor(name),
        pointHoverRadius: 8,
        pointRadius: 1,
      };
    }

    datasets[name].data.push({ x, y });

    if (!datasets[name].tooltips[x]) {
      datasets[name].tooltips[x] = [];
    }

    item.tooltips.forEach((tooltip) => {
      const existingTooltipIndex = datasets[name].tooltips[x].findIndex(
        (t) => t.status === tooltip.status && t.crew === tooltip.crew
      );

      if (existingTooltipIndex >= 0) {
        // Tooltip with the same status and crew exists, update count
        datasets[name].tooltips[x][existingTooltipIndex].count += tooltip.count;
      } else {
        // New tooltip, push to array
        datasets[name].tooltips[x].push({
          status: tooltip.status,
          crew: tooltip.crew,
          count: tooltip.count,
        });
      }
    });
  });
  // Convert labels set to array
  labels = [...labels]
  labels = sortLabels(labels, timeFrame);

  return { labels, datasets: Object.values(datasets) };
}

async function handleChartRequest(req, res, chartType) {
  try {
    const { timeFrame, year, month } = req.query;
    let { cableStatuses, crews, problems } = parseQueryParams(req.query);
    const matchQuery = buildMatchQuery(
      cableStatuses,
      crews,
      problems,
      year,
      month
    );

    const startDate = calculateStartDate(timeFrame, year, month);
    const endDate = calculateEndDate(timeFrame, year, month);
    matchQuery.createdAt = { $gte: startDate, $lte: endDate };

    const aggregationQuery = buildAggregationQuery(
      matchQuery,
      chartType,
      timeFrame
    );

    const results = await RepairData.aggregate(aggregationQuery);
    const { labels, datasets } = transformResultsToDatasets(results, timeFrame, chartType);


    res.status(200).json({ labels, datasets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function formatIPAddress(ip) {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

function safelyStringifyJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return 'Unable to stringify request body';
  }
}

async function log(req, user, message) {
  const clientIP = formatIPAddress(req.ip);
  const requestBody = safelyStringifyJson(req.body);

  // Save to file
  // const logEntry = `Date: ${new Date().toISOString()}, Username: ${user ? user.username : 'Unknown'}, isActive: ${user ? user.isActive : 'Unknown'}, Client IP: ${clientIP}, HTTP Method: ${req.method}, Request Path: ${req.originalUrl}, Request Body: ${requestBody}, Server Host: ${req.hostname}, Message: ${message}\n`;
  // fs.appendFile('log/access.log', logEntry, (err) => {if (err) {console.error('Error writing to log file', err);}});

  // Save to MongoDB
  const newAccessLogData = new AccessLogData({
    username: user ? user.username : 'Unknown',
    isActive: user ? user.isActive : 0,
    clientIP: clientIP,
    httpMethod: req.method,
    requestPath: req.originalUrl,
    requestBody: requestBody,
    serverHost: req.hostname,
    message: message
  });

  try {
    await newAccessLogData.save();
  } catch (error) {
    console.error('Error saving log data to MongoDB', error);
  }
}

const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return `${date.getFullYear()}-W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
};

// const fetchTaskDetails = async (taskIds) => {
//   return Promise.all(taskIds.map(id => TaskData.findById(id)));
// };


module.exports = {
  getCurrentShift,
  excelDateToJSDate,
  parseQueryParams,
  getWeekNumber,
};
