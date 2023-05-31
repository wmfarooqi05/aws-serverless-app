import { companyHandler } from "@functions/companies";
import { activitiesHandler } from "@functions/activities";

import { pendingApprovalsHandler } from "@functions/pending_approvals";

import { handleEBSchedulerLambdaInvoke } from "@functions/reminders";

import {
  webSocketHandler,
  broadcastMessage,
  getAllWebSocketConnections,
} from "@functions/websocket";
import { notificationHandler } from "@functions/notifications";

import {
  googleOauthCallbackHandler,
  googleOauthHandler,
} from "@functions/google/oauth";

import {
  getAllCalendars,
  // getMeetings,
  // getMeetingById,
  createMeeting,
  // updateMeetingById,
  // deleteMeetingById,
} from "@functions/google/calendar";

import {
  // sendEmailText,
  receiveEmailHandler,
} from "@functions/emails";
import { emailHandler } from "@functions/emails";

import {
  importData,
  bulkCognitoSignup,
  uploadSignupBulkJob,
  handleDynamoStreamRecords,
  // handleSESEmailToSNSEvent,
} from "@functions/jobs";

import { getEmployees, getEmployeesWorkSummary } from "@functions/employees";

import { sqsJobQueueInvokeHandler } from "@functions/sqs";

import { teamHandler } from "@functions/teams";
import { cognitoOAuthHandler } from "./auth";

import { utilsHandler } from "@functions/utils";

export default {
  companyHandler,
  activitiesHandler,
  teamHandler,
  emailHandler,
  notificationHandler,
  cognitoOAuthHandler,
  utilsHandler,
  pendingApprovalsHandler,
  // Jobs
  importData,
  bulkCognitoSignup,
  // streamRecordHelper,
  handleDynamoStreamRecords,
  // handleSESEmailToSNSEvent,

  // Reminders
  handleEBSchedulerLambdaInvoke,
  // createReminder,
  // deleteReminder,
  // dailyReminderCleanup,
  // WebSocketapproveOrRejectRequest
  webSocketHandler,
  broadcastMessage,
  getAllWebSocketConnections,

  // google
  googleOauthHandler,
  googleOauthCallbackHandler,

  // calendar
  // getMeetings,
  // getMeetingById,
  getAllCalendars,
  createMeeting,
  // updateMeetingById,
  // deleteMeetingById,

  // createAndSendEmail,

  /// emails
  // sendEmail,
  // sendBulkEmails,
  // sendEmailText,
  receiveEmailHandler,

  // employees
  getEmployees,
  getEmployeesWorkSummary,

  //
  sqsJobQueueInvokeHandler,
  // bulkImportUsersProcessHandler,
  uploadSignupBulkJob,

  // schedulers
  // updateScheduleReminder,
  // getSchedulerGroups,
  // getSchedulers,
  // deleteScheduleReminder,
  // deleteAllReminders,
};
