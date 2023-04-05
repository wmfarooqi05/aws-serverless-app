// import { ACTIVITY_TYPE, IActivity } from "@models/interfaces/Activity";

// export const activitySideJobs = async (
//   createdBy: string,
//   activity: IActivity
// ) => {
//   if (
//     activity.activityType === ACTIVITY_TYPE.EMAIL ||
//     activity.activityType === ACTIVITY_TYPE.MEETING
//   ) {
//     try {
//       const resp = await this.runSideGoogleJob(activity);
//       activity[0].details.jobData = {
//         status: resp?.status || 424,
//       };
//     } catch (e) {
//       activity[0].details.jobData = {
//         status: 500,
//       };
//       if (e.config && e.headers) {
//         activity[0].details.jobData.errorStack = formatGoogleErrorBody(e);
//       } else {
//         activity[0].details.jobData.errorStack = {
//           message: e.message,
//           stack: e.stack,
//         };
//       }
//     }
//   } else if (
//     (activity[0].activityType === ACTIVITY_TYPE.TASK ||
//       activity[0].activityType === ACTIVITY_TYPE.CALL) &&
//     activity[0].details?.isScheduled
//   ) {
//     try {
//       // AWS EB Scheduler Case
//       const response = await this.scheduleEb(
//         createdBy,
//         activity.reminders,
//         activity.dueDate,
//         activity[0].id,
//         ReminderTimeType.CUSTOM
//       );
//       activity[0].details.jobData = response;
//     } catch (e) {
//       activity[0].details.jobData = {
//         stack: e.stack,
//         message: e.message,
//         status: 500,
//       };
//     }
//   }
// };
