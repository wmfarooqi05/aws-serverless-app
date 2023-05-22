import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import { PreTokenGenerationTriggerHandler } from "aws-lambda";
import { container } from "tsyringe";
import { IEmployeeWithTeam } from "@models/interfaces/Employees";
import EmployeeModel from "@models/Employees";

export const preTokenGenerationHandler: PreTokenGenerationTriggerHandler =
  async (event) => {
    const sub = event?.request?.userAttributes?.sub;
    // const sub =
    //   process.env.STAGE === "local"
    //     ? "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b"
    //     : event?.request?.userAttributes?.sub;

    // if (!sub) {
    // dont throw error but return something.
    // throw new CustomError("sub not found in token", 403);
    // }
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
