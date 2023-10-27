import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import { PreTokenGenerationTriggerHandler } from "aws-lambda";
import { container } from "@common/container";
import { IEmployeeWithTeam } from "@models/interfaces/Employees";
import EmployeeModel from "@models/Employees";

export const preTokenGenerationHandler: PreTokenGenerationTriggerHandler =
  async (event) => {
    const sub = event?.request?.userAttributes?.sub;

    try {
      container.resolve(DatabaseService).getKnexClient();
      const employee: IEmployeeWithTeam = await EmployeeModel.query()
        .findById(sub)
        .withGraphFetched("teams");

      const teamId: string = employee.teams.map((x) => x.id).join(",");
      event.response = {
        ...event.response,
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            teamId,
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
