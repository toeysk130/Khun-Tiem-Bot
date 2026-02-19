import { lineClient } from "../../configs/lineClient";
import { replyFlexMessage } from "../../utils/sendLineMsg";
import { FlexBubble, FlexMessage } from "@line/bot-sdk";

const BLUE = "#4A90D9";
const GRAY = "#888888";
const DARK = "#333333";
const EXAMPLE_BG = "#F0F4F8";

function cmdBlock(cmd: string, example: string) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    margin: "md" as const,
    contents: [
      {
        type: "text" as const,
        text: cmd,
        size: "sm" as const,
        color: DARK,
        weight: "bold" as const,
        wrap: true,
      },
      {
        type: "box" as const,
        layout: "vertical" as const,
        margin: "xs" as const,
        cornerRadius: "6px" as const,
        backgroundColor: EXAMPLE_BG,
        paddingAll: "8px" as const,
        contents: [
          {
            type: "text" as const,
            text: example,
            size: "xs" as const,
            color: BLUE,
            wrap: true,
          },
        ],
      },
    ],
  };
}

function makeBubble(
  emoji: string,
  title: string,
  bgColor: string,
  blocks: ReturnType<typeof cmdBlock>[],
): FlexBubble {
  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${emoji} ${title}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
      ],
      backgroundColor: bgColor,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: blocks,
      paddingAll: "12px",
      spacing: "none",
    },
  };
}

export async function handleShowCommands(replyToken: string) {
  // ─── Card 1: วันลา ───
  const leaveCard = makeBubble("📝", "วันลา", "#2980B9", [
    cmdBlock("แจ้งลา", "แจ้งลา ลาพักร้อน 01FEB26 1วัน key ไปเที่ยว"),
    cmdBlock("nc (ไม่นับวันลา)", "nc อบรม 01FEB26 1วัน หลักสูตร XYZ"),
    cmdBlock("อัปเดต สถานะ", "อัปเดต 42 key\nอัปเดต 42 cer"),
    cmdBlock("ลบ รายการ", "ลบ 42"),
  ]);

  // ─── Card 2: Happy Hour ───
  const hhCard = makeBubble("❤️", "Happy Hour", "#E74C3C", [
    cmdBlock("hh เพิ่ม (ขอ HH ใหม่)", "hh เพิ่ม 2h OT วัน launch"),
    cmdBlock("hh ใช้ (ใช้ HH แลกลา)", "hh ใช้ 4h 01FEB26 ครึ่งเช้า ธุระ"),
  ]);

  // ─── Card 3: ดูข้อมูล ───
  const reportCard = makeBubble("📊", "ดูข้อมูล", "#27AE60", [
    cmdBlock(
      "รายงาน",
      "รายงาน ของฉัน\nรายงาน วันนี้\nรายงาน วีคนี้\nรายงาน เดือนนี้",
    ),
    cmdBlock("แอบดู (ดูของคนอื่น)", "แอบดู สมชาย"),
    cmdBlock("สรุป วันลา", "สรุป\nสรุป ทีม (👑 admin)"),
    cmdBlock("สถิติ ประจำเดือน 🏆", "สถิติ"),
    cmdBlock("ตาราง สมาชิก + HH", "ตาราง member"),
  ]);

  // ─── Card 4: Admin ───
  const adminCard = makeBubble("👑", "Admin", "#8E44AD", [
    cmdBlock("approve วันลา", "approve 42\napprove 42 43 44"),
    cmdBlock("hh approve", "hh approve 5\nhh approve 5 6"),
    cmdBlock("เตือน (ดูรายการรอ)", "เตือน approve"),
    cmdBlock(
      "💡 Tip",
      'เพิ่ม "ทั้งหมด" หลังคำสั่งเพื่อดูย้อนหลัง\nเช่น: รายงาน ของฉัน ทั้งหมด',
    ),
  ]);

  const flexMsg: FlexMessage = {
    type: "flex",
    altText: "🤖 รายการคำสั่ง Khun-Tiem",
    contents: {
      type: "carousel",
      contents: [leaveCard, hhCard, reportCard, adminCard],
    },
  };

  await replyFlexMessage(lineClient, replyToken, flexMsg);
}
