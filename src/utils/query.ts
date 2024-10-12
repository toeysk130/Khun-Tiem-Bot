import { Client } from "@line/bot-sdk";
import pg from "pg";
import { pushMsg } from "./sendLineMsg";
import { client, pool } from "../handlers/handleIncomingMessage";

export async function callQuery(
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
