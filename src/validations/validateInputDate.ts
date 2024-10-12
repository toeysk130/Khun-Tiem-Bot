import { getIsLeaveDuplicate, updateKeyStatus } from "../API/leaveScheduleAPI";
import {
  LONG_LEAVE_DATE_LEN,
  monthAbbreviations,
  SINGLE_LEAVE_DATE_LEN,
  validKeyStatus,
  validLeaveAmounts,
  validUpcaseMonths,
} from "../configs/config";
import { pushMsg } from "../utils/sendLineMsg";
import { client, pool } from "../handlers/handleIncomingMessage";
import { UserMetaData } from "../configs/interface";

export async function validateInputDate(
  userMetaData: UserMetaData,
  leaveType: string,
  leaveDatePeriod: string,
  leaveAmount: string,
  leaveKey: string
): Promise<boolean> {
  // Validate leave amount
  if (!validLeaveAmounts.includes(leaveAmount)) {
    await pushMsg(
      client,
      userMetaData.replyToken,
      `⚠️ จำนวนวันลา '${leaveAmount}' ไม่มีในระบบ\n✅ ตัวเลือกที่มี ${validLeaveAmounts.join(
        " "
      )}`
    );
    return false;
  }

  // Validate leave key status
  if (!validKeyStatus.includes(leaveKey)) {
    await pushMsg(
      client,
      userMetaData.replyToken,
      `⚠️ ประเภทการคีย์ '${leaveKey}' ไม่มีในระบบ\n✅ ตัวเลือกที่มี ${validKeyStatus.join(
        " "
      )}`
    );
    return false;
  }

  // Validate leave dates text len
  if (
    leaveDatePeriod.length != SINGLE_LEAVE_DATE_LEN &&
    leaveDatePeriod.length != LONG_LEAVE_DATE_LEN
  ) {
    await pushMsg(
      client,
      userMetaData.replyToken,
      `⚠️ ช่วงวันลา '${leaveDatePeriod.toUpperCase()}' ไม่ถูกต้อง (ตัวอย่าง 01JAN24 หรือ 01JAN24-03JAN24)`
    );
    return false;
  }

  // Validate single date format (e.g., "01JAN24")
  if (leaveDatePeriod.length === SINGLE_LEAVE_DATE_LEN) {
    if (!isValidMonth(leaveDatePeriod)) {
      await pushMsg(
        client,
        userMetaData.replyToken,
        generateInvalidMonthMessage(leaveDatePeriod)
      );
      return false;
    }

    // Validate for leave one day request
    if (!["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
      await pushMsg(
        client,
        userMetaData.replyToken,
        `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง\
        \n ตัวเลือก "1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"`
      );
      return false;
    }

    // Parse the start date and check for duplicate leaves
    const parsedDate = parseDate(leaveDatePeriod);
    const dateString = parsedDate.toISOString().split("T")[0]; // Example: '2024-02-02'

    console.log("parsedDate", parsedDate);
    console.log("dateString", dateString);

    const id = await getIsLeaveDuplicate(
      pool,
      userMetaData.username,
      dateString,
      dateString
    );
    if (id > 0 && leaveType !== "hh") {
      await updateKeyStatus(
        pool,
        client,
        userMetaData.replyToken,
        id,
        leaveKey
      );
      return false;
    }
  }

  // Validate range date format (e.g., "01JAN24-03JAN24")
  if (leaveDatePeriod.length === LONG_LEAVE_DATE_LEN) {
    if (!isValidDateRange(leaveDatePeriod)) {
      await pushMsg(
        client,
        userMetaData.replyToken,
        `⚠️ วันลา '${leaveDatePeriod}' ระบุไม่ถูกต้อง\n✅ ตัวอย่างที่ถูก เช่น 09JAN-13JAN`
      );
      return false;
    }

    if (["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
      await pushMsg(
        client,
        userMetaData.replyToken,
        `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง`
      );
      return false;
    }

    const [startDate, endDate] = leaveDatePeriod.split("-");
    const firstDate = parseDate(startDate);
    const secondDate = parseDate(endDate);

    if (secondDate < firstDate) {
      await pushMsg(
        client,
        userMetaData.replyToken,
        `⚠️ วันที่สิ้นสุด ${endDate} มีค่าน้อยกว่าวันที่เริ่มต้น ${startDate}`
      );
      return false;
    }
  }

  return true;
}

// Helper function to validate if a month is correct in the date
function isValidMonth(dateString: string): boolean {
  const month = dateString.slice(2, 5).toUpperCase(); // Ex. 01JAN25 -> 'JAN'
  return validUpcaseMonths.includes(month);
}

// Helper function to generate an invalid month message
function generateInvalidMonthMessage(dateString: string): string {
  return `⚠️ เดือน '${dateString}' ไม่ถูกต้อง\n✅ ตัวเลือกที่มี ${validUpcaseMonths.join(
    " "
  )}`;
}

// Helper function to check if the date range format is valid (e.g., "26JAN25-28JAN25")
function isValidDateRange(dateRange: string): boolean {
  const pattern = /^\d{2}[a-zA-Z]{3}\d{2}-\d{2}[a-zA-Z]{3}\d{2}$/; // e.g., "26JAN25-28JAN25"
  return pattern.test(dateRange);
}

// Helper function to parse a date string in DDMMMYY format (e.g., "01JAN25" for 1st January 2025)
function parseDate(dateString: string): Date {
  if (dateString.length !== 7) {
    throw new Error(
      "Invalid date format. Expected format is DDMMMYY (e.g., 01JAN25)."
    );
  }

  const day = parseInt(dateString.slice(0, 2), 10); // Extract DD (day)
  const monthAbbreviation = dateString.slice(2, 5).toUpperCase(); // Extract MMM (month)
  const month = monthAbbreviations[monthAbbreviation]; // Convert month abbreviation to index (0-based for JS months)

  if (month === undefined) {
    throw new Error(`Invalid month abbreviation: ${monthAbbreviation}`);
  }

  let year = parseInt(dateString.slice(5, 7), 10); // Extract YY (year)

  // Assume the year is always in the 2000s
  year += 2000;

  return new Date(Date.UTC(year, month, day)); // Return Date object in UTC
}
