import { daysOfWeek } from "./config";

export function convertDatetimeToDDMMM(inputDateString: string): string {
  // Parse the input date string
  const date = new Date(inputDateString);

  // Define an array for month abbreviations
  const monthAbbreviations = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  // Extract day and month components from the date
  const day = date.getUTCDate();
  const monthIndex = date.getUTCMonth();

  // Create the 'DDMMM' format string
  const formattedDate = `${day < 10 ? "0" : ""}${day}${
    monthAbbreviations[monthIndex]
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
