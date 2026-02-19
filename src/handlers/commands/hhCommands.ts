import { UserMetaData } from "../../types/interface";
import { checkIfHhIdExist } from "../../repositories/happyHour";
import { addHhRecord, updateHhApproveFlag } from "../../services/hhService";
import { addNewHhLeaveRequest } from "../../services/leaveService";
import { replyMessage } from "../../utils/sendLineMsg";
import { validateHhRequest } from "../../validations/validateHhReq";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";

export async function handleHhCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
) {
  if (commandArr.length < 2) {
    return replyMessage(
      lineClient,
      userMetaData.replyToken,
      `⚠️ การใช้คำสั่ง "hh" ไม่ถูกต้อง ตัวอย่าง: "hh เพิ่ม 1h เหตุผล" หรือ "hh ใช้ 2h เหตุผล"`,
    );
  }

  const hhSubCommand = commandArr[1];

  switch (hhSubCommand) {
    case "เพิ่ม":
      await handleAddHhRecord(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
      break;
    case "ใช้":
      await handleUseHhRequest(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
      break;
    case "approve":
      await handleHhApproveRequest(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
      break;
    default:
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⛔ คำสั่ง "hh" ที่ไม่รู้จัก "${hhSubCommand}" ตัวเลือกที่สามารถใช้ได้: "เพิ่ม", "ใช้", "approve"`,
      );
      break;
  }
}

async function handleAddHhRecord(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
) {
  if (commandArr.length < 3) {
    return replyMessage(
      lineClient,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh เพิ่ม" ไม่ถูกต้อง ตัวอย่าง: "hh เพิ่ม 1h เหตุผล"`,
    );
  }

  const hhAmt = parseInt(commandArr[2]);
  if (isNaN(hhAmt)) {
    return replyMessage(
      lineClient,
      replyToken,
      `⚠️ จำนวนชั่วโมงไม่ถูกต้อง กรุณาระบุจำนวนชั่วโมงที่ถูกต้อง`,
    );
  }

  const description = commandArr.slice(3).join(" ");

  try {
    await addHhRecord(
      pool,
      lineClient,
      replyToken,
      userMetaData.username,
      "เพิ่ม",
      hhAmt,
      description,
    );
  } catch (error) {
    console.error("Error adding HH record:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะเพิ่มชั่วโมง Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`,
    );
  }
}

async function handleUseHhRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
) {
  const isValidRequest = await validateHhRequest(userMetaData, commandArr);
  if (!isValidRequest) return;

  try {
    const msg = await addNewHhLeaveRequest(
      pool,
      userMetaData.username,
      commandArr,
    );
    await replyMessage(lineClient, replyToken, msg);
  } catch (error) {
    console.error("Error processing HH request:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะใช้ชั่วโมง Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`,
    );
  }
}

async function handleHhApproveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
) {
  if (!userMetaData.isAdmin) {
    return replyMessage(
      lineClient,
      replyToken,
      "😡 คุณไม่ใช่ Admin ไม่สามารถใช้งานได้!",
    );
  }

  if (commandArr.length < 3) {
    return replyMessage(
      lineClient,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh approve" ไม่ถูกต้อง ตัวอย่าง: "hh approve 8" หรือ "hh approve 3,4,8"`,
    );
  }

  const ids = commandArr[2].split(",").map((item) => Number(item.trim()));

  try {
    for (const id of ids) {
      const exists = await checkIfHhIdExist(pool, id.toString());
      if (!exists) {
        return replyMessage(
          lineClient,
          replyToken,
          `⛔ ไม่มี ID:${id} ในระบบ Happy Hour`,
        );
      }
    }

    await updateHhApproveFlag(pool, lineClient, replyToken, ids);
    await replyMessage(
      lineClient,
      replyToken,
      `✅ อนุมัติ Happy Hour สำเร็จสำหรับ ID: ${ids.join(", ")}`,
    );
  } catch (error) {
    console.error("Error approving HH IDs:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะอนุมัติ Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`,
    );
  }
}
