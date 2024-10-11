import {
  addHhRecord,
  checkIfHhIdExist,
  updateHhApproveFlag,
} from "../../API/hhAPI";
import { addNewHhLeaveRequest } from "../../API/leaveScheduleAPI";
import { UserMetaData } from "../../config/interface";
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
      `⚠️ Invalid usage of the "hh" command. Example: "hh เพิ่ม 1h เหตุผล" or "hh ใช้ 2h เหตุผล"`
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
        `⛔ Unknown hh command "${hhSubCommand}". Available options: "เพิ่ม", "ใช้", "approve"`
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
      `⚠️ Invalid usage of the "hh เพิ่ม" command. Example: "hh เพิ่ม 1h เหตุผล"`
    );
  }

  const hhAmt = parseInt(commandArr[2]);
  if (isNaN(hhAmt)) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ Invalid hour amount. Please provide a valid number of hours.`
    );
  }

  const description = commandArr.slice(3).join(" "); // Use the remaining parts as the description

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
      `✅ Successfully added ${hhAmt} happy hour(s) with description: ${description}`
    );
  } catch (error) {
    console.error("Error adding HH record:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while adding happy hour(s). Please try again later.`
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
    return pushMsg(client, replyToken, `❌ Invalid happy hour request.`);
  }

  try {
    await addNewHhLeaveRequest(
      pool,
      client,
      replyToken,
      userMetaData.username,
      commandArr
    );
    await pushMsg(client, replyToken, `✅ Successfully used happy hour(s).`);
  } catch (error) {
    console.error("Error processing HH request:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while processing the happy hour request. Please try again later.`
    );
  }
}

// Function to handle "hh approve"
async function handleHhApproveRequest(
  commandArr: string[],
  userMetaData: UserMetaData,
  replyToken: string
) {
  // Only Admins can approve HH requests
  if (!userMetaData.isAdmin) {
    return pushMsg(client, replyToken, "😡 ไม่ใช่ Admin ใช้งานไม่ได้!");
  }

  if (commandArr.length < 3) {
    return pushMsg(
      client,
      replyToken,
      `⚠️ Invalid usage of the "hh approve" command. Example: "hh approve 8" or "hh approve 3,4,8"`
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
      `✅ Successfully approved Happy Hour for IDs: ${ids.join(", ")}`
    );
  } catch (error) {
    console.error("Error approving HH IDs:", error);
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while approving the happy hour IDs. Please try again later.`
    );
  }
}
