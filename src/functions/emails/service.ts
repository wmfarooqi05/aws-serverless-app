import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import { container, inject, injectable } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { SESEmailService } from "@common/service/bulk_email/SESEamilService";
import EmailRecordsModel, { JobsModel } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { CustomError } from "@helpers/custom-error";
import { validateBulkEmails, validateSendEmail } from "./schema";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";
import { SQSService } from "@functions/sqs/service";
import { COMPANIES_TABLE_NAME } from "@models/commons";
import { ICompany } from "@models/interfaces/Company";
import { chunk } from "@utils/lodash";

export interface IEmailService {}

@injectable()
export class EmailService implements IEmailService {
  constructor(
    @inject(SESEmailService) private readonly sesEmailService: SESEmailService,
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllEmails(body: any): Promise<IEmailPaginated> {}

  async getEmail(id: string): Promise<IEmailModel> {}

  /**
   * @param employee
   * @param body
   * @returns
   */
  async sendEmail(employee: IEmployeeJwt, body: any): Promise<IEmailModel> {
    const payload = JSON.parse(body);
    await validateSendEmail(payload);
    // @TODO get reporting manager if want to add CC

    const {
      recipientId,
      recipientEmail,
      recipientName,
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
      details: {
        body: emailBody,
        ConfigurationSetName: "email_sns_config",
        recipients: [
          {
            recipientEmail,
            recipientName,
            companyId,
            recipientId,
          },
        ],
        senderEmail: employee.email,
        senderId: employee.sub,
        subject,
        bccList,
        ccList,
      },
    };

    const resp = await container.resolve(SQSService).enqueueItems(item);

    // @TODO fix this
    return JobsModel.query().insert({
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
  async sendBulkEmails(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    await validateBulkEmails(payload);

    const { emailListId } = payload;

    if (!emailListId) {
      return;
    }
    const companies: ICompany[] = await this.docClient
      .getKnexClient()(COMPANIES_TABLE_NAME)
      .where(
        "concerned_persons",
        "@>",
        JSON.stringify([{ emailList: [emailListId] }])
      );

    const emailIds = this.getEmailIdsFromCompanies(companies, emailListId);

    const emailInputPayloads: IEmailSqsEventInput[] = this.createEmailSqsInputs(
      payload,
      emailIds,
      employee
    );

    const jobItems = emailInputPayloads.map((x) => {
      return new JobsModel({
        jobId: randomUUID(),
        uploadedBy: employee.sub,
        jobType: "BULK_EMAIL",
        details: x,
        jobStatus: "PENDING",
      });
    });

    // Use the batchPut method to perform bulk create
    return JobsModel.batchPut(jobItems);
    // Need to write a helper method which picks the batch of X and put in SQS
    // const sqsItemsWithJobId: IEmailSqsEventInput[] = emailInputPayloads.map(
    //   (x: IEmailSqsEventInput, i) => {
    //     return {
    //       ...x,
    //       jobId: jobs[i].id,
    //     };
    //   }
    // );

    // const sqsService = container.resolve(SQSService);
    // await Promise.all(sqsItemsWithJobId.map((x) => sqsService.enqueueItems(x)));
    // return jobs.filter((x) => x.id);
  }

  private createEmailSqsInputs(
    emailPayload: any,
    emailList: IEmailSqsEventInput["details"]["recipients"],
    createdBy: IEmployeeJwt
  ): IEmailSqsEventInput[] {
    const chunkSize = 10;
    return chunk(emailList, chunkSize).map((x) => {
      const { subject, body, ccList, bccList } = emailPayload;
      const id = randomUUID();
      return {
        eventType: "SEND_EMAIL",
        name: `EMAIL_JOB_${id}`,
        details: {
          body,
          ConfigurationSetName: "email_sns_config", // @TODO change with env
          recipients: x,
          senderEmail: createdBy.email,
          senderId: createdBy.sub,
          subject,
          bccList,
          ccList,
        },
      } as IEmailSqsEventInput;
    });
  }

  private getEmailIdsFromCompanies(
    companies: ICompany[],
    emailListId: string
  ): IEmailSqsEventInput["details"]["recipients"] {
    const emailIds = [];
    companies.forEach((company: ICompany) => {
      company.concernedPersons.forEach((x) => {
        if (x?.emailList?.includes(emailListId)) {
          emailIds.push(
            ...x.emailList.map((e) => {
              return {
                recipientName: x.name,
                recipientEmail: e,
                companyId: null,
                recipientId: null,
              };
            })
          );
        }
      });
    });
    return emailIds;
  }

  async updateEmail(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<IEmailModel> {}

  async deleteEmail(id: string): Promise<any> {}

  // @TODO fix the 0th index thing
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
      const respEmail = await this.sesEmailService.sendEmail(
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
        const newEmail = new EmailRecordsModel({
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
          emailType: "SENDING",
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

  async sendEmailTest(body: any) {
    const payload = JSON.parse(body);
    const { from, recipients, subject, body: emailBody } = payload;

    const resp = await this.sesEmailService.sendEmail(
      from,
      recipients,
      subject,
      emailBody,
      "email_sns_config",
      [],
      [],
      [from]
    );
    return resp;
  }

}
