import { GoogleCalendarService } from "@functions/google/calendar/service";
import { NotificationService } from "@functions/notifications/service";
import { CustomError } from "@helpers/custom-error";
import { formatGoogleErrorBody } from "@libs/api-gateway";
import ActivityModel from "@models/Activity";
import { INotification } from "@models/Notification";
import { IJobData } from "@models/dynamoose/Jobs";
import { IActivity } from "@models/interfaces/Activity";
import { container } from "tsyringe";

export const scheduleGoogleMeeting = async (jobItem: IJobData) => {
  const activityId: string = jobItem?.details?.activityId;
  if (!activityId) {
    throw new CustomError("Activity id not found", 400);
  }

  const activity: IActivity = ActivityModel.query().findById(activityId);
  if (!activity) {
    throw new CustomError("Activity does not exists", 400);
  }

  let notificationPayload: INotification = {
    notificationType: "INFO_NOTIFICATION",
    receiverEmployee: activity.createdBy,
  };

  let jobData: any = {};
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
    jobData = {
      status: response?.status || 424,
      data: response?.data || {},
    };
  } catch (e) {
    if (e.config && e.headers) {
      jobData.errorStack = formatGoogleErrorBody(e);
    } else {
      jobData.errorStack = {
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
      extraData: { tableRowId: activityId, errorStack: jobData?.errorStack },
    };
  }
  await ActivityModel.query()
    .findById(activityId)
    .patch({
      details: {
        ...activity.details,
        jobData,
      },
    });

  await container
    .resolve(NotificationService)
    .createAndEnqueueNotifications([notificationPayload]);
};
