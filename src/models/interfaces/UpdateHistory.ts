
export enum PendingApprovalType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  JSON_PUSH = "JSON_PUSH",
  JSON_DELETE = "JSON_DELETE",
  JSON_UPDATE = "JSON_UPDATE",
}

export interface IUpdateHistory {
  id?: string;
  tableRowId?: string;
  tableName: string;
  field?: string;
  subField?: string;
  oldValue?: any;
  newValue?: any;
  actionType: PendingApprovalType;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
}
