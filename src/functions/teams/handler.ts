import "reflect-metadata";
import { ITeamModel, ITeamPaginated } from "@models/Teams";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { TeamService } from "./service";
import middy from "@middy/core";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { allowRoleWrapper } from "@middlewares/jwtMiddleware";
import { RolesEnum } from "@models/interfaces/Employees";

export const createTeamHandler: ValidatedEventAPIGatewayProxyEvent<
  ITeamModel
> = async (event) => {
  try {
    const newTeam = await container
      .resolve(TeamService)
      .createTeam(
        event.employee?.sub,
        event.body
      );
    return formatJSONResponse(newTeam, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getTeamsHandler: ValidatedEventAPIGatewayProxyEvent<
  ITeamPaginated
> = async (event) => {
  try {
    const teams = await container
      .resolve(TeamService)
      .getAllTeams(event.queryStringParameters || {});
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getTeamById: ValidatedEventAPIGatewayProxyEvent<
  ITeamModel
> = async (event) => {
  const { teamId } = event.pathParameters;
  try {
    const teams = await container.resolve(TeamService).getTeam(teamId);
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateTeamHandler: ValidatedEventAPIGatewayProxyEvent<
  ITeamModel
> = async (event) => {
  try {
    const { teamId } = event.pathParameters;
    const updatedTeam = await container
      .resolve(TeamService)
      .updateTeam(event?.employee, teamId, event.body);
    return formatJSONResponse(updatedTeam, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const deleteTeamHandler: ValidatedEventAPIGatewayProxyEvent<ITeamModel> =
  middy(async (event) => {
    try {
      const { teamId } = event.pathParameters;
      await container.resolve(TeamService).deleteTeam(teamId);
      return formatJSONResponse({ message: "Team deleted successfully" }, 200);
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const getTeams = allowRoleWrapper(getTeamsHandler);
export const updateTeam = allowRoleWrapper(updateTeamHandler);
export const createTeam = allowRoleWrapper(
  createTeamHandler,
  RolesEnum.ADMIN_GROUP
);
export const deleteTeam = allowRoleWrapper(
  deleteTeamHandler,
  RolesEnum.ADMIN_GROUP
);