import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { google, Auth, gmail_v1 } from "googleapis";
import { GoogleOAuthService } from "../oauth/service";
import EmployeeModel from "@models/Employees";
import { IActivity, IEMAIL_DETAILS } from "@models/interfaces/Activity";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployee } from "@models/interfaces/Employees";

@injectable()
export class GoogleGmailService {
  client: Auth.OAuth2Client;
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(GoogleOAuthService)
    private readonly googleOAuthService: GoogleOAuthService
  ) {}

  async getGoogleGmailClient(employeeId: string): Promise<gmail_v1.Gmail> {
    const client = await this.googleOAuthService.getOAuth2Client(employeeId);
    client.getTokenInfo;
    return google.gmail({ version: "v1", auth: client });
  }

  async createAndSendEmail(employeeId: string, bodyStr: string) {
    const payload = JSON.parse(bodyStr);
    const { from, to, subject, date, messageId, body } = payload;

    // @TODO validate payload
    const employee: IEmployee = await EmployeeModel.query().findById(employeeId);
    // const token = await this.googleOAuthService.getRefreshedAccessToken(employeeId);
    console.log("employee", employee.email);
    const _client = await this.getGoogleGmailClient(employeeId);
    const raw = this.formatRFC2822Message(
      from,
      to,
      subject,
      date,
      messageId,
      body
    );
    const resp = await _client.employees.messages.send({
      employeeId: employee.email,
      requestBody: {
        raw,
      },
    });

    return resp;
  }

  async createAndSendEmailFromActivityPayload(activity: IActivity) {
    const { fromEmail, from, to, subject, date, messageId, body } = activity
      .details as IEMAIL_DETAILS;
    const _client = await this.getGoogleGmailClient(activity.createdBy);
    const raw = this.formatRFC2822Message(
      from,
      to,
      subject,
      date,
      messageId,
      body
    );
    const resp = await _client.employees.messages.send({
      employeeId: fromEmail,
      requestBody: {
        raw,
      },
    });

    return resp;
  }

  formatRFC2822Message(
    from: string,
    to: string,
    subject: string,
    date: string,
    messageId: string,
    body: string
  ) {
    let message: string = "";
    message += "From: " + from + "\r\n";
    message += "To: " + to + "\r\n";
    message += "Subject: " + subject + "\r\n";
    message += "Date: " + date + "\r\n";
    message += "Message-ID: " + messageId + "\r\n";
    if (this.isHtml(body)) {
      message += "Content-Type: text/html; charset=utf-8`\r\n";
    }
    message += "\r\n";
    message += body;

    return this.utf8_to_b64(message);
  }

  utf8_to_b64(text) {
    return Buffer.from(
      String.fromCharCode.apply(null, new TextEncoder().encode(text))
    ).toString("base64");
  }

  isHtml(str) {
    const htmlRegex = /<[a-z][\s\S]*>/i;
    return htmlRegex.test(str);
  }
}
