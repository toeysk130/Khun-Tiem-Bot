import { UserMetaData } from "../../types/interface";
import { replyMessage } from "../../utils/sendLineMsg";
import { lineClient } from "../../configs/lineClient";
import { pool } from "../../configs/database";
import { tableLists } from "../../configs/constants";
import { IMember } from "../../types/interface";
import { getAllRemainingHh } from "../../repositories/happyHour";

export async function handleShowTableCommand(
  commandArr: string[],
  replyToken: string,
) {
  if (commandArr.length !== 2) {
    await replyMessage(
      lineClient,
      replyToken,
      `⚠️ Invalid usage of the "ตาราง" command. Please provide a valid table name.\n Ex: ตาราง (${tableLists.join(
        ", ",
      )})`,
    );
    return;
  }

  const tableName = commandArr[1];

  if (!tableLists.includes(tableName)) {
    await replyMessage(
      lineClient,
      replyToken,
      `⛔ Table "${tableName}" is not recognized. Please choose from the valid tables: ${tableLists.join(
        ", ",
      )}`,
    );
    return;
  }

  try {
    let msg = "";

    if (tableName === "member") {
      const { rows } = await pool.query(
        `SELECT * FROM member ORDER BY is_admin, name`,
      );
      const members = rows as IMember[];
      msg = members
        .map((member) => `${member.name} ${member.is_admin ? "(admin)" : ""}`)
        .join("\n");
    } else if (tableName === "happy_hour") {
      const allRemainingHhs = await getAllRemainingHh(pool);
      msg =
        "❤️ ยอด HH คงเหลือแต่ละคน \n" +
        allRemainingHhs
          .map((detail) => `- ${detail.member}: ${detail.remaining}h`)
          .join("\n");
    }

    if (msg) {
      await replyMessage(lineClient, replyToken, msg);
    } else {
      await replyMessage(lineClient, replyToken, "⚠️ No data found.");
    }
  } catch (error) {
    console.error(`Error in showTable for table ${tableName}:`, error);
    await replyMessage(
      lineClient,
      replyToken,
      `❌ An error occurred while fetching data from ${tableName}.`,
    );
  }
}
