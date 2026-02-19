import { lineClient } from "../../configs/lineClient";
import { replyMessage } from "../../utils/sendLineMsg";

export async function handleShowCommands(replyToken: string) {
  const msg = `🤖 รายการคำสั่ง
    \n👉แจ้งลา (ลาพักร้อน | ลาป่วย | ลากิจ) (01JAN25 | 01JAN25-02JAN25) (1วัน | ครึ่งเช้า | ครึ่งบ่าย) (key | nokey) (เหตุผล)
    \n👉nc (อบรม | training | กิจกรรมบริษัท) (26JAN25 | 26JAN25-28JAN25) (1วัน | ครึ่งเช้า | ครึ่งบ่าย) (เหตุผล)
    \n👉อัปเดต (id) (cer | nocer | key | nokey)
    \n👉ลบ (id) — ❗ มีปุ่มยืนยันก่อนลบ
    \n👉hh ใช้ (1h | 4h) (01JAN25 | 01JAN25-02JAN25) (1วัน | ครึ่งเช้า | ครึ่งบ่าย) (เหตุผล)
    \n👉hh เพิ่ม (1h | 2h) (เหตุผล)
    \n👉รายงาน (ของฉัน | วันนี้ | วีคนี้ | วีคหน้า | เดือนนี้)
    \n👉สรุป — สรุปยอดวันลาของฉัน
    \n👉สรุป ทั้งหมด — สรุปทั้งทีม (admin)
    \n👉สถิติ — 🏆 สถิติสนุกๆ ของทีม
    \n👉เตือน approve (key | nokey)
    \n👉approve (id | ids)
    \n👉hh approve (id | ids)
    \n👉แอบดู (ชื่อคน)
    `;
  await replyMessage(lineClient, replyToken, msg);
}
