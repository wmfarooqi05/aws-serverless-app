import {
  SESClient,
  SendBounceCommandOutput,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { isHtml } from "@utils/emails";
import "reflect-metadata";
import { inject, singleton } from "tsyringe";

export interface ICache {
  initializeClient: () => Promise<void>;
}

export interface ISESEmailService {}

@singleton()
export class SESEmailService implements ISESEmailService {
  sesClient: SESClient;
  constructor() {
    this.initiateClient();
  }

  async initiateClient() {
    this.sesClient = new SESClient({ region: process.env.REGION });
  }

  /**
   *
   * @param from
   * @param recipients
   * @param subject
   * @param body
   * @param CcAddresses
   * @param BccAddresses
   * @returns
   */
  async sendEmail(
    from: string,
    toList: string[],
    subject: string,
    body: string,
    ConfigurationSetName: string,
    CcAddresses: string[] = [],
    BccAddresses: string[] = [],
    replyTo: string[] = []
  ): Promise<SendBounceCommandOutput> {
    const isBodyHtml = isHtml(body);
    const bodyData = { Data: body };

    const input: SendEmailCommandInput = {
      Destination: {
        ToAddresses: toList,
        CcAddresses, // get admin cc addresses,
        BccAddresses,
      },
      Source: from,
      Message: {
        Subject: {
          Data: subject,
        },
        Body: isBodyHtml ? { Html: bodyData } : { Text: bodyData },
      },
      
      ReplyToAddresses: [...new Set([from, ...CcAddresses, ...replyTo])],
      ConfigurationSetName,
    };
    const command = new SendEmailCommand(input);

    try {
      // Send the email using SES
      const response = await this.sesClient.send(command);
      console.log("Email sent successfully:", response);
      // in parent service, add a sqs job to add this to email history of that client
      return response;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }
}
