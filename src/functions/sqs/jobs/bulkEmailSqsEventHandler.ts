import {
  GetTemplateCommand,
  GetTemplateCommandInput,
  SESClient,
  SendBulkTemplatedEmailCommandInput,
  SendTemplatedEmailCommand,
  SendTemplatedEmailCommandInput,
} from "@aws-sdk/client-ses";
import { SQSClient } from "@aws-sdk/client-sqs";
import { IEmail } from "@functions/emails/models/Email";
import { IEmailAddresses } from "@functions/emails/models/EmailAddresses";
import { IEmailTemplate } from "@functions/emails/models/EmailTemplate";
import {
  EMAIL_ADDRESSES_TABLE,
  EMAIL_TEMPLATES_TABLE,
} from "@functions/emails/models/commons";
import { I_BULK_EMAIL_JOB } from "@functions/emails/models/interfaces/bulkEmail";
import { uploadContentToS3 } from "@functions/jobs/upload";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IJobData } from "@models/dynamoose/Jobs";
import { mergeEmailAndSenderName } from "@utils/emails";

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

  if (template.Template.HtmlPart.length > 4000) {
  }
  const MAX_DB_SIZE = 4000;
  if (template.Template.HtmlPart.length > MAX_DB_SIZE) {
    // Upload it to s3
    const templateEntity: IEmailTemplate = await emailDbClient
      .getKnexClient()(EMAIL_TEMPLATES_TABLE)
      .where({
        templateName,
      });

  }

  for (const payload of sendEmailPayload) {
    const command: SendTemplatedEmailCommandInput = {
      Destination: {
        CcAddresses: mergeEmailAndSenderName(ccList),
        ToAddresses: mergeEmailAndSenderName([
          {
            email: payload.destination.toAddressEmail,
            name: payload.destination.toAddressName,
          },
        ]),
      },
      ConfigurationSetName: configurationSetName,
      Source: `${senderName}<${senderEmail}>`,
      Template: templateName,
      Tags: defaultTags.map((x) => {
        return { Name: x.name, Value: x.value };
      }),
      ReplyToAddresses: replyToAddresses,
      TemplateData: JSON.stringify(payload.replacementTemplateData || {}),
    };
    try {
      const resp = await sesClient.send(new SendTemplatedEmailCommand(command));
      result.successful.push({
        body: template.Template.HtmlPart,
        subject: template.Template.SubjectPart,
        direction: "SENT",
        type: "SINGLE",
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
