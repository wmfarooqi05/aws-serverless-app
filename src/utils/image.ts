import { uploadContentToS3 } from "@functions/jobs/upload";
import axios, { AxiosResponse } from "axios";
import { randomUUID } from "crypto";

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
  data: Buffer;
  fileType: string;
  fileName: string;
}

async function downloadImage(urlString: string): Promise<DownloadedImage> {
  try {
    const response: AxiosResponse<ArrayBuffer> = await axios.get(urlString, {
      responseType: "arraybuffer",
    });

    const contentType = response.headers["content-type"];
    const fileType = contentType ? contentType.split("/")[1] : "unknown";
    const fileName = urlString.split("/").pop() || "unknown";

    const imageData = Buffer.from(response.data);

    return {
      data: imageData,
      fileType,
      fileName,
    };
  } catch (error) {
    throw new Error(`Failed to download image from URL: ${urlString}`);
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
  rootKey: string,
  existingKeyPattern?: string
): Promise<{ html: string; replacements: ImageReplacement[] }> => {
  /**
   * BUG
   * Replace with CDN urls, not s3 urls
   */
  const imageTags = html.match(/<img[^>]+src="([^">]+)"/g);
  if (!imageTags) {
    return { html, replacements: [] };
  }

  const replacements: ImageReplacement[] = [];

  for (const imageTag of imageTags) {
    const matches = /<img[^>]+src="([^">]+)"/.exec(imageTag);
    if (matches && matches[1]) {
      const imageUrl = matches[1];
      if (existingKeyPattern && imageUrl.includes(existingKeyPattern)) {
        continue;
      }
      const imageData = await downloadImage(imageUrl);
      const s3Key = `${rootKey}/${randomUUID()}.${imageData.fileType}`; // Modify the key as per your requirement
      const resp = await uploadContentToS3(s3Key, imageData.data);

      const cdnUrl = `${process.env.CLOUD_FRONT_URL}/${s3Key}`;
      replacements.push({ originalUrl: imageUrl, cdnUrl, s3Url: resp.fileUrl });
      html = html.replace(imageUrl, cdnUrl);
    }
  }

  return { html, replacements };
};
