import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { google, Auth, gmail_v1 } from "googleapis";
import { GoogleOAuthService } from "../oauth/service";
import EmployeeModel from "@models/Employees";
import { IActivity, IEMAIL_DETAILS } from "@models/interfaces/Activity";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployee } from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import { formatRFC2822Message } from "@utils/emails";

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
}
