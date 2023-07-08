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
  | "SALES_REP"
  | "SALES_MANAGER"
  | "REGIONAL_MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export const RolesEnum: Readonly<Record<IRoles, number>> = Object.freeze({
  SALES_REP: 0,
  SALES_MANAGER: 1,
  REGIONAL_MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
});

export const RolesArray: IRoles[] = [
  "SALES_REP",
  "SALES_MANAGER",
  "REGIONAL_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

export type GenderType = "Male" | "Female" | "Other";

export const GenderArray: GenderType[] = ["Male", "Female", "Other"];

export interface Address {
  title: string;
  address: string;
  city: string;
  state?: string;
  defaultAddress: boolean;
  postalCode?: string;
  country?: string;
}

export interface PHONE_NUMBER  {
  title: string;
  phoneNumber:string;
}

export interface IEmployee {
  id?: string;
  username?: string;
  email: string;
  name: string;
  avatar?: string | null;
  jobTitle?: string;
  role: IRoles;
  gender?: GenderType;
  addresses: Address[];
  birthdate?: string | null;
  emailVerified?: boolean;
  phoneNumberVerified?: boolean;
  phoneNumber?: string | null;
  secondaryPhoneNumbers: PHONE_NUMBER[];
  reportingManager?: string | null;
  addedBy?: string | null;

  settings?: any;
  socialProfiles?: any;
  timezone?: string | null;
  employeeStatus?: string;
  details: any;
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
