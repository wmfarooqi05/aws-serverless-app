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
import {
  allowRoleWrapper,
  checkRolePermission,
} from "@middlewares/jwtMiddleware";
import { RolesEnum } from "@models/interfaces/Employees";

const createTeamHandler: ValidatedEventAPIGatewayProxyEvent<
  ITeamModel
> = async (event) => {
  try {
    const newTeam = await container
      .resolve(TeamService)
      .createTeam(event.employee?.sub, event.body);
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
      .getAllTeams(event.query || {});
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getTeamByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  ITeamModel
> = async (event) => {
  const { teamId } = event.params;
  try {
    const teams = await container.resolve(TeamService).getTeam(teamId);
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateTeamHandler: ValidatedEventAPIGatewayProxyEvent<
  ITeamModel
> = async (event) => {
  try {
    const { teamId } = event.params;
    const updatedTeam = await container
      .resolve(TeamService)
      .updateTeam(event?.employee, teamId, event.body);
    return formatJSONResponse(updatedTeam, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

const deleteTeamHandler: ValidatedEventAPIGatewayProxyEvent<ITeamModel> = middy(
  async (event) => {
    try {
      const { teamId } = event.params;
      await container.resolve(TeamService).deleteTeam(teamId);
      return formatJSONResponse({ message: "Team deleted successfully" }, 200);
    } catch (e) {
      return formatErrorResponse(e);
    }
  }
);

const addEmployeeToTeamHandler = async (event) => {
  try {
    const { teamId, employeeId } = event.params;
    await container
      .resolve(TeamService)
      .addEmployeeToTeam(event.employee, teamId, employeeId);
    return formatJSONResponse({ message: "Employee added successfully" }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};


const removeEmployeeFromTeamHandler = async (event) => {
  try {
    const { teamId, employeeId } = event.params;
    await container
      .resolve(TeamService)
      .removeEmployeeFromTeam(event.employee, teamId, employeeId);
    return formatJSONResponse({ message: "Employee removed successfully" }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getTeams = checkRolePermission(getTeamsHandler, "COMPANY_READ");
export const getTeamById = checkRolePermission(
  getTeamByIdHandler,
  "COMPANY_READ"
);
export const updateTeam = allowRoleWrapper(
  updateTeamHandler,
  RolesEnum.ADMIN
);
export const createTeam = allowRoleWrapper(
  createTeamHandler,
  RolesEnum.ADMIN
);
export const deleteTeam = allowRoleWrapper(
  deleteTeamHandler,
  RolesEnum.ADMIN
);

// Make this starting from manager [role 2]
export const addEmployeeToTeam = checkRolePermission(
  addEmployeeToTeamHandler,
  "COMPANY_READ"
);


// Make this starting from manager [role 2]
export const removeEmployeeFromTeam = checkRolePermission(
  removeEmployeeFromTeamHandler,
  "COMPANY_READ"
);

