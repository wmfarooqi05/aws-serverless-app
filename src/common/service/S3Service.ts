import "reflect-metadata";
import { injectable } from "tsyringe";
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import bytes from "@utils/bytes";
import * as stream from "stream";
import * as fs from "fs";
import { getKeysFromS3Url } from "@utils/s3";

@injectable()
export class S3Service {
  s3Client: S3Client = null;
  constructor() {
    if (!this.s3Client) {
      this.s3Client = new S3Client({ region: process.env.AWS_REGION });
    }
  }

  /**
   *
   * @param filePath
   * @param Key S3 file key (folder_path/filename)
   * @returns
   */
  async uploadFileToS3(filePath: string, Key: string) {
    const fileContent = await fs.promises.readFile(filePath);
    return this.uploadContentToS3(Key, fileContent);
  }

  async uploadContentToS3(
    Key: string,
    fileContent: any
  ): Promise<{ fileUrl: string; fileKey: string }> {
    const uploadParams: PutObjectCommandInput = {
      Bucket: process.env.DEPLOYMENT_BUCKET,
      Key,
      Body: fileContent,
    };

    try {
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);
      return {
        fileUrl: `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${Key}`,
        fileKey: Key,
      };
    } catch (e) {
      console.error("Error uploading file:", e);
    }
  }

  /**
   *
   * @param sourceKey
   * @param destinationKey
   * @param ACL
   * @param deleteOriginal
   * @param sourceBucket
   * @param sourceRegion
   * @param destinationBucket
   * @param destinationRegion
   * @returns
   */
  copyS3Object = async (
    sourceKey: string,
    destinationKey: string,
    deleteOriginal: boolean = false,
    sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
    sourceRegion: string = process.env.REGION,
    destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
    destinationRegion: string = process.env.REGION
  ): Promise<CopyObjectCommandOutput> => {
    const copyParams: CopyObjectCommandInput = {
      Bucket: destinationBucket,
      CopySource: `${sourceBucket}/${sourceKey}`,
      Key: destinationKey,
    };

    try {
      const { sourceClient, destinationClient } = this.getS3ClientsForRegions(
        sourceRegion,
        destinationRegion
      );

      const newLoc = await destinationClient.send(
        new CopyObjectCommand(copyParams)
      );

      // Delete the object from the old location
      if (deleteOriginal) {
        const deleteParams = {
          Bucket: sourceBucket,
          Key: sourceKey,
        };
        await sourceClient.send(new DeleteObjectCommand(deleteParams));
      }
      return newLoc;
    } catch (e) {}
  };

  /**
   *
   * @param sourceKey
   * @param destinationKey
   * @param ACL
   * @param deleteOriginal
   * @param sourceBucket
   * @param sourceRegion
   * @param destinationBucket
   * @param destinationRegion
   * @returns
   */
  copyS3ObjectAndGetSize = async (
    sourceKey: string,
    destinationKey: string,
    deleteOriginal: boolean = false,
    sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
    sourceRegion: string = process.env.REGION,
    destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
    destinationRegion: string = process.env.REGION
  ): Promise<{ newLoc: CopyObjectCommandOutput; size: string }> => {
    const copyParams: CopyObjectCommandInput = {
      Bucket: destinationBucket,
      CopySource: `${sourceBucket}/${sourceKey}`,
      Key: destinationKey,
    };

    try {
      const { sourceClient, destinationClient } = this.getS3ClientsForRegions(
        sourceRegion,
        destinationRegion
      );

      const newLoc = await destinationClient.send(
        new CopyObjectCommand(copyParams)
      );

      const head = await destinationClient.send(
        new HeadObjectCommand({
          Bucket: destinationBucket,
          Key: destinationKey,
        })
      );

      // Delete the object from the old location
      if (deleteOriginal) {
        const deleteParams = {
          Bucket: sourceBucket,
          Key: sourceKey,
        };
        await sourceClient.send(new DeleteObjectCommand(deleteParams));
      }
      return { newLoc, size: bytes(head.ContentLength).toString() };
    } catch (e) {}
  };

  /**
   *
   * @param sourceFolder
   * @param destinationFolder
   * @deprecated @param ACL
   * @param deleteOriginal
   * @param sourceBucket
   * @param sourceRegion
   * @param destinationBucket
   * @param destinationRegion
   */
  async copyS3FolderContent(
    sourceFolder: string,
    destinationFolder: string,
    deleteOriginal: boolean = false,
    sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
    sourceRegion: string = process.env.REGION,
    destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
    destinationRegion: string = process.env.REGION
  ): Promise<void> {
    const { sourceClient, destinationClient } = this.getS3ClientsForRegions(
      sourceRegion,
      destinationRegion
    );
    const listObjectsCommand = new ListObjectsCommand({
      Bucket: sourceBucket,
      Prefix: sourceFolder,
    });

    const listObjectsResponse = await sourceClient.send(listObjectsCommand);
    const objects = listObjectsResponse.Contents;
    for (const object of objects) {
      const copyObjectCommand = {
        CopySource: `${sourceBucket}/${object.Key}`,
        Bucket: destinationBucket,
        Key: `${destinationFolder}/${object.Key.substring(
          sourceFolder.length + 1
        )}`,
      };
      await destinationClient.send(new CopyObjectCommand(copyObjectCommand));

      if (deleteOriginal) {
        const deleteObjectCommand = {
          Bucket: sourceBucket,
          Key: object.Key,
        };
        await sourceClient.send(new DeleteObjectCommand(deleteObjectCommand));
      }
    }
  }

  async deleteObjectFromS3Url(url: string): Promise<DeleteObjectCommandOutput> {
    const keys = getKeysFromS3Url(url);
    return this.deleteObjectFromS3Key(keys.fileKey, keys.bucketName);
  }

  async deleteObjectFromS3Key(
    key: string,
    bucket: string = process.env.DEPLOYMENT_BUCKET
  ): Promise<DeleteObjectCommandOutput> {
    const deleteParams = {
      Bucket: bucket,
      Key: key,
    };
    return this.s3Client.send(new DeleteObjectCommand(deleteParams));
  }

  // make a download function and write file to some folder

  getS3BufferFromUrl = async (url: string): Promise<Buffer> => {
    const keys = getKeysFromS3Url(url);
    return this.getS3BufferFromKey(keys.fileKey, keys.bucketName);
  };

  getS3BufferFromKey = async (
    fileKey: string,
    bucketName: string = process.env.DEPLOYMENT_BUCKET
  ): Promise<Buffer> => {
    const params: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: fileKey,
    };
    const getObjectCommand = new GetObjectCommand(params);
    const objectData = await this.s3Client.send(getObjectCommand);

    // Pipe the response to a writable stream and collect it as a Buffer
    const bufferStream = new stream.PassThrough();
    objectData.Body.pipe(bufferStream);

    // Accumulate the data in a buffer
    const chunks = [];
    bufferStream.on("readable", () => {
      let chunk;
      while ((chunk = bufferStream.read()) !== null) {
        chunks.push(chunk);
      }
    });

    await stream.promises.finished(bufferStream);

    return Buffer.concat(chunks);
  };

  getS3ReadableFromUrl = async (url: string): Promise<Buffer> => {
    const keys = getKeysFromS3Url(url);
    return this.getS3ReadableFromKey(keys.fileKey, keys.bucketName);
  };

  getS3ReadableFromKey = async (
    fileKey: string,
    bucketName: string = process.env.DEPLOYMENT_BUCKET
  ): Promise<Buffer> => {
    const params: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: fileKey,
    };
    const getObjectCommand = new GetObjectCommand(params);
    const objectData = await this.s3Client.send(getObjectCommand);

    return objectData.Body as Readable;
  };

  getS3ClientsForRegions = (
    sourceRegion: string,
    destinationRegion: string
  ): { sourceClient: S3Client; destinationClient: S3Client } => {
    let sourceClient = this.s3Client;
    let destinationClient = this.s3Client;
    if (sourceRegion !== process.env.REGION) {
      sourceClient = new S3Client({ region: sourceRegion });
    }
    if (destinationRegion !== process.env.REGION) {
      destinationClient = new S3Client({ region: destinationRegion });
    }
    return { sourceClient, destinationClient };
  };
}
