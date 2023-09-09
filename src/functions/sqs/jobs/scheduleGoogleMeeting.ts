import { GoogleCalendarService } from "@functions/activities/google/calendar/service";
import { NotificationService } from "@functions/notifications/service";
import { CustomError } from "@helpers/custom-error";
import { formatGoogleErrorBody } from "@libs/api-gateway";
import ActivityModel from "@models/Activity";
import JobsModel, { IJob, JOB_STATUS } from "@models/Jobs";
import { INotification } from "@models/Notification";
import { IActivity } from "@models/interfaces/Activity";
import { get } from "lodash";
import { container } from "@common/container";
import JobExecutionHistoryModel, {
  IJobExecutionData,
  IJobExecutionHistory,
} from "@models/JobExecutionHistory";

export const scheduleGoogleMeeting = async (
  jobItem: IJob
): Promise<IJobExecutionData> => {
  const activityId: string = jobItem?.details?.activityId;
  if (!activityId) {
    throw new CustomError("Activity id not found", 400);
  }

  const activity: IActivity = await ActivityModel.query().findById(activityId);
  if (!activity) {
    throw new CustomError("Activity does not exists", 400);
  }

  let notificationPayload: INotification = {
    notificationType: "INFO_NOTIFICATION",
    receiverEmployee: activity.createdBy,
  };

  const jobData: IJobExecutionData = {
    jobStatus: "IN_PROGRESS",
    jobResult: null,
  };
  try {
    const response = await container
      .resolve(GoogleCalendarService)
      .createGoogleMeetingFromActivity(activity);
    notificationPayload = {
      ...notificationPayload,
      title: "Google Meet Event created",
      subtitle: `Google meet event for your Activity has been created successfully`,
      extraData: { tableRowId: activityId },
    };
    jobData.jobStatus = "SUCCESSFUL" as JOB_STATUS;
    jobData.jobResult = response?.data || {};
  } catch (e) {
    jobData.jobStatus = "FAILED" as JOB_STATUS;

    if (e.config && e.headers) {
      jobData.jobResult = formatGoogleErrorBody(e);
    } else {
      jobData.jobResult = {
        message: e.message,
        stack: e.stack,
      };
    }

    // @TODO after getting lot of errorStack,
    // extract from errorStack some meaningful string, and add it into subtitle
    // and dont send errorStack in notif
    notificationPayload = {
      ...notificationPayload,
      title: "Google Meet Event creation failed",
      subtitle: `Google meet event for your activity failed to create`,
      extraData: { tableRowId: activityId, errorStack: jobData?.jobResult },
    };
  }

  // @TODO add another try catch block here, to make sure the next code gets executed
  await ActivityModel.query()
    .findById(activityId)
    .patch({
      details: {
        ...activity.details,
        jobData,
      },
    });

  const notifications = await container
    .resolve(NotificationService)
    .createAndEnqueueNotifications([notificationPayload]);
  console.log("notifications created and enqueued", notifications);
  return jobData;
};

export const deleteGoogleMeeting = async (
  jobItem: IJob
): Promise<IJobExecutionData> => {
  // probably this code is not tested after moving to a job
  // In delete we have no idea if activity is already deleted
  // or user is just deleting the meeting
  // In most use cases, activity is already deleted and this
  // is just a cleanup job
  // we need whole payload in jobItem.details
  const activityPayload: IActivity = jobItem?.details;
  console.log("activityPayload", activityPayload);
  const { createdBy, details } = activityPayload;
  const meetingId = get(details, "jobData[0]?.data?.id");
  if (!meetingId) {
    throw new CustomError("Meeting id not found", 400);
  }

  let notificationPayload: INotification = {
    notificationType: "INFO_NOTIFICATION",
    receiverEmployee: createdBy,
  };

  const jobData: IJobExecutionData = {
    jobStatus: "IN_PROGRESS",
    jobResult: null,
  };
  try {
    const response = await container
      .resolve(GoogleCalendarService)
      .deleteGoogleMeeting(meetingId, createdBy);
    notificationPayload = {
      ...notificationPayload,
      title: "Google Meet Event deleted",
      subtitle: `Google meet event for your Activity has been deleted successfully`,
      extraData: { tableRowId: activityPayload.id },
    };
    jobData.jobStatus = "SUCCESSFUL";
    jobData.jobResult = {
      message: "Google meet event deleted successfully",
      data: response.data,
    };
  } catch (e) {
    if (e.config && e.headers) {
      jobData.jobResult = formatGoogleErrorBody(e);
    } else {
      jobData.jobResult = {
        message: e.message,
        stack: e.stack,
      };
    }

    // @TODO after getting lot of errorStack,
    // extract from errorStack some meaningful string, and add it into subtitle
    // and dont send errorStack in notif
    notificationPayload = {
      ...notificationPayload,
      title: "Google Meet Event deletion failed",
      subtitle: `Google meet event for your activity failed to delete`,
      extraData: {
        tableRowId: activityPayload.id,
        errorStack: jobData?.jobResult,
      },
    };
  }
  try {
    await ActivityModel.query()
      .findById(activityPayload.id)
      .patch({
        details: {
          ...activityPayload.details,
          jobData,
        },
      });
  } catch (e) {}

  await container
    .resolve(NotificationService)
    .createAndEnqueueNotifications([notificationPayload]);

  return jobData;
};
