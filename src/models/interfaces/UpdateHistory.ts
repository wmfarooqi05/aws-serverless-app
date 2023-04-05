export interface IUpdateHistory {
  id: string;
  tableRowId: string;
  tableName: string;
  field: string;
  subField: string;
  oldValue: string;
  newValue: string;
  actionType: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
