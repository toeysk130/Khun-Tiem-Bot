import { Client } from "@line/bot-sdk";
import {
  monthAbbreviations,
  validLeaveAmounts,
  validLeaveKeys,
  validLeaveTypes,
  validMonths,
} from "./config";
import { pushMsg } from "./lineAPI";

export async function validateLeaveRequest(
  client: Client,
  commandArr: string[],
  commandLen: number,
  replyToken: string
): Promise<boolean> {
  // command validation
  if (commandLen != 5) {
    const replyMessage =
      "⚠️ คำสั่งไม่ครบนะ\nวิธีใช้งาน: แจ้งลา <ลาป่วย,ลากิจ,ลาพักร้อน,hh> <วันที่เริ่มลา เช่น 26JAN หรือ 26JAN-28JAN> <จำนวน เช่น 1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย]> <key, nokey>\nตัวอย่าง: แจ้งลา ลาพักร้อน 28JAN 1วัน nokey";
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  const leaveType = commandArr[1];
  const leaveStartDate = commandArr[2];
  const leaveAmount = commandArr[3];
  const leaveKey = commandArr[4];

  if (!validLeaveTypes.includes(leaveType)) {
    const replyMessage = `⚠️ ประเภทวันลา '${leaveType}' ไม่มีในระบบ\
      \n ตัวเลือกที่มี ${validLeaveTypes.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  {
    if (leaveStartDate.length != 5 && leaveStartDate.length != 11) {
      const replyMessage = `⚠️ วันที่เริ่มลา '${leaveStartDate}' ไม่ถูกต้อง\
        \n ค่าที่ถูก เช่น 26JAN หรือ 26JAN-28JAN`;
      await pushMsg(client, replyToken, replyMessage);
      return false;
    }
    // ลาภายในวันเดียว
    if (leaveStartDate.length == 5) {
      const month = leaveStartDate.slice(-3);
      if (!validMonths.includes(month)) {
        const replyMessage = `⚠️ เดือน '${leaveStartDate}' ไม่ถูกต้อง\
          \n ตัวเลือกที่มี ${validMonths
            .map((month) => month.toUpperCase())
            .join(" ")}`;
        await pushMsg(client, replyToken, replyMessage);
        return false;
      }

      if (!["1วัน", "ครึ่งเช้า", "ครึ่งบ่าย"].includes(leaveAmount)) {
        const replyMessage = `⚠️ จำนวนวันลา '${leaveAmount}' ไม่ถูกต้อง`;
        await pushMsg(client, replyToken, replyMessage);
        return false;
      }
    }

    // ลาหลายวัน
    if (leaveStartDate.length == 11) {
      const pattern = /^\d{2}[a-z]{3}-\d{2}[a-z]{3}$/i; // Case-insensitive pattern for "26jan-28jan"

      if (!pattern.test(leaveStartDate)) {
        const replyMessage = `⚠️ วันลา '${leaveAmount}' ระบุไม่ถูกต้อง\
          \n ตัวอย่างที่ถูกเช่น 09JAN-13JAN หรือ 30JAN-4FEB`;
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

      if (!validMonths.includes(startDate.slice(-3))) {
        const replyMessage = `⚠️ เดือน '${startDate}' ไม่ถูกต้อง\
          \n ตัวเลือกที่มี ${validMonths
            .map((month) => month.toUpperCase())
            .join(" ")}`;
        await pushMsg(client, replyToken, replyMessage);
        return false;
      }

      if (!validMonths.includes(endDate.slice(-3))) {
        const replyMessage = `⚠️ เดือน '${endDate}' ไม่ถูกต้อง\
          \n ตัวเลือกที่มี ${validMonths
            .map((month) => month.toUpperCase())
            .join(" ")}`;
        await pushMsg(client, replyToken, replyMessage);
        return false;
      }

      // Parse the date strings manually
      const firstDay = parseInt(startDate.slice(0, 2));
      const firstMonth = monthAbbreviations[startDate.slice(2, 5)];
      const firstYear = new Date().getUTCFullYear();

      const secondDay = parseInt(endDate.slice(0, 2));
      const secondMonth = monthAbbreviations[endDate.slice(2, 5)];
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
  }

  if (!validLeaveAmounts.includes(leaveAmount)) {
    const replyMessage = `⚠️ จำนวนวันลา '${leaveAmount}' ไม่มีในระบบ\
        \n ตัวเลือกที่มี ${validLeaveAmounts.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  if (!validLeaveKeys.includes(leaveKey)) {
    const replyMessage = `⚠️ ประเภทการคีย์ '${leaveKey}' ไม่มีในระบบ\
          \n ตัวเลือกที่มี ${validLeaveKeys.join(" ")}`;
    await pushMsg(client, replyToken, replyMessage);
    return false;
  }

  return true;
}
