import "reflect-metadata";
// import { DatabaseService } from "./models/database";
import { DatabaseService } from "@libs/database/database-service-objection";

import { container, inject, injectable } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { SESEmailService } from "@common/service/bulk_email/SESEamilService";
import EmailRecordsModel, { JobsModel } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { CustomError } from "@helpers/custom-error";
import { validateBulkEmails, validateSendEmail } from "./schema";
import {
  IEmailSqsEventInput,
  IRecipientItem,
} from "@models/interfaces/Reminders";
import { SQSService } from "@functions/sqs/service";
import { COMPANIES_TABLE_NAME } from "@models/commons";
import { ICompany } from "@models/interfaces/Company";
import { chunk } from "lodash";
import { SQSEvent } from "aws-lambda";
import * as fs from "fs";
import { simpleParser, Attachment, EmailAddress } from "mailparser";
import { uploadContentToS3 } from "@functions/jobs/upload";
import { EmailModel, IEmail, IATTACHMENT } from "./models/Email";
import * as stream from "stream";

import { IRecipient } from "./models/Recipent";
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import moment from "moment-timezone";

const s3Client = new S3Client({ region: "ca-central-1" });
const s3UsClient = new S3Client({ region: "us-east-1" });

export interface IEmailService {}

@injectable()
export class EmailService implements IEmailService {
  constructor(
    @inject(SESEmailService) private readonly sesEmailService: SESEmailService,
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllEmails(body: any): Promise<IEmailPaginated> {}

  async getEmail(id: string): Promise<IEmailModel> {}

  /**
   * @param employee
   * @param body
   * @returns
   */
  async sendEmail(employee: IEmployeeJwt, body: any): Promise<IEmailModel> {
    const payload = JSON.parse(body);
    await validateSendEmail(payload);
    // @TODO get reporting manager if want to add CC

    const {
      recipientId,
      recipientEmail,
      recipientName,
      subject,
      body: emailBody,
      ccList,
      bccList,
      companyId,
    } = payload;

    const id = randomUUID();

    const item: IEmailSqsEventInput = {
      eventType: "SEND_EMAIL",
      name: `EMAIL_JOB_${id}`,
      details: {
        body: emailBody,
        ConfigurationSetName: "email_sns_config",
        recipients: [
          {
            recipientEmail,
            recipientName,
            companyId,
            recipientId,
          },
        ],
        senderEmail: employee.email,
        senderId: employee.sub,
        subject,
        bccList,
        ccList,
      },
    };

    const resp = await container.resolve(SQSService).enqueueItems(item);

    // @TODO fix this
    return JobsModel.query().insert({
      jobType: "SEND_EMAIL",
      details: {
        sqsResp: resp.MessageId,
        emailDetails: item.details,
      },
      uploadedBy: employee.sub,
    });
  }
  /**
   * Push the emails in chunk of 50 in each sqs item
   * @param employee
   * @param body
   * @returns
   */
  async sendBulkEmails(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    // await validateBulkEmails(payload);

    // const { emailListId } = payload;

    // if (!emailListId) {
    //   return;
    // }
    // const companies: ICompany[] = await this.docClient
    //   .getKnexClient()(COMPANIES_TABLE_NAME)
    //   .where(
    //     "contacts",
    //     "@>",
    //     JSON.stringify([{ emailList: [emailListId] }])
    //   );

    // const emailIds = this.getEmailIdsFromCompanies(companies, emailListId);

    // @WARNING EmailList is in main db and not in emailDb
    const emailIds: IRecipientItem[] = [
      {
        recipientEmail: "wmfarooqi05@gmail.com",
        recipientName: "waleed 05",
      },
      {
        recipientEmail: "wmfarooqi70@gmail.com",
        recipientName: "waleed 70",
      },
    ];

    const emailInputPayloads: IEmailSqsEventInput[] = this.createEmailSqsInputs(
      payload,
      emailIds,
      employee
    );

    const jobItems = emailInputPayloads.map((x) => {
      return new JobsModel({
        jobId: randomUUID(),
        uploadedBy: employee.sub,
        jobType: "BULK_EMAIL",
        details: x,
        jobStatus: "PENDING",
      });
    });

    // Use the batchPut method to perform bulk create
    return JobsModel.batchPut(jobItems);
    // Need to write a helper method which picks the batch of X and put in SQS
    // const sqsItemsWithJobId: IEmailSqsEventInput[] = emailInputPayloads.map(
    //   (x: IEmailSqsEventInput, i) => {
    //     return {
    //       ...x,
    //       jobId: jobs[i].id,
    //     };
    //   }
    // );

    // const sqsService = container.resolve(SQSService);
    // await Promise.all(sqsItemsWithJobId.map((x) => sqsService.enqueueItems(x)));
    // return jobs.filter((x) => x.id);
  }

  private createEmailSqsInputs(
    emailPayload: any,
    emailList: IEmailSqsEventInput["details"]["recipients"],
    createdBy: IEmployeeJwt
  ): IEmailSqsEventInput[] {
    const chunkSize = 10;
    return chunk(emailList, chunkSize).map((x) => {
      const { subject, body, ccList, bccList } = emailPayload;
      const id = randomUUID();
      return {
        eventType: "SEND_EMAIL",
        name: `EMAIL_JOB_${id}`,
        details: {
          body,
          ConfigurationSetName: "email_sns_config", // @TODO change with env
          toList: x,
          senderEmail: createdBy.email,
          senderId: createdBy.sub,
          subject,
          bccList,
          ccList,
        },
      } as IEmailSqsEventInput;
    });
  }

  private getEmailIdsFromCompanies(
    companies: ICompany[],
    emailListId: string
  ): IEmailSqsEventInput["details"]["toList"] {
    const emailIds = [];
    companies.forEach((company: ICompany) => {
      company.contacts.forEach((x) => {
        if (x?.emailList?.includes(emailListId)) {
          emailIds.push(
            ...x.emailList.map((e) => {
              return {
                recipientName: x.name,
                recipientEmail: e,
              } as IRecipientItem;
            })
          );
        }
      });
    });
    return emailIds;
  }

  async updateEmail(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<IEmailModel> {}

  async deleteEmail(id: string): Promise<any> {}

  // @TODO fix the 0th index thing
  async sqsEmailHandler(event: IEmailSqsEventInput) {
    console.log("[sqsEmailHandler]", event);
    const {
      senderEmail,
      senderId,
      replyTo,
      ConfigurationSetName,
      recipientId,
      recipientEmail,
      subject,
      body,
      ccList,
      bccList,
      companyId,
    } = event.details[0];
    try {
      await validateSendEmail(event);
      const respEmail = await this.sesEmailService.sendEmail(
        senderEmail,
        [recipientEmail],
        subject,
        body,
        ConfigurationSetName,
        ccList,
        bccList,
        replyTo
      );

      if (respEmail?.$metadata?.httpStatusCode === 200) {
        const newEmail = new EmailRecordsModel({
          senderId,
          senderEmail,
          emailData: {
            subject,
            body,
          },
          ccList: ccList?.join(","),
          bccList: bccList?.join(","),
          recipientId,
          recipientEmail,
          companyId,
          serviceProvider: "AMAZON_SES",
          updatedBy: senderId,
          emailType: "SENDING",
        });

        const resp = await newEmail.save();
        return resp;
      }
    } catch (error) {
      console.log("[sqsEmailHandler] error: ", error);

      if (error.$metadata) {
        const {
          $metadata: { httpStatusCode },
          Error: { message },
        } = error;
        throw new CustomError(message, httpStatusCode);
      } else {
        throw new CustomError(error.message, error.statusCode, error);
      }
    }
  }

  async sendEmailTest(body: any) {
    const payload = JSON.parse(body);
    const { from, recipients, subject, body: emailBody } = payload;

    const resp = await this.sesEmailService.sendEmail(
      from,
      recipients,
      subject,
      emailBody,
      "email_sns_config",
      [],
      [],
      [from]
    );
    return resp;
  }

  async receiveEmailHelper(Records: SQSEvent["Records"][0]) {
    const deleteEvent = [];
    console.log("[receiveEmailHelper] records", Records);
    // for (const record of Records) {
    // console.log("[sqsJobQueueInvokeHandler] record", record);
    const record = Records;
    const payload = JSON.parse(record.body);
    console.log("payload", payload);
    const messagePayload = JSON.parse(payload?.Message);
    console.log("[receiveEmailHelper]", "messagePayload", messagePayload);
    // const mailStream = fs.createReadStream(payload.filePath);
    const mailStream = await this.downloadStreamFromUSEastBucket(
      `incoming-emails/${messagePayload.mail.messageId}`
    );

    // const messagePath = `/tmp/${randomUUID()}`;
    // await fs.promises.mkdir(messagePath);
    const mailObject = await simpleParser(mailStream);
    console.log("mailObject", mailObject.subject);
    // const attachmentList = await this.saveAttachmentsToTmp(
    //   messagePath,
    //   mailObject.attachments
    // );
    // delete mailObject.attachments;

    /////// Thumbnails
    // await fs.promises.mkdir(`${messagePath}/thumbnails`);
    // const thumbnailPromises = this.generateThumbnails(
    //   messagePath,
    //   attachmentList
    // );
    // const thumbnails = await Promise.all(thumbnailPromises);

    // @TODO handle Thumbnails
    const tmpS3Path = "media/tmp";

    // const attachmentsS3Promises = attachmentList.map((x) =>
    //   uploadFileToS3(
    //     x.absolutePath,
    //     `media/attachments/${messagePayload.mail.messageId}/${x.nameWithExt}`
    //   )
    // );

    const attachmentsS3Promises = mailObject.attachments.map((x) =>
      uploadContentToS3(
        `media/attachments/${messagePayload.mail.messageId}/${randomUUID()}.${
          x.contentType.split("/")[1]
        }`,
        x.content
      )
    );

    const attachmentsS3 = await Promise.all(attachmentsS3Promises);
    console.log("attachmentsS3", attachmentsS3);
    // const attachments = await this.transferFiles(
    //   messagePayload.mail.messageId,
    //   attachmentList,
    //   attachmentsS3
    // );

    const email: IEmail = {
      body: mailObject?.text,
      bodyAsHtml: mailObject?.textAsHtml,
      senderEmail: mailObject?.from?.value[0]?.address,
      senderName: mailObject?.from?.value[0]?.name,
      sentAt: mailObject.date.toISOString(),
      status: "RECEIVED",
      subject: mailObject?.subject,
      attachments: attachmentsS3.map((x) => {
        return { ...x, updatedAt: moment().utc().format() };
      }),
      direction: "RECEIVED",
    };

    let error = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        emailEntity = await EmailModel.query(trx).insert(email);
        const recipients: IRecipient[] = [];
        mailObject.to?.value.map((x: EmailAddress) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "TO_LIST",
            recipientName: x.name,
            recipientEmail: x.address,
          });
        });
        mailObject.cc?.value.map((x: EmailAddress) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "CC_LIST",
            recipientName: x.name,
            recipientEmail: x.address,
          });
        });
        mailObject.bcc?.value.map((x: EmailAddress) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "BCC_LIST",
            recipientName: x.name,
            recipientEmail: x.address,
          });
        });

        const recipientsEntriesPromises = recipients.map((x: any) =>
          EmailModel.relatedQuery("recipients", trx)
            .for(emailEntity.id)
            .insert(x)
        );

        emailEntity.recipients = await Promise.all(recipientsEntriesPromises);
        await trx.commit();
      } catch (e) {
        error = e;
        await trx.rollback();
      }
    });

    if (error) {
      console.log(error);
    }
    // }
  }

  async downloadStreamFromUSEastBucket(keyName: string) {
    const params = {
      Bucket: "gel-api-dev-bucket-2b86f11d",
      Key: keyName,
    };
    const getObjectCommand = new GetObjectCommand(params);
    const objectData = await s3UsClient.send(getObjectCommand);

    // Pipe the response to a writable stream and collect it as a Buffer
    const bufferStream = new stream.PassThrough();
    return objectData.Body.pipe(bufferStream);

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
  }

  async transferFiles(
    messageId: string,
    attachmentList: {
      name: string;
      nameWithExt: string;
      contentType: string;
      ext: string;
      absolutePath: string;
    }[],
    s3TmpFiles: {
      fileUrl: string;
      fileKey: string;
    }[]
  ) {
    const attachments: IATTACHMENT[] = [];
    const copyPromises = s3TmpFiles.map(async (key, index) => {
      attachments.push({
        fileUrl: key.fileUrl,
        updatedAt: moment().utc().format(),
      });
      const CopySource = `media/tmp/${attachmentList[index].nameWithExt}`;
      const Key = `media/attachments/${messageId}/${attachmentList[index].nameWithExt}`;
      const copyParams: CopyObjectCommandInput = {
        Bucket: "gel-api-dev-serverlessdeploymentbucket-d34v77eas9bz",
        CopySource,
        Key,
      };

      try {
        return s3Client.send(new CopyObjectCommand(copyParams));
        console.log(`${key} copied successfully`);
      } catch (err) {
        console.log(`Error copying ${key}: ${err}`);
      }
    });

    const newLoc = await Promise.all(copyPromises);
    // attachments = attachments.map((x, index) => {
    //   return {
    //     ...x,
    //     fileUrl: newLoc[index].
    //   }
    // })
    return attachments;
  }
  // generateThumbnails(
  //   folderPath: string,
  //   attachmentList: {
  //     name: string;
  //     nameWithExt: string;
  //     contentType: string;
  //     ext: string;
  //   }[]
  // ) {
  //   const thumbPath = `${folderPath}/thumbnails`;
  //   return attachmentList.map(async (x) => {
  //     if (x.contentType.includes("video")) {
  //       const Body = fs.createReadStream(
  //         `${folderPath}/attachments/${x.nameWithExt}`
  //       );
  //       const thumbnailBuffer = await new Promise((resolve, reject) => {
  //         const ffmpegProcess = spawn("ffmpeg", [
  //           "-ss",
  //           "00:00:01",
  //           "-i",
  //           "pipe:0",
  //           "-vframes",
  //           "1",
  //           "-q:v",
  //           "2",
  //           "-f",
  //           "image2pipe",
  //           "-c:v",
  //           "png",
  //           "-",
  //         ]);

  //         ffmpegProcess.on("error", (error) => {
  //           console.error("Error running ffmpeg:", error);
  //           reject(error);
  //         });

  //         ffmpegProcess.on("close", (code) => {
  //           if (code !== 0) {
  //             console.error(`ffmpeg process exited with code ${code}`);
  //             reject(`ffmpeg process exited with code ${code}`);
  //           } else {
  //             resolve(Body);
  //           }
  //         });

  //         Body.pipe(ffmpegProcess.stdin);
  //       });

  //       const thumbnailBufferImg = await sharp(thumbnailBuffer)
  //         .resize(200, 200, {
  //           fit: "cover",
  //         }) // Adjust the dimensions as per your requirements
  //         .toBuffer();
  //       console.log("a");
  //       // return new Promise((resolve, reject) => {

  //       // ffprobe(
  //       //   `${thumbPath}/${x.nameWithExt}`,
  //       //   ["-show_streams"],
  //       //   (err, metadata) => {
  //       //     if (err) {
  //       //       reject(err);
  //       //     } else {
  //       //       // Process metadata
  //       //       resolve(metadata);
  //       //     }
  //       //   }
  //       // )
  //       // ffmpeg(`${thumbPath}/${x.nameWithExt}`)
  //       //   .on("end", () => {
  //       //     resolve(`${thumbPath}/${x.nameWithExt}`);
  //       //   })
  //       //   .on("error", (err) => {
  //       //     reject(err);
  //       //   })
  //       //   .screenshots({
  //       //     count: 1,
  //       //     folder: thumbPath,
  //       //     size: "320x240",
  //       //     filename: x.nameWithExt,
  //       //   });
  //       // });
  //     }
  //     // else if (x.contentType.includes("image")) {
  //     //   return new Promise((resolve, reject) => {
  //     //     const thumbnailPath = `${x.name}.png`;
  //     //     sharp(`${folderPath}/attachments/${x.nameWithExt}`)
  //     //       .resize(320, 240)
  //     //       .toFile(thumbnailPath, (err) => {
  //     //         if (err) {
  //     //           reject(err);
  //     //         } else {
  //     //           resolve(thumbnailPath);
  //     //         }
  //     //       });
  //     //   });
  //     // }
  //   });
  // }

  async saveAttachmentsToTmp(folderPath: string, attachments: Attachment[]) {
    if (!attachments.length) return [];
    const saveToTmpPromises = [];
    const attachmentList: {
      name: string;
      nameWithExt: string;
      contentType: string;
      ext: string;
      absolutePath: string;
    }[] = [];
    const attachmentsPath = `${folderPath}/attachments`;
    await fs.promises.mkdir(attachmentsPath);
    attachments.forEach((x) => {
      let type = "";
      if (x.contentType) {
        type = `.${x.contentType.split("/")[1]}`;
      }
      const name = randomUUID();
      const nameWithExt = `${name}${type}`;
      attachmentList.push({
        name,
        nameWithExt,
        contentType: x.contentType,
        ext: type,
        absolutePath: `${attachmentsPath}/${nameWithExt}`,
      });
      saveToTmpPromises.push(
        fs.promises.writeFile(`${attachmentsPath}/${nameWithExt}`, x.content)
      );
    });
    await Promise.all(saveToTmpPromises);
    return attachmentList;
  }

  getHalfDuration(duration: string | number) {
    if (typeof duration === "number") return duration / 2;
    if (typeof duration === "string") return parseInt(duration) / 2;
  }
}
