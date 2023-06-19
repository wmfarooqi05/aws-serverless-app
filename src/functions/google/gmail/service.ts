import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { google, Auth, gmail_v1 } from "googleapis";
import { GoogleOAuthService } from "../oauth/service";
import EmployeeModel from "@models/Employees";
import { IActivity, IEMAIL_DETAILS } from "@models/interfaces/Activity";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import { formatRFC2822Message } from "@utils/emails";
import { EmailAddress, simpleParser } from "mailparser";
import {
  EmailRecordModel,
  IEmailRecord,
} from "@functions/emails/models/EmailRecords";
import { RecipientModel } from "@functions/emails/models/Recipient";
import { QueryBuilder } from "objection";

@injectable()
export class GoogleGmailService {
  client: Auth.OAuth2Client;
  constructor(
    @inject(DatabaseService) private readonly _: DatabaseService,
    @inject(GoogleOAuthService)
    private readonly googleOAuthService: GoogleOAuthService
  ) {}

  async getGoogleGmailClient(employeeId: string): Promise<gmail_v1.Gmail> {
    const client = await this.googleOAuthService.getOAuth2Client(employeeId);
    if (!client) {
      throw new CustomError("Token expired or not found", 400);
    }
    return google.gmail({ version: "v1", auth: client });
  }

  async createAndSendEmail(employeeId: string, bodyStr: string) {
    const payload = JSON.parse(bodyStr);
    const { from, to, subject, date, messageId, body } = payload;

    // @TODO validate payload
    const employee: IEmployee = await EmployeeModel.query().findById(
      employeeId
    );
    // const token = await this.googleOAuthService.getRefreshedAccessToken(employeeId);
    const _client = await this.getGoogleGmailClient(employeeId);
    const raw = formatRFC2822Message(from, to, subject, date, messageId, body);
    const resp = await _client.users.messages.send({
      userId: employee.email,
      requestBody: {
        raw,
      },
    });

    return resp;
  }

  async createAndSendEmailFromActivityPayload(activity: IActivity) {
    const { fromEmail, from, to, isDraft, subject, date, messageId, body } =
      activity.details as IEMAIL_DETAILS;
    if (isDraft) return;
    const _client = await this.getGoogleGmailClient(activity.createdBy);
    const raw = formatRFC2822Message(from, to, subject, date, messageId, body);
    const resp = await _client.users.messages.send({
      userId: fromEmail,
      requestBody: {
        raw,
      },
    });

    return resp;
  }
  // This whole code is part of scrape google emails to local db
  // async scrapeGmail(employee: IEmployeeJwt) {
  //   const tag = "export_for_test";
  //   await this.fetchAndParseEmails(employee.sub, tag);
  // }

  // async fetchAndParseEmails(employeeId: string, tag: string) {
  //   let nextPageToken: string | undefined = undefined;
  //   let emailsProcessed = 0;
  //   // Fetch emails with the specified tag
  //   const gmail = await this.getGoogleGmailClient(employeeId);
  //   let page = 1;
  //   do {
  //     console.log("starting Page: ", page);
  //     // Fetch emails with the specified tag and nextPageToken
  //     const res = await gmail.users.messages.list({
  //       userId: "me",
  //       q: `label:${tag}`,
  //       pageToken: nextPageToken,
  //     });

  //     if (!res.data.messages) {
  //       console.log("No emails found with the specified tag.");
  //       return;
  //     }

  //     // Loop through each email
  //     for (const email of res.data.messages) {
  //       const message = await gmail.users.messages.get({
  //         userId: "me",
  //         id: email.id!,
  //         format: "raw",
  //       });

  //       // Parse the raw email
  //       const rawEmail = message.data.raw!;
  //       if (!rawEmail) {
  //         console.log("skipping email ", emailsProcessed++);
  //         continue;
  //       }
  //       try {
  //         const parsedEmail = await simpleParser(rawEmail);
  //         // Create an EmailRecordModel instance with the parsed email data
  //         const emailRecord: IEmailRecord = await EmailRecordModel.query()
  //           .insert({
  //             subject: parsedEmail.subject,
  //             body: parsedEmail.text || message.data?.snippet,
  //             inReplyTo: parsedEmail.inReplyTo,
  //             references: parsedEmail.references,
  //             priority: parsedEmail.priority,
  //             messageId: parsedEmail.messageId,
  //             details: message.data.payload,
  //             direction:
  //               parsedEmail?.from?.value[0]?.address === "wmfarooqi05@gmail.com"
  //                 ? "SENT"
  //                 : "RECEIVED",
  //             threadId: message.data.threadId,
  //           } as Partial<IEmailRecord>)
  //           .onConflict()
  //           .ignore();

  //         const promises: QueryBuilder<RecipientModel, RecipientModel>[] = [];

  //         // Store the recipients
  //         if (parsedEmail.to) {
  //           if (Array.isArray(parsedEmail.to)) {
  //             for (const recipient of parsedEmail.to) {
  //               promises.push(
  //                 ...this.getRecipients(emailRecord.id, recipient.value)
  //               );
  //             }
  //           } else {
  //             promises.push(
  //               ...this.getRecipients(emailRecord.id, parsedEmail.to.value)
  //             );
  //           }
  //         }
  //         if (parsedEmail.from) {
  //           promises.push(
  //             ...this.getRecipients(
  //               emailRecord.id,
  //               parsedEmail.from.value,
  //               "FROM"
  //             )
  //           );
  //         }

  //         await this.executeDbPromises(promises);
  //         emailsProcessed++;
  //         console.log(emailsProcessed);
  //       } catch (e) {
  //         console.log("error on page", page, " and email: ", emailsProcessed);
  //         console.log("error", e);
  //       }
  //     }

  //     nextPageToken = res.data.nextPageToken;
  //     page++;
  //   } while (nextPageToken);
  // }

  // getRecipients = (
  //   emailId: string,
  //   value: EmailAddress[],
  //   listId = "TO_LIST"
  // ) => {
  //   return value.map((_r) => {
  //     return RecipientModel.query().insert({
  //       emailId,
  //       recipientType: listId,
  //       recipientEmail: _r.address,
  //       recipientName: _r.name,
  //     });
  //   });
  // };

  // async executeDbPromises(
  //   dbPromises: QueryBuilder<RecipientModel, RecipientModel>[]
  // ) {
  //   const trx = await RecipientModel.startTransaction(); // Start a transaction

  //   try {
  //     for (const dbPromise of dbPromises) {
  //       await dbPromise.transacting(trx); // Execute query within the transaction
  //     }

  //     await trx.commit(); // Commit the transaction
  //     console.log("All DB calls executed successfully.");
  //   } catch (error) {
  //     await trx.rollback(); // Rollback the transaction if an error occurs
  //     console.error("Error executing DB calls:", error);
  //   }
  // }
}
