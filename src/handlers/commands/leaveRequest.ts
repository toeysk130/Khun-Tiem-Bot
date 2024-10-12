import { addNewLeaveRequest } from "../../API/leaveScheduleAPI";
import { UserMetaData } from "../../configs/interface";
import { validateLeaveRequest } from "../../validations/validateLeaveReq";

export async function handleLeaveRequest(
  commandArr: string[],
  userMetaData: UserMetaData
) {
  const isValidRequest = await validateLeaveRequest(userMetaData, commandArr);

  if (!isValidRequest) return;

  await addNewLeaveRequest(userMetaData, commandArr);
}
