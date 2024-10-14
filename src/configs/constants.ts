export const SINGLE_LEAVE_DATE_LEN = 7;
export const LONG_LEAVE_DATE_LEN = 15;

export const leaveReqExampleMsg =
  "ตัวอย่าง: แจ้งลา ลาพักร้อน 01JAN24-03JAN24 3วัน nokey ไปเที่ยว";

export const validBotCommands = [
  "แจ้งลา",
  "nc",
  "อัปเดต",
  "hh",
  "รายงาน",
  "รายการ",
  "เตือน",
  "approve",
  "ตาราง",
  "แอบดู",
  "สมัคร",
  "ฝากด่า",
  "cron",
  "ขุนเทียม",
  "คำสั่ง",
];

export const validKeyStatus = ["key", "nokey", "cer", "nocer"];

export const validReportTypes = [
  "ของฉัน",
  "วันนี้",
  "วีคนี้",
  "วีคหน้า",
  "เดือนนี้",
];

export const validHhTypes = ["เพิ่ม", "ใช้"];

export const validLeaveTypes = ["ลาพักร้อน", "ลาป่วย", "ลากิจ"];

export const ncTypes = ["อบรม", "training", "กิจกรรมบริษัท", "ตรวจสุขภาพ"];

export const tableLists = ["member", "happy_hour", "leave_schedule"];

export const keywordMappings: { [key: string]: string } = {
  key: "key",
  nokey: "nokey",
  cer: "มีใบรับรองแพทย์",
  nocer: "ไม่มีใบรับรองแพทย์",
};

// Define a map for month abbreviations
export const monthAbbreviations: { [key: string]: number } = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

export const validUpcaseMonths = [
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
  "11วัน",
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
  "11วัน": 11,
  ครึ่งเช้า: 0.5,
  ครึ่งบ่าย: 0.5,
};

export const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const daysColor = ["🟡", "🟣", "🟢", "🟠", "🔵"];

export const validhhAmts = [
  "1h",
  "2h",
  "3h",
  "4h",
  "5h",
  "6h",
  "7h",
  "8h",
  "9h",
  "10h",
  "11h",
  "12h",
  "13h",
  "14h",
  "15h",
  "16h",
  "17h",
  "18h",
  "19h",
  "20h",
  "21h",
  "22h",
  "23h",
  "24h",
  "25h",
  "26h",
  "27h",
  "28h",
  "29h",
  "30h",
  "31h",
  "32h",
  "33h",
  "34h",
  "35h",
  "36h",
  "37h",
  "38h",
  "39h",
  "40h",
];

export const LEAVE_SCHEDULE_COLUMNS = `id, datetime, member, leave_type, medical_cert, status, leave_start_dt::text, leave_end_dt::text, leave_period, period_detail, is_approve, description`;
