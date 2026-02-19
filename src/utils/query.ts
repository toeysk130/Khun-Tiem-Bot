import { replyMessage } from "../utils/sendLineMsg";
import { pool } from "../configs/database";
import { lineClient } from "../configs/lineClient";

export async function callQuery(
  replyToken: string,
  query: string,
  values: any[],
  successMsg: string,
  failMsg: string,
) {
  try {
    if (!query || values.length === 0) {
      throw new Error("Invalid query or values provided.");
    }

    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      await replyMessage(lineClient, replyToken, successMsg);
    } else {
      await replyMessage(lineClient, replyToken, `⚠️ No changes were made.`);
    }
  } catch (error) {
    console.error(
      `Error executing query: ${query} with values: ${JSON.stringify(values)}`,
      error,
    );
    await replyMessage(
      lineClient,
      replyToken,
      failMsg || `❌ An error occurred while processing your request.`,
    );
  }
}
