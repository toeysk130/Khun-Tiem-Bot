import axios from "axios";

const OPENAI_API_KEY = process.env.CHAT_GPT_API;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function chatWithAI(message: string): Promise<string> {
  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "คุณชื่อ ขุนเทียม เป็นผู้ช่วยในทีมพัฒนาซอฟต์แวร์ ตอบสั้นกระชับ ใช้ภาษาไทย น่ารักและตลกนิดๆ ใส่ emoji บ้าง",
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return (
      response.data?.choices?.[0]?.message?.content || "🤖 ขุนเทียมคิดไม่ออก..."
    );
  } catch (error: any) {
    console.error("OpenAI API error:", error?.response?.data || error.message);
    return "❌ ขุนเทียมเชื่อมต่อ AI ไม่ได้ตอนนี้ ลองใหม่ทีนะ";
  }
}
