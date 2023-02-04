import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import Company from "./Company";
import { COMPANIES_TABLE_NAME } from "./commons";
import { IWithPagination } from "knex-paginate";

export const APP_AUDIT_LOGS_TABLE = process.env.APP_AUDIT_LOGS_TABLE || "app_audit_logs_local";

export interface IAuditLogs {
  id: string;
  companyId: string;
  createdBy: string;
  actionType: ACTION_TYPE;
  title: string;
  parentFieldId: string; // the rowId or entry to which it belongs,
  summary: string;
  moduleName: string;
  filterTags: string[], // it can be like `status`, `assignment` in case if someone wants to see only status update auditLogs
  createdAt: string;
}

export enum ACTION_TYPE {
  CREATE,
  DELETE,
  UPDATE,
}

@singleton()
export default class AppAuditLogs extends Model {
  static get tableName() {
    return APP_AUDIT_LOGS_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        actionType: { type: "string" }, // ACTION_TYPE
        actionTitle: { type: "string" }, // Outgoing call to Waleed, custom written by system
        summary: { type: "string" }, // further details if needed

        tableName: { type: "string" },
        moduleName: { type: "string" }, // e.g. Company, in some cases it will be similar like table name
        relatedModuleName: { type: "string" }, // e.g. concernedPersons (which are right now child of Company table)

        // Null in case of bulk-company operation
        companyId: { type: "string" },
        companyName: { type: "string" },

        createdById: { type: "string" },
        createdByName: { type: "string" },

        queryString: { type: "string" },
        tableRowId: { type: "string" }, // null in case of bulk, or maybe comma separated
        tableRowTitle: { type: "string" }, // if that record has some name or title
        inputValues: { type: "object" }, // { firstname: "new first name"}
        filterTags: { type: "array" }, // it can be like `status`, `assignment` in case if someone wants to see only status update auditLogs
        createdAt: { type: "string" },
      },
      required: [
        "actionType",
        "createdById",
        "createdByName",
        "inputValues",
        "tableName",
        "moduleName",
        "queryString",
      ],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    auditLogsToCompany: {
      relation: Model.BelongsToOneRelation,
      modelClass: Company,
      join: {
        from: `${AUDIT_LOGS_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["filterTags"];
  }
}

export type IAuditLogsModel = ModelObject<AuditLogs>;
export type IAuditLogsPaginated = IWithPagination<IAuditLogsModel>;
