import { pushMsg } from "../../utils/sendLineMsg";
import { client } from "../handleIncomingMessage";

export async function handleShowCommands(replyToken: string) {
  const replyMessage = `🤖 รายการคำสั่ง
    \n👉แจ้งลา (ลาพักร้อน | ลาป่วย | ลากิจ) (01JAN25 | 01JAN25-02JAN25) (1วัน | ครึ่งเช้า | ครึ่งบ่าย) (key | nokey) (เหตุผล)
    \n👉nc (อบรม | training | กิจกรรมบริษัท) (26JAN25 | 26JAN25-28JAN25) (1วัน | ครึ่งเช้า | ครึ่งบ่าย) (เหตุผล)
    \n👉อัปเดต (id) (cer | nocer | key | nokey)
    \n👉hh ใช้ (1h | 4h) (01JAN25 | 01JAN25-02JAN25) (1วัน | ครึ่งเช้า | ครึ่งบ่าย) (เหตุผล)
    \n👉hh เพิ่ม (1h | 2h) (เหตุผล)
    \n👉รายงาน (ของฉัน | วันนี้ | วีคนี้ | วีคหน้า)
    \n👉เตือน approve (key | nokey)
    \n👉approve (id | ids)
    \n👉hh approve (id | ids)
    \n👉แอบดู (ชื่อคน)
    `;
  await pushMsg(client, replyToken, replyMessage);
}
