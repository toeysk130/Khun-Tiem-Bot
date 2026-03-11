import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import {
  checkIfHhIdExist,
  checkIfMyHhIdExist,
  getNotApproveHHLists,
} from "../../repositories/happyHour";
import { pushFlexMessage } from "../../cron/pushMessage";
import { addHhRecord, deleteHhRecord, updateHhApproveFlag } from "../../services/hhService";
import { addNewHhLeaveRequest } from "../../services/leaveService";
import { enhanceErrorWithAI } from "../../services/openaiService";
import { UserMetaData } from "../../types/interface";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";
import { validateHhRequest } from "../../validations/validateHhReq";

export async function handleHhCommand(
  commandArr: string[],
  userMetaData: UserMetaData,
): Promise<boolean> {
  if (commandArr.length < 2) {
    const baseError = `⚠️ การใช้คำสั่ง "hh" ไม่ถูกต้อง ตัวอย่าง: "hh เพิ่ม 1h เหตุผล" หรือ "hh ใช้ 2h เหตุผล"`;
    const enhanced = await enhanceErrorWithAI(commandArr.join(" "), baseError);
    await replyMessage(lineClient, userMetaData.replyToken, enhanced);
    return false;
  }

  const hhSubCommand = commandArr[1];

  switch (hhSubCommand) {
    case "เพิ่ม":
      return await handleAddHhRecord(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
    case "ใช้":
      return await handleUseHhRequest(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
    case "approve":
      return await handleHhApproveRequest(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
    case "ลบ":
      return await handleDeleteHhRecord(
        commandArr,
        userMetaData,
        userMetaData.replyToken,
      );
    default:
      await replyMessage(
        lineClient,
        userMetaData.replyToken,
        `⛔ คำสั่ง "hh" ที่ไม่รู้จัก "${hhSubCommand}" ตัวเลือกที่สามารถใช้ได้: "เพิ่ม", "ใช้", "approve", "ลบ"`,
      );
      return false;
  }
}

async function handleAddHhRecord(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
): Promise<boolean> {
  if (commandArr.length < 3) {
    await replyMessage(
      lineClient,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh เพิ่ม" ไม่ถูกต้อง ตัวอย่าง: "hh เพิ่ม 1h เหตุผล"`,
    );
    return false;
  }

  const hhAmt = parseInt(commandArr[2]);
  if (isNaN(hhAmt)) {
    await replyMessage(
      lineClient,
      replyToken,
      `⚠️ จำนวนชั่วโมงไม่ถูกต้อง กรุณาระบุจำนวนชั่วโมงที่ถูกต้อง`,
    );
    return false;
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
    return true;
  } catch (error) {
    console.error("Error adding HH record:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะเพิ่มชั่วโมง Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`,
    );
    return false;
  }
}

async function handleUseHhRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
): Promise<boolean> {
  // Allowed everywhere now

  const isValidRequest = await validateHhRequest(userMetaData, commandArr);
  if (!isValidRequest) return false;

  try {
    const flexMsg = await addNewHhLeaveRequest(
      pool,
      userMetaData.username,
      commandArr,
    );
    await replyFlexMessage(lineClient, replyToken, flexMsg);

    if (userMetaData.chatType !== "GROUP") {
      await pushFlexMessage(flexMsg);
    }
    return true;
  } catch (error) {
    console.error("Error processing HH request:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะใช้ชั่วโมง Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`,
    );
    return false;
  }
}

async function handleHhApproveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
): Promise<boolean> {
  if (!userMetaData.isAdmin) {
    await replyMessage(
      lineClient,
      replyToken,
      "😡 คุณไม่ใช่ Admin ไม่สามารถใช้งานได้!",
    );
    return false;
  }

  if (commandArr.length < 3) {
    await replyMessage(
      lineClient,
      replyToken,
      '⚠️ การใช้คำสั่ง "hh approve" ไม่ถูกต้อง ตัวอย่าง: "hh approve 8" หรือ "hh approve 3,4,8" หรือ "hh approve all"',
    );
    return false;
  }

  try {
    let ids: number[];

    if (commandArr[2].toLowerCase() === "all") {
      // Approve ALL pending HH records
      const pendingList = await getNotApproveHHLists(pool);
      if (pendingList.length === 0) {
        await replyMessage(
          lineClient,
          replyToken,
          "✅ ไม่มี HH ที่รอ Approve แล้ว",
        );
        return false;
      }
      ids = pendingList.map((hh) => hh.id);
    } else {
      ids = commandArr[2].split(",").map((item) => Number(item.trim()));
    }

    for (const id of ids) {
      const exists = await checkIfHhIdExist(pool, id.toString());
      if (!exists) {
        await replyMessage(
          lineClient,
          replyToken,
          `⛔ ไม่มี ID:${id} ในระบบ Happy Hour`,
        );
        return false;
      }
    }

    await updateHhApproveFlag(pool, lineClient, replyToken, ids);
    return true;
  } catch (error) {
    console.error("Error approving HH IDs:", error);
    await replyMessage(
      lineClient,
      replyToken,
      "❌ เกิดข้อผิดพลาดขณะอนุมัติ Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง",
    );
    return false;
  }
}

async function handleDeleteHhRecord(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string,
): Promise<boolean> {
  if (commandArr.length < 3) {
    await replyMessage(
      lineClient,
      replyToken,
      `⚠️ การใช้คำสั่ง "hh ลบ" ไม่ถูกต้อง ตัวอย่าง: "hh ลบ 5"`,
    );
    return false;
  }

  const id = commandArr[2];

  if (isNaN(Number(id))) {
    await replyMessage(
      lineClient,
      replyToken,
      `⚠️ ID "${id}" ต้องเป็นตัวเลข`,
    );
    return false;
  }

  // Admin can delete any HH record, normal users can only delete their own
  if (userMetaData.isAdmin) {
    const exists = await checkIfHhIdExist(pool, id);
    if (!exists) {
      await replyMessage(
        lineClient,
        replyToken,
        `⛔ ไม่มี ID:${id} ในระบบ Happy Hour`,
      );
      return false;
    }
  } else {
    const exists = await checkIfMyHhIdExist(pool, userMetaData.username, id);
    if (!exists) {
      await replyMessage(
        lineClient,
        replyToken,
        `⛔ ไม่มี ID:${id} ที่เป็นของ '${userMetaData.username}' ในระบบ Happy Hour`,
      );
      return false;
    }
  }

  try {
    await deleteHhRecord(pool, lineClient, replyToken, id);
    return true;
  } catch (error) {
    console.error("Error deleting HH record:", error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ เกิดข้อผิดพลาดขณะลบ Happy Hour กรุณาลองใหม่อีกครั้งภายหลัง`,
    );
    return false;
  }
}

