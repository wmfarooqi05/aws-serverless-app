import * as Joi from "joi";
import {
  IPendingApprovals,
  PendingApprovalsStatus,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";

export const validateGetPendingApprovals = async (obj: any) => {
  await Joi.object({
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
    returningFields: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
  });
};

export const validateCreatePendingApproval = async (obj: any) => {
  await Joi.object({
    activityId: Joi.string().required(),
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
    // @TODO cleanup api update
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
    }
  );
};

export const validateUpdatePendingApprovalAssignedEmployee = async (
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
    }
  );
};

export const validatePendingApprovalBeforeJob = async (
  obj: IPendingApprovals
) => {
  await Joi.object({
    status: Joi.string().valid(...Object.keys(PendingApprovalsStatus)),
    id: Joi.string().uuid().required(),
    retryCount: Joi.number().integer().min(0).required(),
    tableRowId: Joi.when("onApprovalActionRequired.actionType", {
      is: "CREATE",
      then: Joi.not().required(),
      otherwise: Joi.string().guid().required(),
    }), // Joi.string().uuid().not().required(),
    tableName: Joi.string().required(),
    onApprovalActionRequired: onApprovalActionRequiredSchema.required(),
  }).validateAsync(obj, {
    allowUnknown: true,
    abortEarly: true,
  });
};

// Pending Approval Approve / Reject Joi Schema

const jsonbSchema = Joi.object({
  jsonActionType: Joi.when("objectType", {
    is: "JSONB",
    then: Joi.string()
      .valid("JSON_UPDATE", "JSON_DELETE", "JSON_PUSH")
      .required(),
  }),
  jsonbItemId: Joi.when("jsonActionType", {
    is: "JSON_PUSH",
    then: Joi.string().uuid().allow(null),
    otherwise: Joi.string().uuid().required(),
  }),
  jsonbItemKey: Joi.string().required(),
  jsonbItemValue: Joi.when("jsonActionType", {
    is: "JSON_DELETE",
    then: Joi.object().allow(null),
    otherwise: Joi.object().required(),
  }),
});

// const simpleKeySchema = Joi.object({
//   companyName: Joi.string(),
//   assignedTo: Joi.string().uuid(),
// })
//   .xor("companyName", "assignedTo")
//   .required();

const actionSchema = Joi.object({
  objectType: Joi.string().valid("SIMPLE_KEY", "JSONB").required(),
  payload: Joi.when("objectType", {
    is: "SIMPLE_KEY",
    then: Joi.object(),
    otherwise: jsonbSchema.required(),
  }),
}).required();

const onApprovalActionRequiredSchema = Joi.object({
  actionsRequired: Joi.when("actionType", {
    is: "DELETE",
    then: Joi.not().required(),
    otherwise: Joi.array().items(actionSchema).min(1).required(),
  }),
  actionType: Joi.string().required(),
}).required();
