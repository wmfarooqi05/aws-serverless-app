import * as Joi from "joi";
import { PendingApprovalType } from "src/models/interfaces/PendingApprovals";

export const validateGetPendingApprovals = async (obj: any) => {
  await Joi.object({
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
    returningFields: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
  });
};

export const validateCreatePendingApproval = async (obj: any) => {
  await Joi.object({
    activityId: Joi.string().required(),
    activityName: Joi.string(),
    approvers: Joi.array().items(Joi.string()),
    createdBy: Joi.string().required(),
    onApprovalActionRequired: Joi.object({
      rowId: Joi.string().required(),
      actionType: Joi.string()
        .valid(...Object.values(PendingApprovalType))
        .required(),
      payload: Joi.object().required(),
      tableName: Joi.string().required(),
      query: Joi.string(),
    }),
    escalationTime: Joi.date(),
    skipEscalation: Joi.boolean(),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false, // @TODO cleanup api update
  });
};

export const validateUpdatePendingApprovals = async (id: string, obj: any) => {
  await Joi.object({
    id: Joi.string().guid(),
    pendingApprovalName: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  }).validateAsync(
    { ...obj, id },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateUpdatePendingApprovalAssignedUser = async (
  pendingApprovalId: string,
  assignedBy: string,
  payload: any
) => {
  await Joi.object({
    assignedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid(),
    pendingApprovalId: Joi.string().guid().required(),
    comments: Joi.string(),
  }).validateAsync(
    { ...payload, assignedBy, pendingApprovalId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateCreateConcernedPerson = async (
  pendingApprovalId: string,
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    pendingApprovalId: Joi.string().guid().required(),
    name: Joi.string().required(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  })
    .or("phoneNumbers", "emails")
    .validateAsync(
      { ...payload, pendingApprovalId, employeeId },
      {
        abortEarly: true,
        allowUnknown: false,
      }
    );
};

export const validateUpdateConcernedPerson = async (
  employeeId: string,
  pendingApprovalId: string,
  concernedPersonId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    pendingApprovalId: Joi.string().guid().required(),
    concernedPersonId: Joi.string().guid().required(),
    name: Joi.string(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  }).validateAsync(
    { ...payload, pendingApprovalId, employeeId, concernedPersonId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};