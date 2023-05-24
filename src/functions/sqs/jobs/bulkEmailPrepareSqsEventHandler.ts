import { EMAIL_ADDRESSES_TABLE } from "@functions/emails/models/commons";
import {
  IEmailAddress,
  I_BULK_EMAIL_JOB,
  I_BULK_EMAIL_JOB_DETAILS,
  I_BULK_EMAIL_JOB_PREPARE,
} from "@functions/emails/models/interfaces/bulkEmail";
import { DatabaseService } from "@libs/database/database-service-objection";
import JobsModel, { IJobData } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { IWithPagination } from "knex-paginate";
import { chunk } from "lodash";

export const bulkEmailPrepareSqsEventHandler = async (
  emailDbClient: DatabaseService,
  jobItem: IJobData
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
  for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
    const emails: IWithPagination<IEmailAddress> = await emailKnex(
      EMAIL_ADDRESSES_TABLE
    )
      .select("e.*")
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
      )
      .paginate({
        currentPage,
        perPage,
      });

    const replacementTemplateDataArr = [];

    const bulkEmailJobPayloads: I_BULK_EMAIL_JOB_DETAILS = {
      ...details,
      templateData: emails.data.map((x: IEmailAddress, index) => {
        return {
          destination: {
            toAddressEmail: x.email,
            toAddressName: x.name,
          },
          replacementTemplateData: replacementTemplateDataArr[index],
        };
      }),
    } as I_BULK_EMAIL_JOB;

    const jobData = new JobsModel({
      jobId: randomUUID(),
      details: bulkEmailJobPayloads,
      jobStatus: "PENDING",
      uploadedBy: jobItem.uploadedBy,
      jobType: "BULK_SIGNUP",
    });
    await jobData.save();
    jobDataArray.push({ jobId: jobData.jobId });
  }

  return jobDataArray;
};
