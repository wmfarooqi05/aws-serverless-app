import {
  SESClient,
  SendTemplatedEmailCommand,
  SendTemplatedEmailCommandInput,
  SendTemplatedEmailCommandOutput,
} from "@aws-sdk/client-ses";
import { SQSClient } from "@aws-sdk/client-sqs";
import {
  EmailModel,
  IEmail,
  IEmailWithRecipients,
} from "@functions/emails/models/Email";
import { IRecipient } from "@functions/emails/models/Recipient";
import { I_BULK_EMAIL_JOB } from "@functions/emails/models/interfaces/bulkEmail";
import { CustomError } from "@helpers/custom-error";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IJobData } from "@models/dynamoose/Jobs";
import { mergeEmailAndNameList, splitEmailAndName } from "@utils/emails";
import moment from "moment-timezone";

// When we will make separate lambda for email jobs, we can call ses service
const sesClient: SESClient = new SESClient({ region: process.env.REGION });
const dlqUrl = "YOUR_DLQ_URL";

export const bulkEmailSqsEventHandler = async (
  emailDbClient: DatabaseService,
  _: SQSClient,
  jobItem: IJobData
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
    updatePayload: Partial<IEmail>;
  }[] = [];

  const insertData = sendEmailPayload.map((x) => {
    const email: any = {
      attachments: [],
      body: emailTemplateS3Url,
      isBodyUploaded: true,
      emailType: "BULK",
      direction: "SENT",
      subject,
      status: "SENDING",
      details: { placeholders: x.placeholders },
    } as IEmail;
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

  const emailEntities: IEmailWithRecipients[] =
    await EmailModel.query().insertGraph(insertData);

  for (const payload of sendEmailPayload) {
    const command: SendTemplatedEmailCommandInput = {
      Destination: {
        CcAddresses: mergeEmailAndNameList(ccList),
        ToAddresses: [payload.destination],
      },
      ConfigurationSetName: configurationSetName,
      Source: `${senderName}<${senderEmail}>`,
      Template: templateName,
      Tags: defaultTags.map((x) => {
        return { Name: x.name, Value: x.value };
      }),
      ReplyToAddresses: replyToAddresses,
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
      const resp: SendTemplatedEmailCommandOutput = await sesClient.send(
        new SendTemplatedEmailCommand(command)
      );
      results.push({
        emailId: emailEntity.id,
        email: senderEmail,
        updatePayload: {
          direction: "SENT",
          sesMessageId: resp.MessageId,
          status: "SENT",
          sentAt: moment().utc().format(),
        },
      });
    } catch (e) {
      results.push({
        emailId: emailEntity.id,
        email: senderEmail,
        updatePayload: {
          status: "FAILED",
          result: JSON.stringify(e),
        } as IEmail,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // outside loop
  await emailDbClient.getKnexClient().transaction(async (trx) => {
    for (const emailResp of results) {
      await EmailModel.query(trx)
        .findById(emailResp.emailId)
        .patch(emailResp.updatePayload);
    }
  });
};
