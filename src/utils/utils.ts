import {
  LeaveAmountMap,
  daysOfWeek,
  monthAbbreviations,
  validUpcaseMonths,
} from "../configs/config";

export function convertDatetimeToDDMMM(inputDateString: string): string {
  // Parse the input date string
  const date = new Date(inputDateString);

  // Extract day and month components from the date
  const day = date.getUTCDate();
  const monthIndex = date.getUTCMonth();

  // Create the 'DDMMM' format string
  const formattedDate = `${day < 10 ? "0" : ""}${day}${
    validUpcaseMonths[monthIndex]
  }`;

  return formattedDate;
}

export function getCurrentDateString(): string {
  // Get the current date
  const currentDate = new Date();

  // Extract year, month, and day components
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Month is zero-based, so add 1 and pad with leading zero
  const day = String(currentDate.getDate()).padStart(2, "0"); // Pad with leading zero

  // Create the date string in the desired format
  const dateString = `${year}-${month}-${day}`;

  return dateString;
}

export function getNextWeektDateString(): string {
  // Get the current date
  const currentDate = new Date();
  const nextWeekDate = new Date(currentDate);
  nextWeekDate.setDate(currentDate.getDate() + 7);

  // Extract year, month, and day components
  const year = nextWeekDate.getFullYear();
  const month = String(nextWeekDate.getMonth() + 1).padStart(2, "0"); // Month is zero-based, so add 1 and pad with leading zero
  const day = String(nextWeekDate.getDate()).padStart(2, "0"); // Pad with leading zero

  // Create the date string in the desired format
  const dateString = `${year}-${month}-${day}`;

  return dateString;
}

export function getCurrentWeekDate(
  today: Date
): Array<{ day: string; date: string }> {
  const result = [];

  // Get the current day index (0-6, where 0 is Sunday)
  let currentDayIndex = today.getDay();

  // Calculate the most recent Monday (subtract currentDayIndex days, adjusting for Sunday being 0 by adding 6 and modding by 7)
  const mostRecentMonday = new Date(today);
  mostRecentMonday.setDate(today.getDate() - ((currentDayIndex + 6) % 7));

  // Generate dates for the week (Monday to Friday)
  for (let i = 0; i < 5; i++) {
    const date = new Date(mostRecentMonday);
    date.setDate(mostRecentMonday.getDate() + i);
    const formattedDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    result.push({ day: daysOfWeek[date.getDay()], date: formattedDate });
  }

  return result;
}

export function getCurrentTimestamp(): string {
  const currentDateTime = new Date();
  const formattedDateTime = currentDateTime.toISOString();
  return formattedDateTime;
}

export function getFormatLeaveDate(
  leaveStartDate: string,
  leaveAmount: string
) {
  // Initial variables
  let formattedLeaveStartDate = "";
  let formattedLeaveEndDate = "";
  let formattedLeaveAmount = 0;

  // ลาภายในวันเดียว
  if (leaveStartDate.length == 5) {
    const month = leaveStartDate.slice(-3);
    // Parse the date strings manually
    const firstDay = parseInt(leaveStartDate.slice(0, 2));
    const firstMonth =
      monthAbbreviations[leaveStartDate.slice(2, 5).toUpperCase()];
    const firstYear = new Date().getUTCFullYear();

    formattedLeaveStartDate = new Date(
      Date.UTC(firstYear, firstMonth, firstDay)
    ).toISOString();
    formattedLeaveEndDate = formattedLeaveStartDate;
    formattedLeaveAmount = LeaveAmountMap[leaveAmount];
  }

  // ลาหลายวัน
  if (leaveStartDate.length == 11) {
    const dates = leaveStartDate.split("-");
    const startDate = dates[0];
    const endDate = dates[1];

    // Parse the date strings manually
    const firstDay = parseInt(startDate.slice(0, 2));
    const firstMonth = monthAbbreviations[startDate.slice(2, 5).toUpperCase()];
    const firstYear = new Date().getUTCFullYear();

    const secondDay = parseInt(endDate.slice(0, 2));
    const secondMonth = monthAbbreviations[endDate.slice(2, 5).toUpperCase()];
    const secondYear = new Date().getUTCFullYear();

    formattedLeaveStartDate = new Date(
      Date.UTC(firstYear, firstMonth, firstDay)
    ).toISOString();
    formattedLeaveEndDate = new Date(
      Date.UTC(secondYear, secondMonth, secondDay)
    ).toISOString();
    formattedLeaveAmount = LeaveAmountMap[leaveAmount];
  }

  return {
    formattedLeaveStartDate,
    formattedLeaveEndDate,
    formattedLeaveAmount,
  };
}

export function getColorEmoji(is_approve: boolean, status: string): string {
  return is_approve ? "🟢" : status == "key" ? "🟡" : "🔴";
}

export function getDisplayLeaveDate(
  leave_start_dt: string,
  leave_end_dt: string
): string {
  return leave_start_dt == leave_end_dt
    ? convertDatetimeToDDMMM(leave_start_dt)
    : convertDatetimeToDDMMM(leave_start_dt) +
        "-" +
        convertDatetimeToDDMMM(leave_end_dt);
}
