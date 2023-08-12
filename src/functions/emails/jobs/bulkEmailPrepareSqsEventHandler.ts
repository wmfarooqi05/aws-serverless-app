import {
  EmailTemplatesModel,
  IEmailTemplate,
} from "@functions/emails/models/EmailTemplate";
import {
  EMAIL_ADDRESSES_TABLE,
  EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE,
  EMAIL_OPT_OUT_TABLE,
} from "@functions/emails/models/commons";
import {
  EMAIL_TEMPLATE_DATA,
  I_BULK_EMAIL_JOB,
  I_BULK_EMAIL_JOB_PREPARE,
} from "@functions/emails/models/interfaces/bulkEmail";
import { JobService } from "@functions/jobs/service";
import { copyS3Object, getKeysFromS3Url } from "@functions/jobs/upload";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IJob } from "@models/Jobs";
import { COMPANIES_TABLE_NAME, CONTACTS_TABLE } from "@models/commons";
import { mergeEmailAndName } from "@utils/emails";
import { randomUUID } from "crypto";
import { IWithPagination } from "knex-paginate";
import { container } from "@common/container";

export const bulkEmailPrepareSqsEventHandler = async (
  emailDbClient: DatabaseService,
  jobItem: IJob
) => {
  const { details }: { details: I_BULK_EMAIL_JOB_PREPARE } = jobItem as any;

  const emailKnex = emailDbClient.getKnexClient();
  const countResult = await emailKnex(EMAIL_ADDRESSES_TABLE)
    .countDistinct("e.email as distinctCount")
    .from("email_addresses as e")
    .leftJoin(
      "email_address_to_email_list as el",
      "el.email_address_id",
      "e.id"
    )
    .where({
      emailListId: details.emailListId,
    })
    .whereNotIn(
      "e.email",
      emailKnex.select("eop.email").from("email_opt_outs as eop")
    );
  const totalCount: number = parseInt(countResult[0].distinctCount.toString());

  const perPage = 2;
  const maxPages = Math.ceil(totalCount / perPage);
  const jobDataArray = [];
  interface EmailTemplatePayload {
    email: string;
    name: string;
    contactId: string;
    designation: string;
    phoneNumbers: string[];
    companyName: string;
  }
  [];

  const templateEntity: IEmailTemplate = await EmailTemplatesModel.query()
    .where({
      templateName: details.templateName,
    })
    .first();

  // COPY HTML PART
  const templateKey = getKeysFromS3Url(templateEntity.htmlPartUrl);
  const newTemplateKey = `media/bulk_emails/${randomUUID()}/template.html`;
  await copyS3Object(templateKey.fileKey, newTemplateKey);

  if (templateEntity.textPartUrl) {
    // COPY TEXT PART
    const textTemplateKey = getKeysFromS3Url(templateEntity.textPartUrl);
    const newTextTemplateKey = `media/bulk_emails/${randomUUID()}/TextPart.txt`;
    await copyS3Object(textTemplateKey.fileKey, newTextTemplateKey);
  }

  const templateUrl = `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${newTemplateKey}`;
  for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
    const emails: IWithPagination<EmailTemplatePayload> = await emailKnex(
      EMAIL_ADDRESSES_TABLE
    )
      .select(
        "e.email",
        "c.name",
        "c.id as contact_id",
        "c.designation",
        "c.phone_numbers",
        "cp.company_name"
      )
      .from(`${EMAIL_ADDRESSES_TABLE} as e`)
      .leftJoin(
        `${EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE} as el`,
        "el.email_address_id",
        "e.id"
      )
      .leftJoin(`${CONTACTS_TABLE} as c`, "c.id", "e.contact_id")
      .leftJoin(`${COMPANIES_TABLE_NAME} as cp`, "cp.id", "c.company_id")
      .where({
        emailListId: details.emailListId,
      })
      .whereNotIn(
        "e.email",
        emailKnex.select("eop.email").from(`${EMAIL_OPT_OUT_TABLE} as eop`)
      )
      .paginate({
        currentPage,
        perPage,
      });

    const bulkEmailJobPayloads: I_BULK_EMAIL_JOB = {
      ...details,
      emailTemplateS3Url: templateUrl,
      subject: templateEntity.subject,
      templateData: emails.data.map((x: EmailTemplatePayload) => {
        return {
          destination: mergeEmailAndName(x),
          placeholders: JSON.stringify(x),
        } as EMAIL_TEMPLATE_DATA;
      }),
    };

    const resp = await container.resolve(JobService).createAndEnqueueJob(
      {
        details: bulkEmailJobPayloads,
        jobStatus: "PENDING",
        uploadedBy: jobItem.uploadedBy,
        jobType: "BULK_EMAIL",
      },
      process.env.MAIL_QUEUE_URL
    );
    jobDataArray.push({ jobId: resp.job.id });
  }

  return jobDataArray;
};
