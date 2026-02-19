import {
  LONG_LEAVE_DATE_LEN,
  SINGLE_LEAVE_DATE_LEN,
  monthAbbreviations,
  validKeyStatus,
  validLeaveAmounts,
  validUpcaseMonths,
} from "../configs/constants";
import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";
import { getIsLeaveDuplicate } from "../repositories/leaveScheduleRepository";
import { updateKeyStatusAndGetDetail } from "../services/leaveService";
import { enhanceErrorWithAI } from "../services/openaiService";
import { UserMetaData } from "../types/interface";
import { replyFlexMessage, replyMessage } from "../utils/sendLineMsg";

export async function validateInputDate(
  userMetaData: UserMetaData,
  leaveType: string,
  leaveDatePeriod: string,
  leaveAmount: string,
  leaveKey: string,
): Promise<boolean> {
  // Validate leave amount
  if (!validLeaveAmounts.includes(leaveAmount)) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ จำนวนวันลา '${leaveAmount}' ไม่มีในระบบ\n✅ ตัวเลือกที่มี ${validLeaveAmounts.join(
        " ",
      )}`,
    );
    return false;
  }

  // Validate leave key status
  if (!validKeyStatus.includes(leaveKey)) {
    await replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ ประเภทการคีย์ '${leaveKey}' ไม่มีในระบบ\n✅ ตัวเลือกที่มี ${validKeyStatus.join(
        " ",
      )}`,
    );
    return false;
  }

  // Validate leave dates text len
  if (
    leaveDatePeriod.length != SINGLE_LEAVE_DATE_LEN &&
    leaveDatePeriod.length != LONG_LEAVE_DATE_LEN
  ) {
    const baseError = `⚠️ ช่วงวันลา '${leaveDatePeriod.toUpperCase()}' ไม่ถูกต้อง (ตัวอย่าง 01JAN24 หรือ 01JAN24-03JAN24)`;
    const enhanced = await enhanceErrorWithAI(
      `${leaveType} ${leaveDatePeriod} ${leaveAmount}`,
      baseError,
    );
    await replyMessage(lineClient, userMetaData.replyToken, enhanced);
    return false;
  }

  // Validate single date format (e.g., "01JAN24")
  if (leaveDatePeriod.length === SINGLE_LEAVE_DATE_LEN) {
    if (!isValidMonth(leaveDatePeriod)) {
      const baseError = generateInvalidMonthMessage(leaveDatePeriod);
      const enhanced = await enhanceErrorWithAI(
        `${leaveType} ${leaveDatePeriod} ${leaveAmount}`,
        baseError,
      );
      await replyMessage(lineClient, userMetaData.replyToken, enhanced);
      return false;
    }

    if (!["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง\
        \n ตัวเลือก "1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"`,
      );
      return false;
    }

    const parsedDate = parseDate(leaveDatePeriod);
    const dateString = parsedDate.toISOString().split("T")[0];

    const duplicateId = await getIsLeaveDuplicate(
      pool,
      userMetaData.username,
      dateString,
      dateString,
    );

    if (duplicateId > 0 && leaveType !== "hh") {
      // Found duplicate — auto-update the existing record's key status
      const flexMsg = await updateKeyStatusAndGetDetail(
        pool,
        duplicateId,
        leaveKey,
      );
      await replyFlexMessage(lineClient, userMetaData.replyToken, flexMsg);
      return false;
    }
  }

  // Validate range date format (e.g., "01JAN24-03JAN24")
  if (leaveDatePeriod.length === LONG_LEAVE_DATE_LEN) {
    if (!isValidDateRange(leaveDatePeriod)) {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ วันลา '${leaveDatePeriod}' ระบุไม่ถูกต้อง\n✅ ตัวอย่างที่ถูก เช่น 09JAN-13JAN`,
      );
      return false;
    }

    if (["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง`,
      );
      return false;
    }

    const [startDate, endDate] = leaveDatePeriod.split("-");
    const firstDate = parseDate(startDate);
    const secondDate = parseDate(endDate);

    if (secondDate < firstDate) {
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⚠️ วันที่สิ้นสุด ${endDate} มีค่าน้อยกว่าวันที่เริ่มต้น ${startDate}`,
      );
      return false;
    }
  }

  return true;
}

function isValidMonth(dateString: string): boolean {
  const month = dateString.slice(2, 5).toUpperCase();
  return validUpcaseMonths.includes(month);
}

function generateInvalidMonthMessage(dateString: string): string {
  return `⚠️ เดือน '${dateString}' ไม่ถูกต้อง\n✅ ตัวเลือกที่มี ${validUpcaseMonths.join(
    " ",
  )}`;
}

function isValidDateRange(dateRange: string): boolean {
  const pattern = /^\d{2}[a-zA-Z]{3}\d{2}-\d{2}[a-zA-Z]{3}\d{2}$/;
  return pattern.test(dateRange);
}

function parseDate(dateString: string): Date {
  if (dateString.length !== 7) {
    throw new Error(
      "Invalid date format. Expected format is DDMMMYY (e.g., 01JAN25).",
    );
  }

  const day = parseInt(dateString.slice(0, 2), 10);
  const monthAbbreviation = dateString.slice(2, 5).toUpperCase();
  const month = monthAbbreviations[monthAbbreviation];

  if (month === undefined) {
    throw new Error(`Invalid month abbreviation: ${monthAbbreviation}`);
  }

  let year = parseInt(dateString.slice(5, 7), 10);
  year += 2000;

  return new Date(Date.UTC(year, month, day));
}
