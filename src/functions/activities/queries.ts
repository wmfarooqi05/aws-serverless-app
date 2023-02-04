import { ACTIVITIES_TABLE } from "src/models/commons";
import { ACTIVITY_STATUS_SHORT } from "src/models/interfaces/Activity";


export const topNResults = (companyId: string, type: string, limit: number) => `
  SELECT
    row_number_filter.*
  FROM (
    SELECT
      ${ACTIVITIES_TABLE}.*,
      ROW_NUMBER() OVER (PARTITION BY status_short ORDER BY updated_at DESC)
    FROM
      ${ACTIVITIES_TABLE}
    WHERE
      company_id = '${companyId}' AND ${ACTIVITIES_TABLE}.status_short = '${type}') row_number_filter
  WHERE
    ROW_NUMBER <= ${limit}
`;

export const unionAllResults = (companyId: string, limit: number) => {
  return Object.values(ACTIVITY_STATUS_SHORT).map(x => topNResults(companyId, x, limit)).join('\nUNION\n')
}