const messageEvent = {
  eventType: "Delivery",
  mail: {
    timestamp: "2023-04-14T20:14:03.857Z",
    source: "wmfarooqi05@gmail.com",
    sourceArn:
      "arn:aws:ses:${self:provider.region}:${aws:accountId}:identity/wmfarooqi05@gmail.com",
    sendingAccountId: "524073432557",
    messageId: "010d018781674e51-ef0c0264-a610-4f7b-9543-1a73cd14edb4-000000",
    destination: ["wmfarooqi70@gmail.com"],
    headersTruncated: false,
    headers: [
      { name: "From", value: "wmfarooqi05@gmail.com" },
      { name: "Reply-To", value: "wmfarooqi05@gmail.com" },
      { name: "To", value: "wmfarooqi70@gmail.com" },
      { name: "Subject", value: "abcd" },
      { name: "MIME-Version", value: "1.0" },
      { name: "Content-Type", value: "text/plain; charset=UTF-8" },
      { name: "Content-Transfer-Encoding", value: "7bit" },
    ],
    commonHeaders: {
      from: ["wmfarooqi05@gmail.com"],
      replyTo: ["wmfarooqi05@gmail.com"],
      to: ["wmfarooqi70@gmail.com"],
      messageId: "010d018781674e51-ef0c0264-a610-4f7b-9543-1a73cd14edb4-000000",
      subject: "abcd",
    },
    tags: {
      "ses:operation": ["SendEmail"],
      "ses:configuration-set": ["email_sns_config"],
      "ses:source-ip": ["3.97.212.13"],
      "ses:from-domain": ["gmail.com"],
      "ses:caller-identity": ["gel-api-dev-ca-central-1-lambdaRole"],
      "ses:outgoing-ip": ["23.249.208.13"],
    },
  },
  delivery: {
    timestamp: "2023-04-14T20:14:04.814Z",
    processingTimeMillis: 957,
    recipients: ["wmfarooqi70@gmail.com"],
    smtpResponse:
      "250 2.0.0 OK  1681503244 y22-20020a05622a005600b003eadc19626csi1884304qtw.102 - gsmtp",
    reportingMTA: "d208-13.smtp-out.ca-central-1.amazonses.com",
  },
};
const payload = {
  Type: "Notification",
  MessageId: "82379f5b-5f3e-50b0-9720-c3e8e972f126",
  TopicArn: "arn:aws:sns:${self:provider.region}:${aws:accountId}:email-sns-topic",
  Subject: "Amazon SES Email Event Notification",
  Message:
    '{"eventType":"Delivery","mail":{"timestamp":"2023-04-14T20:14:03.857Z","source":"wmfarooqi05@gmail.com","sourceArn":"arn:aws:ses:${self:provider.region}:${aws:accountId}:identity/wmfarooqi05@gmail.com","sendingAccountId":"524073432557","messageId":"010d018781674e51-ef0c0264-a610-4f7b-9543-1a73cd14edb4-000000","destination":["wmfarooqi70@gmail.com"],"headersTruncated":false,"headers":[{"name":"From","value":"wmfarooqi05@gmail.com"},{"name":"Reply-To","value":"wmfarooqi05@gmail.com"},{"name":"To","value":"wmfarooqi70@gmail.com"},{"name":"Subject","value":"abcd"},{"name":"MIME-Version","value":"1.0"},{"name":"Content-Type","value":"text/plain; charset=UTF-8"},{"name":"Content-Transfer-Encoding","value":"7bit"}],"commonHeaders":{"from":["wmfarooqi05@gmail.com"],"replyTo":["wmfarooqi05@gmail.com"],"to":["wmfarooqi70@gmail.com"],"messageId":"010d018781674e51-ef0c0264-a610-4f7b-9543-1a73cd14edb4-000000","subject":"abcd"},"tags":{"ses:operation":["SendEmail"],"ses:configuration-set":["email_sns_config"],"ses:source-ip":["3.97.212.13"],"ses:from-domain":["gmail.com"],"ses:caller-identity":["gel-api-dev-ca-central-1-lambdaRole"],"ses:outgoing-ip":["23.249.208.13"]}},"delivery":{"timestamp":"2023-04-14T20:14:04.814Z","processingTimeMillis":957,"recipients":["wmfarooqi70@gmail.com"],"smtpResponse":"250 2.0.0 OK  1681503244 y22-20020a05622a005600b003eadc19626csi1884304qtw.102 - gsmtp","reportingMTA":"d208-13.smtp-out.ca-central-1.amazonses.com"}}\n',
  Timestamp: "2023-04-14T20:14:04.925Z",
  SignatureVersion: "1",
  Signature:
    "oOkaQP5XwtPJjnY47PLe4iLewvp8Q4hPIxG40N+nbNZqLMB6Eceiiul4T1qbbkxl6ioh6uS76rJ1NPS8cBsqr3JqZbNbSPcBpHWNHyjqpPFg8pFCzidedqcYVkzzPBE74Piz8HtKGaoL7fEZkYnsXN8n4tm3ELXNpFja3cUHcjmoKHEiofQh0A12W3u7gSw0k2OKZG2FujCXfVdidq6zJa2eewWWpRX8cmlfIixd1H/0ibIMXabDgtK9V9GSZ3wJ5ZWq+a10LRaWvzX1rbmJM1cVW0a/eTD1H86j0VmhGzfow3yRqL+EWOhuMHapl4hjNXQavexEZL+FjzFdHFM3Dg==",
  SigningCertURL:
    "https://sns.ca-central-1.amazonaws.com/SimpleNotificationService-56e67fcb41f6fec09b0196692625d385.pem",
  UnsubscribeURL:
    "https://sns.ca-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:${self:provider.region}:${aws:accountId}:email-sns-topic:2f9cfa03-5f0e-4c9d-9f38-3ff6001faba6",
};

import { SNSHandler, SNSEvent } from "aws-lambda";
import { uploadContentToS3 } from "./upload";
import EmailRecordsModel from "@models/dynamoose/EmailRecords";

export const handleSESEmailToSNSEvent: SNSHandler = async (event: SNSEvent) => {
  const message = JSON.parse(event.Records[0].Sns.Message);

  // Extract the email reply data
  const reply = message.content;
  const messageId = message.mail.messageId;
  const timestamp = message.mail.timestamp;
  const subject = message.mail.commonHeaders.subject;
  const sender = message.mail.commonHeaders.from[0];
  const recipient = message.mail.commonHeaders.to[0];
  // @TODO add multiple replies
  //  const recipients: string[] = message.mail.commonHeaders.replyTo;
  let attachmentUrl: any = "";

  // Store the email reply metadata in DynamoDB
  // @TODO fix this
  // recipients.
  const newEmail = new EmailRecordsModel({
    id: messageId,
    senderEmail: sender,
    emailData: {
      subject,
      // body, @TODO reply body in reply object
    },
    // ccList: ccList?.join(","),
    // bccList: bccList?.join(","),
    // recipientId,
    // recipientEmail,
    // companyId,
    serviceProvider: "AMAZON_SES",
    // updatedBy: senderId,
    emailType: "REPLYING",
  });

  await newEmail.save();

  // Store the email reply attachment in S3
  if (reply?.attachments && reply?.attachments?.length > 0) {
    // @TODO for loop for multiple attachments
    const attachment = reply?.attachments[0];
    const s3Key = `email-attachments/${messageId}-${attachment.name}`;
    await uploadContentToS3(s3Key, attachment.content);

    // Update the attachment URL in DynamoDB
    const attachmentUrl = `https://s3.amazonaws.com/my-s3-bucket/${s3Key}`;
    // const dynamoUpdateParams = {
    //   TableName: "my-dynamodb-table",
    //   Key: {
    //     messageId: { S: messageId },
    //     timestamp: { N: timestamp.toString() },
    //   },
    //   UpdateExpression: "SET attachmentUrl = :attachmentUrl",
    //   ExpressionAttributeValues: {
    //     ":attachmentUrl": { S: attachmentUrl },
    //   },
    // };
    // await dynamoDBClient.send(new UpdateItemCommand(dynamoUpdateParams));
  }
};
