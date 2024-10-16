import { handleRegisterCommand } from "./commands/registerMember";
import { handleLeaveRequest } from "./commands/leaveRequest";
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
import { pushMsg } from "../utils/sendLineMsg";
import { client } from "./handleIncomingMessage";

export async function commandDispatcher(
  userMetadata: UserMetaData,
  command: string,
  commandArr: string[]
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
    default:
      await pushMsg(
        client,
        userMetadata.replyToken,
        `ไม่รู้จักคำสั่ง '${command}'`
      );
  }
}
