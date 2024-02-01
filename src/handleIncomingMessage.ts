import { Client, TextEventMessage, WebhookEvent } from "@line/bot-sdk";
import pg from "pg";
import * as dotenv from "dotenv";
import { validateLeaveRequest } from "./validateLeaveReq";
import {
  addNewLeaveRequest,
  getMemberDetails,
  pushMsg,
  registerNewMember,
  showListToday,
  showTable,
  showWaitApprove,
  updateApproveFlag,
} from "./lineAPI";
import { tableLists, validReportTypes } from "./config";

dotenv.config();
const pool = new pg.Pool();
const client = new Client({
  channelSecret: process.env.CHANNEL_SECRET || "",
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});

export async function handleIncomingMessage(event: WebhookEvent) {
  if (event.type !== "message") return;
  const textMessage = event.message as TextEventMessage;
  const receivedText = textMessage.text.toLowerCase();
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

  //   // TODO: remove
  //   const isAdmin = member.is_admin;
  //   if (!isAdmin) return;
  //   //

  // Stop procesing if member not register yet
  if (!isMemberExist) return;

  if (command == "คำสั่ง") {
    const replyMessage = `🤖 รายการคำสั่ง\
      \n👉สมัคร <ชื่อ>\
      \n👉แจ้งลา <ลาป่วย,ลากิจ,ลาพักร้อน,hh> <วันเริ่มลา 26JAN,26JAN-28JAN> <จำนวน 1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <key,nokey>\
      \n👉แก้ไข <id> <status> <key,nokey> (⛔ Developing)\
      \n👉รายงาน <วันนี้, วีคนี้, เดือนนี้> (⛔ Developing)\
      \n👉เตือน <approve>\
      \n👉approve <ids เช่น approve 8 หรือ approve 3,4,8,10> (⛔ Only Admin)\
      \n👉ตาราง <member, happy_hour, leave_schedule>\
      `;
    await pushMsg(client, replyToken, replyMessage);
  }
  // ตาราง <member, happy_hour, leave_schedule>
  else if (command == "ตาราง" && commandLen == 2) {
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
      !(await validateLeaveRequest(client, commandArr, commandLen, replyToken))
    )
      return;

    await addNewLeaveRequest(pool, client, replyToken, member, commandArr);
  }

  // เตือน <รายวัน, approve>
  else if (command == "เตือน" && commandLen == 2) {
    const option = commandArr[1];
    if (option == "approve") await showWaitApprove(pool, client, replyToken);
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
    if (ids.length == 1)
      // TODO: validate single approval
      await updateApproveFlag(pool, client, replyToken, ids[0]);

    // TODO: validate multiple approvals
    // TODO: Bulk Update
  }
  //👉รายงาน <วันนี้, วีคนี้, เดือนนี้> (⛔ Developing)
  else if (command == "รายงาน" && commandLen == 2) {
    const reportType = commandArr[1];
    // command validation
    if (!validReportTypes.includes(reportType)) {
      const replyMessage = `⛔ ตัวเลือก '${reportType}' ไม่มีในระบบ`;
      await pushMsg(client, replyToken, replyMessage);
      return;
    }

    if (reportType == "วันนี้") await showListToday(pool, client, replyToken);
  }
}
