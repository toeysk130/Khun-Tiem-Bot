import { showTable } from "../../API/leaveScheduleAPI";
import { tableLists } from "../../config/config";
import { pushMsg } from "../../utils/sendLineMsg";
import { client, pool } from "../handleIncomingMessage";

export async function handleShowTableCommand(
  commandArr: string[],
  replyToken: string
) {
  // Command validation: Ensure the correct number of arguments
  if (commandArr.length !== 2) {
    await pushMsg(
      client,
      replyToken,
      `⚠️ Invalid usage of the "ตาราง" command. Please provide a valid table name.`
    );
    return;
  }

  const tableName = commandArr[1];

  // Validate if the requested table exists in the allowed table list
  if (!tableLists.includes(tableName)) {
    await pushMsg(
      client,
      replyToken,
      `⛔ Table "${tableName}" is not recognized. Please choose from the valid tables: ${tableLists.join(
        ", "
      )}`
    );
    return;
  }

  // Fetch the table data and display it
  try {
    await showTable(pool, client, tableName, replyToken);
  } catch (error) {
    await pushMsg(
      client,
      replyToken,
      `❌ An error occurred while fetching the data for table "${tableName}". Please try again later.`
    );
  }
}
