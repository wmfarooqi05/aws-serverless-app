import { ITeam } from "@models/Teams";

export interface IEmployeeJwt {
  sub: string;
  role: IRoles;
  teamId: string[];
  currentTeamId: string;
  permitted: boolean;
  createPendingApproval: boolean;
  email: string;
  email_verified: boolean;
  phone_number_verified: boolean;
  auth_time: string;
  phone_number: string;
  exp: string;
  /**@deprecated */
  roleKey: string;
}

export const roleKey = "role";

export type IRoles =
  | "SALES_REP_GROUP"
  | "SALES_MANAGER_GROUP"
  | "REGIONAL_MANAGER_GROUP"
  | "ADMIN_GROUP"
  | "SUPER_ADMIN_GROUP";

export const RolesEnum: Readonly<Record<IRoles, number>> = Object.freeze({
  SALES_REP_GROUP: 0,
  SALES_MANAGER_GROUP: 1,
  REGIONAL_MANAGER_GROUP: 2,
  ADMIN_GROUP: 3,
  SUPER_ADMIN_GROUP: 4,
});

export const RolesArray: IRoles[] = [
  "SALES_REP_GROUP",
  "SALES_MANAGER_GROUP",
  "REGIONAL_MANAGER_GROUP",
  "ADMIN_GROUP",
  "SUPER_ADMIN_GROUP",
];

export type GenderType = "Male" | "Female" | "Other";

export const GenderArray: GenderType[] = ["Male", "Female", "Other"];

export interface IEmployee {
  id?: string;
  username?: string;
  sub?: string;
  name: string;
  picture?: string;
  email: string;
  enabled?: boolean;
  jobTitle?: string;
  role: string; // IRoles;
  gender?: GenderType;
  birthdate?: string;
  emailVerified?: boolean;
  phoneNumberVerified?: boolean;
  phoneNumber?: string;
  secondaryPhoneNumbers: [];
  reportingManager?: string;
  addedBy?: string;

  settings?: JSON;
  socialProfiles?: JSON;
  EmployeeStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEmployeeWithTeam extends IEmployee {
  teams: ITeam[];
}

export const TEAM_HEADER_KEY = "x-team-id";

export const DATE_FORMATS = [
  "MM/YYYY/DD",
  "MM/DD/YYYY",
  "DD/YYYY/MM",
  "DD/MM/YYYY",
  "DD/MMM/YYYY",
  "DDD/MMM/YYYY",
  "MMM/DDD/YYYY",
  "YYYY/MMM/DD",
  "YYYY/DD/MMM",
  "YYYY/MM/DD",
  "YYYY/DD/MM",
];
