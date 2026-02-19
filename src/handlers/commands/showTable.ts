import { tableLists } from "../../configs/constants";
import { pool } from "../../configs/database";
import { lineClient } from "../../configs/lineClient";
import {
  getAllPendingHh,
  getAllRemainingHh,
} from "../../repositories/happyHour";
import { IMember } from "../../types/interface";
import { buildMemberListBubble } from "../../utils/flexMessage";
import { replyFlexMessage, replyMessage } from "../../utils/sendLineMsg";

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
    if (tableName === "member") {
      const [{ rows }, allHh, pendingMap] = await Promise.all([
        pool.query("SELECT * FROM member ORDER BY is_admin DESC, name"),
        getAllRemainingHh(pool),
        getAllPendingHh(pool),
      ]);
      const members = rows as IMember[];

      // Build HH remaining map
      const hhMap: { [key: string]: number } = {};
      allHh.forEach((h) => {
        hhMap[h.member] = h.remaining || 0;
      });

      const memberData = members.map((m) => ({
        name: m.name,
        isAdmin: m.is_admin,
        hhRemaining: hhMap[m.name] || 0,
        hhPending: pendingMap[m.name] || 0,
      }));

      const flexMsg = buildMemberListBubble(memberData);
      await replyFlexMessage(lineClient, replyToken, flexMsg);
    } else if (tableName === "happy_hour") {
      const allRemainingHhs = await getAllRemainingHh(pool);
      const msg =
        "❤️ ยอด HH คงเหลือแต่ละคน \n" +
        allRemainingHhs
          .map((detail) => `- ${detail.member}: ${detail.remaining}h`)
          .join("\n");

      if (msg) {
        await replyMessage(lineClient, replyToken, msg);
      } else {
        await replyMessage(lineClient, replyToken, "⚠️ No data found.");
      }
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
