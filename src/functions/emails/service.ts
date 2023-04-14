import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import { inject, injectable } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { SESEmailService } from "@common/service/bulk_email/SESEamilService";
import { EmailModel } from "@models/dynamoose/Emails";
import { randomUUID } from "crypto";

export interface IEmailService {}

@injectable()
export class EmailService implements IEmailService {
  constructor(
    @inject(SESEmailService) private readonly sesEmailService: SESEmailService
  ) {}

  async getAllEmails(body: any): Promise<IEmailPaginated> {}

  async getEmail(id: string): Promise<IEmailModel> {}

  async sendEmail(employee: IEmployeeJwt, body: any): Promise<IEmailModel> {
    const payload = JSON.parse(body);
    // await validateSendEmail(payload);
    // @TODO get reporting manager if want to add CC

    const {
      recipientId,
      recipientEmail,
      subject,
      body: emailBody,
      CcAddresses,
      BccAddresses,
      companyId,
    } = payload;

    const respEmail = await this.sesEmailService.sendEmails(
      employee.email,
      [recipientEmail],
      subject,
      emailBody,
      // CcAddresses,
      // BccAddresses
    );

    const newEmail = new EmailModel({
      id: randomUUID(),
      senderId: employee.sub,
      senderEmail: employee.email,
      emailData: {
        subject,
        body: emailBody,
      },
      // ccList: CcAddresses,
      // bccList: BccAddresses,
      recipientId,
      recipientEmail,
      companyId,
      sentDate: Date.now(),
      serviceProvider: "AWS",
      updatedBy: employee.sub,
    });

    const resp = await newEmail.save();
    return resp;
  }

  async sendBulkEmails(
    employee: IEmployeeJwt,
    body
  ): Promise<{
    // await validateBulkEmails(body);
    // push this to sqs, which will trigger the same function, sendEmails
    return: any;
  }> {
    return;
  }

  async updateEmail(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<IEmailModel> {}

  async deleteEmail(id: string): Promise<any> {}
}
