import "reflect-metadata";
// import { DatabaseService } from "./models/database";
import { DatabaseService } from "@libs/database/database-service-objection";

import { inject, injectable } from "tsyringe";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { SESEmailService } from "@common/service/bulk_email/SESEamilService";
import EmailRecordsModel from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { CustomError } from "@helpers/custom-error";
import { validateBulkEmails, validateSendEmail } from "./schema";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";
import { SQSEvent } from "aws-lambda";
import * as fs from "fs";
import { simpleParser, Attachment, EmailAddress } from "mailparser";
import {
  copyS3Object,
  getKeysFromS3Url,
  uploadContentToS3,
  getS3ReadableFromUrl,
} from "@functions/jobs/upload";
import { EmailModel, IEmail, IATTACHMENT } from "./models/Email";
import * as stream from "stream";

import { IRecipient } from "./models/Recipent";
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import moment from "moment-timezone";
import { EmailTemplatesModel, IEmailTemplate } from "./models/EmailTemplate";
import EmailAddressesModel, { IEmailAddresses } from "@models/EmailAddresses";
import {
  GetTemplateCommand,
  GetTemplateCommandInput,
  SESClient,
  SendBulkTemplatedEmailCommand,
  SendBulkTemplatedEmailCommandInput,
  SendRawEmailCommand,
  SendRawEmailCommandInput,
} from "@aws-sdk/client-ses";
import { formatErrorResponse } from "@libs/api-gateway";

const s3Client = new S3Client({ region: "ca-central-1" });
const s3UsClient = new S3Client({ region: "us-east-1" });
const sesClient = new SESClient({ region: process.env.REGION });
// const MailComposer = require("nodemailer/lib/mail-composer");
import MailComposer from "nodemailer/lib/mail-composer";
import { isValidUrl } from "@utils/index";
import { mergeEmailAndSenderName } from "@utils/emails";
import EmployeeModel from "@models/Employees";

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
  async sendEmail(employeeJwt: IEmployeeJwt, _body: any): Promise<IEmailModel> {
    // nodemailer.createTransport().sendMail({});
    // @TODO get reporting manager if want to add CC

    const payload = JSON.parse(_body);
    await validateSendEmail(payload);

    const employee: IEmployee = await EmployeeModel.query().findById(
      employeeJwt.sub
    );

    const { name: senderName, email: senderEmail, id: senderId } = employee;
    const {
      toList,
      ccList,
      bccList,
      subject,
      body,
      isBodyUploaded,
      replyTo,
      attachments,
    } = payload;

    let deleteS3Items = [];
    // Add email sender id, and use sendername and sender email from JWT
    const email: IEmail = {
      senderId,
      body,
      isBodyUploaded,
      direction: "SENT",
      senderName,
      senderEmail,
      status: "SENDING",
      subject,
    };
    let emailEntity = await this.createEmailObject(
      email,
      toList,
      ccList,
      bccList
    );

    try {
      const { mailComposer, copyS3Promises, fileMap } = await this.composeEmail(
        senderName,
        senderEmail,
        toList,
        ccList,
        bccList,
        subject,
        replyTo,
        body,
        attachments,
        emailEntity.id,
        isBodyUploaded
      );
      const rawMail = await mailComposer.compile().build();
      const rawMailInput: SendRawEmailCommandInput = {
        RawMessage: {
          Data: rawMail,
        },
        ConfigurationSetName: "email_sns_config",
        Destinations: [
          ...mergeEmailAndSenderName(toList),
          ...mergeEmailAndSenderName(ccList),
          ...mergeEmailAndSenderName(bccList),
        ],
        Source: `${senderName} <${senderEmail}>`,
      };
      const resp = await sesClient.send(new SendRawEmailCommand(rawMailInput));

      if (resp.$metadata.httpStatusCode === 200) {
        await Promise.all(copyS3Promises);
        // @TODO attachments not saving fileurl
        const updateParams: any = {
          status: "SENT",
          attachments: fileMap,
          sentAt: moment().utc().format(),
        };
        emailEntity = { ...emailEntity, ...updateParams };
        await EmailModel.query().patchAndFetchById(
          emailEntity.id,
          updateParams
        );
      }
      // delete S3
      return emailEntity;
    } catch (e) {
      // delete the copied items maybe
      // we will not delete anything from tmp till mail is sent
      console.log("e");
      return formatErrorResponse(e);
    }
  }

  async createEmailObject(
    email: IEmail,
    toList: EmailAddress[],
    ccList: EmailAddress[],
    bccList: EmailAddress[]
  ) {
    let emailEntity: IEmail = null;
    let error: any = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        emailEntity = await EmailModel.query(trx).insert(email);

        const recipients: IRecipient[] = [];
        toList?.map((x: EmailAddress) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "TO_LIST",
            recipientName: x.name,
            recipientEmail: x.address,
          });
        });
        ccList?.map((x: EmailAddress) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "CC_LIST",
            recipientName: x.name,
            recipientEmail: x.address,
          });
        });
        bccList?.map((x: EmailAddress) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "BCC_LIST",
            recipientName: x.name,
            recipientEmail: x.address,
          });
        });

        recipients.map((x: any) =>
          EmailModel.relatedQuery("recipients", trx)
            .for(emailEntity.id)
            .insert(x)
        );
      } catch (e) {
        error = e;
        await trx.rollback();
      }
    });
    if (error) {
      throw new CustomError(error.message, error.statusCode);
    }
    return emailEntity;
  }
  /**
   *
   * @param senderName
   * @param senderEmail
   * @param toList
   * @param ccList
   * @param bccList
   * @param subject
   * @param replyTo
   * @param emailBody
   * @param attachments
   * @param emailId
   * @returns
   */
  async composeEmail(
    senderName: string,
    senderEmail: string,
    toList: { email: string; name: string }[],
    ccList: { email: string; name: string }[],
    bccList: { email: string; name: string }[],
    subject: string,
    replyTo: string,
    body: string,
    attachments: {
      url: string;
      contentType: string;
      filename: string;
    }[],
    emailId: string,
    isBodyUploaded: boolean
  ): Promise<{
    mailComposer: MailComposer;
    copyS3Promises: Promise<CopyObjectCommandOutput>[];
    fileMap: any[];
  }> {
    let emailBody: any = body;
    if (isBodyUploaded && isValidUrl(emailBody)) {
      emailBody = await getS3ReadableFromUrl(emailBody);
      // deleteS3Items.push(emailBody);
    }

    const mailComposer = new MailComposer({
      from: { address: senderEmail, name: senderName },
      to: toList?.length
        ? toList.map(({ email, name }) => ({ address: email, name }))
        : [],
      cc: ccList?.length
        ? ccList.map(({ email, name }) => ({ address: email, name }))
        : [],
      bcc: bccList?.length
        ? bccList.map(({ email, name }) => ({ address: email, name }))
        : [],
      subject,
      replyTo,
      text: emailBody,
      // html: emailBody,
    });

    const copyS3Promises: Promise<CopyObjectCommandOutput>[] = [];
    const fileMap = [];

    if (attachments?.length) {
      const attachmentStreams = await Promise.all(
        attachments.map((x) => {
          // deleteS3Items.push(x.url);
          return getS3ReadableFromUrl(x.url);
        })
      );

      mailComposer.mail.attachments = attachments.map((x, i) => {
        return {
          contentType: x.contentType,
          filename: x.filename,
          content: attachmentStreams[i],
          // raw: attachmentStreams[i],
        };
      });
      // @TODO bring back
      attachments.forEach((x) => {
        const uuidName = randomUUID();
        const newKey = `media/attachments/${emailId}/${x.filename}`;
        const keys = getKeysFromS3Url(x.url);
        fileMap.push({
          fileKey: newKey,
          uuidName,
          originName: x.filename,
          fileUrl: `https://${process.env.DEPLOYMENT_BUCKET}/${newKey}`,
        });

        copyS3Promises.push(
          copyS3Object(
            keys.fileKey,
            newKey,
            "public-read",
            false,
            keys.bucketName,
            keys.region
          )
        );
      });
    }
    return { mailComposer, copyS3Promises, fileMap };
  }
  /**
   * Push the emails in chunk of 50 in each sqs item
   * @param employee
   * @param body
   * @returns
   */
  async sendBulkEmails(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);

    await validateBulkEmails(payload);

    const { emailListId, templateId, placeholders } = payload;

    const emailTemplate: IEmailTemplate =
      await EmailTemplatesModel.query().findById(templateId);
    if (!emailTemplate) {
      throw new CustomError("Template doesn't exists", 400);
    }

    const emailAddresses: IEmailAddresses[] = await EmailAddressesModel.query()
      .joinRelated("emailLists")
      .where("emailLists.id", emailListId);

    const destinations: SendBulkTemplatedEmailCommandInput["Destinations"] =
      emailAddresses.map((x) => {
        return {
          Destination: {
            ToAddresses: [x.email],
          },
          ReplacementTemplateData: JSON.stringify({ name: "Recipient 1" }),
        };
      });

    const params: SendBulkTemplatedEmailCommandInput = {
      Source: "admin@elywork.com",
      Template: "templateAbc", //emailTemplate.templateName,
      Destinations: destinations,
      ConfigurationSetName: "email_sns_config",
      DefaultTemplateData: JSON.stringify({ name: "Recipient 1" }),
    };

    try {
      const resp = await sesClient.send(
        new SendBulkTemplatedEmailCommand(params)
      );
      return resp;
    } catch (e) {
      console.log(e);
      return formatErrorResponse(e);
    }

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
    // const emailIds: IRecipientItem[] = [
    //   {
    //     recipientEmail: "wmfarooqi05@gmail.com",
    //     recipientName: "waleed 05",
    //   },
    //   {
    //     recipientEmail: "wmfarooqi70@gmail.com",
    //     recipientName: "waleed 70",
    //   },
    // ];

    // const emailInputPayloads: IEmailSqsEventInput[] = this.createEmailSqsInputs(
    //   payload,
    //   emailIds,
    //   employee
    // );

    // const jobItems = emailInputPayloads.map((x) => {
    //   return new JobsModel({
    //     jobId: randomUUID(),
    //     uploadedBy: employee.sub,
    //     jobType: "BULK_EMAIL",
    //     details: x,
    //     jobStatus: "PENDING",
    //   });
    // });

    // Use the batchPut method to perform bulk create
    // return JobsModel.batchPut(jobItems);
    // Need to write a helper method which picks the batch of X and put in SQS
    // const sqsItemsWithJobId: IEmailSqsEventInput[] = emailInputPayloads.map(
    //   (x: IEmailSqsEventInput, i) => {
    //     return {
    //       ...x,tntzii.com

    //       jobId: jobs[i].id,
    //     };
    //   }
    // );

    // const sqsService = container.resolve(SQSService);
    // await Promise.all(sqsItemsWithJobId.map((x) => sqsService.enqueueItems(x)));
    // return jobs.filter((x) => x.id);
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

  async receiveEmailHelper(Records: SQSEvent["Records"][0]) {
    const deleteEvent = [];
    console.log("[receiveEmailHelper] records", Records);
    const record = Records[0];
    const payload = JSON.parse(record.body);
    console.log("payload", payload);
    const messagePayload = JSON.parse(payload?.Message);
    console.log("[receiveEmailHelper]", "messagePayload", messagePayload);
    // const mailStream = fs.createReadStream(payload.filePath);
    const mailStream = await this.downloadStreamFromUSEastBucket(
      `incoming-emails/${messagePayload.mail.messageId}`
    );

    const mailObject = await simpleParser(mailStream);
    const attachmentsS3Promises = mailObject.attachments.map((x) => {
      return uploadContentToS3(
        `media/attachments/${messagePayload.mail.messageId}/${x.filename}.${
          x.contentType.split("/")[1]
        }`,
        x.content
      );
    });

    const attachmentsS3 = await Promise.all(attachmentsS3Promises);
    console.log("attachmentsS3", attachmentsS3);

    let body = mailObject.html ? mailObject.html : mailObject.text;

    let isBodyUploaded = false;
    const MAX_DB_SIZE = 4000;
    if (body.length > MAX_DB_SIZE) {
      // Upload it to s3
      const resp = await uploadContentToS3(
        `media/body/${messagePayload.mail.messageId}/${randomUUID()}`,
        body
      );
      isBodyUploaded = true;
      body = resp.fileUrl;
    }
    // else {
    //   body = compressedBody;
    // }
    const email: IEmail = {
      body,
      senderEmail: mailObject?.from?.value[0]?.address,
      senderName: mailObject?.from?.value[0]?.name,
      sentAt: mailObject.date.toISOString(),
      status: "RECEIVED",
      subject: mailObject?.subject,
      sesMessageId: messagePayload.mail.messageId,
      attachments: attachmentsS3.map((x) => {
        return {
          ...x,
          updatedAt: moment().utc().format(),
          filename: x.fileKey.split("/").at(-1),
        };
      }),
      direction: "RECEIVED",
      isBodyUploaded,
    };

    let error = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        const emailEntity: IEmail = await EmailModel.query(trx).insert(email);
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
  }

  async getEmailTemplateContentById(employee, body) {
    const commandInput: GetTemplateCommandInput = {
      TemplateName: body.templateId,
    };

    return sesClient.send(new GetTemplateCommand(commandInput));
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
  }

  /**
   * @deprecated
   * @param messageId
   * @param attachmentList
   * @param s3TmpFiles
   * @returns
   */
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
        fileKey: key.fileKey,
        filename: key.fileKey.split("/").at(-1),
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

    await Promise.all(copyPromises);
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

  /**
   * will be used in generating thumbnails
   * @param folderPath
   * @param attachments
   * @returns
   */
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

  /**
   * @deprecated
   * @param body
   */
  async sendRawMail(body) {
    const payload = JSON.parse(body);
    const mail = await fs.promises.readFile(payload.filePath);
    const rawMailInput: SendRawEmailCommandInput = {
      RawMessage: {
        Data: mail,
      },
      ConfigurationSetName: "email_sns_config",
      Destinations: ["waleed <wmfarooqi05@gmail.com>"],
      Source: `Admin Guy <admin@elywork.com>`,
    };
    await sesClient.send(new SendRawEmailCommand(rawMailInput));
  }
}
