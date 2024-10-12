import { handleRegisterCommand } from "./commands/registerMember";
import { handleLeaveRequest } from "./commands/leaveRequest";
import { handleShowCommands } from "./commands/showCommands";
import { handleShowTableCommand } from "./commands/showTable";
import { UserMetaData } from "../configs/interface";
import { handleApproveCommand } from "./commands/approveRequest";
import { handleReportCommand } from "./commands/reportRequest";
import { handleHhCommand } from "./commands/hhCommands";

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
    case "hh":
      await handleHhCommand(commandArr, userMetadata);
      break;
  }
}
