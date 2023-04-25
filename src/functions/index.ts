import { companyHandler } from "@functions/companies";
import { activitiesHandler } from "@functions/activities";

import {
  sendWebSocketNotification,
  getMyPendingApprovals,
  approveOrRejectRequest,
} from "@functions/pending_approvals";

import {
  handleEBSchedulerLambdaInvoke,
  createReminder,
  deleteReminder,
  dailyReminderCleanup,
  // schedulers
  updateScheduleReminder,
  getSchedulerGroups,
  getSchedulers,
  deleteScheduleReminder,
  deleteAllReminders,
} from "@functions/reminders";

import {
  webSocketHandler,
  broadcastMessage,
  getAllWebSocketConnections,
} from "@functions/websocket";

import { notificationHandler } from "@functions/notifications";

import {
  googleOauthCallbackHandler,
  googleOauthHandler,
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,
} from "@functions/google/oauth";

import { createAndSendEmail } from "@functions/google/gmail";

import {
  getAllCalendars,
  // getMeetings,
  // getMeetingById,
  createMeeting,
  // updateMeetingById,
  // deleteMeetingById,
} from "@functions/google/calendar";

import { sendEmail, sendBulkEmails } from "@functions/emails";
import { emailHandler } from "@functions/emails/emailLists";

import {
  importData,
  bulkCognitoSignup,
  bulkImportUsersProcessHandler,
  //  processPendingJobs,
} from "@functions/jobs";

import { getEmployees, getEmployeesWorkSummary } from "@functions/employees";

import { sqsJobQueueInvokeHandler } from "@functions/sqs";

import { teamHandler } from "@functions/teams";

export default {
  companyHandler,
  activitiesHandler,
  teamHandler,
  emailHandler,
  notificationHandler,

  // Jobs
  importData,
  bulkCognitoSignup,
  // processPendingJobs,

  sendWebSocketNotification,
  getMyPendingApprovals,
  approveOrRejectRequest,

  // Reminders
  handleEBSchedulerLambdaInvoke,
  createReminder,
  deleteReminder,
  dailyReminderCleanup,
  // WebSocketapproveOrRejectRequest
  webSocketHandler,
  broadcastMessage,
  getAllWebSocketConnections,

  // google
  googleOauthHandler,
  googleOauthCallbackHandler,
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,

  // calendar
  // getMeetings,
  // getMeetingById,
  getAllCalendars,
  createMeeting,
  // updateMeetingById,
  // deleteMeetingById,

  createAndSendEmail,

  /// emails
  sendEmail,
  sendBulkEmails,

  // employees
  getEmployees,
  getEmployeesWorkSummary,

  //
  sqsJobQueueInvokeHandler,
  bulkImportUsersProcessHandler,

  // schedulers
  updateScheduleReminder,
  getSchedulerGroups,
  getSchedulers,
  deleteScheduleReminder,
  deleteAllReminders,
};
