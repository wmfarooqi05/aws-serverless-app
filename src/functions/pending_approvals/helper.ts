import { DatabaseService } from "@libs/database/database-service-objection";
import {
  addJsonbObject,
  deleteJsonbObject,
  findIndexFromJsonbArray,
  transformJSONKeys,
  updateJsonbObject,
} from "src/common/json_helpers";
// import { CustomError } from "src/helpers/custom-error";
import {
  APPROVAL_ACTION_JSONB_PAYLOAD,
  IPendingApprovals,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";

export const pendingApprovalKnexHelper = async (
  entry: IPendingApprovals,
  docClient: DatabaseService
) => {
  const { actionType, payload, rowId, tableName, query } =
    entry.onApprovalActionRequired;

  const knexClient = docClient.knexClient;
  if (query) {
    // Case 1:
    return knexClient.raw(query);
  }

  const payloadWithJson = transformJSONKeys(payload);

  // Case 2:
  const knexWTable = docClient.get(tableName);
  const whereObj = { id: rowId };
  if (actionType === PendingApprovalType.CREATE) {
    return knexWTable.insert(payloadWithJson).returning(Object.keys(payloadWithJson));
  } else if (actionType === PendingApprovalType.UPDATE) {
    return knexWTable.update(payloadWithJson).where(whereObj).returning(Object.keys(payloadWithJson));
  } else if (actionType === PendingApprovalType.DELETE) {
    return knexWTable.where(whereObj).del();
  } else if (actionType === PendingApprovalType.JSON_PUSH) {
    // use helper function to push item to array or add [item]
    const { jsonbItem, key }: APPROVAL_ACTION_JSONB_PAYLOAD = payloadWithJson;
    const createQuery = addJsonbObject(
      key,
      knexClient,
      JSON.parse(jsonbItem as string)
    );
    return knexWTable.update(createQuery).where(whereObj).returning(key);
  } else if (
    actionType === PendingApprovalType.JSON_UPDATE ||
    actionType === PendingApprovalType.JSON_DELETE
  ) {
    // add second id in onApprovalActionRequired
    // get index
    const { id, jsonbItem, key }: APPROVAL_ACTION_JSONB_PAYLOAD = payload;
    const index = await findIndexFromJsonbArray(rowId, key, id, knexWTable);
    let finalQuery = {};
    if (actionType === PendingApprovalType.JSON_UPDATE) {
      finalQuery = updateJsonbObject(
        key,
        knexClient,
        JSON.parse(jsonbItem as string),
        index
      );
    } else {
      finalQuery = deleteJsonbObject(key, knexClient, index);
    }
    return knexWTable.update(finalQuery).where(whereObj).returning(key);
  }
};
