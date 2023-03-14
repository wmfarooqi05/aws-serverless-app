import {
  createMongoAbility,
  AbilityBuilder,
  MongoAbility,
  ForbiddenError,
  subject
} from "@casl/ability";

type Actions = "create" | "read" | "update" | "delete" | "invite" | "manage";

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

// interface COMPANY {
//   id: string;
//   name: string;
// }

// const getPermissionsForUserRole = async (user: IUser) => {
//   const permissions = createMongoAbility<[Actions, ModuleTypeForCasl]>([
//     {
//       action: "read",
//       subject: "COMPANY",
//       conditions: { assignedTo: user.id }
//     }
//   ]);
//   return permissions;
// };

const getPermissionsForUserRole2 = () => {
  return {
    admin: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY"
        // conditions: { assignedTo: user.id }
      },
      {
        action: "create",
        subject: "COMPANY"
        // conditions: { assignedTo: user.id }
      },
      {
        action: "update",
        subject: "COMPANY"
        // conditions: { assignedTo: user.id }
      }
    ]),
    manager: createMongoAbility<[Actions, ModuleTypeForCasl]>([
      {
        action: "read",
        subject: "COMPANY"
        // conditions: { assignedTo: user.id }
      }
    ])
  };
};

// export const func = async () => {
//   const permissions = await getPermissionsForUserRole({
//     id: "1",
//     role: "manager"
//   });
//   console.log("create", permissions.can("create", "COMPANY"));
//   console.log("update", permissions.can("update", "COMPANY"));
//   console.log("read", permissions.can("read", "COMPANY"));
// };

export function defineAbilityFor(user: IUser): any {
  const builder = new AbilityBuilder(createMongoAbility);
  return builder.build();
}

export type AppAbility = MongoAbility<[Actions, ModuleTypeForCasl]>;

export type DefinePermissions = (
  user: IUser,
  builder: AbilityBuilder<AppAbility>
) => void;

// const defineAbilityFor2 = (user: IUser) => {
//   // const rolePermissions: Record<
//   //   Roles,
//   //   MongoAbility<[Actions, ModuleTypeForCasl]>
//   // >

//   const rolePermissions = {
//     admin: createMongoAbility<[Actions, ModuleTypeForCasl]>([
//       {
//         action: "update",
//         subject: "COMPANY",
//         conditions: { assignedTo: user.id }
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
//         conditions: { assignedTo: user.id }
//       },
//       {
//         action: "update",
//         subject: "COMPANY"
//       }
//     ])
//   };
//   return rolePermissions;
//   // const builder = new AbilityBuilder(createMongoAbility);
//   // console.log("building for ", user.role);
//   // const builder = new AbilityBuilder(rolePermissions[user.role](user, builder));
//   // console.log('create', rolePermissions['admin']({id: '1'}, builder));
//   // console.log("create", rolePermissions[user.role](user, builder));
//   // console.log("create", rolePermissions.can("create", "COMPANY"));
//   // console.log("update", permissions.can("update", "COMPANY"));
//   // console.log("read", permissions.can("read", "COMPANY"));
//   // return builder.build(rolePermissions[user.role]);
// };

const func2 = (user: IUser) => {
  // const ability = defineAbilityFor2(user);
  const ability = getPermissionsForUserRole2();
  console.log("ability", ability);
  // ability['admin'].can("create", "COMPANY")
  console.log(user.role, "create", ability[user.role].can("create", "COMPANY"));
  console.log(user.role, "update", ability[user.role].can("update", "COMPANY"));
  console.log(user.role, "read", ability[user.role].can("read", "COMPANY"));
  try {
    ForbiddenError.from(ability[user.role]).throwUnlessCan(
      "read",
      subject("COMAPNY", { id: "1" })
    );
  } catch (e) {
    console.log("error", e);
  }
};

// export const func3 = async (user: IUser) => {
//   const ability = defineAbilityFor2(user);
//   console.log("ability", ability);
//   // console.log(user.role);
//   // console.log(user.role, "create", ability.can("create", "COMPANY"));
//   // console.log(user.role, "update", ability.can("update", "COMPANY"));
//   // console.log(user.role, "read", ability.can("read", "COMPANY"));
// };

func2({
  id: "1",
  role: "manager"
});

// func2({
//   id: "2",
//   role: "manager"
// });
