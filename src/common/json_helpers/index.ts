import {
  APPROVAL_ACTION_JSONB_PAYLOAD,
  APPROVAL_ACTION_SIMPLE_KEY,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
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
  const id = randomUUID();
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
  originalItem: object[],
  jsonbItemKey: string,
  jsonbItemId: string,
  newJsonbItem: any,
  knexClient: Knex
) => {
  const index = findIndexFromJSONBArray(
    originalItem[jsonbItemKey],
    jsonbItemId
  );

  if (index === -1) {
    throw new CustomError(
      `Item doesn't exists for update in item: ${jsonbItemKey}, id: ${jsonbItemId}`,
      404
    );
  }

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
  originalItem: object[],
  jsonbItemKey: string,
  jsonbItemId: any,
  knexClient: Knex
) => {
  const index = findIndexFromJSONBArray(
    originalItem[jsonbItemKey],
    jsonbItemId
  );

  if (index === -1) {
    throw new CustomError(
      `Item doesn't exists for delete in item: ${jsonbItemKey}, id: ${jsonbItemId}`,
      404
    );
  }
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
  rowId: string,
  actionItems:
    | APPROVAL_ACTION_SIMPLE_KEY[]
    | APPROVAL_ACTION_JSONB_PAYLOAD[]
    | null,
  originalObject: any,
  knexClient: Knex,
  tableName: string
) => {
  if (!actionItems) return null;
  let simpleKeys = {};
  const finalQueries = [];
  actionItems.forEach(
    (
      actionItem: APPROVAL_ACTION_SIMPLE_KEY | APPROVAL_ACTION_JSONB_PAYLOAD
    ) => {
      if (actionItem.objectType === "SIMPLE_KEY") {
        simpleKeys = { ...simpleKeys, ...actionItem.payload };
      } else {
        const {
          payload: {
            jsonbItemKey,
            jsonbItemValue,
            jsonbItemId,
            jsonActionType,
          },
        } = actionItem;

        switch (jsonActionType) {
          case PendingApprovalType.JSON_UPDATE:
            finalQueries.push(
              knexClient(tableName)
                .where({ id: rowId })
                .update(
                  updateJsonbObjectHelper(
                    originalObject,
                    jsonbItemKey,
                    jsonbItemId,
                    jsonbItemValue,
                    knexClient
                  )
                )
            );
            break;
          case PendingApprovalType.JSON_PUSH:
            finalQueries.push(
              knexClient(tableName)
                .where({ id: rowId })
                .update(
                  addJsonbObjectHelper(jsonbItemKey, knexClient, jsonbItemValue)
                )
            );
            break;
          case PendingApprovalType.JSON_DELETE:
            finalQueries.push(
              knexClient(tableName)
                .where({ id: rowId })
                .update(
                  deleteJsonbObjectHelper(
                    originalObject,
                    jsonbItemKey,
                    jsonbItemId,
                    knexClient
                  )
                )
            );
            break;
          default:
            throw new Error(`Invalid action type: ${jsonActionType}`);
        }
      }
    }
  );

  finalQueries.push(
    knexClient(tableName).where({ id: rowId }).update(simpleKeys)
  );

  return finalQueries;
};

const convertObject = (given, knexClient: Knex) => {
  const required = {};
  for (const key in given) {
    if (Array.isArray(given[key])) {
      const combined = given[key].join(",");
      required[key] = knexClient.raw(combined);
    } else {
      required[key] = given[key];
    }
  }
  return required;
};

export const validateJSONItemAndGetIndex = async (
  knexClient: Knex,
  tableName: string,
  tableRowId: string,
  jsonColumnName: string,
  jsonItemId: string,
  errorRowNotFound = null,
  errorJSONItemNotFound = null
): Promise<number> => {
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
  return index;
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
  const id = randomUUID();
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
