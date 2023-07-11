import mime from "mime-types";

export const getFileExtension = (contentType: string) => {
  const extension = mime.extension(contentType);
  return extension || "";
};
