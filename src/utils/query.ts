import { pushMsg } from "./sendLineMsg";
import { client, pool } from "../handlers/handleIncomingMessage";

export async function callQuery(
  replyToken: string,
  query: string,
  values: any[],
  successMsg: string,
  failMsg: string
) {
  try {
    // Validate that the query and values are provided
    if (!query || values.length === 0) {
      throw new Error("Invalid query or values provided.");
    }

    // Execute the query
    const result = await pool.query(query, values);

    // Check if the result is valid
    if (result.rowCount > 0) {
      // Send success message if query affected rows
      await pushMsg(client, replyToken, successMsg);
    } else {
      // No rows were affected (possibly a non-update query)
      await pushMsg(client, replyToken, `⚠️ No changes were made.`);
    }
  } catch (error) {
    // Log detailed error message with the query and values for easier debugging
    console.error(
      `Error executing query: ${query} with values: ${JSON.stringify(values)}`,
      error
    );

    // Send fail message with a fallback if the original message is undefined
    await pushMsg(
      client,
      replyToken,
      failMsg || `❌ An error occurred while processing your request.`
    );
  }
}
