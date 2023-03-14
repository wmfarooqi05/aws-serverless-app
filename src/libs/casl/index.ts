import { createMongoAbility, ForbiddenError, subject } from "@casl/ability";

export type Actions = "create" | "read" | "update" | "delete" | "invite" | "all";

export type ModuleTypeForCasl = "COMPANY" | "Employee" | "all";

// type Roles =
//   // | "SALES_REP"
//   // | "SALES_MANAGER"
//   // | "REGIONAL_MANAGER"
//   // | "ADMIN"
//   | "admin"
//   // | "SUPER_ADMIN"
//   | "member";

interface IEmployee {
  id: string;
  role: string;
}
export const getPermissionsForEmployeeRole2 = () => {
  return {
    admin: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY",
        // conditions: { assignedTo: employee.id }
      },
      {
        action: "create",
        subject: "COMPANY",
        // conditions: { assignedTo: employee.id }
      },
      {
        action: "update",
        subject: "COMPANY",
        // conditions: { assignedTo: employee.id }
      },
    ]),
    manager: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY",
        // conditions: { assignedTo: employee.id }
      },
    ]),
  };
};

 const func2 = (employee: IEmployee) => {
  const ability = getPermissionsForEmployeeRole2();
  try {
    ForbiddenError.from(ability[employee.role]).throwUnlessCan(
      "read",
      subject("COMAPNY", { id: "1" })
    );
  } catch (e) {
    console.log("error", e);
  }
};

export default func2;