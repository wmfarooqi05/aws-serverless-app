import {
  SESClient,
  ListTemplatesCommand,
  UpdateTemplateCommand,
  DeleteTemplateCommand,
} from "@aws-sdk/client-ses";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { inject, injectable } from "tsyringe";
import { EmailTemplatesModel, IEmailTemplate } from "../models/EmailTemplate";
import {
  copyS3FolderContent,
  validateS3BucketUrl,
} from "@functions/jobs/upload";
import { validateCreateEmailTemplate, validateDeleteTemplate } from "./schema";
import { CustomError } from "@helpers/custom-error";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { checkTemplateExistsOnSES } from "./helpers";
import { randomUUID } from "crypto";
import JobsModel, { IJobData } from "@models/dynamoose/Jobs";

// Initialize AWS SES client and DynamoDB client
const sesClient = new SESClient({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });

@injectable()
export class EmailTemplateService {
  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {}

  // Function to list all SES templates
  async listTemplates(): Promise<string[]> {
    const command = new ListTemplatesCommand({});
    const { Templates } = await sesClient.send(command);
    return Templates.map((template) => template.TemplateName);
  }

  // Function to create a new SES template and store the record in the database
  async createEmailTemplate(employee: IEmployeeJwt, body: any): Promise<any> {
    const payload = JSON.parse(body);
    await validateCreateEmailTemplate(payload);
    const { templateName, subjectPart, htmlS3Link, textS3Link, saveAsDraft } =
      payload;
    const version = "1";
    const templateSesName = `${templateName}-${version}`;
    validateS3BucketUrl(htmlS3Link);
    if (textS3Link) validateS3BucketUrl(textS3Link);
    const templateExistsOnSes = await checkTemplateExistsOnSES(
      templateName,
      sesClient
    );
    const templateExistsOnDB: IEmailTemplate = await EmailTemplatesModel.query()
      .where({
        templateName,
      })
      .first();

    if (templateExistsOnDB && templateExistsOnSes) {
      throw new CustomError("Template Name exists on SES and Database", 400);
      //create it in db by downloading content from SES, not from provided
    } else if (templateExistsOnDB) {
      // create template and sync DB
      // for now just throw errors
      throw new CustomError("template exists on DB, not on SES", 400);
    } else if (templateExistsOnSes) {
      // only sync DB
      throw new CustomError("template exists on SES, not on DB", 400);
    }
    const template: IEmailTemplate = {
      templateName,
      templateSesName,
      // placeholders,
      awsRegion: process.env.REGION,
      updatedBy: employee.sub,
      version,
      subject: subjectPart,
      status: !!saveAsDraft ? "DRAFT" : "PROCESSING",
      htmlPartUrl: htmlS3Link,
      textPartUrl: textS3Link,
    };

    let emailTemplateEntry: IEmailTemplate = null;
    try {
      emailTemplateEntry = await EmailTemplatesModel.query().insert(template);

      if (!saveAsDraft) {
        const jobItem = new JobsModel({
          jobId: randomUUID(),
          uploadedBy: employee.sub,
          jobType: "PROCESS_TEMPLATE",
          details: { emailTemplateId: emailTemplateEntry.id },
          jobStatus: "PENDING",
        });
        const jobResp: IJobData = await jobItem.save();

        await EmailTemplatesModel.query()
          .findById(emailTemplateEntry.id)
          .patch({
            details: {
              // sesResponse,
              jobId: jobResp.jobId,
            },
          });
      }
    } catch (e) {
      if (e.name === "AlreadyExistsException") {
        console.log("AlreadyExistsException, we are linking with DB row");
      } else if (emailTemplateEntry?.id) {
        EmailTemplatesModel.query().deleteById(emailTemplateEntry.id);
        throw new CustomError(e.message, e.statusCode);
      }
    }
    return emailTemplateEntry;
  }

  async deleteEmailTemplate(employee: IEmployeeJwt, body) {
    // Only tested by running without deletion and moving part
    const payload = JSON.parse(body);
    await validateDeleteTemplate(payload);
    let isDeletedFromSES = false;
    let templateEntity: IEmailTemplate = null;
    let {
      templateId,
      templateSesName,
    }: { templateId?: string; templateSesName?: string } = payload;
    let error = null;
    try {
      const query = EmailTemplatesModel.query();
      if (templateId) {
        query.where({ id: templateId });
      }
       else {
        query.where({ templateSesName });
      }

      templateEntity = await query.first();

      if (!templateSesName) {
        templateSesName = templateEntity.templateSesName;
      }

      const templateExistsOnSes = await checkTemplateExistsOnSES(
        templateSesName,
        sesClient
      );
      if (!templateEntity && !templateExistsOnSes) {
        throw new CustomError("Template doesn't exists on DB and SES", 400);
      }
      const rootKey = `media/email-templates/${templateEntity.templateName}/${templateEntity.version}`;

      const command = new DeleteTemplateCommand({
        TemplateName: templateSesName,
      });
      await sesClient.send(command);
      console.log("deleted from SES");
      await copyS3FolderContent(
        rootKey,
        `tmp/${templateEntity.templateName}/${templateEntity.version}`,
        "public-read"
      );
      console.log(
        `content moved to tmp folder: ${templateEntity.templateName}/${templateEntity.version}`
      );
      isDeletedFromSES = true;
      await EmailTemplatesModel.query().findById(templateEntity.id).del();
      console.log("deleted from DB");
    } catch (e) {
      // put back
      console.log("error", e);
      error = e;
      if (isDeletedFromSES) {
        // recover using links in DB;
        // we have to check if moved to tmp or not
        // if yes, then replace `media/email-templates/` paths with `tmp` and recover
        // otherwise just re-create
      }
    }

    if (error) {
      throw new CustomError(error.message, error.statusCode);
    }
  }
  // Function to retrieve a template record from the database
  async getAllTemplates(): Promise<any> {
    return EmailTemplatesModel.query();
  }

  async getTemplateById(body): Promise<any> {
    return EmailTemplatesModel.query().findById(body.templateId);
  }

  // Function to update a template and its record in the database
  async updateTemplate(
    templateName: string,
    placeholders: string[]
  ): Promise<any> {
    // Update SES template
    const templateContent = `Hello {{name}},\n\n${placeholders
      .map((p) => `{{${p}}}`)
      .join(", ")}\n\nRegards,\n{{sender}}`;
    const command = new UpdateTemplateCommand({
      Template: {
        TemplateName: templateName,
        SubjectPart: "Test email subject",
        TextPart: templateContent,
      },
    });
    await sesClient.send(command);

    const template: IEmailTemplate = {
      templateName,
      placeholders,
    };

    // Update template record in database
    const { Attributes } = await dynamoClient
      .update({
        TableName: "TemplatesTable",
        Key: { templateName },
        UpdateExpression: "SET placeholders = :placeholders",
        ExpressionAttributeValues: { ":placeholders": placeholders },
        ReturnValues: "UPDATED_NEW",
      })
      .promise();
    return Attributes as TemplateRecord;
  }
}
