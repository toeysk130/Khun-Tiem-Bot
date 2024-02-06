import * as dotenv from "dotenv";
import { Client, TextEventMessage, WebhookEvent } from "@line/bot-sdk";
import pg from "pg";
import { validateLeaveRequest } from "../utils/validateLeaveReq";
import {
  addNewHhLeaveRequest,
  addNewLeaveRequest,
  addNewNcLeaveRequest,
  checkIfIdExist,
  checkIfMyIdExist,
  getMemberDetails,
  pushMsg,
  registerNewMember,
  showListThisWeek,
  showListToday,
  showMyList,
  showTable,
  showWaitApprove,
  updateApproveFlag,
  updateKeyStatus,
} from "../API/leaveScheduleAPI";
import {
  daysColor,
  tableLists,
  validHhTypes,
  validKeyStatus,
  validReportTypes,
  validUpcaseMonths,
  validhhAmts,
} from "../config/config";
import {
  getCurrentDateString,
  getCurrentWeekDate,
  getNextWeektDateString,
} from "../utils/utils";
import { pushMessage, pushSingleMessage } from "../API/pushMessage";
import { validateHhRequest } from "../utils/validateHhReq";
import { addHhRecord } from "../API/hhAPI";
import { fetchOpenAICompletion } from "../API/chatGpt";

dotenv.config();
const pool = new pg.Pool();
const client = new Client({
  channelSecret: process.env.CHANNEL_SECRET || "",
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});

export async function handleIncomingMessage(event: WebhookEvent) {
  if (event.type !== "message") return;
  const textMessage = event.message as TextEventMessage;
  const receivedText = textMessage.text.trim().toLowerCase();
  const replyToken = event.replyToken;

  const commandArr = receivedText.split(" ");
  const command = commandArr[0];
  const commandLen = commandArr.length;

  const userId = event.source.userId;
  const userName = commandArr[1];
  if (!userId) return;

  const member = await getMemberDetails(pool, userId);
  const isMemberExist = typeof member !== "undefined";

  // สมัคร <ชื่อ>
  if (command == "สมัคร" && commandLen == 2) {
    if (isMemberExist) {
      const replyMessage = `😡 ไอ...${member.name} มี User อยู่แล้วก็อย่าเพิ่มซ้ำเล่นสิ...ปั๊ดโถ่ว!`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }
    await registerNewMember(pool, client, replyToken, userId, userName);
  }

  // Stop procesing if member not register yet
  if (!isMemberExist) return;

  if (command == "คำสั่ง") {
    const replyMessage = `🤖 รายการคำสั่ง\
      \n👉แจ้งลา <ลาพักร้อน, ลาป่วย, ลากิจ> <วันเริ่มลา 26JAN,26JAN-28JAN> <จำนวน 1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <key,nokey> <เหตุผล>\
      \n👉nc <อบรม, training, กิจกรรมบริษัท> <วันเริ่มลา 26JAN,26JAN-28JAN> <จำนวน 1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <เหตุผล>\
      \n👉อัปเดต <id> <key,nokey>\
      \n👉hh ใช้ <1h,2h,...,40h> <วันลา 26JAN> <1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <เหตุผล>\
      \n👉hh เพิ่ม <1h,2h,...,40h> <เหตุผล>\
      \n👉รายงาน/รายการ <ของฉัน, วันนี้, วีคนี้, วีคหน้า>\
      \n👉เตือน <approve> <'',key,nokey>\
      \n👉approve <id, ids(8,9)> (⛔ Only Admin)\
      \n👉ตาราง <member, happy_hour> (⛔ Only Admin)\
      \n👉แอบดู <ชื่อคน> (⛔ Only Admin)\
      \n👉สมัคร <ชื่อ>\
      `;
    // \n👉ลบ <id> (⛔ Only Admin) (⚠️ Developing)\
    await pushMsg(client, replyToken, replyMessage);
  }
  // ตาราง <member, happy_hour, leave_schedule>
  else if (command == "ตาราง" && commandLen == 2) {
    if (member.is_admin == false) {
      const replyMessage = "😡 ไม่ใช่ Admin ใช้งานไม่ได้!";
      await pushMsg(client, replyToken, replyMessage);
      return;
    }
    const tableName = commandArr[1];
    // command validation
    if (!tableLists.includes(tableName)) {
      const replyMessage = `⛔ Table ${tableName} is not exists on database`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    await showTable(pool, client, replyToken, tableName);
  }

  // แจ้งลา <ประเภท [ลาป่วย,ลากิจ,ลาพักร้อน,hh]> <วันเริ่มลา [26JAN]> <จำนวน [1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย]> <key, nokey>
  else if (command == "แจ้งลา") {
    if (
      !(await validateLeaveRequest(
        pool,
        client,
        member.name,
        commandArr,
        commandLen,
        replyToken
      ))
    )
      return;

    await addNewLeaveRequest(pool, client, replyToken, member, commandArr);
  } else if (command == "nc") {
    if (
      !(await validateLeaveRequest(
        pool,
        client,
        member.name,
        commandArr,
        commandLen,
        replyToken
      ))
    )
      return;

    await addNewNcLeaveRequest(pool, client, replyToken, member, commandArr);
  }

  // เตือน <รายวัน, approve>
  else if (
    command === "เตือน" &&
    (commandArr.length === 2 || commandArr.length === 3)
  ) {
    const option = commandArr[1];
    const optionStatus = commandArr.length === 3 ? commandArr[2] : "";

    if (option == "approve")
      await showWaitApprove(pool, client, replyToken, optionStatus);
  }

  // approve <ids เช่น approve 8 หรือ approve 3,4,8,10> (⛔ Only Admin)
  else if (command == "approve" && commandLen == 2) {
    // validate if not admin
    if (member.is_admin == false) {
      const replyMessage = "😡 ไม่ใช่ Admin มัน Approve ไม่ได้เด๊ะ!";
      await pushMsg(client, replyToken, replyMessage);
      return;
    }
    const option = commandArr[1];
    const ids = option.split(",").map((item) => Number(item.trim()));

    // validate option
    if (ids.length == 1) {
      const id = ids[0];

      if (!(await checkIfIdExist(pool, id.toString()))) {
        const replyMessage = `⛔ ไม่มี ID:${id} ในระบบ`;
        await pushMsg(client, replyToken, replyMessage);
        return;
      }

      await updateApproveFlag(pool, client, replyToken, ids);
    } else if (ids.length > 1) {
      // validate ids
      for (const id of ids) {
        if (!(await checkIfIdExist(pool, id.toString()))) {
          const replyMessage = `⛔ ไม่มี ID:${id} ในระบบ`;
          await pushMsg(client, replyToken, replyMessage);
          return;
        }
      }

      await updateApproveFlag(pool, client, replyToken, ids);
    }
  }
  //👉รายงาน <ของฉัน, วันนี้, วีคนี้, เดือนนี้> (⛔ Developing)
  else if ((command == "รายงาน" || command == "รายการ") && commandLen == 2) {
    const reportType = commandArr[1];
    // command validation
    if (!validReportTypes.includes(reportType)) {
      const replyMessage = `⛔ ตัวเลือก '${reportType}' ไม่มีในระบบ`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    if (reportType == "วันนี้") await showListToday(pool, client, replyToken);
    else if (reportType == "ของฉัน")
      await showMyList(pool, client, member.name, replyToken);
    else if (reportType == "วีคนี้" || reportType == "วีคหน้า") {
      const currentWeekDates =
        reportType == "วีคนี้"
          ? getCurrentWeekDate(new Date(getCurrentDateString()))
          : getCurrentWeekDate(new Date(getNextWeektDateString()));

      const currentWeekStartDate = currentWeekDates[0].date;
      const currentWeekEndDate =
        currentWeekDates[currentWeekDates.length - 1].date;

      const leaveListThisWeeks = await showListThisWeek(
        pool,
        currentWeekStartDate,
        currentWeekEndDate
      );

      // Initialize an object to accumulate members for each day
      let dayMembersMap: { [key: string]: string[] } = {};

      // Function to format date as DDMMM (e.g., 29JAN)
      function formatDate(date: string): string {
        const parts = date.split("-");
        const day = parts[2];
        const monthIndex = parseInt(parts[1], 10) - 1; // Month is 0-indexed in the array
        const month = validUpcaseMonths[monthIndex];
        return `${day}${month}`;
      }

      // Prepare the result string with formatted dates
      let resultString = `😶‍🌫️ ใครลาบ้าง ${
        reportType == "วีคนี้" ? "สัปดาห์นี้" : "สัปดาห์หน้า"
      }\n\n`;

      currentWeekDates.forEach((weekDate, index) => {
        // Initialize members array for each day
        dayMembersMap[weekDate.day] = [];

        // Format date
        const formattedDate = formatDate(weekDate.date);

        // Populate members for each day
        leaveListThisWeeks.forEach((leave) => {
          if (
            weekDate.date >= leave.leave_start_dt &&
            weekDate.date <= leave.leave_end_dt
          ) {
            const leaveStr = `${leave.member} (${leave.leave_type}${
              leave.period_detail.startsWith("ครึ่ง")
                ? `-${leave.period_detail}`
                : ``
            })`;

            dayMembersMap[weekDate.day].push(leaveStr);
          }
        });

        // Append to result string
        resultString += `${daysColor[index]}${formattedDate}(${
          weekDate.day
        }) : ${dayMembersMap[weekDate.day].join(", ") || ""}\n`;
      });

      await pushMsg(client, replyToken, resultString);
    }
  }
  //👉อัปเดต <id> <key,nokey>
  else if (command == "อัปเดต" && commandLen == 3) {
    const id = commandArr[1];
    const status = commandArr[2];

    // validation
    if (!validKeyStatus.includes(status)) {
      const replyMessage = `⚠️ ประเภทการคีย์ '${status}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี ${validKeyStatus.join(" ")}`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    if (!(await checkIfMyIdExist(pool, member.name, id))) {
      const replyMessage = `⛔ ไม่มี ID:${id} ที่เป็นของ '${member.name}'`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    await updateKeyStatus(pool, client, replyToken, id, status);
  } else if (command == "cron") {
    // validate if not admin
    if (member.is_admin == false) {
      const replyMessage = "😡 ไม่ใช่ Admin ใช้งานไม่ได้!";
      await pushMsg(client, replyToken, replyMessage);
      return;
    }
    await pushMessage();
  } else if (command == "hh") {
    const hhType = commandArr[1]; // "เพิ่ม", "ใช้"
    const hhAmt = commandArr[2]; // 1h,2h,...,40h

    if (!validHhTypes.includes(hhType)) {
      // "เพิ่ม", "ใช้"
      const replyMessage = `⚠️ ประเภท hh '${hhType}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี '${validHhTypes.join(", ")}'`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    if (!validhhAmts.includes(hhAmt)) {
      // 1h,2h,...,40h-
      const replyMessage = `⚠️ จำนวน hh '${hhAmt}' ไม่มีในระบบ\
      \n✅ ตัวเลือกที่มี '1h,2h,...,40h'`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    if (hhType == "เพิ่ม") {
      const description = commandArr.slice(3).join(" "); // other elements will be description
      await addHhRecord(
        pool,
        client,
        replyToken,
        member.name,
        hhType,
        parseInt(hhAmt),
        description
      );
    } else if (hhType == "ใช้") {
      if (
        !(await validateHhRequest(
          pool,
          client,
          replyToken,
          member.name,
          commandArr
        ))
      )
        return;

      await addNewHhLeaveRequest(pool, client, replyToken, member, commandArr);
    }
  } else if (command == "แอบดู") {
    if (member.is_admin == false) {
      const replyMessage = "😡 ไม่ใช่ Admin ใช้งานไม่ได้!";
      await pushMsg(client, replyToken, replyMessage);
      return;
    }
    const name = commandArr[1];
    await showMyList(pool, client, name, replyToken);
  } else if (command == "ฝากด่า") {
    const description = commandArr.slice(1).join(" ");
    await pushSingleMessage(description);
  } else if (command == "ขุนเทียม") {
    const description = commandArr.slice(1).join(" ");
    await fetchOpenAICompletion(description);
  }
}
