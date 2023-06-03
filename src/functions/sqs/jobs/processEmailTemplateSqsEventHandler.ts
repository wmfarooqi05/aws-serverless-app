import {
  CreateTemplateCommand,
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
import { getS3BufferFromUrl, uploadContentToS3 } from "@functions/jobs/upload";
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
    const {
      templateName,
      version,
      templateSesName,
      htmlPartUrl,
      textPartUrl,
      subject,
    } = emailTemplate;

    const htmlPartBuffer = await getS3BufferFromUrl(htmlPartUrl);
    const htmlPartContent = htmlPartBuffer.toString();

    if (!isHtml(htmlPartContent)) {
      throw new CustomError("Not valid html template", 400);
    }

    // HtmlPart
    const replacements = await replaceImageUrls(
      htmlPartContent,
      `media/email-templates/${templateName}/${version}`,
      `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/media/email-templates/${templateName}/`
    );

    const rootKey = `media/email-templates/${templateName}/${version}`;
    const htmlPart = await uploadContentToS3(
      `${rootKey}/HtmlPart.html`,
      replacements.html,
      "public-read"
    );

    const updateDbItem: Partial<IEmailTemplate> = {
      htmlPartUrl: htmlPart.fileUrl,
      status: "OK",
    };

    // Thumbnail
    const thumbKey = `${rootKey}/thumbnail.png`;
    const { thumbnailBuffer, bodyText } = await generateThumbnailFromHtml(
      replacements.html
    );
    const thumbnail = await uploadContentToS3(
      thumbKey,
      thumbnailBuffer,
      "public-read"
    );
    updateDbItem.thumbnailUrl = thumbnail.fileUrl;

    let textPartContent = null;
    if (textPartUrl?.trim()?.length > 0) {
      const textPartBuffer = await getS3BufferFromUrl(textPartUrl);
      textPartContent = textPartBuffer.toString();

      const textPart = await uploadContentToS3(
        `${rootKey}/TextPart.txt`,
        textPartContent,
        "public-read"
      );
      updateDbItem.textPartUrl = textPart.fileUrl;
    }

    // Placeholders
    const placeholders = [
      ...getPlaceholders(subject),
      ...getPlaceholders(textPartContent),
      ...getPlaceholders(bodyText),
    ];
    updateDbItem.placeholders = placeholders;

    await sesClient.send(
      new CreateTemplateCommand({
        Template: {
          TemplateName: templateSesName,
          HtmlPart: replacements.html,
          SubjectPart: subject,
          TextPart: textPartContent,
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
          `jsonb_set(details, '{errors}', '${JSON.stringify({
            _message: error.message,
            statusCode: error.statusCode,
            _stack: error.stack,
          })}', true)`
        ),
      } as Partial<IEmailTemplate>);
    throw new CustomError(error.message, error.statusCode);
  }
};

export default processEmailTemplateSqsEventHandler;
