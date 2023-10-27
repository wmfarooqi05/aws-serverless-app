import { companiesHandler } from "@functions/companies";
import { activitiesHandler } from "@functions/activities";

// import { handleEBSchedulerLambdaInvoke } from "@functions/reminders";

import { webSocketHandler } from "@functions/websocket";
import { notificationHandler } from "@functions/notifications";

import { employeeHandler } from "@functions/employees";

import { teamHandler } from "@functions/teams";
import { cognitoOAuthHandler } from "./auth";

import { utilsHandler } from "@functions/utils";
import { deleteAllReminders } from "./reminders";

const exportHandlers = {
  companiesHandler,
  activitiesHandler,
  teamHandler,
  notificationHandler,
  cognitoOAuthHandler,
  utilsHandler,
  // Jobs
  // importData,
  // bulkCognitoSignup,
  // handleDynamoStreamRecords,
  // uploadSignupBulkJob,

  // Reminders
  // handleEBSchedulerLambdaInvoke,
  webSocketHandler,

  employeeHandler,
};

if (process.env.NODE_ENV === "local") {
  // exportHandlers["dailyReminderCleanup"] = dailyReminderCleanup;
  exportHandlers["deleteAllReminders"] = deleteAllReminders;
}

export default exportHandlers;
