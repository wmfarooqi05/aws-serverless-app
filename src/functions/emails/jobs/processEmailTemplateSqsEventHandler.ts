import { CreateTemplateCommand, SESClient } from "@aws-sdk/client-ses";
import {
  EmailTemplatesModel,
  IEmailTemplate,
} from "@functions/emails/models/EmailTemplate";
import { FileRecordService } from "@functions/fileRecords/service";
import { getS3BufferFromUrl } from "@functions/jobs/upload";
import { CustomError } from "@helpers/custom-error";
import { FilePermissionsMap, ReadAllPermissions } from "@models/FileRecords";
import { IJob } from "@models/Jobs";
import { getPlaceholders, isHtml } from "@utils/emails";
import { replaceImageUrls } from "@utils/image";
import { isValidJSON } from "@utils/json";
import { htmlToText } from "html-to-text";
import { container } from "@common/container";
import { sesDefaultConfig } from "@common/configs";

const sesClient = new SESClient(sesDefaultConfig);
const fileRecordService = container.resolve(FileRecordService);

const processEmailTemplateSqsEventHandler = async (jobItem: IJob) => {
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

  if (emailTemplate?.status === "DRAFT" || emailTemplate?.status === "READY") {
    throw new CustomError(
      `Template with status: '${emailTemplate.status}' cannot be processed`,
      400
    );
  }

  await emailTemplate?.$query()?.patch({
    status: "IN_PROGRESS" as IEmailTemplate["status"],
  });

  try {
    const { templateName, version, templateSesName, htmlPartUrl, subject } =
      emailTemplate;

    const htmlPartBuffer = await getS3BufferFromUrl(htmlPartUrl);
    const htmlPartContent = htmlPartBuffer.toString();

    if (!isHtml(htmlPartContent)) {
      throw new CustomError("Not valid html template", 400);
    }

    // HtmlPart
    const replacements = await replaceImageUrls(
      htmlPartContent,
      `media/email-templates/${templateName}/${version}`
    );

    const bodyText = htmlToText(replacements.html);

    const rootKey = `media/email-templates/${templateName}/${version}`;

    const permissionMap: FilePermissionsMap = ReadAllPermissions;
    const files = await fileRecordService.uploadFilesToBucketWithPermissions(
      [
        {
          fileContent: replacements.html,
          fileName: "template.html",
          fileType: "text/html",
          originalFilename: "template.html",
          s3Key: rootKey,
          variationEnforcedRequired: true,
          variations: ["FULL_SNAPSHOT", "THUMBNAIL"],
        },
      ],
      permissionMap
    );

    const updateDbItem: Partial<IEmailTemplate> = {
      htmlPartUrl: files[0].fileUrl,
      status: "READY",
    };

    // Placeholders
    const placeholders = [
      ...getPlaceholders(subject),
      ...getPlaceholders(bodyText),
    ];
    updateDbItem.placeholders = placeholders;

    await sesClient.send(
      new CreateTemplateCommand({
        Template: {
          TemplateName: templateSesName,
          HtmlPart: replacements.html,
          SubjectPart: subject,
          TextPart: bodyText,
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
