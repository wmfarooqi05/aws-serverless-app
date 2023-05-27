import "reflect-metadata";
import { injectable } from "tsyringe";
import { SQSClient } from "@aws-sdk/client-sqs";
// import JobsModel, { IJobs } from "@models/pending/[x]Jobs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

@injectable()
export class UtilService {
  sqsClient: SQSClient = null;
  dynamoDBClient: DynamoDBClient = null;
  emailDbClient: DatabaseService = null;
  s3Client: S3Client = null;
  constructor() {
    // private s3Client: S3Client // @inject(DatabaseService) private readonly docClient: DatabaseService,
    if (!this.s3Client) {
      this.s3Client = new S3Client({ region: process.env.REGION });
    }
  }

  async generateSignedUrl(employee: IEmployeeJwt, body) {
    const { filenames } = JSON.parse(body);
    const signedUrls = await Promise.all(
      filenames.map(async (filename: string) => {
        const ext = getExtension(filename);
        const newFileName = `${randomUUID()}${ext}`;
        const key = `tmp/${newFileName}`;
        const command = new PutObjectCommand({
          Bucket: process.env.DEPLOYMENT_BUCKET,
          Key: key,
          ContentType: "application/octet-stream",
          ACL: "public-read", // Set ACL as per your requirement
          // ...(Object.keys(headers).length > 0 && { Metadata: headers }),
        });

        const signedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: 20,
        });
        return {
          signedUrl,
          key,
          originalFileName: filename,
          newFileName: newFileName,
          urlAfterUpload: `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${key}`,
          ACL,
        };
      })
    );
    return signedUrls;
  }
}

export const getExtension = (filename: string) => {
  let ext = "";
  if (filename.split(".")[1]) {
    ext = `.${filename.split(".")[1]}`;
  }
  return ext;
};
