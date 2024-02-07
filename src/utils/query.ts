import { Client } from "@line/bot-sdk";
import pg from "pg";
import { pushMsg } from "./sendLineMsg";

export async function callQuery(
  pool: pg.Pool,
  client: Client,
  replyToken: string,
  query: string,
  value: any[],
  successMsg: string,
  failMsg: string
) {
  try {
    await pool.query(query, value);
    await pushMsg(client, replyToken, successMsg);
  } catch (error) {
    console.error(error);
    await pushMsg(client, replyToken, failMsg);
  }
}
