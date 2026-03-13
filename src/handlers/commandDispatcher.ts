import { lineClient } from "../configs/lineClient";
import {
  generateAIComment,
  getAiChatOnLeaveEnabled,
  setAiChatOnLeaveEnabled,
} from "../services/openaiService";
import { UserMetaData } from "../types/interface";
import { buildLeaveTypePickerBubble } from "../utils/flexMessage";
import {
  QuickReplyLabel,
  attachQuickReply,
  flushReplyBuffer,
  replyFlexMessage,
  replyMessage,
  startReplyBuffer,
} from "../utils/sendLineMsg";
import { handleApproveCommand } from "./commands/approveRequest";
import { handleAskAICommand } from "./commands/askAICommand";
import { handleDeleteMemberCommand } from "./commands/deleteMember";
import { handleDeleteRequest } from "./commands/deleteRequest";
import { handleHhCommand } from "./commands/hhCommands";
import {
  handleLeaveRequest,
  handleNcLeaveRequest,
} from "./commands/leaveRequest";
import { handleModeCommand } from "./commands/modeCommand";
import { handleRegisterCommand } from "./commands/registerMember";
import {
  handleOtherReport,
  handleReportCommand,
  handleVisualWeekReport,
  handleWarningReport,
} from "./commands/reportRequest";
import { handleShowCommands } from "./commands/showCommands";
import { handleShowTableCommand } from "./commands/showTable";
import { handleStatsCommand } from "./commands/statsCommand";
import { handleSummaryCommand } from "./commands/summaryCommand";
import { handleUpdateRequest } from "./commands/updateRequests";
import { handleCronCommand } from "./commands/cronCommand";
import { Message } from "@line/bot-sdk";

// Commands that already use AI — skip AI follow-up to avoid double calls
const AI_POWERED_COMMANDS = ["ขุนเทียม", "ฝากด่า", "สถิติ", "สรุป"];

// Commands that are view-only — skip AI follow-up to avoid noise
const QUIET_COMMANDS = [
  "คำสั่ง",
  "ตาราง",
  "รายงาน",
  "รายการ",
  "แอบดู",
  "เตือน",
  "โหมด",
  "แจ้งลาง่าย",
  "เปิดแชท",
  "ปิดแชท",
  "cron",
];

// Commands that must be used in Group Chat only
const GROUP_ONLY_COMMANDS = ["แจ้งลา", "nc"];

// Quick reply buttons shown after successful commands
const QUICK_REPLY_MAP: Record<string, QuickReplyLabel[]> = {
  แจ้งลา: [
    { label: "📋 รายงาน ของฉัน", text: "รายงาน ของฉัน" },
    { label: "📊 สรุป", text: "สรุป" },
    { label: "📅 ภาพรวม", text: "ภาพรวม" },
  ],
  nc: [
    { label: "📋 รายงาน ของฉัน", text: "รายงาน ของฉัน" },
    { label: "📊 สรุป", text: "สรุป" },
  ],
  hh: [
    { label: "📋 รายงาน ของฉัน", text: "รายงาน ของฉัน" },
    { label: "📊 สรุป", text: "สรุป" },
  ],
  รายงาน: [
    { label: "📊 สรุป", text: "สรุป" },
    { label: "📈 สถิติ", text: "สถิติ" },
    { label: "📅 ภาพรวม", text: "ภาพรวม" },
  ],
  สรุป: [
    { label: "📋 รายงาน ของฉัน", text: "รายงาน ของฉัน" },
    { label: "📈 สถิติ", text: "สถิติ" },
  ],
  approve: [
    { label: "📋 รายงาน วันนี้", text: "รายงาน วันนี้" },
    { label: "🔔 เตือน", text: "เตือน" },
  ],
  สถิติ: [
    { label: "📊 สรุป ทีม", text: "สรุป ทีม" },
    { label: "📅 ภาพรวม", text: "ภาพรวม" },
  ],
};

export async function commandDispatcher(
  userMetadata: UserMetaData,
  command: string,
  commandArr: string[],
  skipAIComment: boolean = false,
) {
  // Allowed everywhere now

  const skipAI =
    skipAIComment ||
    AI_POWERED_COMMANDS.includes(command) ||
    QUIET_COMMANDS.includes(command) ||
    !getAiChatOnLeaveEnabled();

  // Start buffering replies so we can bundle AI comment together
  if (!skipAI) {
    startReplyBuffer(userMetadata.replyToken);
  }

  // Start AI generation in parallel with the handler for speed
  const aiPromise = !skipAI
    ? generateAIComment(
        userMetadata.username,
        commandArr.join(" "),
        true,
      ).catch(() => null)
    : Promise.resolve(null);

  let wasSuccessful = true;

  try {
    switch (command) {
      case "คำสั่ง":
        await handleShowCommands(userMetadata.replyToken);
        break;
      case "สมัคร":
        await handleRegisterCommand(userMetadata);
        break;
      case "แจ้งลา":
        wasSuccessful =
          (await handleLeaveRequest(commandArr, userMetadata)) !== false;
        break;
      case "nc":
        wasSuccessful =
          (await handleNcLeaveRequest(commandArr, userMetadata)) !== false;
        break;
      case "ตาราง":
        await handleShowTableCommand(commandArr, userMetadata.replyToken);
        break;
      case "approve": // only Admin
        await handleApproveCommand(commandArr, userMetadata);
        break;
      case "รายงาน":
      case "รายการ":
        await handleReportCommand(commandArr, userMetadata);
        break;
      case "แอบดู":
        await handleOtherReport(commandArr, userMetadata);
        break;
      case "เตือน":
        await handleWarningReport(userMetadata);
        break;
      case "hh":
        wasSuccessful =
          (await handleHhCommand(commandArr, userMetadata)) !== false;
        break;
      case "อัปเดต":
        await handleUpdateRequest(commandArr, userMetadata);
        break;
      case "ลบ":
        await handleDeleteRequest(commandArr, userMetadata);
        break;
      case "สรุป":
        await handleSummaryCommand(commandArr, userMetadata);
        break;
      case "สถิติ":
        await handleStatsCommand(commandArr, userMetadata);
        break;
      case "ขุนเทียม":
      case "ฝากด่า":
        await handleAskAICommand(commandArr, userMetadata);
        break;
      case "ลบสมาชิก":
        await handleDeleteMemberCommand(commandArr, userMetadata);
        break;
      case "โหมด":
        await handleModeCommand(commandArr, userMetadata);
        break;
      case "ภาพรวม":
        await handleVisualWeekReport(userMetadata.replyToken);
        break;
      case "cron":
        wasSuccessful =
          (await handleCronCommand(commandArr, userMetadata)) !== false;
        break;
      case "เปิดแชท": {
        setAiChatOnLeaveEnabled(true);
        await replyMessage(
          lineClient,
          userMetadata.replyToken,
          "🤖 เปิดแชท AI แล้ว — ขุนเทียมจะพูดคุยเล่นหลังแจ้งลาทุกครั้ง",
        );
        break;
      }
      case "ปิดแชท": {
        setAiChatOnLeaveEnabled(false);
        await replyMessage(
          lineClient,
          userMetadata.replyToken,
          "🔇 ปิดแชท AI แล้ว — ขุนเทียมจะไม่พูดคุยหลังแจ้งลา",
        );
        break;
      }
      case "แจ้งลาง่าย": {
        if (userMetadata.chatType === "GROUP") {
          await replyMessage(
            lineClient,
            userMetadata.replyToken,
            "⚠️ การใช้งาน 'แจ้งลาง่าย' ในกลุ่มเปลือง Push Token\nกรุณาไปใช้คำสั่งนี้ในห้องแชทส่วนตัว (DM) ของขุนเทียมแทนนะครับ 🙏",
          );
        } else {
          const flex = buildLeaveTypePickerBubble();
          await replyFlexMessage(lineClient, userMetadata.replyToken, flex);
        }
        break;
      }
      default:
        wasSuccessful = false;
        await replyMessage(
          lineClient,
          userMetadata.replyToken,
          `ไม่รู้จักคำสั่ง '${command}'`,
        );
    }
  } catch (error) {
    wasSuccessful = false;
    console.error("Command dispatch error:", error);
  }

  // Flush buffer — bundle handler reply + AI comment in ONE reply (free!)
  if (!skipAI) {
    const extraMessages: Message[] = [];

    if (wasSuccessful) {
      try {
        const aiComment = await Promise.race([
          aiPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        if (aiComment) {
          extraMessages.push({ type: "text", text: `🤖 ${aiComment}` });
        }
      } catch {
        // AI is optional — silently ignore
      }
    }

    // Attach contextual quick reply buttons
    const quickItems = QUICK_REPLY_MAP[command];
    if (wasSuccessful && quickItems) {
      attachQuickReply(userMetadata.replyToken, quickItems);
    }

    await flushReplyBuffer(lineClient, userMetadata.replyToken, extraMessages);
  }
}
