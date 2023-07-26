import path from "path";
import fs from "fs";

// Function to create nested directories recursively
export const createDirectories = async (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    const parentDir = path.dirname(dirPath);
    await createDirectories(parentDir);
    await fs.promises.mkdir(dirPath);
  }
};

// Function to create the file and its parent directories if needed
export const createFileWithDirectories = async (
  filePath: string,
  fileContent: any
) => {
  const fileDir = path.dirname(filePath);
  await createDirectories(fileDir);
  await fs.promises.writeFile(filePath, fileContent);
};
