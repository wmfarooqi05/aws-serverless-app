import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { SESEmailService } from "./SESEamilService";
import { CustomError } from "@helpers/custom-error";

export interface ICache {
  initializeClient: () => Promise<void>;
}

type EmailClients = "AMAZON_SES" | "SENDGRID";

export interface IBulkEmailService {}

@injectable()
export class BulkEmailService implements IBulkEmailService {
  defaultClient: EmailClients = "AMAZON_SES";
  constructor(
    @inject(SESEmailService) private readonly sesEmailService: SESEmailService
  ) {}

  async initiateConnection() {}

  async sendEmails(
    from: string,
    recipients: string[],
    subject: string,
    body: string,
    client: EmailClients = "AMAZON_SES"
  ) {
    if (client === "AMAZON_SES") {
      this.sesEmailService.sendEmails(from, recipients, subject, body);
    }

    throw new CustomError("Not supporting other email services", 400);
  }
}
