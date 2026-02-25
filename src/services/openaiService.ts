import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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

══════ คู่มือคำสั่งฉบับเต็ม ══════

1. แจ้งลา <ประเภท> <วันที่> <จำนวน> <key|nokey> [เหตุผล]
   ├─ ประเภท: ลาพักร้อน, ลาป่วย, ลากิจ (ต้องตรงเป๊ะ)
   ├─ วันที่: รูปแบบ DDMMMYY เช่น 01JAN26 (ต้องมี 7 ตัวอักษรเสมอ: 2 หลักวัน + 3 ตัวเดือน + 2 หลักปี)
   │       ช่วงวัน: DDMMMYY-DDMMMYY เช่น 01JAN26-03JAN26 (15 ตัวอักษร)
   ├─ จำนวน: สำหรับวันเดียว → 1วัน, ครึ่งเช้า, ครึ่งบ่าย | สำหรับหลายวัน → 2วัน, 3วัน, ..., 11วัน
   ├─ key = มี Key ลา, nokey = ไม่มี Key ลา
   └─ ตัวอย่าง: แจ้งลา ลาพักร้อน 01JAN26-03JAN26 3วัน nokey ไปเที่ยว
              แจ้งลา ลาป่วย 15FEB26 1วัน key ไม่สบาย

2. nc <ประเภท> <วันที่> <จำนวน> [เหตุผล]  (ไม่ต้อง count วันลา, auto-approve)
   ├─ ประเภท: อบรม, training, กิจกรรมบริษัท, ตรวจสุขภาพ (ต้องตรงเป๊ะ)
   ├─ วันที่ & จำนวน: เหมือนแจ้งลา
   └─ ตัวอย่าง: nc training 26FEB26 1วัน หลักสูตรดับเพลิง

3. hh เพิ่ม <N>h [เหตุผล]  — บันทึกชั่วโมง HH (รอ approve)
   ├─ N = 1-40 จำนวนเต็ม
   └─ ตัวอย่าง: hh เพิ่ม 2h ทำ OT วันเสาร์

4. hh ใช้ <N>h <วันที่DDMMMYY> <จำนวน> [เหตุผล]  — ใช้ HH แลกวันลา
   ├─ N = 1-40 จำนวนเต็ม
   ├─ วันที่ & จำนวน: เหมือนแจ้งลา
   └─ ตัวอย่าง: hh ใช้ 4h 27FEB26 ครึ่งเช้า เลิกเร็ว

5. hh approve <id> | <id,id,id> | all  — อนุมัติ HH (admin เท่านั้น)

6. approve <id> | <id,id,id> | all  — อนุมัติวันลา (admin เท่านั้น)

7. รายงาน <ตัวเลือก>
   ├─ รายงาน ของฉัน — ดูรายการลาของตัวเอง (ปีนี้)
   ├─ รายงาน ของฉัน ทั้งหมด — ดูย้อนหลังทุกปี
   ├─ รายงาน วันนี้ — ดูว่าวันนี้ใครลาบ้าง
   ├─ รายงาน วีคนี้ / รายงาน วีคหน้า — สรุปการลาประจำสัปดาห์
   └─ รายงาน เดือนนี้ — สรุปการลาเดือนปัจจุบัน

8. แอบดู <ชื่อสมาชิก> — ดูรายการลาของคนอื่น | แอบดู <ชื่อ> ทั้งหมด (ย้อนหลัง)

9. สรุป — สรุปยอดลาของตัวเองปีนี้ | สรุป ทั้งหมด | สรุป ทีม | สรุป ทีม ทั้งหมด

10. สถิติ — ดูสถิติการใช้ Bot แบบละเอียด

11. อัปเดต <id> <key|nokey|cer|nocer>  — เปลี่ยน key status ของรายการลา

12. ลบ <id>  — ลบรายการลา (ต้องเป็นของตัวเองหรือ admin)

13. ตาราง member | ตาราง happy_hour | ตาราง leave_schedule  — ดูข้อมูลในตาราง

14. เตือน  — แสดงรายการที่รอ approve ทั้งหมด

15. สมัคร <ชื่อ>  — ลงทะเบียนผู้ใช้ใหม่

16. ขุนเทียม <ข้อความ>  — พูดคุยกับ AI (เช่น ขุนเทียม พรุ่งนี้ลาพักร้อนนะ)

17. ฝากด่า <ชื่อ>  — ให้ AI แซวเพื่อนร่วมทีม

18. โหมด สุภาพ | โหมด ก้าวร้าว  — เปลี่ยนบุคลิก AI

19. ภาพรวม  — แสดง emoji grid สรุปภาพรวมทีมประจำสัปดาห์

20. แจ้งลาง่าย  — เปิดเมนูเลือกวันลาแบบกดปุ่ม (interactive)

21. คำสั่ง  — แสดงรายการคำสั่งทั้งหมด

══════ กฎเรื่องวันที่ ══════
- เดือนที่ใช้: JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC
- รูปแบบวันที่ต้องเป็น DDMMMYY เสมอ (7 ตัวอักษร) เช่น 27FEB26 ไม่ใช่ 27FEB
- ปีย่อ 2 หลัก เช่น 26 = 2026, 25 = 2025
- ข้อผิดพลาดที่พบบ่อย: ลืมใส่ปี เช่น พิมพ์ 27FEB แทน 27FEB26`;

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
      OPENROUTER_URL,
      {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Khun-Tiem-Bot",
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
      OPENROUTER_URL,
      {
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 200,
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Khun-Tiem-Bot",
        },
      },
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleanedContent = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanedContent) as ParsedCommand;
    return parsed;
  } catch (error: any) {
    console.error(
      "parseNaturalLanguageCommand error:",
      error?.response?.data || error.message,
    );
    return null;
  }
}
