export interface IMember {
  id: number;
  uid: string;
  name: string;
  is_admin: boolean;
}

export interface IHappyHour {
  id: number;
  member: string;
  type: string;
  hour: number;
  approver: string;
}

export interface ILeaveSchedule {
  id: number;
  datetime: Date;
  member: string;
  leave_type: string;
  medical_cert: string;
  status: string;
  leave_start_dt: string;
  leave_end_dt: string;
  leave_period: number;
  period_detail: string;
  is_approve: boolean;
}
