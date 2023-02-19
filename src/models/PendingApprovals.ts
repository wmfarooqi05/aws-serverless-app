import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { PENDING_APPROVAL_TABLE } from "./commons";
import {
  PendingApprovalsStatus,
} from "./interfaces/PendingApprovals";

@singleton()
export default class PendingApprovalsModel extends Model {
  static get tableName() {
    return PENDING_APPROVAL_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        activityId: { type: "string" },
        activityName: { type: "string" },
        approvers: { type: "array" },
        createdBy: { type: "string" },
        onApprovalActionRequired: {
          type: "object",
          default: {},
        },
        escalationTime: { type: "string" },
        skipEscalation: { type: "boolean", default: true },
        status: { type: "string", default: PendingApprovalsStatus.PENDING },
        retryCount: { type: "number" },
        resultPayload: { type: "array" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "activityId",
        "activityName",
        "createdBy",
        "onApprovalActionRequired",
      ],
      additionalProperties: false,
    };
  }
}

export type IPendingApprovalsModel = ModelObject<PendingApprovalsModel>;
