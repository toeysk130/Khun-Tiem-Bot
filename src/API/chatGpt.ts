import axios from "axios";
import { pushSingleMessage } from "./pushMessage";

const openaiApiKey = process.env.CHAT_GPT_API || "";
const maxTokens = 200;

export async function fetchOpenAICompletion(prompt: string): Promise<void> {
  const postData = {
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  };

  axios
    .post("https://api.openai.com/v1/chat/completions", postData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
    })
    .then(async (response) => {
      console.log(response.data.choices[0].message.content);
      await pushSingleMessage(response.data.choices[0].message.content);
    })
    .catch((error) => {
      console.error(error);
    });
}
