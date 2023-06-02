import {
  GetTemplateCommand,
  SESClient,
  UpdateTemplateCommand,
  UpdateTemplateCommandInput,
} from "@aws-sdk/client-ses";
import { SQSClient } from "@aws-sdk/client-sqs";
import {
  EmailTemplatesModel,
  IEmailTemplate,
} from "@functions/emails/models/EmailTemplate";
import { uploadContentToS3 } from "@functions/jobs/upload";
import { CustomError } from "@helpers/custom-error";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IJobData } from "@models/dynamoose/Jobs";
import { getPlaceholders, isHtml } from "@utils/emails";
import { replaceImageUrls } from "@utils/image";
import { generateThumbnailFromHtml } from "@utils/thumbnails";

const sesClient = new SESClient({ region: process.env.REGION });

const processEmailTemplateSqsEventHandler = async (jobItem: IJobData) => {
  const {
    details: { emailTemplateId },
  } = jobItem;

  const emailTemplate: IEmailTemplate =
    await EmailTemplatesModel.query().findById(emailTemplateId);
  if (!emailTemplate) {
    throw new CustomError(
      `Template with Id: ${emailTemplateId} not found in database`,
      400
    );
  }
  if (emailTemplate?.status === "DRAFT" || emailTemplate?.status === "OK") {
    throw new CustomError(
      `Template with status: '${emailTemplate.status}' cannot be processed`,
      400
    );
  }
  try {
    const { templateName, version, templateSesName } = emailTemplate;
    const sesTemplate = await sesClient.send(
      new GetTemplateCommand({
        TemplateName: templateSesName || templateName, // in case templateSesName is missing in older data,
      })
    );
    if (!sesTemplate) {
      throw new CustomError(
        `Template ${templateSesName || templateName} not found on SES`,
        400
      );
    }
    const { HtmlPart, SubjectPart, TextPart } = sesTemplate.Template;

    // Thumbnail
    const rootKey = `media/email-templates/${templateName}/${version}`;
    const thumbKey = `${rootKey}/thumbnail.png`;
    const { thumbnailBuffer, bodyText } = await generateThumbnailFromHtml(
      HtmlPart
    );
    const thumbnail = await uploadContentToS3(
      thumbKey,
      thumbnailBuffer,
      "public-read"
    );
    // Placeholders
    const placeholders = [
      ...getPlaceholders(SubjectPart),
      ...getPlaceholders(TextPart),
      ...getPlaceholders(bodyText),
    ];
    const updateDbItem: Partial<IEmailTemplate> = {
      status: "OK",
      placeholders,
    };

    updateDbItem.thumbnailUrl = thumbnail.fileUrl;

    // HtmlPart
    if (!isHtml(HtmlPart)) {
      throw new CustomError("Not valid html template", 400);
    }
    const replacements = await replaceImageUrls(
      HtmlPart,
      `media/email-templates/${templateName}/${version}`,
      `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/media/email-templates/${templateName}/`
    );

    const htmlPart = await uploadContentToS3(
      `${rootKey}/HtmlPart.html`,
      HtmlPart,
      "public-read"
    );
    updateDbItem.htmlPartUrl = htmlPart.fileUrl;
    if (TextPart) {
      const textPart = await uploadContentToS3(
        `${rootKey}/HtmlPart.html`,
        HtmlPart,
        "public-read"
      );
      updateDbItem.textPartUrl = textPart.fileUrl;
    }

    await sesClient.send(
      new UpdateTemplateCommand({
        Template: {
          TemplateName: templateSesName,
          HtmlPart: replacements.html,
          SubjectPart: SubjectPart,
          TextPart: TextPart,
        },
      })
    );

    const updatedObject = await EmailTemplatesModel.query()
      .findById(emailTemplateId)
      .patch(updateDbItem);
    console.log("updatedObject", updatedObject);
  } catch (error) {
    console.log("error", error);
    await EmailTemplatesModel.query()
      .findById(emailTemplateId)
      .patch({
        status: "ERROR",
        details: EmailTemplatesModel.raw(
          `jsonb_set(details, '{errors}', '${JSON.stringify(error)}', true)`
        ),
      } as Partial<IEmailTemplate>);
  }
};

export default processEmailTemplateSqsEventHandler;
