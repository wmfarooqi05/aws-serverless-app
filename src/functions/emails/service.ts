import "reflect-metadata";
// import { DatabaseService } from "./models/database";
import { DatabaseService } from "@libs/database/database-service-objection";

import { inject, injectable } from "tsyringe";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { SESEmailService } from "@common/service/bulk_email/SESEamilService";
import EmailRecordsModel, { JobsModel } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { CustomError } from "@helpers/custom-error";
import {
  validateBulkEmails,
  validateEmailsByContact,
  validateSendEmail,
} from "./schema";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";
import { SQSEvent, SQSRecord } from "aws-lambda";
import * as fs from "fs";
import { simpleParser, Attachment, EmailAddress, ParsedMail } from "mailparser";
import {
  copyS3Object,
  getKeysFromS3Url,
  uploadContentToS3,
  getS3ReadableFromUrl,
} from "@functions/jobs/upload";
import {
  EmailRecordModel,
  IEmailRecord,
  IATTACHMENT,
  IEmailRecordModel,
} from "./models/EmailRecords";
import * as stream from "stream";

import { IRecipient } from "./models/Recipient";
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import moment from "moment-timezone";
import { EmailTemplatesModel, IEmailTemplate } from "./models/EmailTemplate";
import EmailAddressesModel, {
  IEmailAddresses,
} from "@functions/emails/models/EmailAddresses";
import {
  GetTemplateCommand,
  GetTemplateCommandInput,
  SESClient,
  SendRawEmailCommand,
  SendRawEmailCommandInput,
  SendTemplatedEmailCommand,
  SendTemplatedEmailCommandInput,
} from "@aws-sdk/client-ses";
import { formatErrorResponse } from "@libs/api-gateway";

import MailComposer from "nodemailer/lib/mail-composer";
import { isValidUrl, xnorGate } from "@utils/index";
import {
  mergeEmailAndName,
  mergeEmailAndNameList,
  splitEmailAndName,
  validateEmailReferences,
} from "@utils/emails";
import EmployeeModel from "@models/Employees";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import { RecipientModel } from "./models/Recipient";
import { I_BULK_EMAIL_JOB } from "./models/interfaces/bulkEmail";
import { COMPANIES_TABLE_NAME, CONTACTS_TABLE } from "@models/commons";
import { EMAIL_ADDRESSES_TABLE } from "./models/commons";
import { EmailMetricsModel, IEmailMetrics } from "./models/EmailMetrics";
import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { IEmailMetricsRecipients } from "./models/EmailMetricsRecipients";
import {
  generateThumbnailFromBuffer,
  generateThumbnailFromImageBuffers,
  generateThumbnails,
} from "@utils/thumbnails";

const s3Client = new S3Client({ region: "ca-central-1" });
const s3UsClient = new S3Client({ region: "us-east-1" });
const sesClient = new SESClient({ region: process.env.REGION });

export interface IEmailService {}

@injectable()
export class EmailService implements IEmailService {
  sqsClient: SQSClient = null;
  constructor(
    @inject(SESEmailService) private readonly sesEmailService: SESEmailService,
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {
    this.sqsClient = new SQSClient({ region: process.env.REGION });
  }

  async getAllEmails(body: any): Promise<any> {}

  async getEmail(id: string): Promise<any> {}

  /**
   * @param employee
   * @param body
   * @returns
   */
  async sendEmail(
    employeeJwt: IEmployeeJwt,
    _body: any
  ): Promise<IEmailRecordModel> {
    // nodemailer.createTransport().sendMail({});
    // @TODO get reporting manager if want to add CC

    const payload = JSON.parse(_body);
    await validateSendEmail(payload);
    const {
      toList,
      ccList,
      bccList,
      subject,
      body,
      isBodyUploaded,
      attachments,
      inReplyTo: _inReplyTo,
      references: _references,
    } = payload;

    let inReplyTo = null;
    let references = null;
    if (_inReplyTo) {
      inReplyTo = `<${_inReplyTo}>`;
      references = `${inReplyTo}`;
      if (_references) {
        references += ` ${_references}`;
      }
      validateEmailReferences(inReplyTo, references);
    }

    let employee: IEmployee = await EmployeeModel.query().findById(
      employeeJwt.sub
    );

    if (process.env.STAGE === "local") {
      employee = {
        name: "waleed admin",
        email: "admin@elywork.com",
      };
    }

    const { name: senderName, email: senderEmail } = employee;

    // Add email sender id, and use sendername and sender email from JWT
    const email: IEmailRecord = {
      body,
      isBodyUploaded,
      direction: "SENT",
      status: "SENDING",
      subject,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
    };
    let emailEntity = await this.createEmailObject(
      email,
      senderName,
      senderEmail,
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
        senderEmail, // reply to
        body,
        attachments,
        emailEntity.id,
        isBodyUploaded,
        inReplyTo,
        references
      );
      const rawMail = await mailComposer.compile().build();
      const rawMailInput: SendRawEmailCommandInput = {
        RawMessage: {
          Data: rawMail,
        },
        ConfigurationSetName: "email_sns_config",
        Destinations: [
          ...mergeEmailAndNameList(toList),
          ...mergeEmailAndNameList(ccList),
          ...mergeEmailAndNameList(bccList),
        ],
        Source: `${senderName} <${senderEmail}>`,
      };
      const resp = await sesClient.send(new SendRawEmailCommand(rawMailInput));

      if (resp.$metadata.httpStatusCode === 200) {
        await Promise.all(copyS3Promises);
        // @TODO attachments not saving fileurl
        const updateParams: Partial<IEmailRecord> = {
          status: "SENT",
          attachments: fileMap,
          sentAt: moment().utc().format(),
          messageId: `${resp.MessageId}.${process.env.REGION}.amazonses.com`,
          details: resp.$metadata,
        };
        emailEntity = { ...emailEntity, ...updateParams };
        await EmailRecordModel.query().patchAndFetchById(
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
    email: IEmailRecord,
    senderName: string,
    senderEmail: string,
    toList: any[],
    ccList: any[],
    bccList: any[]
  ) {
    let emailEntity: IEmailRecord = null;
    let error: any = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        emailEntity = await EmailRecordModel.query(trx).insert(email);

        const recipients: IRecipient[] = [
          {
            recipientName: senderName,
            recipientEmail: senderEmail,
            recipientType: "FROM",
            emailId: emailEntity.id,
          },
        ];
        toList?.map((x) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "TO_LIST",
            recipientName: x.name,
            recipientEmail: x.email,
          });
        });
        ccList?.map((x) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "CC_LIST",
            recipientName: x.name,
            recipientEmail: x.email,
          });
        });
        bccList?.map((x) => {
          return recipients.push({
            emailId: emailEntity.id,
            recipientType: "BCC_LIST",
            recipientName: x.name,
            recipientEmail: x.email,
          });
        });

        emailEntity["recipients"] = await RecipientModel.query(trx).insert(
          recipients
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
   * @param emailFolderName This will be email's id in database
   * @param inReplyTo
   * @param references
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
    emailFolderName: string,
    isBodyUploaded: boolean,
    inReplyTo: string,
    references: string
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
      html: emailBody,
      inReplyTo,
      references,
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
        const newKey = `media/attachments/${emailFolderName}/${x.filename}`;
        const keys = getKeysFromS3Url(x.url);
        fileMap.push({
          fileKey: newKey,
          originName: x.filename,
          fileUrl: `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${newKey}`,
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
  async sendBulkEmails(employeeJwt: IEmployeeJwt, body) {
    const payload = JSON.parse(body);

    /**
     * @TODO
     * add some logic to validate default placeholder with template placeholders
     */
    await validateBulkEmails(payload);

    const {
      emailListId,
      templateId,
      defaultPlaceholders,
      defaultTags,
      ccList,
    } = payload;

    const emailTemplate: IEmailTemplate =
      await EmailTemplatesModel.query().findById(templateId);
    if (!emailTemplate) {
      throw new CustomError("Template doesn't exists", 400);
    }

    const employee: IEmployee = await EmployeeModel.query().findById(
      employeeJwt.sub
    );

    const emailAddresses: IEmailAddresses[] = await EmailAddressesModel.query()
      .joinRelated("emailLists")
      .where("emailLists.id", emailListId);
    // const values = emailAddresses.map((x) => x.email).join(",");
    // const values = emailAddresses.map(email => `'${email}'`).join(',')}

    const emailList = emailAddresses.map((x) => x.email);
    const emails = [
      "hassan@gmail.com",
      "hassan2@gmail.com",
      "jhon@gmail.com",
      "wm2@gmail.com",
      "wmfarooqi05@gmail.com",
      "hazyhassan888@gmail.com",
      "wmfarooqi70@gmail.com",
    ];

    // const knex = this.docClient.getKnexClient();
    const values: string = emailList.map((email) => `'${email}'`).join(",");

    // const contacts = await this.docClient
    //   .getKnexClient()("contacts")
    //   .select("company.*", "companies.company_name")
    //   .leftJoin("companies", "companies.id", "contacts.company_id")
    //   .whereRaw("emails @> any(?)", [
    //     emails.map((email) => JSON.stringify([email])),
    //   ]);

    const contactsData: {
      email: string;
      name: string;
      contactId: string;
      designation: string;
      phoneNumbers: string[];
      companyName: string;
    }[] = await this.docClient
      .getKnexClient()(EMAIL_ADDRESSES_TABLE)
      .select(
        `${EMAIL_ADDRESSES_TABLE}.email`,
        `${CONTACTS_TABLE}.name`,
        `${CONTACTS_TABLE}.id as contact_id`,
        `${CONTACTS_TABLE}.designation`,
        `${CONTACTS_TABLE}.phone_numbers`,
        `${COMPANIES_TABLE_NAME}.company_name`
      )
      .leftJoin(
        `${CONTACTS_TABLE}`,
        `${CONTACTS_TABLE}.id`,
        `${EMAIL_ADDRESSES_TABLE}.contact_id`
      )
      .leftJoin(
        `${COMPANIES_TABLE_NAME}`,
        `${COMPANIES_TABLE_NAME}.id`,
        `${CONTACTS_TABLE}.company_id`
      );

    // Add logic for employees having multiple emails
    const details: I_BULK_EMAIL_JOB = {
      emailListId,
      templateName: emailTemplate.templateName,
      defaultTags: defaultTags || [],
      defaultPlaceholders: defaultPlaceholders || [],
      senderEmail: employee.email,
      senderName: employee.name,
      configurationSetName: "email_sns_config",
      replyToAddresses: [`${employee.name} <${employee.email}>`],
      ccList: ccList || [],
      templateData: contactsData.map((x) => {
        return {
          destination: mergeEmailAndName(x),
          placeholders: JSON.stringify(x),
        };
      }),
    };

    const jobItem = new JobsModel({
      jobId: randomUUID(),
      uploadedBy: employee.id,
      jobType: "BULK_EMAIL",
      details,
      jobStatus: "PENDING",
    });
    return jobItem.save();
  }

  async updateEmail(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<IEmailRecordModel> {}

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

  async emailQueueInvokeHandler(Records: SQSRecord[]) {
    console.log("[receiveEmailHelper] records", Records);
    for (const record of Records) {
      try {
        const payload = JSON.parse(record.body);
        console.log("payload", payload?.notificationType, payload.eventType);
        if (payload?.notificationType === "Received") {
          await this.receiveEmailHelper(record);
        } else if (payload.eventType) {
          await this.processMetricsEvent(record);
        } else {
          if (process.env.STAGE === "local") {
            console.log("no event found");
            continue;
          }
          const key = `emails/unprocessed-events/${randomUUID()}`;
          const s3Resp = await uploadContentToS3(key, JSON.stringify(record));
          console.log("uploaded to s3", s3Resp);
        }
        if (process.env.STAGE === "local") {
          continue;
        }
        await this.deleteMessageFromSQS(record.receiptHandle);
      } catch (e) {
        if (process.env.STAGE === "local") {
          console.log("error", e);
          continue;
        }

        const key = `emails/unprocessed-events/catch/${randomUUID()}`;
        const s3Resp = await uploadContentToS3(key, JSON.stringify(record));
        console.log("uploaded to s3", s3Resp);
      }
    }
  }

  async processMetricsEvent(record: SQSRecord) {
    const payload = JSON.parse(record.body);
    console.log("[processMetricsEvent]", payload);
    const eventType: string = payload.eventType;
    const sender = splitEmailAndName(payload?.mail?.source);
    const details = payload;
    console.log("details", details);
    delete details?.mail?.headers;
    delete details?.mail?.commonHeaders;

    let recipientPayload: any[] =
      payload?.mail?.recipients || payload?.mail.destination;
    const finalRecipientEmails: { email: string; emailId: string }[] = [];

    if (recipientPayload.length > 0) {
      recipientPayload = recipientPayload.map(
        (x) => splitEmailAndName(x).email
      );
      const recipientEntities: IEmailAddresses[] =
        await EmailAddressesModel.query().whereIn("email", recipientPayload);

      recipientPayload.forEach((x) => {
        const entity = recipientEntities.find((r) => r.email === x);
        if (entity) {
          finalRecipientEmails.push({
            email: entity.email,
            emailId: entity.id,
          });
        } else {
          finalRecipientEmails.push({
            email: splitEmailAndName(x).email,
            emailId: null,
          });
        }
      });
    }
    let error = null;
    const emailRecord: IEmailRecord = await EmailRecordModel.query().where({
      messageId: payload?.mail?.messageId,
    });
    await EmailMetricsModel.transaction(async (trx) => {
      try {
        const metricsRecord: IEmailMetrics = await EmailMetricsModel.query(
          trx
        ).insert({
          emailRecordId: emailRecord?.id || undefined,
          eventType,
          senderEmail: sender.email,
          details,
          timestamp: payload?.[eventType.toLowerCase()]?.timestamp,
        } as IEmailMetrics);

        if (recipientPayload?.length) {
          const recipients: IEmailMetricsRecipients[] =
            finalRecipientEmails.map((x) => {
              return {
                metricsId: metricsRecord.id,
                recipientEmail: x.email,
                eventType,
              } as IEmailMetricsRecipients;
            });

          await Promise.all(
            recipients.map((x) =>
              EmailMetricsModel.relatedQuery("recipients", trx)
                .for(metricsRecord.id)
                .insert(x)
            )
          );
          await trx.commit();
        }
      } catch (e) {
        error = e;
        await trx.rollback();
      }
    });
    if (error) {
      throw new CustomError(error.message, 500);
    }
  }

  // Delete a message from a SQS queue
  async deleteMessageFromSQS(receiptHandle: string) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: process.env.MAIL_QUEUE,
        ReceiptHandle: receiptHandle,
      });
      await this.sqsClient.send(command);
      console.log(
        `Message with receipt handle ${receiptHandle} deleted from queue.`
      );
    } catch (error) {
      console.error(`Error deleting message from queue: ${error}`);
    }
  }

  async receiveEmailHelper(record: SQSRecord) {
    const messagePayload = JSON.parse(record.body);
    console.log("[receiveEmailHelper], messagePayload", messagePayload);
    const s3CleanupFiles: string[] = [];

    let error = [];
    try {
      let mailStream: fs.ReadStream;
      if (process.env.STAGE === "local") {
        mailStream = fs.createReadStream(messagePayload.filePath);
      } else {
        mailStream = await this.downloadStreamFromUSEastBucket(
          `incoming-emails/${messagePayload.mail.messageId}`
        );
      }

      const mailObject = await simpleParser(mailStream, {
        decodeStrings: true,
        skipImageLinks: true,
      });

      const {
        inReplyTo: _inReplyTo,
        references,
        priority,
        messageId: _messageId,
      } = mailObject;
      const inReplyTo = _inReplyTo?.replace(/[<>]/g, "");
      const messageId = _messageId?.replace(/[<>]/g, "");

      let emailRecord: IEmailRecord = await EmailRecordModel.query()
        .where({
          messageId,
        })
        .first();

      if (emailRecord?.status === "RECEIVED_AND_PROCESSED") {
        console.log("Email already processed");
        return;
      }
      const { text: bodyText, html } = mailObject;

      if (!emailRecord) {
        await this.docClient.getKnexClient().transaction(async (trx) => {
          try {
            emailRecord = await EmailRecordModel.query().insert({
              body:
                bodyText.length > 1000 ? bodyText.substring(0, 1000) : bodyText,
              sentAt: mailObject.date.toISOString(),
              subject: mailObject?.subject,
              direction: "RECEIVED",
              inReplyTo,
              references,
              isBodyUploaded: bodyText.length > 1000,
              priority,
              messageId,
              containsHtml: !!html,
              status: "RECEIVED_AND_PROCESSING",
            } as IEmailRecord);
            const recipients: IRecipient[] = [
              {
                recipientEmail: mailObject?.from?.value[0]?.address,
                recipientName: mailObject?.from?.value[0]?.name,
                recipientType: "FROM",
                emailId: emailRecord.id,
              },
            ];
            mailObject.to?.value.map((x: EmailAddress) => {
              return recipients.push({
                emailId: emailRecord.id,
                recipientType: "TO_LIST",
                recipientName: x.name,
                recipientEmail: x.address,
              });
            });
            mailObject.cc?.value.map((x: EmailAddress) => {
              return recipients.push({
                emailId: emailRecord.id,
                recipientType: "CC_LIST",
                recipientName: x.name,
                recipientEmail: x.address,
              });
            });
            mailObject.bcc?.value.map((x: EmailAddress) => {
              return recipients.push({
                emailId: emailRecord.id,
                recipientType: "BCC_LIST",
                recipientName: x.name,
                recipientEmail: x.address,
              });
            });

            const recipientsEntriesPromises = recipients.map((x: any) =>
              EmailRecordModel.relatedQuery("recipients", trx)
                .for(emailRecord.id)
                .insert(x)
            );

            console.log("saving recipients");
            await Promise.all(recipientsEntriesPromises);
            await trx.commit();
          } catch (e) {
            error.push(e);
            await trx.rollback();
          }
        });
      }
      const { contentUrl, attachmentsS3 } = await this.handleMailContents(
        emailRecord.id,
        mailObject
      );
      console.log("uploaded attachments and content to s3");

      attachmentsS3.forEach((x) => {
        s3CleanupFiles.push(x.fileUrl);
        s3CleanupFiles.push(x.thumbnailUrl);
      });

      const emailUpdatedContent: Partial<IEmailRecord> = {
        contentUrl,
        status: "RECEIVED_AND_PROCESSED",
        attachments: attachmentsS3.map((x) => {
          return {
            ...x,
            updatedAt: moment().utc().format(),
          };
        }),
      };
      console.log("saving attachments and urls in email record");
      await EmailRecordModel.query()
        .findById(emailRecord.id)
        .patch(emailUpdatedContent);

      console.log("Job processed");
    } catch (e) {
      error.push(e);
      if (s3CleanupFiles) {
        const jobItem = new JobsModel({
          jobId: randomUUID(),
          uploadedBy: "RECEIVE_EMAIL_SERVICE_JOB",
          jobType: "DELETE_S3_FILES",
          details: { s3CleanupFiles },
          jobStatus: "PENDING",
        });
        await jobItem.save();
      }
    }
    if (error.length) {
      console.log("errors", error);
      throw new CustomError(error.map((x) => x.message).join(", \n"), 500);
    }
  }

  /**
   *
   * @param folderId
   * @param mailObject
   * @returns
   */
  async handleMailContents(
    folderId: string,
    mailObject: ParsedMail
  ): Promise<{
    contentUrl: string;
    attachmentsS3: {
      fileUrl: string;
      fileKey: string;
      originalName: string;
      s3FileName: string;
      cid?: string;
      thumbnailUrl: string;
    }[];
  }> {
    const { text, html, headers } = mailObject;

    // FileMap with original and s3 filenames record
    const fileMap: {
      originalName: string;
      s3FileName: string;
      content: any;
      cid?: string;
      contentType: string;
    }[] = mailObject.attachments.map((x) => {
      const fileType = x.contentType ? `.${x.contentType.split("/")[1]}` : "";
      return {
        originalName: `${x.filename}${fileType}`,
        s3FileName: `${randomUUID()}${fileType}`,
        content: x.content,
        cid: x.cid,
        contentType: x.contentType,
      };
    });

    const thumbnailBuffers = await generateThumbnailFromImageBuffers(
      fileMap
        .filter((x) => x.contentType.split("/")[0] === "image")
        .map((x) => {
          return { name: x.s3FileName, buffer: x.content };
        })
    );

    // Creating promises array for uploading to S3
    const attachmentPromises = fileMap.map((x) =>
      uploadContentToS3(
        `emails/${folderId}/attachments/${x.s3FileName}`,
        x.content,
        "public-read"
      )
    );

    const thumbnailPromises = thumbnailBuffers.map((x) =>
      uploadContentToS3(
        `emails/${folderId}/attachments/thumb_${x.name}`,
        x.thumbnailBuffer,
        "public-read"
      )
    );

    const s3UploadedContent = await Promise.all(attachmentPromises);
    const thumbnailUrls = await Promise.all(thumbnailPromises);
    const attachmentsS3: {
      fileUrl: string;
      fileKey: string;
      originalName: string;
      s3FileName: string;
      cid?: string;
      thumbnailUrl: string;
    }[] = s3UploadedContent.map((x) => {
      const { originalName, s3FileName, cid } = fileMap.find((f) =>
        x.fileKey.includes(`attachments/${f.s3FileName}`)
      );
      const thumbnail = thumbnailUrls.find((x) =>
        x.fileKey.includes(s3FileName.split(".")[0])
      );
      return {
        ...x,
        originalName,
        s3FileName,
        cid,
        thumbnailUrl: thumbnail ? thumbnail.fileUrl : null,
      };
    });

    // Replace embedded links with S3 URLs
    let replacedHtml = mailObject.html;
    if (replacedHtml) {
      const cidRegex = /cid:(\S+?)(?=")/g;
      let match;
      while ((match = cidRegex.exec(replacedHtml)) !== null) {
        const cid = match[1];
        const s3Obj = attachmentsS3.find((x) => x.cid === cid);
        replacedHtml = replacedHtml.replace(`cid:${cid}`, s3Obj.fileUrl);
      }
    }

    const headerObject = {};
    for (const [key, value] of headers) {
      headerObject[key] = value;
    }
    const contentS3 = await uploadContentToS3(
      `emails/${folderId}/content.json`,
      JSON.stringify({
        text,
        html: replacedHtml,
        headers: headerObject,
      })
    );
    return {
      contentUrl: contentS3.fileUrl,
      attachmentsS3,
    };
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
      } catch (err) {
        console.log(`Error copying ${key}: ${err}`);
      }
    });

    await Promise.all(copyPromises);
    return attachments;
  }

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

  /**
   * query is good, but it is not fetching what we want
   * it is fetching all rows where A or B can exists
   * @param employee
   * @param body
   * @returns
   */
  async emailsByContact(employee: IEmployeeJwt, body: any) {
    const findingMails = [employee.email, body.contactEmail];
    await validateEmailsByContact(employee.email, body.contactEmail);
    const knex = this.docClient.getKnexClient();

    const emailIds = await knex(RecipientModel.tableName)
      .select("emailId")
      .whereIn("recipientEmail", findingMails)
      .whereIn("emailId", function () {
        this.select("emailId")
          .from(RecipientModel.tableName)
          .whereIn("recipientEmail", findingMails)
          .groupBy("email_id")
          .havingRaw("COUNT(DISTINCT recipient_email) = ?", [
            findingMails.length,
          ]);
      })
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));

    const emails = await EmailRecordModel.query()
      .findByIds(emailIds.data.map((x) => x.emailId))
      .withGraphFetched("recipients");

    return {
      data: emails,
      pagination: emailIds.pagination,
    };

    return emailIds;
  }
}
