import {
  SESClient,
  SendTemplatedEmailCommand,
  SendTemplatedEmailCommandInput,
  SendTemplatedEmailCommandOutput,
} from "@aws-sdk/client-ses";
import { SQSClient } from "@aws-sdk/client-sqs";
import {
  EmailRecordModel,
  IEmailRecord,
  IEmailRecordWithRecipients,
} from "@functions/emails/models/EmailRecords";
import { IRecipient } from "@functions/emails/models/Recipient";
import { I_BULK_EMAIL_JOB } from "@functions/emails/models/interfaces/bulkEmail";
import { CustomError } from "@helpers/custom-error";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IJob } from "@models/Jobs";
import { IJobData } from "@models/dynamoose/Jobs";
import { mergeEmailAndNameList, splitEmailAndName } from "@utils/emails";
import moment from "moment-timezone";

// When we will make separate lambda for email jobs, we can call ses service
const sesClient: SESClient = new SESClient({ region: process.env.REGION });
const dlqUrl = "YOUR_DLQ_URL";

/**
 * This is second part of sending bulk jobs
 * The N/100 number of jobs created in by bulkEmailPrepareSqsEventHandler or
 * I_BULK_EMAIL_JOB_PREPARE payload, now we will send the emails to those
 * 100 persons in a job
 * @param emailDbClient
 * @param _
 * @param jobItem
 */
export const bulkEmailSqsEventHandler = async (
  emailDbClient: DatabaseService,
  _: SQSClient,
  jobItem: IJob
) => {
  const {
    details: {
      ccList,
      configurationSetName,
      defaultTags,
      replyToAddresses,
      senderEmail,
      senderName,
      templateData: sendEmailPayload,
      templateName,
      emailTemplateS3Url,
      subject,
      defaultPlaceholders,
    },
  }: { details: I_BULK_EMAIL_JOB } = jobItem as any;
  const results: {
    emailId: string;
    email: string;
    updatePayload: Partial<IEmailRecord>;
  }[] = [];

  const insertData = sendEmailPayload.map((x) => {
    const email: any = {
      attachments: [],
      body: emailTemplateS3Url,
      isBodyUploaded: true, //???? verify this logic
      emailType: "BULK",
      direction: "SENT",
      subject,
      status: "SENDING",
      details: { placeholders: x.placeholders, jobId: jobItem.id },
    } as IEmailRecord;
    const toEmailObject = splitEmailAndName(x.destination);
    const recipients = [
      {
        recipientEmail: toEmailObject.email,
        recipientType: "TO_LIST",
        recipientName: toEmailObject.name,
      },
    ] as IRecipient[];
    ccList.forEach((cc) => {
      recipients.push({
        recipientEmail: cc.email,
        recipientName: cc.name,
        recipientType: "CC_LIST",
      } as IRecipient);
    });
    email["recipients"] = recipients;
    return email;
  });

  console.info("Adding email records to database before sending");
  // we are storing all the emails first in databse
  // so that in case they fail, we will make their status failed
  // and record it properly. later on we can show them as failed
  // emails, or re-sent them by some job
  const emailEntities: IEmailRecordWithRecipients[] =
    await EmailRecordModel.query().insertGraph(insertData);

  let command: SendTemplatedEmailCommandInput = {
    Destination: {
      CcAddresses: mergeEmailAndNameList(ccList),
    },
    ConfigurationSetName: configurationSetName,
    Source: `${senderName}<${senderEmail}>`,
    Template: templateName,
    Tags: defaultTags.map((x) => {
      return { Name: x.name, Value: x.value };
    }),
    ReplyToAddresses: replyToAddresses,
    TemplateData: JSON.stringify(defaultPlaceholders),
  };

  console.log("generic command", command);
  let index = 0; // or maybe convert for-of loop to for loop
  for (const payload of sendEmailPayload) {
    command = {
      ...command,
      Destination: {
        ...command.Destination,
        ToAddresses: [payload.destination],
      },
      TemplateData: JSON.stringify({
        ...defaultPlaceholders,
        ...JSON.parse(payload.placeholders),
      }),
    };

    const toEmailObject = splitEmailAndName(payload.destination);
    const emailEntity = emailEntities.find((obj) =>
      obj.recipients.some((item) => item.recipientEmail === toEmailObject.email)
    );
    try {
      // @TODO - for local testing, we need to skip it
      console.info(
        "index",
        index,
        "sending the email to ",
        payload.destination
      );
      console.info("template data", command.TemplateData);
      let resp: SendTemplatedEmailCommandOutput = null;
      if (process.env.STAGE === "local") {
        resp = { MessageId: "test message", $metadata: {} as any };
      } else {
        resp = await sesClient.send(new SendTemplatedEmailCommand(command));
      }
      console.info("email sent, resp: ", resp);
      results.push({
        emailId: emailEntity.id,
        email: senderEmail,
        updatePayload: {
          direction: "SENT",
          messageId: resp.MessageId,
          status: "SENT",
          sentAt: moment().utc().format(),
        },
      });
    } catch (e) {
      console.error("error sending mail to", payload.destination, e);
      results.push({
        emailId: emailEntity.id,
        email: senderEmail,
        updatePayload: {
          status: "FAILED",
          result: JSON.stringify(e),
        } as IEmailRecord,
      });
    }

    console.info("Waiting 100ms for next loop");
    await new Promise((resolve) => setTimeout(resolve, 100));
    index++;
  }

  // At the end of job, now we are updating delivery status in database
  // so the emails which are failed will be marked as failed

  /**
   * WARNING: we have to make sure knex client is available
   * there are two strategies
   * 
   * 1st: We disconnect knex client after insertGraph thing, because now, nobody
   * knows for how long sending email will keep on going, we can release the connection
   * back to pool, and after X seconds when all 100 mails are gone, we can update their
   * statuses in the DB
   * 
   * 2nd: We increase the connection timeout because right now its 3sec and it will
   * be for sure not available here after 3+ seconds
   * 
   * Fallback: If DB doesn't connect for some reason, we have to store these logs
   * in S3 and create a job for handling this
   * Even if job will not be there, data present in S3 will indicate this needs to 
   * be cleaned up
   */
  // 
  // 
  
  console.info("Updating delivery statuses of emails in DB");
  await emailDbClient.getKnexClient().transaction(async (trx) => {
    for (const emailResp of results) {
      await EmailRecordModel.query(trx)
        .findById(emailResp.emailId)
        .patch(emailResp.updatePayload);
    }
  });
};
