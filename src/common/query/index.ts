export const getPaginateClauseObject = (body: any) => {
  if (!body) {
    return {
      perPage: 12,
      currentPage: 1,
    };
  }
  const { page, pageSize } = body;

  return {
    perPage: pageSize ? parseInt(pageSize) : 12,
    currentPage: page ? parseInt(page) : 1,
  };
};

export const getOrderByItems = (body: any, aliasKey = null): string[] => {
  if (!body) return ["updatedAt", "desc"];
  const { sortBy, sortAscending } = body;
  const sortKey = sortBy ? sortBy : "updatedAt";
  let sortOrder = "desc";
  if (sortAscending === "true") {
    sortOrder = "asc";
  }

  if (aliasKey) {
    return [`${aliasKey}.${sortKey}`, `${aliasKey}.${sortOrder}`];
  }
  return [sortKey, sortOrder];
};

export const sanitizeColumnNames = (
  columnNames: string[],
  fields: string,
  aliasKey: string = null,
  getAllKeys: boolean = false
): string | string[] => {
  let returnAll = "*";
  if (aliasKey) {
    returnAll = `${aliasKey}.*`;
  }

  if (!fields) {
    if (getAllKeys) {
      if (aliasKey) {
        return columnNames.map((x) => `${aliasKey}.${x}`);
      }
      return columnNames;
    }
    return returnAll;
  }

  const returningFields = fields
    .split(",")
    .filter((x) => columnNames.includes(x));

  if (returningFields.length === 0) returnAll;

  if (aliasKey) {
    return returningFields.map((key) => `${aliasKey}.${key}`);
  }
  return returningFields;
};
