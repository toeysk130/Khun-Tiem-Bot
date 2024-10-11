import { pushMsg } from "../../utils/sendLineMsg";
import { client } from "../handleIncomingMessage";

export async function handleShowCommands(replyToken: string) {
  const replyMessage = `🤖 รายการคำสั่ง
    \n👉แจ้งลา <ลาพักร้อน, ลาป่วย, ลากิจ> <วันเริ่มลา 26JAN,26JAN-28JAN> <จำนวน 1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <key,nokey> <เหตุผล>
    \n👉nc <อบรม, training, กิจกรรมบริษัท> <วันเริ่มลา 26JAN,26JAN-28JAN> <จำนวน 1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <เหตุผล>
    \n👉อัปเดต <id> <cer,nocer,key,nokey>
    \n👉hh ใช้ <1h,2h,...,40h> <วันลา 26JAN> <1วัน, 3วัน, ครึ่งเช้า, ครึ่งบ่าย> <เหตุผล>
    \n👉hh เพิ่ม <1h,2h,...,40h> <เหตุผล>
    \n👉รายงาน/รายการ <ของฉัน, วันนี้, วีคนี้, วีคหน้า>
    \n👉เตือน approve <'',key,nokey>
    \n👉approve <id, ids(8,9)> (⛔ Only Admin)
    \n👉hh approve <id, ids(8,9)> (⛔ Only Admin)
    \n👉แอบดู <ชื่อคน> (⛔ Only Admin)
    \n👉สมัคร <ชื่อ>
    `;
  await pushMsg(client, replyToken, replyMessage);
}
