import {
  SESClient,
  ListTemplatesCommand,
  CreateTemplateCommand,
  UpdateTemplateCommand,
  DeleteTemplateCommand,
  CreateTemplateCommandInput,
} from "@aws-sdk/client-ses";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { isHtml } from "@utils/emails";
import { inject, injectable } from "tsyringe";
import { EmailTemplatesModel, IEmailTemplate } from "../models/EmailTemplate";
import {
  copyS3Object,
  getKeysFromS3Url,
  uploadContentToS3,
} from "@functions/jobs/upload";
import { validateCreateEmailTemplate } from "./schema";
import { CustomError } from "@helpers/custom-error";
import { generateThumbnailFromHtml } from "@utils/thumbnails";
import {
  DeleteItemCommand,
  DeleteItemCommandInput,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

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
    const {
      templateContent,
      placeholders,
      templateName,
      subjectPart,
      version,
      htmlLink,
      thumbnailUrl,
    } = payload;

    const commandInput: CreateTemplateCommandInput = {
      Template: {
        TemplateName: templateName,
        SubjectPart: subjectPart,
      },
    };
    const _isHtml = isHtml(templateContent);
    if (htmlLink || _isHtml) {
      commandInput.Template.HtmlPart = templateContent;
    } else {
      commandInput.Template.TextPart = templateContent;
    }

    const command = new CreateTemplateCommand(commandInput);
    const template: IEmailTemplate = {
      templateName,
      placeholders,
      awsRegion: process.env.REGION,
      updatedBy: employee.sub,
      version,
    };
    if (htmlLink || _isHtml) {
      const newKey = `media/email-templates/${templateName}/${version}/thumbnail.png`;
      if (_isHtml) {
        const thumbBuffer = await generateThumbnailFromHtml(templateContent);
        const thumbnail = await uploadContentToS3(
          newKey,
          thumbBuffer,
          "public-read"
        );
        template.thumbnailUrl = thumbnail.fileUrl;
      } else if (thumbnailUrl) {
        const keys = getKeysFromS3Url(thumbnailUrl);
        await copyS3Object(
          keys.fileKey,
          newKey,
          "public-read",
          true,
          keys.bucketName,
          keys.region
        );
        template.thumbnailUrl = newKey;
      } else {
        // @TODO
        // Download big template and make its thumbnail and upload :D
      }
    }
    const emailTemplateEntry: IEmailTemplate =
      await EmailTemplatesModel.query().insert(template);
    try {
      const resp = await sesClient.send(command);
      const sesResponse = JSON.stringify(resp);

      await EmailTemplatesModel.query().patchAndFetchById(
        emailTemplateEntry.id,
        { sesResponse }
      );
      emailTemplateEntry.sesResponse = sesResponse;
    } catch (e) {
      if (e.name === "AlreadyExistsException") {
        console.log("AlreadyExistsException, we are linking with DB row");
      } else {
        EmailTemplatesModel.query().deleteById(emailTemplateEntry.id);
        throw new CustomError(e.message, e.statusCode);
      }
    }
    return emailTemplateEntry;
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

  // Function to delete a template and its record from the database
  async deleteTemplate(templateName: string): Promise<void> {
    // Delete SES template
    const command = new DeleteTemplateCommand({ TemplateName: templateName });
    await sesClient.send(command);

    const params: DeleteItemCommandInput = {
      TableName: "TemplatesTable",
      Key: {
        partitionKey: { S: templateName }, // Specify the partition key value
      },
    };

    await dynamoClient.send(new DeleteItemCommand(params));
  }
}
