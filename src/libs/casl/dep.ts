import {
  createMongoAbility,
  AbilityBuilder,
  MongoAbility,
  ForbiddenError,
  subject
} from "@casl/ability";

type Actions = "create" | "read" | "update" | "delete" | "invite" | "manage";

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

// interface COMPANY {
//   id: string;
//   name: string;
// }

// const getPermissionsForEmployeeRole = async (employee: IEmployee) => {
//   const permissions = createMongoAbility<[Actions, ModuleTypeForCasl]>([
//     {
//       action: "read",
//       subject: "COMPANY",
//       conditions: { assignedTo: employee.id }
//     }
//   ]);
//   return permissions;
// };

const getPermissionsForEmployeeRole2 = () => {
  return {
    admin: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY"
        // conditions: { assignedTo: employee.id }
      },
      {
        action: "create",
        subject: "COMPANY"
        // conditions: { assignedTo: employee.id }
      },
      {
        action: "update",
        subject: "COMPANY"
        // conditions: { assignedTo: employee.id }
      }
    ]),
    manager: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY"
        // conditions: { assignedTo: employee.id }
      }
    ])
  };
};

// export const func = async () => {
//   const permissions = await getPermissionsForEmployeeRole({
//     id: "1",
//     role: "manager"
//   });
//   console.log("create", permissions.can("create", "COMPANY"));
//   console.log("update", permissions.can("update", "COMPANY"));
//   console.log("read", permissions.can("read", "COMPANY"));
// };

export function defineAbilityFor(employee: IEmployee): any {
  const builder = new AbilityBuilder(createMongoAbility);
  return builder.build();
}

export type AppAbility = MongoAbility<[Actions, ModuleTypeForCasl]>;

export type DefinePermissions = (
  employee: IEmployee,
  builder: AbilityBuilder<AppAbility>
) => void;

// const defineAbilityFor2 = (employee: IEmployee) => {
//   // const rolePermissions: Record<
//   //   Roles,
//   //   MongoAbility<[Actions, ModuleTypeForCasl]>
//   // >

//   const rolePermissions = {
//     admin: createMongoAbility<[Actions, ModuleTypeForCasl]>([
//       {
//         action: "update",
//         subject: "COMPANY",
//         conditions: { assignedTo: employee.id }
//       },
//       {
//         action: "update",
//         subject: "COMPANY"
//       }
//     ]),
//     member: createMongoAbility<[Actions, ModuleTypeForCasl]>([
//       {
//         action: "read",
//         subject: "COMPANY",
//         conditions: { assignedTo: employee.id }
//       },
//       {
//         action: "update",
//         subject: "COMPANY"
//       }
//     ])
//   };
//   return rolePermissions;
//   // const builder = new AbilityBuilder(createMongoAbility);
//   // console.log("building for ", employee.role);
//   // const builder = new AbilityBuilder(rolePermissions[employee.role](employee, builder));
//   // console.log('create', rolePermissions['admin']({id: '1'}, builder));
//   // console.log("create", rolePermissions[employee.role](employee, builder));
//   // console.log("create", rolePermissions.can("create", "COMPANY"));
//   // console.log("update", permissions.can("update", "COMPANY"));
//   // console.log("read", permissions.can("read", "COMPANY"));
//   // return builder.build(rolePermissions[employee.role]);
// };

const func2 = (employee: IEmployee) => {
  // const ability = defineAbilityFor2(employee);
  const ability = getPermissionsForEmployeeRole2();
  console.log("ability", ability);
  // ability['admin'].can("create", "COMPANY")
  console.log(employee.role, "create", ability[employee.role].can("create", "COMPANY"));
  console.log(employee.role, "update", ability[employee.role].can("update", "COMPANY"));
  console.log(employee.role, "read", ability[employee.role].can("read", "COMPANY"));
  try {
    ForbiddenError.from(ability[employee.role]).throwUnlessCan(
      "read",
      subject("COMAPNY", { id: "1" })
    );
  } catch (e) {
    console.log("error", e);
  }
};

// export const func3 = async (employee: IEmployee) => {
//   const ability = defineAbilityFor2(employee);
//   console.log("ability", ability);
//   // console.log(employee.role);
//   // console.log(employee.role, "create", ability.can("create", "COMPANY"));
//   // console.log(employee.role, "update", ability.can("update", "COMPANY"));
//   // console.log(employee.role, "read", ability.can("read", "COMPANY"));
// };

func2({
  id: "1",
  role: "manager"
});

// func2({
//   id: "2",
//   role: "manager"
// });
