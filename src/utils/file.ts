import mime from "mime-types";

export const getFileExtension = (contentType: string) => {
  const extension = mime.extension(contentType);
  return extension || "";
};

export const getFileContentType = (filenameOrExt: string): string => {
  return mime.contentType(filenameOrExt) || "";
};

export const getFileNameWithoutExtension = (filename: string): string => {
  return filename?.substring(0, filename?.lastIndexOf(".")) || filename;
};
