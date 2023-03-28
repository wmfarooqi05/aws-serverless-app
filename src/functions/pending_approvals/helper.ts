import { transformJSONKeys } from "src/common/json_helpers";
// import { CustomError } from "src/helpers/custom-error";
import {
  IPendingApprovals,
  PendingApprovalsStatus,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
import { CustomError } from "@helpers/custom-error";
import { Knex } from "knex";

export const validatePendingApprovalObject = (entry: IPendingApprovals) => {
  if (!entry) {
    // Case 3
    throw new CustomError(
      `Pending Approval entry doesn\'t exists. ${entry.id}`,
      404
    );
  } else if (entry.status === PendingApprovalsStatus.SUCCESS) {
    return;
    // throw new CustomError("Pending Approval already completed", 400);
  }

  if (!(entry.onApprovalActionRequired?.actionsRequired?.length > 0)) {
    throw new CustomError("No post approval action items exists", 404);
  }

  const { actionType, actionsRequired } = entry.onApprovalActionRequired;

  if (
    actionType === PendingApprovalType.CREATE ||
    actionType === PendingApprovalType.DELETE
  ) {
    if (actionsRequired.length > 1) {
      throw new CustomError(
        "Create or Delete can have only one pending action",
        400
      );
    }
    if (actionsRequired[0].objectType === "JSONB") {
      throw new CustomError("Create or Delete cannot have JSONB type", 400);
    }
  }
};

export const pendingApprovalKnexHelper = async (
  entry: IPendingApprovals,
  // @TODO replace this with knexClient
  knexClient: Knex
) => {
  const { actionType, actionsRequired, rowId, tableName, query } =
    entry.onApprovalActionRequired;

  // @TODO replace this with getKnexClient
  // const knexClient = docClient.knexClient;
  const originalObject = await knexClient(tableName)
    .where({ id: rowId })
    .first();
  if (query) {
    // Case 1:
    return knexClient.raw(query);
  }

  const knexWTable = knexClient(tableName);
  const whereObj = { id: rowId };
  if (actionType === PendingApprovalType.DELETE) {
    return knexWTable.where(whereObj).del();
  }

  const finalKeys = transformJSONKeys(
    actionsRequired,
    knexClient,
    originalObject
  );

  // Case 2:

  if (actionType === PendingApprovalType.CREATE) {
    return knexWTable.insert(finalKeys).returning(Object.keys(finalKeys));
  } else {
    return knexWTable
      .update(finalKeys)
      .where(whereObj)
      .returning(Object.keys(finalKeys));
  }
};
