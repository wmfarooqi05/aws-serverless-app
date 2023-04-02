export interface IEmployeeJwt {
  sub: string;
  "cognito:groups": string;
  teamId: string;
  permitted: boolean;
  createPendingApproval: boolean;
}

export const roleKey = "cognito:groups";

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
  id: string;
  name: string;
  picture?: string;
  email: string;
  enabled: boolean;
  jobTitle: string;
  role: string;
  gender: GenderType;
  address: string;
  city: string;
  state: string;
  country: string;
  birthdate: string;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  phoneNumber: string;
  reportingManager: string;
  teamId: string;

  settings: JSON;
  socialProfiles: JSON;
  EmployeeStatus: string;
  createdAt: string;
  updatedAt: string;
}
