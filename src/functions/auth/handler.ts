import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import { EMPLOYEES_TABLE_NAME } from "@models/commons";
import { PreTokenGenerationTriggerHandler } from "aws-lambda";
import { container } from "tsyringe";
import { IEmployee, roleKey } from "@models/interfaces/Employees";

export const preTokenGenerationHandler: PreTokenGenerationTriggerHandler =
  async (event) => {
    const sub = event?.request?.userAttributes?.sub;
    try {
      console.log("sub", sub);
      const teamIdKey = "team_id";
      const dbClient = container.resolve(DatabaseService);
      const employee: IEmployee = await dbClient
        .getKnexClient()(EMPLOYEES_TABLE_NAME)
        .where({
          id: sub,
        })
        .first();
      console.log("employee", employee, "teamId", employee.teamId);
      event.response = {
        ...event.response,
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            teamId: employee.teamId,
            role: employee.role,
          },
        },
      };
      console.log(
        "custom claim",
        event.response?.claimsOverrideDetails?.claims
      );
    } catch (err) {
      console.error(err);
      // Handle errors here
    }
    return event;
  };
