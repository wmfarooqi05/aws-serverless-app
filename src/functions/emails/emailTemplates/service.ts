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
import { getS3BufferFromUrl } from "@functions/jobs/upload";
import { replaceImageUrls } from "@utils/image";
import { checkTemplateExists } from "./helpers";

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
      templateContent: templatePart,
      placeholders,
      templateName,
      subjectPart,
      version,
      htmlS3Link,
      thumbnailUrl,
    } = payload;

    const templateExistsOnSes = await checkTemplateExists(templateName, sesClient);
    // const tempalteExistsOnDB = await EmailTemplatesModel

    let templateContent = templatePart;
    if (htmlS3Link) {
      // download it into templateContent
      const templateS3Buffer = await getS3BufferFromUrl(htmlS3Link);
      templateContent = templateS3Buffer.toString();
    }

    const commandInput: CreateTemplateCommandInput = {
      Template: {
        TemplateName: templateName,
        SubjectPart: subjectPart,
      },
    };
    const _isHtml = htmlS3Link || isHtml(templateContent);
    if (htmlS3Link || _isHtml) {
      templateContent = await replaceImageUrls(
        templateContent,
        `media/email-templates/${templateName}/${version}`
      );
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
      subject: subjectPart,
    };
    const rootKey = `media/email-templates/${templateName}/${version}`;

    // content handling part
    if (htmlS3Link) {
      const newKey = `${rootKey}/template-content`;
      await copyS3Object(
        getKeysFromS3Url(htmlS3Link).fileKey,
        newKey,
        "public-read",
        false
      );

      template.contentUrl = `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${newKey}`;
      template.contentUrl = htmlS3Link;
    } else {
      const templateContentUrl = await uploadContentToS3(
        `${rootKey}/template-content`,
        templateContent
      );
      template.contentUrl = templateContentUrl.fileUrl;
    }

    const thumbKey = `${rootKey}/thumbnail.png`;

    // thumbnail part
    if (htmlS3Link || _isHtml) {
      if (thumbnailUrl) {
        const keys = getKeysFromS3Url(thumbnailUrl);
        await copyS3Object(
          keys.fileKey,
          thumbKey,
          "public-read",
          true,
          keys.bucketName,
          keys.region
        );
        template.thumbnailUrl = thumbKey;
      } else if (_isHtml) {
        const thumbBuffer = await generateThumbnailFromHtml(templateContent);
        const thumbnail = await uploadContentToS3(
          thumbKey,
          thumbBuffer,
          "public-read"
        );
        template.thumbnailUrl = thumbnail.fileUrl;
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
