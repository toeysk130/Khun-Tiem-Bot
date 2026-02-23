import axios from "axios";

const OPENAI_API_KEY = process.env.CHAT_GPT_API;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// ── AI Personality Modes ──

export type AIMode = "สุภาพ" | "ก้าวร้าว";

let currentMode: AIMode = "สุภาพ";

export function getAIMode(): AIMode {
  return currentMode;
}

export function setAIMode(mode: AIMode): void {
  currentMode = mode;
}

const PERSONALITIES: Record<AIMode, string> = {
  สุภาพ: `บุคลิก: เป็นกันเอง น่ารัก ตลกนิดๆ ใส่ emoji ใช้ภาษาไทย ห้ามใช้คำหยาบ
- พูดจาสุภาพ อ่อนโยน ลงท้ายด้วย คะ/ค่ะ/นะคะ
- ให้กำลังใจ ชมเชย อบอุ่น`,
  ก้าวร้าว: `บุคลิก: จิกกัด แซวแรง พูดห้วนๆ ตลกร้าย แต่ลึกๆแคร์ ใส่ emoji ใช้ภาษาไทย ห้ามใช้คำหยาบ
- พูดห้วน ตรงๆ ไม่อ้อมค้อม ไม่ใช้ครับ/คะ ลงท้ายแบบขำๆ
- แซวเรื่องลาเยอะ ลาบ่อย มาสาย ขี้เกียจ แต่ห้ามคำหยาบจริงๆ
- ถ้าคนลาพักร้อน แซวว่าไปเที่ยวสนุกน่าดู ทิ้งงานให้คนอื่น
- ถ้าคนลาป่วย ก็ยังแซวได้ว่า "แหม ป่วยอีกแล้วเหรอ" แต่ไม่ร้ายเกิน`,
};

const BOT_CONTEXT_BASE = `คุณชื่อ "ขุนเทียม" เป็น LINE Bot ผู้ช่วยประจำทีมพัฒนาซอฟต์แวร์
หน้าที่หลัก:
- จัดการเรื่องวันลา (ลาพักร้อน, ลาป่วย, ลากิจ) — แจ้งลา, อนุมัติ, ดูรายงาน, สรุปสถิติ
- จัดการ Happy Hour (HH) — บันทึกชั่วโมง, ดูยอดคงเหลือ, อนุมัติ
- แจ้งเตือนอัตโนมัติ — เตือนก่อนวันลา, สรุปรายสัปดาห์
- ให้ข้อมูลสถิติและวิเคราะห์ภาพรวมการลาของทีม

รูปแบบคำสั่งทั้งหมด:
1. แจ้งลา <ประเภท> <วันที่> <จำนวน> <key|nokey> <เหตุผล>
   - ประเภท: ลาพักร้อน, ลาป่วย, ลากิจ
   - วันที่: วันเดียว DDMMMYY เช่น 01JAN26 | ช่วงวัน DDMMMYY-DDMMMYY เช่น 01JAN26-03JAN26
   - จำนวน: 1วัน, 2วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย
   - key = มี Key ลา, nokey = ไม่มี Key ลา
   - ตัวอย่าง: แจ้งลา ลาพักร้อน 01JAN26-03JAN26 3วัน nokey ไปเที่ยว
2. nc <ประเภท> <วันที่> <จำนวน> <เหตุผล>  (แจ้งลาแบบย่อ ไม่ระบุ key)
   - ตัวอย่าง: nc ลาป่วย 15FEB26 1วัน ไม่สบาย
3. hh เพิ่ม <ชั่วโมง>h <เหตุผล>  |  hh ใช้ <ชั่วโมง>h <เหตุผล>
   - ตัวอย่าง: hh เพิ่ม 2h ทำ OT  |  hh ใช้ 1h ไปหาหมอ
4. hh approve <id> หรือ <id,id,id>
5. approve <id> หรือ <id,id,id> (อนุมัติลา)
6. รายงาน ของฉัน | รายงาน วันนี้ | รายงาน วีคนี้ | แอบดู <ชื่อ>
7. สรุป | สรุป ทั้งหมด | สรุป ทีม | สรุป ทีม ทั้งหมด
8. สถิติ
9. อัปเดต <id> <key|nokey>
10. ลบ <id>
11. ตาราง member | ตาราง happy_hour
12. เตือน (admin: ส่งการแจ้งเตือนคนที่ยังไม่ approve)
13. สมัคร <ชื่อ>
14. ขุนเทียม <คำถามอะไรก็ได้>
15. โหมด สุภาพ | โหมด ก้าวร้าว (เปลี่ยนบุคลิก AI)

หมายเหตุ: เดือนที่ใช้ JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC + ปีย่อ 2 หลัก เช่น 26 = 2026`;

function getBotContext(): string {
  return `${BOT_CONTEXT_BASE}\n\n${PERSONALITIES[currentMode]}`;
}

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
  const systemPrompt = `${getBotContext()}
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
  const systemPrompt = `${getBotContext()}
คุณกำลังส่งข้อความเตือนการลาของ "พรุ่งนี้" ในกลุ่ม LINE ของทีม
เขียนข้อความสั้นๆ (2-3 บรรทัด) ใส่ emoji ให้สนุก
กฎ:
- ต้องระบุให้ชัดเจนว่าเป็นเรื่องของ "พรุ่งนี้" (Tomorrow) ห้ามพิมพ์ว่า "วันนี้" เด็ดขาด
- ถ้ามีคนลาป่วย (พรุ่งนี้) → อวยพรให้หายไวๆ อย่างอบอุ่น
- ถ้ามีคนลาพักร้อน (พรุ่งนี้) → แซวเบาๆ เช่น "ไปเที่ยวมาเล่าให้ฟังด้วยนะ"
- ถ้ามีคนลากิจ (พรุ่งนี้) → ขอให้เรื่องส่วนตัวเรียบร้อย
- ถ้าไม่มีใครลา (พรุ่งนี้) → ให้พิมพ์ข้อความบอกว่า "พรุ่งนี้ไม่มีใครลา" ชื่นชมทีม เล่นมุขตลก ให้กำลังใจ
- เน้นบรรยากาศอบอุ่น ตลก ไม่เกินเลย
- ตอบเฉพาะข้อความ ไม่ต้องมี prefix หรือ header`;

  let userMsg: string;
  if (leaveList.length === 0) {
    userMsg =
      "พรุ่งนี้ไม่มีใครลาเลย ช่วยเขียนบอกทีมว่าพรุ่งนี้ไม่มีคนลา และเขียนข้อความให้กำลังใจทีมหน่อย";
  } else {
    const details = leaveList
      .map((l) => `${l.member} ${l.leaveType} ${l.period}`)
      .join(", ");
    userMsg = `พรุ่งนี้มีคนลา: ${details}\nเขียนข้อความเตือนสำหรับพรุ่งนี้ให้สนุกหน่อย`;
  }

  const result = await callOpenAI(systemPrompt, userMsg, 200);
  return result || "";
}

export async function summarizeData(dataContext: string): Promise<string> {
  const systemPrompt = `${getBotContext()}
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

export async function enhanceErrorWithAI(
  userInput: string,
  errorMessage: string,
): Promise<string> {
  const systemPrompt = `${getBotContext()}
ผู้ใช้พิมพ์คำสั่งผิด คุณต้องช่วยแนะนำคำสั่งที่ถูกต้อง
กฎ:
- ดูจากสิ่งที่ผู้ใช้พิมพ์ แล้วเดาว่าเขาต้องการทำอะไร
- แนะนำคำสั่งที่ถูกต้องแบบครบถ้วน พร้อมตัวอย่างจริงที่ใช้ได้เลย
- ตอบสั้นๆ 1-2 บรรทัด ใส่ emoji
- ไม่ต้องพูดซ้ำข้อผิดพลาด ให้เน้นวิธีแก้`;

  const userMsg = `ผู้ใช้พิมพ์: "${userInput}"
ข้อผิดพลาด: ${errorMessage}
ช่วยแนะนำคำสั่งที่ถูกต้อง`;

  const result = await callOpenAI(systemPrompt, userMsg, 150);
  if (result) {
    return `${errorMessage}\n\n🤖 ขุนเทียมช่วย:\n${result}`;
  }
  return errorMessage;
}

export async function generateAIComment(
  username: string,
  userCommand: string,
  wasSuccessful: boolean,
): Promise<string | null> {
  const systemPrompt = `${getBotContext()}
คุณเป็นผู้ช่วยที่คอยดูการใช้งานคำสั่ง แล้วแสดงความเห็นสั้นๆ
กฎ:
- ตอบ 1 ประโยค สั้นมากๆ ไม่เกิน 2 บรรทัด
- ใส่ emoji ให้เหมาะสม
- ถ้าคำสั่งสำเร็จ: แซว ชม หรือพูดตลกเกี่ยวกับสิ่งที่ผู้ใช้ทำ (ห้ามซ้ำกับข้อความตอบกลับ)
- ถ้าคำสั่งผิดพลาด: ให้คำแนะนำสั้นๆ ว่าควรพิมพ์แบบไหน
- เรียกชื่อผู้ใช้เป็นระยะ ทำให้เป็นกันเอง
- ห้ามพูดซ้ำข้อมูลที่ Bot ตอบไปแล้ว`;

  const context = wasSuccessful
    ? `ผู้ใช้ "${username}" พิมพ์: "${userCommand}" → ทำงานสำเร็จ ช่วยแสดงความเห็นสั้นๆ`
    : `ผู้ใช้ "${username}" พิมพ์: "${userCommand}" → เกิดข้อผิดพลาด ช่วยแนะนำสั้นๆ`;

  return callOpenAI(systemPrompt, context, 80);
}

// ── Natural Language → Command Parser ──

export interface ParsedCommand {
  intent: string | null; // "แจ้งลา" | "hh" | "ลบ" | "อัปเดต" | null
  command: string | null; // complete command string or null
  question: string | null; // follow-up question if info incomplete
}

export async function parseNaturalLanguageCommand(
  conversationHistory: { role: string; content: string }[],
  username: string,
): Promise<ParsedCommand | null> {
  const today = new Date();
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const dd = String(today.getDate()).padStart(2, "0");
  const mmm = months[today.getMonth()];
  const yy = String(today.getFullYear()).slice(-2);
  const currentDate = `${dd}${mmm}${yy}`;

  const systemPrompt = `${getBotContext()}

วันนี้คือ ${currentDate} (${today.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})
ชื่อผู้ใช้คือ "${username}"

คุณเป็นตัวช่วยแปลงภาษาธรรมชาติเป็นคำสั่ง Bot
ผู้ใช้อาจพูดแบบธรรมชาติ เช่น "พรุ่งนี้ลาพักร้อนนะ ครึ่งบ่าย" ให้แปลงเป็นคำสั่งที่สมบูรณ์

กฎสำคัญ:
1. ถ้าข้อความไม่เกี่ยวกับ แจ้งลา/hh/ลบ/อัปเดต ให้ intent = null
2. ถ้าข้อมูลครบ → สร้าง command ที่สมบูรณ์
3. ถ้าข้อมูลไม่ครบ → ถามเฉพาะสิ่งที่ขาด ถามให้ครบในรอบเดียว สั้นกระชับ
4. "พรุ่งนี้" = วันถัดไป, "มะรืน" = 2 วันถัดไป แปลงเป็นรูปแบบ DD${mmm}${yy}
5. ถ้าไม่ระบุ key/nokey → ใช้ key เป็นค่าเริ่มต้น
6. ถ้าไม่ระบุจำนวนวัน → คำนวณจากวันที่เริ่ม-สิ้นสุด หรือใช้ 1วัน
7. command จะต้องเป็นตัวพิมพ์เล็กทั้งหมด ยกเว้นวันที่ (DDMMMYY)

ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น:
{
  "intent": "แจ้งลา" | "hh" | "ลบ" | "อัปเดต" | null,
  "command": "คำสั่งสมบูรณ์" | null,
  "question": "คำถามที่ต้องการข้อมูลเพิ่ม" | null
}`;

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ];

    const response = await axios.post(
      OPENAI_URL,
      {
        model: "gpt-4o-mini",
        messages,
        max_tokens: 200,
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as ParsedCommand;
    return parsed;
  } catch (error: any) {
    console.error(
      "parseNaturalLanguageCommand error:",
      error?.response?.data || error.message,
    );
    return null;
  }
}
