import { lineClient } from "../configs/lineClient";
import { generateAIComment } from "../services/openaiService";
import { UserMetaData } from "../types/interface";
import {
  flushReplyBuffer,
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
  handleWarningReport,
} from "./commands/reportRequest";
import { handleShowCommands } from "./commands/showCommands";
import { handleShowTableCommand } from "./commands/showTable";
import { handleStatsCommand } from "./commands/statsCommand";
import { handleSummaryCommand } from "./commands/summaryCommand";
import { handleUpdateRequest } from "./commands/updateRequests";
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
];

// Commands that must be used in Group Chat only
const GROUP_ONLY_COMMANDS = ["แจ้งลา", "nc"];

export async function commandDispatcher(
  userMetadata: UserMetaData,
  command: string,
  commandArr: string[],
  skipAIComment: boolean = false,
) {
  // Block leave commands in personal chat
  if (
    GROUP_ONLY_COMMANDS.includes(command) &&
    userMetadata.chatType !== "GROUP"
  ) {
    return replyMessage(
      lineClient,
      userMetadata.replyToken,
      "📢 การแจ้งลาต้องทำในห้อง Group Chat เท่านั้นนะคะ เพื่อให้ทุกคนในทีมเห็น!",
    );
  }

  const skipAI =
    skipAIComment ||
    AI_POWERED_COMMANDS.includes(command) ||
    QUIET_COMMANDS.includes(command);

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
        await handleLeaveRequest(commandArr, userMetadata);
        break;
      case "nc":
        await handleNcLeaveRequest(commandArr, userMetadata);
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
        await handleHhCommand(commandArr, userMetadata);
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

    await flushReplyBuffer(lineClient, userMetadata.replyToken, extraMessages);
  }
}
