import { companyHandler } from "@functions/companies";
import { activitiesHandler } from "@functions/activities";

import { pendingApprovalsHandler } from "@functions/pending_approvals";

// import { handleEBSchedulerLambdaInvoke } from "@functions/reminders";

import { webSocketHandler } from "@functions/websocket";
import { notificationHandler } from "@functions/notifications";
import {
  googleOauthCallbackHandler,
  googleOauthHandler,
} from "@functions/google/oauth";

import {
  // sendEmailText,
  receiveEmailHandler,
} from "@functions/emails";
import { emailHandler } from "@functions/emails";

import // importData,
// bulkCognitoSignup,
// uploadSignupBulkJob,
// handleDynamoStreamRecords,
// handleSESEmailToSNSEvent,
"@functions/jobs";

import { employeeHandler } from "@functions/employees";

import { sqsJobQueueInvokeHandler, imageVariationJob } from "@functions/sqs";

import { teamHandler } from "@functions/teams";
import { cognitoOAuthHandler } from "./auth";

import { utilsHandler } from "@functions/utils";
import { deleteAllReminders } from "./reminders";
// import { scrapeGmail } from "./google/gmail";

const exportHandlers = {
  companyHandler,
  activitiesHandler,
  teamHandler,
  emailHandler,
  notificationHandler,
  cognitoOAuthHandler,
  utilsHandler,
  pendingApprovalsHandler,
  // Jobs
  // importData,
  // bulkCognitoSignup,
  // handleDynamoStreamRecords,
  // uploadSignupBulkJob,

  // Reminders
  // handleEBSchedulerLambdaInvoke,
  webSocketHandler,

  // google
  googleOauthHandler,
  googleOauthCallbackHandler,
  // getAllCalendars,
  // createMeeting,
  receiveEmailHandler,
  employeeHandler,
  sqsJobQueueInvokeHandler,
  imageVariationJob,
};

if (process.env.NODE_ENV === "local") {
  // exportHandlers["dailyReminderCleanup"] = dailyReminderCleanup;
  exportHandlers["deleteAllReminders"] = deleteAllReminders;
}

export default exportHandlers;
