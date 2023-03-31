export interface IUpdateHistory {
  id: string;
  tableRowId: string;
  tableName: string;
  field: string;
  subField: string;
  value: string; // this will be beneficial when we have json key
  // old and new value will represent whole json, but value will tell what was the actual value
  oldValue: string;
  newValue: string;
  actionType: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
