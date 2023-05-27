import {
  GetTemplateCommand,
  GetTemplateCommandInput,
  SESClient,
  SendBulkTemplatedEmailCommandInput,
  SendTemplatedEmailCommand,
  SendTemplatedEmailCommandInput,
} from "@aws-sdk/client-ses";
import { SQSClient } from "@aws-sdk/client-sqs";
import { EmailModel, IEmail } from "@functions/emails/models/Email";
import { IEmailAddresses } from "@functions/emails/models/EmailAddresses";
import { IEmailTemplate } from "@functions/emails/models/EmailTemplate";
import { IRecipient } from "@functions/emails/models/Recipient";
import {
  EMAIL_ADDRESSES_TABLE,
  EMAIL_TEMPLATES_TABLE,
} from "@functions/emails/models/commons";
import { I_BULK_EMAIL_JOB } from "@functions/emails/models/interfaces/bulkEmail";
import { uploadContentToS3 } from "@functions/jobs/upload";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IJobData } from "@models/dynamoose/Jobs";
import { mergeEmailAndNameList, splitEmailAndName } from "@utils/emails";
import moment from "moment-timezone";

// When we will make separate lambda for email jobs, we can call ses service
const sesClient: SESClient = new SESClient({ region: process.env.REGION });

export const bulkEmailSqsEventHandler = async (
  emailDbClient: DatabaseService,
  sqsClient: SQSClient,
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
    },
  }: { details: I_BULK_EMAIL_JOB } = jobItem as any;
  const result = {
    successful: [],
    failed: [],
  };

  const template = await sesClient.send(
    new GetTemplateCommand({
      TemplateName: templateName,
    })
  );

  const dbObjects = [];
  sendEmailPayload.map((x) => {
    return {
      attachments: [],
      body: emailTemplateS3Url,
      isBodyUploaded: true,
      type: "BULK",
      direction: "SENT",
      subject,
      status: "SENDING",
      details: { placeholders: x.placeholders },
    } as IEmail;
  });

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
    const nameEmail = splitEmailAndName(x.destination);
    const recipients = [
      {
        recipientEmail: nameEmail.email,
        recipientType: "TO_LIST",
        recipientName: nameEmail.name,
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
  // await emailDbClient.getKnexClient().transaction(async (trx) => {
  // try {
  const emailEntities = await EmailModel.query().insertGraph(insertData);

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
      TemplateData: payload.placeholders,
    };
    try {
      const resp = await sesClient.send(new SendTemplatedEmailCommand(command));
      result.successful.push({
        body: emailTemplateS3Url,
        isBodyUploaded: true,
        type: "BULK",
        direction: "SENT",
        sesMessageId: resp.MessageId,
        subject,
        status: "SENT",
        sentAt: moment().utc().format(),
      } as IEmail);
    } catch (e) {
      result.failed.push({ payload });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

const queueUrl = "YOUR_QUEUE_URL";
const dbTable = "YOUR_DB_TABLE";

interface EmailData {
  recipient: string;
  subject: string;
  message: string;
}

async function processEmails(jobData: I_BULK_EMAIL_JOB) {
  const emailPromises = jobData.templateData.map(async (email) => {
    // Send email using SES or your preferred email service provider

    // Simulate email sending by delaying for a short period
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update email status in the database
    const params = {
      TableName: dbTable,
      Key: { recipient: email.recipient },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "Sent" },
    };

    try {
      await dynamodb.update(params).promise();
      console.log(`Email sent to ${email.recipient}`);
    } catch (error) {
      console.error(
        `Error updating status for ${email.recipient} in the database:`,
        error
      );
      // Send the email to DLQ for reprocessing
      await sendToDLQ(email);
    }
  });

  await Promise.all(emailPromises);
}

async function sendToDLQ(email: EmailData) {
  const dlqUrl = "YOUR_DLQ_URL";

  const params = {
    MessageBody: JSON.stringify(email),
    QueueUrl: dlqUrl,
  };

  try {
    await sqs.sendMessage(params).promise();
    console.log(`Email sent to DLQ for reprocessing: ${email.recipient}`);
  } catch (error) {
    console.error(`Error sending email to DLQ:`, error);
  }
}

async function processQueueMessages() {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10, // Number of messages to retrieve from the queue
    WaitTimeSeconds: 5, // Long polling to wait for messages
  };

  try {
    const response = await sqs.receiveMessage(params).promise();

    if (response.Messages && response.Messages.length > 0) {
      const emails = response.Messages.map(
        (message) => JSON.parse(message.Body!) as EmailData
      );
      await processEmails(emails);

      const deleteParams = {
        Entries: response.Messages.map((message) => ({
          Id: message.MessageId!,
          ReceiptHandle: message.ReceiptHandle!,
        })),
        QueueUrl: queueUrl,
      };

      await sqs.deleteMessageBatch(deleteParams).promise();
    }
  } catch (error) {
    console.error("Error receiving messages from the queue:", error);
  }
}

processQueueMessages();

async function sendEmails(
  emailData: Array<{ to: string; subject: string; message: string }>
) {
  const params = {
    Source: "your-email@example.com", // Replace with your verified email address
    Destination: {},
    Template: "your-template-name", // Replace with your SES template name
    TemplateData: "",
  };

  for (const email of emailData) {
    params.Destination.ToAddresses = [email.to];
    params.Message = {
      Subject: { Data: email.subject },
      Body: { Text: { Data: email.message } },
    };

    try {
      await ses.sendTemplatedEmail(params).promise();
      console.log(`Email sent to ${email.to}`);
    } catch (err) {
      console.error(`Error sending email to ${email.to}:`, err);
    }
  }
}
