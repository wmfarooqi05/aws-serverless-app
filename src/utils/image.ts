import { FileRecordService, UploadFiles } from "@functions/fileRecords/service";
import { uploadContentToS3 } from "@functions/jobs/upload";
import { randomUUID } from "crypto";
import { container } from "tsyringe";
import { getFileContentType, getFileExtension } from "./file";
import { ReadAllPermissions } from "@models/FileRecords";

export const isUrlStringSafe = (urlString: string): boolean => {
  // Check for potential security issues or impurities in the URL string
  const disallowedProtocols = ["ftp:", "file:"]; // Add any other disallowed protocols
  const disallowedHostnames = ["example.com"]; // Add any other disallowed hostnames

  const parsedUrl = new URL(urlString);

  // Check if the protocol is allowed
  if (disallowedProtocols.includes(parsedUrl.protocol)) {
    return false;
  }

  // Check if the hostname is allowed
  if (disallowedHostnames.includes(parsedUrl.hostname)) {
    return false;
  }

  // Additional checks can be added based on your specific requirements

  return true;
};

interface DownloadedImage {
  data: ArrayBuffer;
  fileType: string;
  fileName: string;
  originalUrl: string;
}

async function downloadImage(urlString: string): Promise<DownloadedImage> {
  try {
    const response = await fetch(urlString);
    if (!response.ok) {
      throw new Error(`Failed to download image from URL: ${urlString}`);
    }

    const contentType = response.headers.get("content-type");
    const fileType = contentType ? contentType.split("/")[1] : "unknown";
    const fileName = urlString.split("/").pop() || "unknown";

    const buffer = await response.arrayBuffer(); // Convert the response body to a Buffer

    return {
      data: buffer,
      fileType,
      fileName,
      originalUrl: urlString,
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
interface ImageReplacement {
  originalUrl: string;
  s3Url: string;
  cdnUrl: string;
}

/**
 *
 * @param html
 * @param rootKey
 * @param existingKeyPattern
 * @returns
 */
export const replaceImageUrls = async (
  html: string,
  rootKey: string
): Promise<{ html: string; replacements: ImageReplacement[] }> => {
  /**
   * Replace with CDN urls, not s3 urls
   */

  // for detecting <img src="URL" /> pattern
  const imageTags = html.match(/<img[^>]+src="([^">]+)"/g);
  if (!imageTags) {
    return { html, replacements: [] };
  }

  const replacements: ImageReplacement[] = [];

  const imageUrls = imageTags
    .map((imageTag) => {
      // Break the match and extract url on [1]
      const matches = /<img[^>]+src="([^">]+)"/.exec(imageTag);
      if (matches && matches[1] && !checkExistingPattern(rootKey, matches[1])) {
        // It means this url is not already in our bucket folder
        // and we can safely upload it to bucket and store in file records
        return matches[1];
      } else {
        return null;
      }
    })
    .filter((x) => typeof x === "string"); // to filter out null cases

  // Now we have image urls uploaded NOT in our bucket's template folder
  // It means either they are somewhere in our bucket or they can be
  // on some 3rd party site from where user picked them
  // we will use fetch to download that image

  if (imageUrls.length > 0) {
    const downloadedImages = await Promise.allSettled(
      imageUrls.map((x) => downloadImage(x))
    );

    const uploadFiles: UploadFiles[] = downloadedImages
      .map((resp) => {
        if (resp.status === "fulfilled") {
          const { data, fileName, fileType, originalUrl } = resp.value;
          return {
            originalFilename: fileName, // we dont need to add extension here, maybe
            fileName: `${randomUUID()}.${fileType}`,
            s3Key: rootKey,
            fileContent: data,
            originalUrl,
            fileType: getFileContentType(fileType),
            variations: ["THUMBNAIL"],
          } as UploadFiles;
        }
      })
      .filter((x) => x);

    // uploadFiles only has valid image array
    const fileRecords = await container
      .resolve(FileRecordService)
      .uploadFilesToBucketWithPermissions(uploadFiles, ReadAllPermissions);

    // now we have to carefully replace image urls with our bucket urls
    // catch is that some of the image could be failed to download
    // so we will skip them
    uploadFiles.forEach((uploadFile, index) => {
      const originalUrl = uploadFile.originalUrl;
      const cdnUrl = `${process.env.CLOUD_FRONT_URL}/${fileRecords[index].s3Key}`;
      replacements.push({
        originalUrl,
        cdnUrl,
        s3Url: fileRecords[index].fileUrl,
      });
      html = html.replace(originalUrl, cdnUrl);
    });
  }

  return { html, replacements };
};

export const checkExistingPattern = (rootKey: string, url): boolean => {
  const urlWithS3Prefix = `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/`;
  const urlWithCDNPrefix = `${process.env.CLOUD_FRONT_URL}/`;
  const urlKey = url.replace(urlWithS3Prefix, "").replace(urlWithCDNPrefix, "");
  return urlKey.includes(rootKey);
};
