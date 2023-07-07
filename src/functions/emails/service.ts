import "reflect-metadata";
// import { DatabaseService } from "./models/database";
import { DatabaseService } from "@libs/database/database-service-objection";

import { container, inject, injectable } from "tsyringe";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { IJobData, JobsModel } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { CustomError } from "@helpers/custom-error";
import {
  validateBulkEmails,
  validateEmailsByContact,
  validateGetMyEmails,
  validateMoveToFolder,
  validateSendEmail,
  validateUpdateLabel,
} from "./schema";
import { SQSRecord } from "aws-lambda";
import * as fs from "fs";
import {
  simpleParser,
  Attachment,
  EmailAddress,
  ParsedMail,
  MailParser,
} from "mailparser";
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
  IEmailRecordWithRecipients,
} from "./models/EmailRecords";
import * as stream from "stream";

import { IRecipient, RECIPIENT_TYPE } from "./models/Recipient";
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
  SendTemplatedEmailCommandOutput,
} from "@aws-sdk/client-ses";
import { formatErrorResponse } from "@libs/api-gateway";

import MailComposer from "nodemailer/lib/mail-composer";
import { isValidUrl } from "@utils/index";
import {
  constructFileContent,
  extractHtmlAndText,
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
import {
  EMAIL_ADDRESSES_TABLE,
  EMAIL_RECIPIENT_TABLE,
  RECIPIENT_EMPLOYEE_DETAILS,
} from "./models/commons";
import { EmailMetricsModel, IEmailMetrics } from "./models/EmailMetrics";
import { SQSClient } from "@aws-sdk/client-sqs";
import { IEmailMetricsRecipients } from "./models/EmailMetricsRecipients";
import { generateThumbnailFromImageBuffers } from "@utils/thumbnails";
import processEmailTemplateSqsEventHandler from "@functions/emails/jobs/processEmailTemplateSqsEventHandler";
import { bulkEmailPrepareSqsEventHandler } from "@functions/emails/jobs/bulkEmailPrepareSqsEventHandler";
import { bulkEmailSqsEventHandler } from "@functions/emails/jobs/bulkEmailSqsEventHandler";
import { deleteMessageFromSQS } from "@utils/sqs";
import ContactModel from "@models/Contacts";
import { IContact } from "@models/Contacts";
import {
  applyWordFilterOnBuilder,
  convertToEmailAddress,
  getEmailsFromParsedEmails,
  getKeywords,
  getRecipientsFromAddress,
} from "./helper";
import {
  RecipientEmployeeDetailsModel,
  generalFolders,
} from "./models/RecipientEmployeeDetails";
import { FilePermissionsService } from "@functions/filePermissions/service";
import {
  FilePermissionModel,
  FilePermissionsMap,
  IFilePermissions,
} from "@models/FilePermissions";
import bytes from "@utils/bytes";
import { getSecretValueFromSecretManager } from "@utils/secretManager";
import { SecretManager } from "@common/service/SecretManager";

const s3Client = new S3Client({ region: "ca-central-1" });
const s3UsClient = new S3Client({ region: "us-east-1" });
const sesClient = new SESClient({ region: process.env.REGION });

const SENT_EMAIL_FOLDER = "emails/sent";

export interface IEmailService {}

@injectable()
export class EmailService implements IEmailService {
  sqsClient: SQSClient = null;
  emailDbClient: DatabaseService = null;
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(FilePermissionsService)
    private readonly filePermissionsService: FilePermissionsService,
    @inject(SecretManager) private readonly secretManager: SecretManager
  ) {
    this.sqsClient = new SQSClient({ region: process.env.REGION });
  }

  async getAllEmails(body: any): Promise<any> {}

  async getEmail(employee: IEmployeeJwt, id: string, file): Promise<any> {
    const emailRecords: IEmailRecordWithRecipients[] = [];
    const baseEmailRecord: IEmailRecordWithRecipients =
      await EmailRecordModel.query()
        .findById(id)
        .withGraphFetched(
          "recipients.[recipientEmployeeDetails, recipientCompanyDetails]"
        );

    emailRecords.push(baseEmailRecord);
    if (baseEmailRecord.threadId) {
      const references = baseEmailRecord.references
        .split(/\s+/)
        .map((x) => x.slice(1, -1))
        .filter((x) => x !== baseEmailRecord.messageId);

      const threadEmails: IEmailRecordWithRecipients[] =
        await EmailRecordModel.query()
          .whereIn("messageId", references)
          .withGraphFetched(
            "recipients.[recipientEmployeeDetails, recipientCompanyDetails]"
          );
      emailRecords.push(...threadEmails);
    }

    emailRecords.forEach((x) => {
      x.recipients?.forEach((r) => {
        if (
          r?.recipientEmployeeDetails?.employeeId &&
          r.recipientEmployeeDetails.employeeId !== employee.sub
        ) {
          delete r.recipientEmployeeDetails;
        }
      });
    });

    /**
     * content json [0] at 0th row
     * attachments on 0+ rows, so length will be attachment.length + 1
     */

    const {
      attachments,
      contentUrl,
      containsHtml,
      isBodyUploaded,
      recipients,
    } = emailRecord;

    if (!recipients.find((x) => x.recipientEmail === employee.email)) {
      throw new CustomError("You are not allowed to view this email", 403);
    }

    const abc = emailRecord.attachments.map((x) => {
      return x.fileUrl;
    });
    const downloadableContent: string[] = [
      emailRecord.contentUrl,
      ...attachments?.map((x) => x.fileUrl),
    ];

    const files =
      await this.filePermissionsService.downloadFileFromS3WithPermissions(
        employee,
        downloadableContent
      );

    console.log(files.length);
  }

  async getCompleteEmailById(id: string): Promise<any> {
    return EmailRecordModel.query()
      .findById(id)
      .joinRelated([
        "recipients",
        "recipients.recipientEmployeeDetails",
        "recipients.recipientCompanyDetails",
      ]);

    // const contentJsonFile =
  }

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
      subject: _subject,
      body,
      isBodyUploaded,
      attachments,
      inReplyTo,
      references: _references,
    } = payload;

    let references = null;
    let threadId = null;
    let subject = _subject;

    if (inReplyTo) {
      references = `<${inReplyTo}>`;
      if (_references) {
        references += ` ${_references}`;
      }
      validateEmailReferences(`<${inReplyTo}>`, references);

      // It means it is belonging to a thread, or starting a new thread
      // fetch email with messageId = inReplyTo
      const previousEmail: IEmailRecord =
        await EmailRecordModel.query().findOne({
          messageId: inReplyTo,
        });

      if (previousEmail?.subject) {
        subject = previousEmail?.subject;
      }
      // in case 1 i.e. threadId !== null, attach to email
      if (previousEmail?.threadId) {
        threadId = previousEmail?.threadId;
      } else {
        // in case2, create a threadId, append and also update to replied email
        threadId = randomUUID();
        await EmailRecordModel.query().findById(previousEmail.id).patch({
          threadId,
        });
        await RecipientModel.query()
          .patch({ threadId })
          .where({
            emailId: previousEmail.id,
          } as Partial<IRecipient>);
      }
    }

    let employee: IEmployee = await EmployeeModel.query().findById(
      employeeJwt.sub
    );

    // @TODO remove
    if (process.env.STAGE === "local" || !!payload.overrideFrom) {
      employee = {
        name: "waleed admin",
        email: "admin@elywork.com",
      };
      if (payload.from) {
        employee.email = payload.from;
      }
    }

    const { name: senderName, email: senderEmail } = employee;

    try {
      const { mailComposer, copyS3Promises, emailRecord } =
        await this.composeEmail(
          senderName,
          senderEmail,
          toList,
          ccList,
          bccList,
          subject,
          senderEmail, // reply to
          body,
          attachments,
          isBodyUploaded,
          inReplyTo,
          references,
          threadId
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
          sentAt: moment().utc().format(),
          messageId: `${resp.MessageId}.${process.env.REGION}.amazonses.com`,
          details: resp.$metadata,
        };

        await EmailRecordModel.query().patchAndFetchById(
          emailRecord.id,
          updateParams
        );
        return { ...emailRecord, ...updateParams };
      }
      // delete S3
      return emailRecord;
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
    toList: { name: string; email: string }[],
    ccList: any[],
    bccList: any[],
    threadId: string
  ) {
    let emailEntity: IEmailRecord = null;
    let error: any = null;

    const getEmails = (list) => (list ? list.map((x) => x.email) : []);

    const combinedEmails: string[] = [
      senderEmail,
      ...getEmails(toList),
      ...getEmails(ccList),
      ...getEmails(bccList),
    ];

    const employeeRecords: IEmployee[] = await EmployeeModel.query().whereIn(
      "email",
      combinedEmails
    );

    const contactRecords: IContact[] = await ContactModel.query()
      .joinRaw(
        "CROSS JOIN LATERAL jsonb_array_elements_text(emails) AS email(value)"
      )
      .whereIn("value", combinedEmails);

    const recipients = getRecipientsFromAddress(
      [
        {
          list: {
            value: [
              {
                name: senderName,
                address: senderEmail,
              },
            ],
          },
          folderName: "sent_items",
          type: "FROM",
        },
        {
          list: { value: convertToEmailAddress(toList) },
          folderName: "inbox",
          type: "TO_LIST",
        },
        {
          list: { value: convertToEmailAddress(ccList) },
          folderName: "inbox",
          type: "CC_LIST",
        },
        {
          list: { value: convertToEmailAddress(bccList) },
          folderName: "inbox",
          type: "BCC_LIST",
        },
      ],
      threadId,
      employeeRecords,
      contactRecords
    );

    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        emailEntity = await EmailRecordModel.query(trx).insert(email);

        recipients.forEach((x) => (x.emailId = emailEntity.id));
        emailEntity["recipients"] = await RecipientModel.query(trx).insertGraph(
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
   * @param inReplyTo
   * @param references
   * @param threadId
   * @returns
   */
  async composeEmail(
    senderName: string,
    senderEmail: string,
    toList: { email: string; name: string }[] | undefined,
    ccList: { email: string; name: string }[] | undefined,
    bccList: { email: string; name: string }[] | undefined,
    subject: string,
    replyTo: string,
    body: string,
    attachments: {
      url: string;
      contentType: string;
      filename: string;
    }[],
    isBodyUploaded: boolean,
    inReplyTo: string,
    references: string,
    threadId: string
  ): Promise<{
    emailRecord: IEmailRecord;
    mailComposer: MailComposer;
    copyS3Promises: Promise<CopyObjectCommandOutput>[];
  }> {
    let emailBody: any = body;
    if (isBodyUploaded && isValidUrl(emailBody)) {
      emailBody = await getS3ReadableFromUrl(emailBody);
      // @TODO bring back this array
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
      inReplyTo: `<${inReplyTo}>`,
      references,
    });

    const copyS3Promises: Promise<CopyObjectCommandOutput>[] = [];
    let fileMap: IFilePermissions[] = [];

    const employees: IEmployee[] = await EmployeeModel.query().whereIn(
      "email",
      [
        senderEmail,
        ...(toList.map((x) => x.email) || []),
        ...(ccList?.map((x) => x.email) || []),
        ...(bccList?.map((x) => x.email) || []),
      ] as string[]
    );

    const { fileContent, containsHtml } = constructFileContent(emailBody);
    // Add email sender id, and use sendername and sender email from JWT
    const isTextLonger = fileContent.text.length > 1000;

    const email: IEmailRecord = {
      body: fileContent.text.slice(0, 1000),
      isBodyUploaded: isTextLonger,
      direction: "SENT",
      status: "SENDING",
      subject,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      threadId,
      containsHtml,
    };
    const emailRecord: IEmailRecord = await this.createEmailObject(
      email,
      senderName,
      senderEmail,
      toList,
      ccList,
      bccList,
      threadId
    );

    const permissionMap: FilePermissionsMap = {};

    employees.forEach((x) => {
      permissionMap[x.id] = {
        email: x.email,
        employeeId: x.id,
        permissions: x.email === senderEmail ? ["OWNER"] : ["READ"],
      };
    });

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
        };
      });
      // @TODO bring back

      const files: {
        originalFilename: string;
        contentType: string;
        sourceKey: string;
        destinationKey: string;
        deleteOriginal?: boolean;
        sourceBucket: string;
        sourceRegion: string;
      }[] = attachments.map((x) => {
        const { bucketName, fileKey, region } = getKeysFromS3Url(x.url);
        const destinationKey = `${SENT_EMAIL_FOLDER}/${emailRecord.id}/${fileKey
          .split("/")
          .at(-1)}`;
        return {
          contentType: x.contentType,
          originalFilename: x.filename,
          sourceKey: fileKey,
          destinationKey,
          sourceBucket: bucketName,
          sourceRegion: region,
        };
      });

      try {
        fileMap =
          await this.filePermissionsService.copyFilesToBucketWithPermissions(
            files,
            permissionMap
          );
      } catch (e) {
        console.log(e);
        return e;
      }
    }

    const contentResp =
      await this.filePermissionsService.uploadFilesToBucketWithPermissions(
        [
          {
            fileContent,
            contentType: "text/json",
            Key: `${SENT_EMAIL_FOLDER}/${emailRecord.id}/content.json`,
            originalFilename: "content.json",
          },
        ],
        permissionMap
      );

    const updatedParams = {
      attachments: fileMap.map((x) => {
        return {
          fileKey: x.fileKey,
          fileUrl: x.fileUrl,
          originalName: x.originalFilename,
          fileSize: x.fileSize,
          thumbnailUrl: x.thumbnailUrl,
        } as any;
      }),
      contentUrl: contentResp[0].fileUrl,
      containsHtml,
    };
    await EmailRecordModel.query().patchAndFetchById(
      emailRecord.id,
      updatedParams
    );
    return {
      emailRecord: {
        ...emailRecord,
        ...updatedParams,
      },
      mailComposer,
      copyS3Promises,
    };
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

    // const knex = this.docClient.getKnexClient();

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

  async emailQueueInvokeHandler(Records: SQSRecord[]) {
    console.log("[receiveEmailHelper] records", Records);
    for (const record of Records) {
      try {
        const payload = JSON.parse(record.body);
        console.log("payload", payload?.notificationType, payload.eventType);
        if (payload?.notificationType === "Received") {
          await this.receiveEmailHelper(record);
        } else if (payload.eventType && !payload.jobId) {
          await this.processMetricsEvent(record);
        } else if (payload.jobId) {
          const jobItem: IJobData = await JobsModel.get({
            jobId: payload.jobId,
          });

          if (
            process.env.STAGE !== "local" &&
            jobItem.jobStatus === "SUCCESSFUL"
          ) {
            console.log(
              `Message ${record.messageId} has already been processed. Skipping...`
            );
            continue;
          }

          if (!this.emailDbClient) {
            this.emailDbClient = this.docClient;
          }

          let resp = null;
          if (payload?.eventType === "PROCESS_TEMPLATE") {
            // Move this to email sqs handler
            resp = await processEmailTemplateSqsEventHandler(jobItem);
          } else if (payload?.eventType === "BULK_EMAIL_PREPARE") {
            // Move this to email sqs handler
            resp = await bulkEmailPrepareSqsEventHandler(
              this.emailDbClient,
              jobItem
            );
          } else if (payload?.eventType === "BULK_EMAIL") {
            // Move this to email sqs handler
            resp = await bulkEmailSqsEventHandler(
              this.emailDbClient,
              this.sqsClient,
              jobItem
            );
          }
        } else {
          if (process.env.STAGE === "local") {
            console.log("no event found");
            continue;
          }
          const key = `emails/unprocessed-events/${randomUUID()}`;
          const s3Resp = await uploadContentToS3(key, JSON.stringify(record));
          console.log("uploaded to s3", s3Resp);
        }
        await deleteMessageFromSQS(
          this.sqsClient,
          record.receiptHandle,
          process.env.MAIL_QUEUE_NAME
        );
      } catch (e) {
        if (process.env.STAGE !== "local") {
          console.log("error", e);
          const key = `emails/unprocessed-events/catch/${randomUUID()}`;
          const s3Resp = await uploadContentToS3(key, JSON.stringify(record));
          console.log("uploaded to s3", s3Resp);
        }
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

  async receiveEmailHelper(record: SQSRecord) {
    const messagePayload = JSON.parse(record.body);
    console.log("[receiveEmailHelper], messagePayload", messagePayload);

    /** Array containing S3 URLs of files to be cleanup in case error in job */
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

      const messageId = mailObject.messageId?.replace(/[<>]/g, "");

      let emailRecord: IEmailRecord = await EmailRecordModel.query()
        .where({
          messageId,
        })
        .first();

      // move the upper code here, because it is mutating record on L:831
      // @TODO uncomment this
      if (
        process.env.STAGE !== "local" &&
        (emailRecord?.status === "RECEIVED_AND_PROCESSED" ||
          emailRecord.status === "SENT")
      ) {
        console.log("Email already processed");
        return;
      }

      /** THREAD AND REPLIES HANDLING */
      const {
        inReplyTo: _inReplyTo,
        references: _references,
        priority,
      } = mailObject;
      const inReplyTo = _inReplyTo?.replace(/[<>]/g, "");
      const references: string = _references
        ? Array.isArray(_references)
          ? _references.join(" ")
          : _references
        : null;
      let threadId = null;
      if (inReplyTo) {
        // It means it is belonging to a thread, or starting a new thread
        // fetch email with messageId = inReplyTo
        const previousEmail: IEmailRecord =
          await EmailRecordModel.query().findOne({
            messageId: inReplyTo,
          });
        if (previousEmail) {
          // in case 1 i.e. threadId !== null, attach to email
          if (previousEmail?.threadId) {
            threadId = previousEmail?.threadId;
          } else {
            // in case2, create a threadId, append and also update to replied email
            threadId = randomUUID();
            await EmailRecordModel.query().findById(previousEmail.id).patch({
              threadId,
            });

            /** @NOTES
             * There is an issue, that if this code will crash further on,
             * the assignment of threadId to previousEmail will not revert
             * But this will not create any issue as on next cycle of job,
             * this threadId will be used on `if` part of this `else` block
             */
            await RecipientModel.query()
              .patch({ threadId })
              .where({
                emailId: previousEmail.id,
              } as Partial<IRecipient>);
          }
        }
      }
      /** END THREAD AND REPLIES HANDLING */

      const { text: bodyText, html } = mailObject;

      const { recipients, employees } = await this.getReceiveEmailRecipients(
        mailObject,
        threadId
      );

      // move this whole transaction to another function
      let trxError = null;
      await this.docClient.getKnexClient().transaction(async (trx) => {
        try {
          if (!emailRecord) {
            emailRecord = await EmailRecordModel.query(trx).insert({
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
              threadId,
            });
          }

          recipients.forEach((x) => {
            x.emailId = emailRecord.id;
          });
          console.log("saving recipients");
          await trx.commit();
        } catch (e) {
          trxError = e;
          await trx.rollback();
        }
      });

      if (trxError) {
        throw new CustomError(
          trxError.message || trxError,
          trxError.statusCode || 500
        );
      }
      console.info("Entry has been added in DB, now upload attachments to S3");

      const { contentUrl, attachmentsS3 } =
        await this.receivingEmailAttachmentsHelper(
          emailRecord.id,
          mailObject,
          employees
        );
      console.log("uploaded attachments and content to s3");

      attachmentsS3.forEach((x) => {
        s3CleanupFiles.push(x.fileUrl);
        s3CleanupFiles.push(x.thumbnailUrl);
      });

      s3CleanupFiles.push(contentUrl);

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
      if (s3CleanupFiles.length) {
        console.info("Uploading s3CleanupFiles Job", s3CleanupFiles);
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

  async getReceiveEmailRecipients(
    mailObject: ParsedMail,
    threadId: string | null
  ): Promise<{
    recipients: IRecipient[];
    employees: IEmployee[];
    contacts: IContact[];
  }> {
    const combinedEmails: string[] = [
      ...getEmailsFromParsedEmails(mailObject?.from),
      ...getEmailsFromParsedEmails(mailObject?.to),
      ...getEmailsFromParsedEmails(mailObject?.cc),
      ...getEmailsFromParsedEmails(mailObject?.bcc),
    ];

    const employeeRecords: IEmployee[] = await EmployeeModel.query().whereIn(
      "email",
      combinedEmails
    );

    const contactRecords: IContact[] = await ContactModel.query()
      .joinRaw(
        "CROSS JOIN LATERAL jsonb_array_elements_text(emails) AS email(value)"
      )
      .whereIn("value", combinedEmails);

    return {
      recipients: getRecipientsFromAddress(
        [
          { list: mailObject.to, type: "TO_LIST", folderName: "inbox" },
          { list: mailObject.cc, type: "CC_LIST", folderName: "inbox" },
          { list: mailObject.bcc, type: "BCC_LIST", folderName: "inbox" },
          { list: mailObject.from, type: "FROM", folderName: "sent_items" },
        ],
        threadId,
        employeeRecords,
        contactRecords
      ),
      employees: employeeRecords,
      contacts: contactRecords,
    };
  }

  /**
   *
   * @param folderId
   * @param mailObject
   * @returns
   */
  async receivingEmailAttachmentsHelper(
    folderId: string,
    mailObject: ParsedMail,
    employees: IEmployee[]
  ): Promise<{
    contentUrl: string;
    attachmentsS3: {
      fileUrl: string;
      fileKey: string;
      originalName: string;
      s3FileName: string;
      cid?: string;
      thumbnailUrl: string;
      fileSize: string;
    }[];
  }> {
    const { text, headers } = mailObject;

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

    const uploadFiles = fileMap.map((x) => {
      return {
        originalFilename: x.originalName,
        contentType: x.contentType,
        fileContent: x.content,
        Key: `emails/${folderId}/attachments/${x.s3FileName}`,
      } as {
        originalFilename: string;
        contentType: string;
        Key: string;
        fileContent: any;
      };
    });

    const permissionMap = {};

    employees.forEach((x) => {
      permissionMap[x.id] = {
        email: x.email,
        employeeId: x.id,
        permissions: ["READ"],
      };
    });

    const s3UploadedContent =
      await this.filePermissionsService.uploadFilesToBucketWithPermissions(
        uploadFiles,
        permissionMap
      );

    const attachmentsS3: {
      fileUrl: string;
      fileKey: string;
      originalName: string;
      s3FileName: string;
      cid?: string;
      thumbnailUrl: string;
      isEmbedded: boolean;
      fileSize: string;
    }[] = s3UploadedContent.map((x) => {
      const { originalName, s3FileName, cid } = fileMap.find((f) =>
        x.fileKey.includes(`attachments/${f.s3FileName}`)
      );

      return {
        ...x,
        originalName,
        s3FileName,
        cid,
        thumbnailUrl: null,
        isEmbedded: false,
      };
    });

    // Replace embedded links with S3 URLs
    let replacedHtml = mailObject.html;
    if (replacedHtml) {
      const cidRegex = /cid:(\S+?)(?=")/g;
      let match;
      while ((match = cidRegex.exec(replacedHtml)) !== null) {
        const cid = match[1];
        const index = attachmentsS3.findIndex((x) => x.cid === cid);
        attachmentsS3[index].isEmbedded = true;
        replacedHtml = replacedHtml.replace(
          `cid:${cid}`,
          attachmentsS3[index].fileUrl
        );
      }
    }

    const headerObject = {};
    for (const [key, value] of headers) {
      headerObject[key] = value;
    }

    const contentS3 =
      await this.filePermissionsService.uploadFilesToBucketWithPermissions(
        [
          {
            contentType: "application/json",
            fileContent: JSON.stringify({
              text,
              html: replacedHtml,
              headers: headerObject,
            }),
            Key: `emails/${folderId}/content.json`,
            originalFilename: "content.json",
          },
        ],
        permissionMap
      );

    return {
      contentUrl: contentS3[0].fileUrl,
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

  async getMyEmails(employee: IEmployeeJwt, body) {
    await validateGetMyEmails(body);
    const {
      page = 1,
      pageSize = 10,
      searchQuery,
      from: _from,
      in: _in,
      to: _to,
      haveWords: _haveWords,
      subject: _subject,
      labels: _labels,
    } = body;

    // const { keywords, filters } = parsedQuery;
    const keywords = getKeywords(searchQuery);
    const filters = {
      from: _from?.split(","),
      in: _in?.split(","),
      to: _to?.split(","),
      haveWords: _haveWords?.split(","),
      subject: _subject?.split(","),
      labels: _labels?.split(",") || [],
    };

    try {
      const query = EmailRecordModel.query().alias("e");

      query
        .leftJoin(`${EMAIL_RECIPIENT_TABLE} as r`, `r.email_id`, `e.id`)
        .leftJoin(
          `${RECIPIENT_EMPLOYEE_DETAILS} as ed`,
          `ed.recipient_id`,
          `r.id`
        );

      if (keywords?.length) {
        query.where((builder) => {
          applyWordFilterOnBuilder(builder, keywords, [
            "e.subject",
            "e.body",
            "r.recipient_name",
          ]);
        });
      }

      if (filters.in?.length) {
        query
          .where("ed.folderName", filters.in[0])
          .andWhere("ed.employeeId", employee.sub);
      }

      if (filters.labels?.length) {
        query
          .whereRaw("ed.labels @> ?", JSON.stringify(filters.labels))
          .andWhere("ed.employeeId", employee.sub);
      }
      filters?.from?.length &&
        query.orWhere((builder) => {
          builder.whereIn("r.recipient_email", filters.from);
          builder.andWhere("r.recipient_type", "FROM");
        });
      filters?.to?.length &&
        query.orWhere((builder) => {
          builder.whereIn("r.recipient_email", filters.to);
          builder.andWhere("r.recipient_type", "TO_LIST");
        });

      if (filters?.from?.length || filters?.to?.length) {
        const totalCount =
          filters?.from?.length || 0 + filters?.to?.length || 0;
        query
          .groupBy("e.id")
          .havingRaw("COUNT(r.recipient_email) = ?", [totalCount]);
      }

      if (filters?.subject?.length) {
        query.where((builder) => {
          applyWordFilterOnBuilder(builder, filters.subject, ["e.subject"]);
        });
      }

      if (filters?.haveWords?.length) {
        query.where((builder) => {
          applyWordFilterOnBuilder(builder, filters.haveWords, ["e.body"]);
        });
      }

      query.page(page - 1, pageSize);
      query.orderBy(...getOrderByItems(body));

      console.log(query.toKnexQuery().toSQL());
      const emails: any = await query.execute();
      return EmailRecordModel.query()
        .withGraphFetched(`recipients.[recipientEmployeeDetails(filterByMe)]`)
        .modifiers({
          filterByMe: (query) => query.modify("filterMe", employee.sub),
        })
        .findByIds(emails?.results?.map((x) => x.id));
      // const recipients = await RecipientModel.query().where
    } catch (error) {
      console.error(error);
      throw new CustomError("An error occurred while fetching the inbox.", 500);
    }
  }

  async moveToFolder(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    await validateMoveToFolder(payload);
    const { emailIds, folderName }: { emailIds: string[]; folderName: string } =
      payload;

    const emailRecords: IEmailRecord[] =
      await EmailRecordModel.query().findByIds(emailIds);

    const missingIds = emailIds.filter(
      (id) => !emailRecords.some((obj) => obj.id === id)
    );

    if (missingIds.length) {
      throw new CustomError(
        `Email record with id(s): ${missingIds} not found`,
        404
      );
    }
    // Add validation if folder exists
    if (!generalFolders.some((folder) => folder === folderName)) {
      // @TODO implement labels strategy
      throw new CustomError(
        `Folder name \'${folderName}\' doesn't exists`,
        400
      );
    }
    return RecipientEmployeeDetailsModel.query()
      .patch({ folderName })
      .where({ employeeId: employee.sub })
      .whereExists(
        RecipientEmployeeDetailsModel.relatedQuery("recipient").whereIn(
          "emailId",
          emailIds
        )
      );
  }

  async updateLabel(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    await validateUpdateLabel(payload);
    const { emailIds, labels }: { emailIds: string[]; labels: string } =
      payload;

    const emailRecords: IEmailRecord[] =
      await EmailRecordModel.query().findByIds(emailIds);

    const missingIds = emailIds.filter(
      (id) => !emailRecords.some((obj) => obj.id === id)
    );

    if (missingIds.length) {
      throw new CustomError(
        `Email record with id(s): ${missingIds} not found`,
        404
      );
    }
    // Add validation if labels exists
    // if (!generalFolders.some((folder) => folder === folderName)) {
    //   // @TODO implement labels strategy
    //   throw new CustomError(
    //     `Folder name \'${folderName}\' doesn't exists`,
    //     400
    //   );
    // }
    return RecipientEmployeeDetailsModel.query()
      .patch({ labels: JSON.stringify(labels) })
      .where({ employeeId: employee.sub })
      .whereExists(
        RecipientEmployeeDetailsModel.relatedQuery("recipient").whereIn(
          "emailId",
          emailIds
        )
      );
  }

  bulkEmailSqsEventHandler = async (employee, body) => {
    const payload = JSON.parse(body);
    const { templateName, emailTemplateS3Url, subject, destination } = payload;
    const email: any = {
      attachments: [],
      body: emailTemplateS3Url,
      isBodyUploaded: true,
      emailType: "BULK",
      direction: "SENT",
      subject,
      status: "SENDING",
      // details: { placeholders: x.placeholders },
    } as IEmailRecord;
    const toEmailObject = splitEmailAndName(destination);
    const recipients = [
      {
        recipientEmail: toEmailObject.email,
        recipientType: "TO_LIST",
        recipientName: toEmailObject.name,
      },
    ] as IRecipient[];
    email["recipients"] = recipients;
    const command: SendTemplatedEmailCommandInput = {
      Destination: {
        ToAddresses: [payload.destination],
      },
      ConfigurationSetName: "email_sns_config",
      Source: "Waleed Mehmood <wmfarooqi05@gmail.com>",
      Template: templateName,
      TemplateData: JSON.stringify({}),
    };

    const resp: SendTemplatedEmailCommandOutput = await sesClient.send(
      new SendTemplatedEmailCommand(command)
    );

    console.log("resp", resp);
  };
}
