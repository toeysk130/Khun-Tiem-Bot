import { registerNewMember } from "../../API/leaveScheduleAPI";
import { pushMsg } from "../../utils/sendLineMsg";
import { client, pool } from "../handleIncomingMessage";

export async function handleRegisterCommand(
  userId: string,
  userName: string,
  replyToken: string
) {
  if (userName) {
    const replyMessage = `User ${userName} มีอยู่ในระบบแล้วครับ`;
    await pushMsg(client, replyToken, replyMessage);
  } else {
    await registerNewMember(pool, client, replyToken, userId, userName);
  }
}
