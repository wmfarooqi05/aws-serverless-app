import * as Joi from "joi";
import { getPaginatedJoiKeys } from "src/common/schema";
import TeamModel from "@models/Teams";

const schemaKeys = Object.keys(TeamModel.jsonSchema.properties);

export const validateGetTeams = async (obj: any) => {
  await Joi.object()
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(obj, {
      abortEarly: true,
    });
};

export const validateCreateTeam = async (updatedBy: string, obj: any) => {
  await Joi.object({
    teamName: Joi.string(),
    updatedBy: Joi.string(),
    details: Joi.object(),
    settings: Joi.object()
  }).validateAsync(
    { ...obj, updatedBy },
    {
      abortEarly: true,
      // @TODO cleanup api update
    }
  );
};

export const validateUpdateTeams = async (
  teamId: string,
  updatedBy: string,
  obj: any
) => {
  await Joi.object({
    teamId: Joi.string().guid(),
    teamName: Joi.string(),
    updatedBy: Joi.string(),
    details: Joi.object(),
    settings: Joi.object()
  }).validateAsync(
    { ...obj, teamId, updatedBy },
    {
      abortEarly: true,
      // @TODO cleanup api update
    }
  );
};

export const validateAddDeleteEmployeeToTeam = async (
  adminId,
  teamId,
  employeeId
) => {
  await Joi.object({
    teamId: Joi.string().guid().required(),
    employeeId: Joi.string().guid().required(),
    adminId: Joi.string().guid().required(),
  }).validateAsync({ teamId, employeeId, adminId });
};
