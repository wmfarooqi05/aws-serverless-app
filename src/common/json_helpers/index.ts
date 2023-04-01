import { UPDATE_HISTORY_TABLE } from "@models/commons";
import {
  APPROVAL_ACTION_JSONB_PAYLOAD,
  APPROVAL_ACTION_SIMPLE_KEY,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
import { IUpdateHistory } from "@models/interfaces/UpdateHistory";
import { randomUUID } from "crypto";
import { Knex } from "knex";
import { CustomError } from "src/helpers/custom-error";

/**
 *
 * @param key
 * @param knex
 * @param item
 * @returns
 */
export const addJsonbObjectHelper = (
  key: string,
  knexClient: Knex,
  item: any
): Object => {
  const id = item.id ?? randomUUID();
  const keySnakeCase = key
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return {
    [key]: knexClient.raw(
      `(
        CASE
          WHEN ${keySnakeCase} IS NULL THEN :itemWithArray::JSONB
          ELSE ${keySnakeCase} || :singleItem::jsonb
        END
      )`,
      {
        itemWithArray: JSON.stringify([{ ...item, id }]),
        singleItem: JSON.stringify({ ...item, id }),
      }
    ),
  };
};

export const updateJsonbObjectHelper = (
  jsonbItemKey: string,
  newJsonbItem: Object,
  index: number,
  knexClient: Knex
) => {
  const keySnakeCase = jsonbItemKey
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return {
    [jsonbItemKey]: knexClient.raw(
      `
        jsonb_set(${keySnakeCase}, 
          '{
            ${index}
          }', '${JSON.stringify(newJsonbItem)}', 
          true
        )
      `
    ),
  };
};

export const updateJsonbObjectWithObjectHelper = async (
  tableName: string,
  rowId: string,
  jsonKey: string,
  knex: Knex<any, any[]>,
  jsonObjId: any
) => {
  const item = await knex(tableName).where({ id: rowId });

  if (!item) {
    throw new CustomError(`${tableName} item doesn't exists.`, 404);
  }

  // @TODO check if concernedPersons is null
  const index = item?.[jsonKey]?.findIndex((x) => x.id === jsonObjId);

  if (index === -1) {
    throw new CustomError("Concerned Person doesn't exist", 404);
  }

  const keySnakeCase = jsonKey
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return {
    [jsonKey]: knex.raw(
      `
        jsonb_set(${keySnakeCase}, 
          '{
            ${index}
          }', '${JSON.stringify(item)}', 
          true
        )
      `
    ),
  };
};

export const findIndexFromJSONBArray = (item: any[], id: string) => {
  return item?.findIndex((x) => x.id === id);
};

export const deleteJsonbObjectHelper = (
  jsonbItemKey: string,
  index: number,
  knexClient: Knex
) => {
  const keySnakeCase = jsonbItemKey
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return { [jsonbItemKey]: knexClient.raw(`${keySnakeCase} - ${index}`) };
};

/**
 * @deprecated
 * @param rowId
 * @param key
 * @param jsonItemId
 * @param knexInstance
 * @returns
 */
export const _findIndexFromJsonbArray = async (
  rowId: string,
  key: string,
  jsonItemId: string,
  knexInstance
): Promise<number> => {
  const object = await knexInstance.where({ id: rowId }).returning(key);
  // @TODO check if concernedPersons is null
  const index = object[0][key]?.findIndex((x) => x.id === jsonItemId);

  if (index === -1) {
    throw new CustomError("Item doesn't exists in jsonb", 404);
  }

  return index;
};

export const transformJSONKeys = (
  tableRowId: string,
  actionItems:
    | APPROVAL_ACTION_SIMPLE_KEY[]
    | APPROVAL_ACTION_JSONB_PAYLOAD[]
    | null,
  actionType: PendingApprovalType,
  originalObject: any,
  knexClient: Knex,
  tableName: string,
  updatedBy: string
) => {
  if (!actionItems) return null;
  let simpleKeys = {};
  const finalQueries = [];
  actionItems.forEach(
    (
      actionItem: APPROVAL_ACTION_SIMPLE_KEY | APPROVAL_ACTION_JSONB_PAYLOAD
    ) => {
      if (actionItem.objectType === "SIMPLE_KEY") {
        let updateHistoryObj: IUpdateHistory = {
          tableName,
          tableRowId,
          actionType: actionType,
          updatedBy,
        } as IUpdateHistory;

        if (actionType === PendingApprovalType.DELETE) {
          updateHistoryObj = {
            ...updateHistoryObj,
            oldValue: JSON.stringify(originalObject),
            newValue: null,
          };
          finalQueries.push(
            knexClient(tableName).where("id", "=", tableRowId).del()
          );
        } else if (actionType === PendingApprovalType.UPDATE) {
          simpleKeys = { ...simpleKeys, ...actionItem.payload };

          const field = Object.keys(actionItem.payload)[0];
          updateHistoryObj = {
            ...updateHistoryObj,
            field,
            oldValue: originalObject[field],
            newValue: actionItem.payload[field],
          };
        }
        finalQueries.push(
          knexClient(UPDATE_HISTORY_TABLE).insert(updateHistoryObj)
        );
      } else {
        const {
          payload: {
            jsonbItemKey,
            jsonbItemValue,
            jsonbItemId,
            jsonActionType,
          },
        } = actionItem;
        let index = -1;

        if (jsonActionType !== PendingApprovalType.JSON_PUSH) {
          index = findIndexFromJSONBArray(
            originalObject[jsonbItemKey],
            jsonbItemId
          );
          if (index === -1) {
            throw new CustomError(
              `Item doesn't exists for ${jsonActionType} in item: ${jsonbItemKey}, id: ${jsonbItemId}`,
              404
            );
          }
        }

        finalQueries.push(
          knexClient(UPDATE_HISTORY_TABLE).insert({
            tableName,
            tableRowId,
            field: jsonbItemKey,
            oldValue:
              jsonActionType === PendingApprovalType.JSON_PUSH
                ? JSON.stringify(originalObject[jsonbItemKey])
                : JSON.stringify(originalObject[jsonbItemKey][index]),
            actionType: jsonActionType,
            newValue: jsonbItemValue,
            updatedBy,
          } as IUpdateHistory)
        );

        switch (jsonActionType) {
          case PendingApprovalType.JSON_UPDATE:
            finalQueries.push(
              knexClient(tableName)
                .where({ id: tableRowId })
                .update(
                  updateJsonbObjectHelper(
                    jsonbItemKey,
                    jsonbItemValue,
                    index,
                    knexClient
                  )
                )
            );
            break;
          case PendingApprovalType.JSON_PUSH:
            finalQueries.push(
              knexClient(tableName)
                .where({ id: tableRowId })
                .update(
                  addJsonbObjectHelper(jsonbItemKey, knexClient, jsonbItemValue)
                )
            );
            break;
          case PendingApprovalType.JSON_DELETE:
            finalQueries.push(
              knexClient(tableName)
                .where({ id: tableRowId })
                .update(
                  deleteJsonbObjectHelper(jsonbItemKey, index, knexClient)
                )
            );
            break;
          default:
            throw new Error(`Invalid action type: ${jsonActionType}`);
        }
      }
    }
  );

  if (simpleKeys && Object.keys(simpleKeys).length > 0) {
    finalQueries.push(
      knexClient(tableName).where({ id: tableRowId }).update(simpleKeys)
    );
  }

  return finalQueries;
};

export const validateJSONItemAndGetIndex = async (
  knexClient: Knex,
  tableName: string,
  tableRowId: string,
  jsonColumnName: string,
  jsonItemId: string,
  errorRowNotFound = null,
  errorJSONItemNotFound = null
): Promise<{ index: number; originalObject: Object }> => {
  const originalRowItem = await knexClient
    .table(tableName)
    .where({ id: tableRowId })
    .first();

  if (!originalRowItem) {
    throw new CustomError(
      errorRowNotFound ? errorRowNotFound : `${tableName} not found`,
      404
    );
  }
  // @TODO add employee checks
  const index = originalRowItem?.[jsonColumnName]?.findIndex(
    (x: any) => x.id === jsonItemId
  );
  if (index === -1 || index === undefined) {
    throw new CustomError(
      errorJSONItemNotFound
        ? errorJSONItemNotFound
        : `${jsonColumnName} doesn't exist`,
      404
    );
  }
  return { index, originalObject: originalRowItem };
};

/**
 * For Where IN queries on JSONB values, we need to
 * convert the string array in a special form
 * 'a,b,c' -> "'a','b','c'"
 * @param value
 */
export const convertToWhereInValue = (value: string): string => {
  return value
    ?.split(",")
    .map((x) => `'${x}'`)
    .join(",");
};

export const addJsonbObjectQueryHelper = (
  key: string,
  knexClient: Knex,
  item: any
): Object => {
  const id = item.id ?? randomUUID();
  const keySnakeCase = key
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();

  const itemWithArray = JSON.stringify([{ ...item, id }]);
  const singleItem = JSON.stringify({ ...item, id });

  return `${keySnakeCase} || :${singleItem}::jsonb`;
};

export const updateJsonbObjectQueryHelper = (
  originalItem: object[],
  jsonbItemKey: string,
  jsonbItemId: string,
  newJsonbItem: any,
  knexClient: Knex
) => {
  const index = findIndexFromJSONBArray(originalItem, jsonbItemId);
  const keySnakeCase = jsonbItemKey
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return `jsonb_set(${keySnakeCase}, '{${index}}', '${JSON.stringify(
    newJsonbItem
  )}', true)`;
};

export const deleteJsonbObjectQueryHelper = (
  originalItem: object[],
  jsonbItemKey: string,
  jsonbItemId: any,
  knexClient: Knex
) => {
  const index = findIndexFromJSONBArray(originalItem, jsonbItemId);
  const keySnakeCase = jsonbItemKey
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return `${keySnakeCase} - ${index}`;
};
