import { lineClient } from "../configs/lineClient";
import { pushSingleMessage } from "../cron/pushMessage";
import { generateAIComment } from "../services/openaiService";
import { UserMetaData } from "../types/interface";
import { replyMessage } from "../utils/sendLineMsg";
import { handleApproveCommand } from "./commands/approveRequest";
import { handleAskAICommand } from "./commands/askAICommand";
import { handleDeleteMemberCommand } from "./commands/deleteMember";
import { handleDeleteRequest } from "./commands/deleteRequest";
import { handleHhCommand } from "./commands/hhCommands";
import {
  handleLeaveRequest,
  handleNcLeaveRequest,
} from "./commands/leaveRequest";
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

// Commands that already use AI — skip AI follow-up to avoid double calls
const AI_POWERED_COMMANDS = ["ขุนเทียม", "ฝากด่า", "สถิติ", "สรุป"];

// Commands that are view-only — skip AI follow-up to avoid noise
const QUIET_COMMANDS = ["คำสั่ง", "ตาราง", "รายงาน", "รายการ", "แอบดู", "cron"];

export async function commandDispatcher(
  userMetadata: UserMetaData,
  command: string,
  commandArr: string[],
) {
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

  // AI follow-up comment (fire-and-forget)
  const skipAI =
    AI_POWERED_COMMANDS.includes(command) || QUIET_COMMANDS.includes(command);

  if (!skipAI) {
    generateAIComment(
      userMetadata.username,
      commandArr.join(" "),
      wasSuccessful,
    )
      .then((comment) => {
        if (comment) {
          pushSingleMessage(`🤖 ${comment}`);
        }
      })
      .catch(() => {
        // AI comment is optional — silently ignore errors
      });
  }
}
