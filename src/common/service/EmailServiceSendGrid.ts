import "reflect-metadata";
import * as SendGrid from "@sendgrid/mail";
import { injectable } from "tsyringe";

@injectable()
export class EmailService {
  constructor() {
    // send grid add api key
    SendGrid.setApiKey(process.env.SEND_GRID_KEY);
  }

  async send(
    to: string,
    subject: string,
    html: string,
    from: string = process.env.DEFAULT_EMAIL_SENDER
  ) {
    const mail: SendGrid.MailDataRequired = {
      to: "wmfarooqi70@gmail.com",
      subject,
      from: 'wmfarooqi05@gmail.com', // Fill it with your validated email on SendGrid account
      html,
    };
    return SendGrid.send(mail);
  }
}
