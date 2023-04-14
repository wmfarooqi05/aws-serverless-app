import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import { container, delay, inject, injectable } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { SESEmailService } from "@common/service/bulk_email/SESEamilService";
import EmailModel from "@models/dynamoose/Emails";
import { randomUUID } from "crypto";
import { CustomError } from "@helpers/custom-error";
import { validateSendEmail } from "./schema";
import moment from "moment-timezone";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";
import { SQSService } from "@functions/sqs/service";
import JobsResultsModel from "@models/JobsResult";

export interface IEmailService {}

@injectable()
export class EmailService implements IEmailService {
  constructor(
    @inject(SESEmailService) private readonly sesEmailService: SESEmailService,
    @inject(DatabaseService) private readonly _: DatabaseService
  ) {}

  async getAllEmails(body: any): Promise<IEmailPaginated> {}

  async getEmail(id: string): Promise<IEmailModel> {}

  /**
   * @param employee
   * @param body
   * @returns
   */
  async sendEmail(employee: IEmployeeJwt, body: any): Promise<IEmailModel> {
    const payload: {
      recipientId: string;
      recipientEmail: string;
      subject: string;
      body: string;
      ccList: string[];
      bccList: string[];
      companyId: string;
    } = JSON.parse(body);
    await validateSendEmail(employee, payload);
    // @TODO get reporting manager if want to add CC

    const {
      recipientId,
      recipientEmail,
      subject,
      body: emailBody,
      ccList,
      bccList,
      companyId,
    } = payload;

    const id = randomUUID();

    const item: IEmailSqsEventInput = {
      eventType: "SEND_EMAIL",
      name: `EMAIL_JOB_${id}`,
      details: [
        {
          body: emailBody,
          ConfigurationSetName: "email_sns_config",
          recipientEmail,
          senderEmail: employee.email,
          senderId: employee.sub,
          subject,
          bccList,
          ccList,
          companyId,
          recipientId,
        },
      ],
    };

    const resp = await container.resolve(SQSService).enqueueItems(item);

    return JobsResultsModel.query().insert({
      jobType: "SEND_EMAIL",
      details: {
        sqsResp: resp.MessageId,
        emailDetails: item.details,
      },
      uploadedBy: employee.sub,
    });
  }
  /**
   * Push the emails in chunk of 50 in each sqs item
   * @param employee
   * @param body
   * @returns
   */
  async sendBulkEmails(
    employee: IEmployeeJwt,
    body
  ): Promise<{
    // await validateBulkEmails(body);
    // push this to sqs, which will trigger the same function, sendEmails
    return: any;
  }> {
    const payload = JSON.parse(body);
    if (payload.emailListId) {
      const emailList = EmailList.query();
    }

    return;
  }

  async updateEmail(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<IEmailModel> {}

  async deleteEmail(id: string): Promise<any> {}

  async sqsEmailHandler(event: IEmailSqsEventInput) {
    console.log("[sqsEmailHandler]", event);
    const {
      senderEmail,
      senderId,
      replyTo,
      ConfigurationSetName,
      recipientId,
      recipientEmail,
      subject,
      body,
      ccList,
      bccList,
      companyId,
    } = event.details[0];
    try {
      await validateSendEmail(event);
      const respEmail = await this.sesEmailService.sendEmails(
        senderEmail,
        [recipientEmail],
        subject,
        body,
        ConfigurationSetName,
        ccList,
        bccList,
        replyTo
      );

      if (respEmail?.$metadata?.httpStatusCode === 200) {
        const newEmail = new EmailModel({
          id: randomUUID(),
          senderId,
          senderEmail,
          emailData: {
            subject,
            body,
          },
          ccList: ccList?.join(","),
          bccList: bccList?.join(","),
          recipientId,
          recipientEmail,
          companyId,
          serviceProvider: "AMAZON_SES",
          updatedBy: senderId,
        });

        const resp = await newEmail.save();
        return resp;
      }
    } catch (error) {
      console.log("[sqsEmailHandler] error: ", error);

      if (error.$metadata) {
        const {
          $metadata: { httpStatusCode },
          Error: { message },
        } = error;
        throw new CustomError(message, httpStatusCode);
      } else {
        throw new CustomError(error.message, error.statusCode, error);
      }
    }
  }
}
