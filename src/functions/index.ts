import {
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
  getMyActivitiesByDay,
} from "@functions/activities";

import {
  createCompany,
  deleteCompany,
  getCompanyById,
  getCompanies,
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

import { importData } from "@functions/jobs";

import { getEmployees } from "@functions/employees";

export default {
  createCompany,
  deleteCompany,
  getCompanyById,
  getCompanies,
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
  getMyActivitiesByDay,
  // ACTIVITY
  // createActivity,
  approvePendingApproval,
  sendWebSocketNotification,

  // Reminders
  createReminder,
  deleteReminder,
  dailyReminderCleanup,
  // WebSocket
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
};
