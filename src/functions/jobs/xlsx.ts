import { snakeCase } from "lodash";
import * as XLSX from "xlsx";
import { uploadContentToS3 } from "./upload";

export const uploadJsonAsXlsx = async (
  Key: string,
  content: any
): Promise<{ fileUrl: string; fileKey: string }> => {
  const rows = [];
  const headers = Object.keys(content[0]);
  rows.push(headers.map((x) => snakeCase(x)));
  for (const item of content) {
    const row = headers.map((header) => item[header]); // Map the item's values based on the headers
    rows.push(row);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  const buffer = XLSX.write(workbook, { type: "buffer" });
  return uploadContentToS3(Key, buffer);
};
