import axios from "axios";

const OPENAI_API_KEY = process.env.CHAT_GPT_API;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 300,
): Promise<string | null> {
  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data?.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    console.error("OpenAI API error:", error?.response?.data || error.message);
    return null;
  }
}

export async function chatWithAI(message: string): Promise<string> {
  const result = await callOpenAI(
    "คุณชื่อ ขุนเทียม เป็นผู้ช่วยในทีมพัฒนาซอฟต์แวร์ ตอบสั้นกระชับ ใช้ภาษาไทย น่ารักและตลกนิดๆ ใส่ emoji บ้าง",
    message,
    500,
  );
  return result || "🤖 ขุนเทียมคิดไม่ออก...";
}

export async function generateDailyGreeting(
  leaveList: { member: string; leaveType: string; period: string }[],
): Promise<string> {
  const systemPrompt = `คุณชื่อ ขุนเทียม เป็น Bot ผู้ช่วยทีมพัฒนาซอฟต์แวร์
คุณต้องเขียนข้อความแจ้งเตือนสั้นๆ (2-3 บรรทัด) ใส่ emoji ให้สนุก
กฎ:
- ถ้ามีคนลาป่วย → อวยพรให้หายไวๆ อย่างอบอุ่น
- ถ้ามีคนลาพักร้อน → แซวเบาๆ เช่น "ไปเที่ยวมาเล่าให้ฟังด้วยนะ"
- ถ้ามีคนลากิจ → ขอให้เรื่องส่วนตัวเรียบร้อย
- ถ้าไม่มีใครลา → ชื่นชมทีม เล่นมุขตลก ให้กำลังใจ
- ห้ามใช้คำหยาบ เน้นบรรยากาศอบอุ่น ตลก ไม่เกินเลย
- ตอบเฉพาะข้อความ ไม่ต้องมี prefix หรือ header`;

  let userMsg: string;
  if (leaveList.length === 0) {
    userMsg = "พรุ่งนี้ไม่มีใครลาเลย เขียนข้อความให้กำลังใจทีมหน่อย";
  } else {
    const details = leaveList
      .map((l) => `${l.member} ${l.leaveType} ${l.period}`)
      .join(", ");
    userMsg = `พรุ่งนี้มีคนลา: ${details}\nเขียนข้อความแจ้งเตือนให้สนุกหน่อย`;
  }

  const result = await callOpenAI(systemPrompt, userMsg, 200);
  return result || "";
}
