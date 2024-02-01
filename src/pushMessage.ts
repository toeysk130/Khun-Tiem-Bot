import axios from "axios";

export async function pushMessage() {
  // Replace with your Line API access token
  const LINE_ACCESS_TOKEN = "";

  // Replace with your Line Group ID
  const GROUP_ID = "";

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

  // Define the message you want to send
  const message = {
    type: "text",
    text: "Hello, Line Group!",
  };

  // Create the payload for the request
  const payload = {
    to: GROUP_ID,
    messages: [message],
  };

  // Send the message to the Line Group
  axiosInstance
    .post("", payload)
    .then((response) => {
      console.log("Message sent successfully:", response.data);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}
