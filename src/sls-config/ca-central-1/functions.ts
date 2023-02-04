import {
  getActivities,
  getActivityById,
  createActivity,
  deleteActivity,
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
  getMyActivities,
  getTopActivities,
  getAllActivitiesByCompany,
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
} from "@functions/companies";

// import {
//   createActivity,
// } from "./activities";

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
  // Activity
  getActivities,
  getActivityById,
  createActivity,
  deleteActivity,
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
  getMyActivities,
  getTopActivities,
  getAllActivitiesByCompany
  // ACTIVITY
  // createActivity,
};
