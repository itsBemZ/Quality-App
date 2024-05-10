const getWeekNumber = async (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return `${date.getFullYear()}-W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
};


const getShift = async(currentHour) => {
  let shift;
  console.log(currentHour);
  if (currentHour >= 6 && currentHour < 14) {
    shift = "morning";
  } else if (currentHour >= 14 && currentHour < 22) {
    shift = "evening";
  } else {
    shift = "night";
  }
  return shift;
}

module.exports = {
  getWeekNumber,
  getShift,
};
