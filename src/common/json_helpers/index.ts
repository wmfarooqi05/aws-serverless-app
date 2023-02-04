import { Knex } from "knex";
import { CustomError } from "src/helpers/custom-error";

export const addJsonbObject = (key: string, knex: any, item: any) => {
  const keySnakeCase = key
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return {
    [key]: knex.raw(
      `(
        CASE
          WHEN ${keySnakeCase} IS NULL THEN :itemWithArray::JSONB
          ELSE ${keySnakeCase} || :singleItem::jsonb
        END
      )`,
      {
        itemWithArray: JSON.stringify([item]),
        singleItem: JSON.stringify(item),
      }
    ),
  };
};

export const updateJsonbObject = (
  key: string,
  knex: any,
  item: any,
  index: number
) => {
  const keySnakeCase = key
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return {
    [key]: knex.raw(
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

export const deleteJsonbObject = (key: string, knex: any, index: number) => {
  const keySnakeCase = key
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return { [key]: knex.raw(`${keySnakeCase} - ${index}`) };
};

export const findIndexFromJsonbArray = async (
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

export const transformJSONKeys = (payload: any | null) => {
  if (!payload) return null;
  Object.keys(payload).forEach((x) => {
    if (typeof payload[x] === "object") {
      payload[x] = JSON.stringify(payload[x]);
    }
  });

  return payload;
};
