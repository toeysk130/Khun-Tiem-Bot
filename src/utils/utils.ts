import {
  LeaveAmountMap,
  SINGLE_LEAVE_DATE_LEN,
  daysOfWeek,
  monthAbbreviations,
  validUpcaseMonths,
} from "../configs/constants";

export function convertDatetimeToDDMMYY(inputDateString: string): string {
  // Parse the input date string
  const date = new Date(inputDateString);

  // Extract day, month, and year components from the date
  const day = date.getUTCDate();
  const monthIndex = date.getUTCMonth();
  const year = date.getUTCFullYear() % 100; // Get last two digits of the year

  // Create the 'DDMMMYY' format string
  const formattedDate = `${day < 10 ? "0" : ""}${day}${
    validUpcaseMonths[monthIndex]
  }${year < 10 ? "0" : ""}${year}`; // Ensure the year is always two digits

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

  // ลาภายในวันเดียว DDMMMYY format (e.g., 02JAN24)
  if (leaveStartDate.length == SINGLE_LEAVE_DATE_LEN) {
    const firstDay = parseInt(leaveStartDate.slice(0, 2), 10); // Extract day
    const firstMonth =
      monthAbbreviations[leaveStartDate.slice(2, 5).toUpperCase()]; // Extract month abbreviation and map to index
    const firstYear = parseInt(leaveStartDate.slice(5, 7), 10) + 2000; // Extract last two digits of the year and assume 20XX

    // Create formatted leave start and end dates
    formattedLeaveStartDate = new Date(
      Date.UTC(firstYear, firstMonth, firstDay)
    ).toISOString();
    formattedLeaveEndDate = formattedLeaveStartDate; // Same day for single-day leave
    formattedLeaveAmount = LeaveAmountMap[leaveAmount]; // Map leave amount
  }

  // ลาหลายวัน Handle multiple-day leave (e.g., "02JAN24-05JAN24")
  if (leaveStartDate.length === 15) {
    // DDMMMYY-DDMMMYY format
    const dates = leaveStartDate.split("-"); // Split start and end dates
    const startDate = dates[0]; // First part (e.g., "02JAN24")
    const endDate = dates[1]; // Second part (e.g., "05JAN24")

    // Parse the start date
    const firstDay = parseInt(startDate.slice(0, 2), 10);
    const firstMonth = monthAbbreviations[startDate.slice(2, 5).toUpperCase()];
    const firstYear = parseInt(startDate.slice(5, 7), 10) + 2000;

    // Parse the end date
    const secondDay = parseInt(endDate.slice(0, 2), 10);
    const secondMonth = monthAbbreviations[endDate.slice(2, 5).toUpperCase()];
    const secondYear = parseInt(endDate.slice(5, 7), 10) + 2000;

    // Create formatted start and end dates
    formattedLeaveStartDate = new Date(
      Date.UTC(firstYear, firstMonth, firstDay)
    ).toISOString();
    formattedLeaveEndDate = new Date(
      Date.UTC(secondYear, secondMonth, secondDay)
    ).toISOString();
    formattedLeaveAmount = LeaveAmountMap[leaveAmount]; // Map leave amount
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
    ? convertDatetimeToDDMMYY(leave_start_dt)
    : convertDatetimeToDDMMYY(leave_start_dt) +
        "-" +
        convertDatetimeToDDMMYY(leave_end_dt);
}
