export const validReportTypes = ["วันนี้", "วีคนี้", "เดือนนี้"];

export const validLeaveTypes = ["ลาป่วย", "ลากิจ", "ลาพักร้อน", "hh"];

export const tableLists = ["member", "happy_hour", "leave_schedule"];

// Define a map for month abbreviations
export const monthAbbreviations: { [key: string]: number } = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export const validMonths = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export const validLeaveAmounts = [
  "1วัน",
  "2วัน",
  "3วัน",
  "4วัน",
  "5วัน",
  "6วัน",
  "7วัน",
  "8วัน",
  "9วัน",
  "10วัน",
  "ครึ่งเช้า",
  "ครึ่งบ่าย",
];

export const LeaveAmountMap: { [key: string]: number } = {
  "1วัน": 1,
  "2วัน": 2,
  "3วัน": 3,
  "4วัน": 4,
  "5วัน": 5,
  "6วัน": 6,
  "7วัน": 7,
  "8วัน": 8,
  "9วัน": 9,
  "10วัน": 10,
  ครึ่งเช้า: 0.5,
  ครึ่งบ่าย: 0.5,
};

export const validLeaveKeys = ["key", "nokey"];
