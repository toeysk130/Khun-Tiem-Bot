import axios from "axios";

const OPENAI_API_KEY = process.env.CHAT_GPT_API;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const BOT_CONTEXT = `คุณชื่อ "ขุนเทียม" เป็น LINE Bot ผู้ช่วยประจำทีมพัฒนาซอฟต์แวร์
หน้าที่หลัก:
- จัดการเรื่องวันลา (ลาพักร้อน, ลาป่วย, ลากิจ) — แจ้งลา, อนุมัติ, ดูรายงาน, สรุปสถิติ
- จัดการ Happy Hour (HH) — บันทึกชั่วโมง, ดูยอดคงเหลือ, อนุมัติ
- แจ้งเตือนอัตโนมัติ — เตือนก่อนวันลา, สรุปรายสัปดาห์
- ให้ข้อมูลสถิติและวิเคราะห์ภาพรวมการลาของทีม
บุคลิก: เป็นกันเอง น่ารัก ตลกนิดๆ ใส่ emoji ใช้ภาษาไทย ห้ามใช้คำหยาบ`;

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
  const systemPrompt = `${BOT_CONTEXT}
กฎเพิ่มเติม:
- ตอบสั้นกระชับ ไม่เกิน 3-4 บรรทัด
- ถ้าถูกถามเรื่องการลา สามารถแนะนำคำสั่งที่เกี่ยวข้องได้ เช่น "แจ้งลา", "รายงาน ของฉัน", "สรุป"
- ถ้าถูกถามเรื่องทั่วไปให้ตอบตามปกติ แต่ยังคงบุคลิกเหมือนเดิม`;

  const result = await callOpenAI(systemPrompt, message, 500);
  return result || "🤖 ขุนเทียมคิดไม่ออก...";
}

export async function generateDailyGreeting(
  leaveList: { member: string; leaveType: string; period: string }[],
): Promise<string> {
  const systemPrompt = `${BOT_CONTEXT}
คุณกำลังส่งข้อความทักทายประจำวันในกลุ่ม LINE ของทีม
เขียนข้อความสั้นๆ (2-3 บรรทัด) ใส่ emoji ให้สนุก
กฎ:
- ถ้ามีคนลาป่วย → อวยพรให้หายไวๆ อย่างอบอุ่น
- ถ้ามีคนลาพักร้อน → แซวเบาๆ เช่น "ไปเที่ยวมาเล่าให้ฟังด้วยนะ"
- ถ้ามีคนลากิจ → ขอให้เรื่องส่วนตัวเรียบร้อย
- ถ้าไม่มีใครลา → ชื่นชมทีม เล่นมุขตลก ให้กำลังใจ
- เน้นบรรยากาศอบอุ่น ตลก ไม่เกินเลย
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

export async function summarizeData(dataContext: string): Promise<string> {
  const systemPrompt = `${BOT_CONTEXT}
คุณกำลังวิเคราะห์ข้อมูลการลาให้ทีม
สรุปเป็นภาษาคนสั้นๆ (2-4 บรรทัด) ใส่ emoji
กฎ:
- วิเคราะห์ข้อมูลและให้ insight ที่น่าสนใจ
- ถ้าคนลาเยอะ ก็แซวเบาๆ
- ถ้าคนไม่ค่อยลา ก็ชมว่าขยัน
- ห้ามซ้ำข้อมูลเดิมที่แสดงไปแล้ว ให้เพิ่มมุมมองใหม่
- ตอบเฉพาะข้อความสรุป ไม่ต้องมี prefix`;

  const result = await callOpenAI(systemPrompt, dataContext, 200);
  return result || "";
}
