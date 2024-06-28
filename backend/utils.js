const moment = require('moment');


const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const methodColors = {
  GET: colors.blue,
  POST: colors.green,
  PUT: colors.yellow,
  DELETE: colors.red
};

const statusColors = {
  '2': colors.green, // 2xx
  '3': colors.cyan,  // 3xx
  '4': colors.red,   // 4xx
  '5': colors.magenta // 5xx
};

function getColorByMethod(method) {
  return methodColors[method] || colors.reset;
}

function getColorByStatus(status) {
  return statusColors[status.toString()[0]] || colors.reset;
}

function getColorByTime(time) {
  if (time < 100) {
    return colors.green;
  } else if (time < 500) {
    return colors.yellow;
  }
  return colors.red;
}

function getColorByLength(length) {
  const size = parseInt(length, 10);
  if (size < 500) {
    return colors.cyan;
  } else if (size < 5000) {
    return colors.blue;
  }
  return colors.magenta;
}

function getShiftDate(hour, date) {
  const shiftDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  if (hour >= 0 && hour < 6) {
    shiftDate.setDate(shiftDate.getDate() - 1);
  }
  return shiftDate;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return `${date.getFullYear()}-W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
}

function getShift(currentHour) {
  if (currentHour >= 6 && currentHour < 14) {
    return "morning";
  } else if (currentHour >= 14 && currentHour < 22) {
    return "evening";
  }
  return "night";
}

function formatIPAddress(ip) {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

function morganConsoleLog(method, status, responseTime, contentLength, username, clientIP, messageText, url) {
  const methodColor = getColorByMethod(method);
  const statusColor = getColorByStatus(parseInt(status, 10));
  const timeColor = getColorByTime(responseTime);
  const lengthColor = getColorByLength(contentLength);
  const reset = colors.reset;

  console.log(
    `${moment().format('llll')} | User: ${username} | IP: ${clientIP} | Message: ${messageText} | Method: ${methodColor}${method}${reset} | Target: ${url} | Status: ${statusColor}${status}${reset} | Time: ${timeColor}${responseTime} ms${reset} | Length: ${lengthColor}${contentLength}${reset}`
  );
}

const excelDateToJSDate = (serial) => {
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
    date_info,
    // date_info.getFullYear(),
    // date_info.getMonth(),
    // date_info.getDate(),
    // hours,
    // minutes,
    // seconds
  );
};


module.exports = {
  getShiftDate,
  getWeekNumber,
  getShift,
  formatIPAddress,
  morganConsoleLog,
  excelDateToJSDate,
};