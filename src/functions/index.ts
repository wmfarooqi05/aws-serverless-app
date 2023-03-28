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

import {
  createCompany,
  deleteCompany,
  getCompanyById,
  getCompanies,
  // getMyCompanies,
  getCompaniesByEmployeeId,
  updateCompany,
  updateCompanyAssignedEmployee,
  createConcernedPersons,
  updateConcernedPerson,
  deleteConcernedPerson,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,
} from "@functions/companies";

import {
  approvePendingApproval,
  sendWebSocketNotification,
  getMyPendingApprovals,
  approveOrRejectRequest,
} from "@functions/pending_approvals";

import {
  createReminder,
  deleteReminder,
  dailyReminderCleanup,
} from "@functions/reminders";

import {
  webSocketHandler,
  broadcastMessage,
  getAllWebSocketConnections,
} from "@functions/websocket";

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

import {
  importData,
  bulkCognitoSignup,
  bulkImportUsersProcessHandler,
} from "@functions/jobs";

import { getEmployees, getEmployeesWorkSummary } from "@functions/employees";

import { sqsJobQueueInvokeHandler } from "@functions/sqs";

export default {
  createCompany,
  deleteCompany,
  getCompanyById,
  getCompanies,
  // getMyCompanies,
  getCompaniesByEmployeeId,
  updateCompany,
  updateCompanyAssignedEmployee,
  createConcernedPersons,
  updateConcernedPerson,
  deleteConcernedPerson,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,

  // Jobs
  importData,
  bulkCognitoSignup,
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
  approvePendingApproval,
  sendWebSocketNotification,
  updateStatusOfActivity,
  getMyPendingApprovals,
  approveOrRejectRequest,

  // Reminders
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

  // employees
  getEmployees,
  getEmployeesWorkSummary,

  //
  sqsJobQueueInvokeHandler,
  bulkImportUsersProcessHandler,
};
