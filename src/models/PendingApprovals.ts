import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { PENDING_APPROVAL_TABLE } from "./commons";
import { PendingApprovalsStatus } from "./interfaces/PendingApprovals";

@singleton()
export default class PendingApprovalsModel extends Model {
  static get tableName() {
    return PENDING_APPROVAL_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        tableRowId: { type: "string" },
        tableName: { type: "string" },
        approvers: { type: "array" },
        approvalDetails: { type: "object" },
        createdBy: { type: "string" },
        onApprovalActionRequired: {
          type: "object",
          default: {},
        },
        escalationTime: { type: "string" },
        skipEscalation: { type: "boolean", default: true },
        status: { type: "string", default: PendingApprovalsStatus.PENDING },
        retryCount: { type: "number", default: 0 },
        resultPayload: { type: "array", default: JSON.stringify([]) },
        batchApprovalKey: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["createdBy", "onApprovalActionRequired"],
      additionalProperties: false,
    };
  }
}

export type IPendingApprovalsModel = ModelObject<PendingApprovalsModel>;
