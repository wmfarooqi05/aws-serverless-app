export const getPaginateClauseObject = (body: any) => {
  if (!body) return;
  const { page, pageSize } = body;

  return {
    perPage: pageSize ? parseInt(pageSize) : 12,
    currentPage: page ? parseInt(page) : 1,
  };
};

export const getOrderByItems = (body: any): string[] => {
  if (!body) return ["updatedAt", "desc"];
  const { sortBy, sortAscending } = body;
  const sortKey = sortBy ? sortBy : "updatedAt";
  let sortOrder = "desc";
  if (sortAscending === "true") {
    sortOrder = "asc";
  }
  return [sortKey, sortOrder];
};

export const sanitizeColumnNames = (
  columnNames: string[],
  fields: string
): string | string[] => {
  if (!fields) return "*";
  const returningFields = fields
    .split(",")
    .filter((x) => columnNames.includes(x));

  if (returningFields.length === 0) {
    return "*";
  }
  return returningFields;
};
