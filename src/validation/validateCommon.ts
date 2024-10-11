import { Client } from "@line/bot-sdk";
import pg from "pg";
import { getIsLeaveDuplicate, updateKeyStatus } from "../API/leaveScheduleAPI";
import {
  monthAbbreviations,
  validKeyStatus,
  validLeaveAmounts,
  validUpcaseMonths,
} from "../configs/config";
import { pushMsg } from "../utils/sendLineMsg";

export async function validateInputDate(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  member: string,
  leaveType: string,
  leaveStartDate: string,
  leaveAmount: string,
  leaveKey: string
) {
  if (leaveStartDate.length != 5 && leaveStartDate.length != 11) {
    const replyMessage = `⚠️ วันที่เริ่มลา '${leaveStartDate}' ไม่ถูกต้อง\
            \n✅ ค่าที่ถูก เช่น 26JAN หรือ 26JAN-28JAN`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }
  // ลาภายในวันเดียว
  if (leaveStartDate.length == 5) {
    const month = leaveStartDate.slice(-3);
    if (!validUpcaseMonths.includes(month.toUpperCase())) {
      const replyMessage = `⚠️ เดือน '${leaveStartDate}' ไม่ถูกต้อง\
              \n✅ ตัวเลือกที่มี ${validUpcaseMonths
                .map((month) => month)
                .join(" ")}`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }

    if (!["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
      const replyMessage = `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }

    // Parse the date strings manually
    const firstDay = parseInt(leaveStartDate.slice(0, 2), 10);
    const monthAbbreviation = leaveStartDate.slice(2, 5);
    const firstMonth = validUpcaseMonths.indexOf(
      monthAbbreviation.toUpperCase()
    );
    const firstYear = new Date().getUTCFullYear();
    const firstDate = new Date(Date.UTC(firstYear, firstMonth, firstDay));
    const dateString = firstDate.toISOString().split("T")[0]; // Output: '2024-02-02'

    // If Duplicate date then update instead
    const id = await getIsLeaveDuplicate(pool, member, dateString, dateString);

    if (id > 0 && leaveType !== "hh") {
      await updateKeyStatus(pool, client, replyToken, id, leaveKey);
      return false;
    }
  }

  // ลาหลายวัน
  if (leaveStartDate.length == 11) {
    const pattern = /^\d{2}[a-z]{3}-\d{2}[a-z]{3}$/i; // Case-insensitive pattern for "26jan-28jan"

    if (!pattern.test(leaveStartDate)) {
      const replyMessage = `⚠️ วันลา '${leaveAmount}' ระบุไม่ถูกต้อง\
              \n✅ ตัวอย่างที่ถูกเช่น 09JAN-13JAN หรือ 30JAN-4FEB`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }

    if (["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
      const replyMessage = `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }

    const dates = leaveStartDate.split("-");
    const startDate = dates[0];
    const endDate = dates[1];

    if (!validUpcaseMonths.includes(startDate.slice(-3).toUpperCase())) {
      const replyMessage = `⚠️ เดือน '${startDate}' ไม่ถูกต้อง\
              \n✅ ตัวเลือกที่มี ${validUpcaseMonths
                .map((month) => month)
                .join(" ")}`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }

    if (!validUpcaseMonths.includes(endDate.slice(-3).toUpperCase())) {
      const replyMessage = `⚠️ เดือน '${endDate}' ไม่ถูกต้อง\
              \n✅ ตัวเลือกที่มี ${validUpcaseMonths
                .map((month) => month)
                .join(" ")}`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }

    // Parse the date strings manually
    const firstDay = parseInt(startDate.slice(0, 2));
    const firstMonth = monthAbbreviations[startDate.slice(2, 5).toUpperCase()];
    const firstYear = new Date().getUTCFullYear();

    const secondDay = parseInt(endDate.slice(0, 2));
    const secondMonth = monthAbbreviations[endDate.slice(2, 5).toUpperCase()];
    const secondYear = new Date().getUTCFullYear();

    // Create Date objects with UTC values
    const firstDate = new Date(Date.UTC(firstYear, firstMonth, firstDay));
    const secondDate = new Date(Date.UTC(secondYear, secondMonth, secondDay));

    // Compare the dates
    if (secondDate < firstDate) {
      const replyMessage = `⚠️ ไม่ถูกต้อง\nend date: ${endDate} มีค่าน้อยกว่า start date: ${startDate}'`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }
  }

  if (!validLeaveAmounts.includes(leaveAmount)) {
    const replyMessage = `⚠️ จำนวนวันลา '${leaveAmount}' ไม่มีในระบบ\
        \n✅ ตัวเลือกที่มี ${validLeaveAmounts.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  if (!validKeyStatus.includes(leaveKey)) {
    const replyMessage = `⚠️ ประเภทการคีย์ '${leaveKey}' ไม่มีในระบบ\
          \n✅ ตัวเลือกที่มี ${validKeyStatus.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  return true;
}
