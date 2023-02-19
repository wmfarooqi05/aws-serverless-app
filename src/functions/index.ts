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
  updateCompanyAssignedUser,
  createConcernedPersons,
  updateConcernedPerson,
  deleteConcernedPerson,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,
} from "@functions/companies";

import { approvePendingApproval } from "@functions/pending_approvals";

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

export default {
  createCompany,
  deleteCompany,
  getCompanyById,
  getCompanies,
  updateCompany,
  updateCompanyAssignedUser,
  createConcernedPersons,
  updateConcernedPerson,
  deleteConcernedPerson,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,
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

  // Reminders
  createReminder,
  deleteReminder,
  dailyReminderCleanup,
  // WebSocket
  webSocketHandler,
  broadcastMessage,
  getAllWebSocketConnections,
};
