export interface IMember {
  id: number;
  uid: string;
  name: string;
  is_admin: boolean;
}

export interface IHappyHour {
  id: number;
  datetime: Date;
  member: string;
  type: string;
  hours: number;
  description: string;
  is_approve: boolean;
}

export interface IAllRemaiHH {
  member: string;
  total_add: number;
  total_del: number;
  remaining: number;
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
  description: string;
}
