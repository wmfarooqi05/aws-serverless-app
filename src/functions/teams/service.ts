import "reflect-metadata";
import TeamModel, { ITeamModel, ITeamPaginated } from "@models/Teams";
import { DatabaseService } from "@libs/database/database-service-objection";

import {
  validateGetTeams,
  validateUpdateTeams,
  validateCreateTeam,
  validateAddEmployeeToTeam,
} from "./schema";

import { inject, injectable } from "tsyringe";
import { CustomError } from "src/helpers/custom-error";
import {
  IEmployeeJwt,
  RolesArray,
  RolesEnum,
} from "@models/interfaces/Employees";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";

export interface ITeamService {
  getAllTeams(body: any): Promise<ITeamPaginated>;
  createTeam(team: ITeamModel): Promise<ITeamModel>;
  getTeam(id: string): Promise<ITeamModel>;
  updateTeam(
    employee: IEmployeeJwt,
    id: string,
    status: string
  ): Promise<ITeamModel>;
  deleteTeam(employee: IEmployeeJwt, id: string): Promise<any>;
}

@injectable()
export class TeamService implements ITeamService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllTeams(body: any): Promise<ITeamPaginated> {
    await validateGetTeams(body);

    return this.docClient
      .getKnexClient()(TeamModel.tableName)
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async getTeam(id: string): Promise<ITeamModel> {
    return TeamModel.query().findById(id);
  }

  async createTeam(employeeId: string, body: any): Promise<ITeamModel> {
    const payload = JSON.parse(body);
    await validateCreateTeam(employeeId, payload);

    return TeamModel.query()
      .insert({
        ...payload,
        updatedBy: employeeId,
      })
      .returning("*");
  }

  async updateTeam(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<ITeamModel> {
    const payload = JSON.parse(body);
    await validateUpdateTeams(id, employee.sub, payload);
    const updatedTeam = await TeamModel.query().patchAndFetchById(id, {
      ...payload,
      updatedBy: employee.sub,
    });
    if (!updatedTeam || Object.keys(updatedTeam).length === 0) {
      throw new CustomError("Object not found", 404);
    }
    return updatedTeam;
  }

  async deleteTeam(id: string): Promise<any> {
    const deleted = await TeamModel.query().deleteById(id);

    if (!deleted) {
      throw new CustomError("Team not found", 404);
    }
  }

  async addEmployeeToTeam(
    admin: IEmployeeJwt,
    teamId: string,
    employeeId: string
  ) {
    await validateAddEmployeeToTeam(admin.sub, teamId, employeeId);
    if (
      RolesEnum[admin.role] < RolesEnum.ADMIN_GROUP &&
      !admin.teamId.split(",").includes(teamId)
    ) {
      throw new CustomError(
        "You are not authorized to add user to this team",
        403
      );
    }

    await TeamModel.relatedQuery("employees").for(teamId).relate(employeeId);
  }
}
