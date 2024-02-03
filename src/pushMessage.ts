import axios from "axios";
import * as dotenv from "dotenv";
import pg from "pg";
import { getListToday, getWaitApprove } from "./lineAPI";

// Setup
dotenv.config();
const pool = new pg.Pool();

export async function pushMessage() {
  const LINE_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || "";
  const GROUP_ID = process.env.GROUP_ID || "";

  // Line Messaging API endpoint
  const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

  // Create an Axios instance with the Line API headers
  const axiosInstance = axios.create({
    baseURL: LINE_API_URL,
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const listToday = await getListToday(pool);

  // Define the message you want to send
  const message1 = {
    type: "text",
    text: "☀️ สวัสดียามเช้าที่สดใส ☀️\n\n" + listToday,
  };

  // Create the payload for the request
  const payload1 = {
    to: GROUP_ID,
    messages: [message1],
  };

  // Send the message to the Line Group
  axiosInstance
    .post("", payload1)
    .then((response) => {
      console.log("Message sent successfully:", response.data);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });

  // =======================================
  // =======================================
  // =======================================

  const waitApprove = await getWaitApprove(pool);

  // Define the message you want to send
  const message2 = {
    type: "text",
    text: waitApprove,
  };

  // Create the payload for the request
  const payload2 = {
    to: GROUP_ID,
    messages: [message2],
  };

  // Send the message to the Line Group
  axiosInstance
    .post("", payload2)
    .then((response) => {
      console.log("Message sent successfully:", response.data);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}
