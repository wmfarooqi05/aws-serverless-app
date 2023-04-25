import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getMyActivities,
  getTopActivities,
  getAllActivitiesByCompany,
  getMyStaleActivityByStatus,
  updateStatusOfActivity,
  getEmployeeStaleActivityByStatus,
} from "@functions/activities";

import {
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
} from "@functions/activities/activity-remarks";

import { companyHandler, } from "@functions/companies";

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

import {
  getNotifications,
  getNotificationById,
  updateNotification,
} from "@functions/notifications";

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
import {
  getAllEmailLists,
  addEmailList,
  updateEmailList,
  deleteEmailList,
} from "@functions/emails/emailLists";

import {
  importData,
  bulkCognitoSignup,
  bulkImportUsersProcessHandler,
  processPendingJobs,
} from "@functions/jobs";

import { getEmployees, getEmployeesWorkSummary } from "@functions/employees";

import { sqsJobQueueInvokeHandler } from "@functions/sqs";

import {
  getTeamById,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from "@functions/teams";

export default {
  companyHandler,

  // Jobs
  importData,
  bulkCognitoSignup,
  processPendingJobs,

  // Activity
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
  getMyActivities,
  getTopActivities,
  getAllActivitiesByCompany,
  getMyStaleActivityByStatus,
  getEmployeeStaleActivityByStatus,
  // ACTIVITY
  // createActivity,
  sendWebSocketNotification,
  updateStatusOfActivity,
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

  // email list
  addEmailList,
  updateEmailList,
  deleteEmailList,
  getAllEmailLists,

  // employees
  getEmployees,
  getEmployeesWorkSummary,

  //
  sqsJobQueueInvokeHandler,
  bulkImportUsersProcessHandler,

  // teams
  getTeamById,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,

  // notifications
  getNotificationById,
  getNotifications,
  updateNotification,

  // schedulers
  updateScheduleReminder,
  getSchedulerGroups,
  getSchedulers,
  deleteScheduleReminder,
  deleteAllReminders,
};
