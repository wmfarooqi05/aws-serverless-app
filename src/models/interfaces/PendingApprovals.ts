export enum PendingApprovalsStatus {
  // CANCELLED = "CANCELLED", //A pending request is canceled and any action items associated with the request are canceled.
  ESCALATED = "ESCALATED", //	Because the original approver did not complete the RFI in the allotted amount of time, the RFI was sent to another approver.
  FAILED = "FAILED", //	The activity could not be completed. No further activity occurs.
  PARTICIPANT_RESOLUTION_FAILED = "PARTICIPANT_RESOLUTION_FAILED", // 	The activity could not be completed because the approver was deleted from the system.
  PENDING = "PENDING", //	No action was taken to complete the activity.
  SUBMITTED = "SUBMITTED", //	The activity was submitted for approval.
  SUCCESS = "SUCCESS", //	The RFI was successfully completed.
  TERMINATED = "TERMINATED", //	The process run fails with an unknown exception.
  TIMEOUT = "TIMEOUT", //	The specified amount of time to complete an activity passed. The activity is completed and a new activity is created and sent to the escalation participant.
  WARNING = "WARNING", //	The activity was partially completed. A problem occurred, preventing the work order from being successfully completed.
  REJECTED = "REJECTED",
}

export interface IPendingApprovals {
  id?: string;
  tableRowId: string;
  tableName: string;
  approvers: string[];
  createdBy: string;
  onApprovalActionRequired: IOnApprovalActionRequired;
  escalationTime?: string;
  skipEscalation?: boolean;
  status?: PendingApprovalsStatus;
  retryCount?: number;
  resultPayload?: {};
  createdAt?: string;
  updatedAt?: string;
}

export enum PendingApprovalType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  JSON_PUSH = "JSON_PUSH",
  JSON_DELETE = "JSON_DELETE",
  JSON_UPDATE = "JSON_UPDATE",
}

export interface APPROVAL_ACTION_JSONB_PAYLOAD {
  objectType: "JSONB";
  payload: {
    jsonbItemId?: string; // Not present in case of Create
    jsonbItemValue: string;
    jsonbItemKey: string;
    jsonActionType:
      | PendingApprovalType.JSON_PUSH
      | PendingApprovalType.JSON_UPDATE
      | PendingApprovalType.JSON_DELETE;
  };
}

export interface APPROVAL_ACTION_SIMPLE_KEY {
  objectType: "SIMPLE_KEY";
  payload: {
    [k: string]: string;
  };
}

export interface IOnApprovalActionRequired {
  actionType: PendingApprovalType;
  actionsRequired:
    | APPROVAL_ACTION_SIMPLE_KEY[]
    | APPROVAL_ACTION_JSONB_PAYLOAD[];
  /**
   * @deprecated The method should not be used
   */
  payload?: APPROVAL_ACTION_SIMPLE_KEY | APPROVAL_ACTION_JSONB_PAYLOAD;
  /**
   * @deprecated The method should not be used
   */
  tableName: string;
  query?: string;
}

// export interface IOnApprovalActionRequired = IOnApproveCreateAction | IOnApproveUpdateAction | IOnApproveDeleteAction;
