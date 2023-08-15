import { companiesHandler } from "@functions/companies";
import { activitiesHandler } from "@functions/activities";

import { pendingApprovalsHandler } from "@functions/pending_approvals";

// import { handleEBSchedulerLambdaInvoke } from "@functions/reminders";

import { webSocketHandler } from "@functions/websocket";
import { notificationHandler } from "@functions/notifications";

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

const exportHandlers = {
  companiesHandler,
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
