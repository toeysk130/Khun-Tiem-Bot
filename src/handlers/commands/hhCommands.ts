import { addNewHhLeaveRequest } from "../../API/leaveScheduleAPI";
import { UserMetaData } from "../../configs/interface";
import { checkIfHhIdExist } from "../../repositories/happyHour";
import { addHhRecord, updateHhApproveFlag } from "../../services/hhService";
import { pushMsg } from "../../utils/sendLineMsg";
import { validateHhRequest } from "../../validation/validateHhReq";
import { client, pool } from "../handleIncomingMessage";

export async function handleHhCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  // Validate the command format (hh <subcommand> <params>)
  if (commandArr.length < 2) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh" ไม่ถูกต้อง ตัวอย่าง: "hh เพิ่ม 1h เหตุผล" หรือ "hh ใช้ 2h เหตุผล"`
    );
  }

  const hhSubCommand = commandArr[1];

  switch (hhSubCommand) {
    case "เพิ่ม":
      await handleAddHhRecord(commandArr, userMetaData, replyToken);
      break;
    case "ใช้":
      await handleUseHhRequest(commandArr, userMetaData, replyToken);
      break;
    case "approve":
      await handleHhApproveRequest(commandArr, userMetaData, replyToken);
      break;
    default:
      await pushMsg(
        client,
        replyToken,
        `⛔ คำสั่ง "hh" ที่ไม่รู้จัก "${hhSubCommand}" ตัวเลือกที่สามารถใช้ได้: "เพิ่ม", "ใช้", "approve"`
      );
      break;
  }
}

// Function to handle "hh เพิ่ม"
async function handleAddHhRecord(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  if (commandArr.length < 3) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh เพิ่ม" ไม่ถูกต้อง ตัวอย่าง: "hh เพิ่ม 1h เหตุผล"`
    );
  }

  const hhAmt = parseInt(commandArr[2]);
  if (isNaN(hhAmt)) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ จำนวนชั่วโมงไม่ถูกต้อง กรุณาระบุจำนวนชั่วโมงที่ถูกต้อง`
    );
  }

  const description = commandArr.slice(3).join(" "); // ใช้ส่วนที่เหลือเป็นคำอธิบาย

  try {
    await addHhRecord(
      pool,
      client,
      replyToken,
      userMetaData.username,
      "เพิ่ม",
      hhAmt,
      description
    );
    await pushMsg(
      client,
      replyToken,
      `✅ เพิ่มชั่วโมง Happy Hour จำนวน ${hhAmt} ชั่วโมงสำเร็จ พร้อมคำอธิบาย: ${description}`
    );
  } catch (error) {
    console.error("Error adding HH record:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะเพิ่มชั่วโมง Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`
    );
  }
}

// Function to handle "hh ใช้"
async function handleUseHhRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  const isValidRequest = await validateHhRequest(
    pool,
    client,
    replyToken,
    userMetaData.username,
    commandArr
  );

  if (!isValidRequest) {
    return pushMsg(client, replyToken, `❌ คำขอ Happy Hour ไม่ถูกต้อง`);
  }

  try {
    await addNewHhLeaveRequest(
      pool,
      client,
      replyToken,
      userMetaData.username,
      commandArr
    );
    await pushMsg(client, replyToken, `✅ ใช้ชั่วโมง Happy Hour สำเร็จ`);
  } catch (error) {
    console.error("Error processing HH request:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะใช้ชั่วโมง Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`
    );
  }
}

// Function to handle "hh approve"
async function handleHhApproveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  if (!userMetaData.isAdmin) {
    return pushMsg(
      client,
      replyToken,
      "😡 คุณไม่ใช่ Admin ไม่สามารถใช้งานได้!"
    );
  }

  if (commandArr.length < 3) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh approve" ไม่ถูกต้อง ตัวอย่าง: "hh approve 8" หรือ "hh approve 3,4,8"`
    );
  }

  // Extract IDs and validate them
  const ids = commandArr[2].split(",").map((item) => Number(item.trim()));

  try {
    for (const id of ids) {
      const exists = await checkIfHhIdExist(pool, id.toString());
      if (!exists) {
        return pushMsg(
          client,
          replyToken,
          `⛔ ไม่มี ID:${id} ในระบบ Happy Hour`
        );
      }
    }

    // If all IDs are valid, approve them
    await updateHhApproveFlag(pool, client, replyToken, ids);
    await pushMsg(
      client,
      replyToken,
      `✅ อนุมัติ Happy Hour สำเร็จสำหรับ ID: ${ids.join(", ")}`
    );
  } catch (error) {
    console.error("Error approving HH IDs:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะอนุมัติ Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`
    );
  }
}
