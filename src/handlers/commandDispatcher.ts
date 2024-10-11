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
  commandArr: string[],
  replyToken: string
) {
  switch (command) {
    case "คำสั่ง":
      await handleShowCommands(replyToken);
      break;
    case "สมัคร":
      await handleRegisterCommand(
        userMetadata.userId,
        userMetadata.username,
        replyToken
      );
      break;
    case "แจ้งลา":
      await handleLeaveRequest(commandArr, userMetadata.username, replyToken);
      break;
    case "ตาราง":
      await handleShowTableCommand(commandArr, replyToken);
      break;
    case "approve": // only Admin
      await handleApproveCommand(commandArr, userMetadata, replyToken);
      break;
    case "รายงาน":
    case "รายการ":
      await handleReportCommand(commandArr, userMetadata, replyToken);
      break;
    case "hh":
      await handleHhCommand(commandArr, userMetadata, replyToken);
      break;
  }
}
