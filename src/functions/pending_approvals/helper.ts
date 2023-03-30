import { transformJSONKeys } from "src/common/json_helpers";
// import { CustomError } from "src/helpers/custom-error";
import {
  IPendingApprovals,
  PendingApprovalsStatus,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
import { CustomError } from "@helpers/custom-error";
import { Knex } from "knex";

export const validatePendingApprovalObject = (entry: any) => {
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
  knexClient: Knex
) => {
  const {
    tableName,
    tableRowId,
    onApprovalActionRequired: { actionsRequired, query },
  } = entry;

  const originalObject = await knexClient(tableName)
    .where({ id: tableRowId })
    .first();
  if (!originalObject) {
    throw new CustomError(
      `Object not found in table: ${tableName}, id: ${tableRowId}`,
      400
    );
  }
  if (query) {
    // Case 1:
    return knexClient.raw(query);
  }

  const finalQueries: any[] = transformJSONKeys(
    tableRowId,
    actionsRequired,
    originalObject,
    knexClient,
    tableName
  );

  // Executing all queries as a single transaction
  const responses = await knexClient.transaction(async (trx) => {
    const updatePromises = finalQueries.map((finalQuery) =>
      trx.raw(finalQuery.toString())
    );
    return Promise.all(updatePromises);
  });

  return responses;
};
