import { handleRegisterCommand } from "./commands/registerMember";
import {
  handleLeaveRequest,
  handleNcLeaveRequest,
} from "./commands/leaveRequest";
import { handleShowCommands } from "./commands/showCommands";
import { handleShowTableCommand } from "./commands/showTable";
import { handleApproveCommand } from "./commands/approveRequest";
import {
  handleOtherReport,
  handleReportCommand,
  handleWarningReport,
} from "./commands/reportRequest";
import { handleHhCommand } from "./commands/hhCommands";
import { UserMetaData } from "../types/interface";
import { handleUpdateRequest } from "./commands/updateRequests";
import { handleDeleteRequest } from "./commands/deleteRequest";
import { handleSummaryCommand } from "./commands/summaryCommand";
import { replyMessage } from "../utils/sendLineMsg";
import { lineClient } from "../configs/lineClient";

export async function commandDispatcher(
  userMetadata: UserMetaData,
  command: string,
  commandArr: string[],
) {
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
    default:
      await replyMessage(
        lineClient,
        userMetadata.replyToken,
        `ไม่รู้จักคำสั่ง '${command}'`,
      );
  }
}
