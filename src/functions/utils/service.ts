import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { FilePermissionsService } from "@functions/filePermissions/service";
import { validateGetPublicUrls } from "./schema";
import { getFileExtension } from "@utils/file";

@injectable()
export class UtilService {
  s3Client: S3Client = null;
  constructor(
    @inject(FilePermissionsService)
    private readonly filePermissionsService: FilePermissionsService
  ) {
    if (!this.s3Client) {
      this.s3Client = new S3Client({ region: process.env.REGION });
    }
  }

  async generateSignedUrl(employee: IEmployeeJwt, body) {
    const { filenames } = JSON.parse(body);
    const signedUrls = await Promise.all(
      filenames.map(async (filename: string) => {
        const ext = getFileExtension(filename);
        const newFileName = `${randomUUID()}${ext}`;
        const key = `tmp/${newFileName}`;
        const command = new PutObjectCommand({
          Bucket: process.env.DEPLOYMENT_BUCKET,
          Key: key,
          ContentType: "application/octet-stream",
        });

        const signedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: 20,
        });
        return {
          signedUrl,
          key,
          originalFileName: filename,
          newFileName: newFileName,
          urlAfterUpload: `${process.env.CLOUD_FRONT_DOMAIN_NAME}/${key}`,
        };
      })
    );
    return signedUrls;
  }

  async getPublicUrls(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    await validateGetPublicUrls(payload);

    const { urls }: { urls: string[] } = payload;
    return this.filePermissionsService.getCDNPublicUrlWithPermissions(employee, urls);
  }
}
