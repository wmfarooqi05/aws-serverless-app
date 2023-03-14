import { createMongoAbility, ForbiddenError, subject } from "@casl/ability";

export type Actions = "create" | "read" | "update" | "delete" | "invite" | "all";

export type ModuleTypeForCasl = "COMPANY" | "User" | "all";

// type Roles =
//   // | "SALES_REP"
//   // | "SALES_MANAGER"
//   // | "REGIONAL_MANAGER"
//   // | "ADMIN"
//   | "admin"
//   // | "SUPER_ADMIN"
//   | "member";

interface IUser {
  id: string;
  role: string;
}
export const getPermissionsForUserRole2 = () => {
  return {
    admin: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY",
        // conditions: { assignedTo: user.id }
      },
      {
        action: "create",
        subject: "COMPANY",
        // conditions: { assignedTo: user.id }
      },
      {
        action: "update",
        subject: "COMPANY",
        // conditions: { assignedTo: user.id }
      },
    ]),
    manager: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY",
        // conditions: { assignedTo: user.id }
      },
    ]),
  };
};

 const func2 = (user: IUser) => {
  const ability = getPermissionsForUserRole2();
  try {
    ForbiddenError.from(ability[user.role]).throwUnlessCan(
      "read",
      subject("COMAPNY", { id: "1" })
    );
  } catch (e) {
    console.log("error", e);
  }
};

export default func2;