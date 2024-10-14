import { registerNewMember } from "../../API/leaveScheduleAPI";
import { UserMetaData } from "../../types/interface";
import { pushMsg } from "../../utils/sendLineMsg";
import { client } from "../handleIncomingMessage";

export async function handleRegisterCommand(userMetaData: UserMetaData) {
  if (userMetaData.username) {
    const replyMessage = `User ${userMetaData.username} มีอยู่ในระบบแล้วครับ`;
    await pushMsg(client, userMetaData.replyToken, replyMessage);
  } else {
    await registerNewMember(
      userMetaData.replyToken,
      userMetaData.userId,
      userMetaData.username
    );
  }
}
