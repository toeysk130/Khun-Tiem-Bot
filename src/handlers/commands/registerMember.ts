import { registerNewMember } from "../../API/leaveScheduleAPI";
import { UserMetaData } from "../../configs/interface";
import { pushMsg } from "../../utils/sendLineMsg";
import { client, pool } from "../handleIncomingMessage";

export async function handleRegisterCommand(userMetaData: UserMetaData) {
  if (userMetaData.username) {
    const replyMessage = `User ${userMetaData.username} มีอยู่ในระบบแล้วครับ`;
    await pushMsg(client, userMetaData.replyToken, replyMessage);
  } else {
    await registerNewMember(
      pool,
      client,
      userMetaData.replyToken,
      userMetaData.userId,
      userMetaData.username
    );
  }
}
