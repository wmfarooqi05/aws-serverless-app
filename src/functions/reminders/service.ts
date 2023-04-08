import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import {
  SchedulerClient,
  CreateScheduleCommand,
  CreateScheduleCommandInput,
  DeleteScheduleCommand,
  DeleteScheduleCommandInput,
  Target,
  CreateScheduleCommandOutput,
  ListScheduleGroupsCommand,
  ListScheduleGroupsCommandInput,
  UpdateScheduleCommandInput,
  UpdateScheduleCommand,
  ListSchedulesCommandInput,
  ListSchedulesCommand,
  ListSchedulesCommandOutput,
} from "@aws-sdk/client-scheduler";

import { randomUUID } from "crypto";
import ReminderModel, { IReminder, ReminderStatus } from "src/models/Reminders";
import moment from "moment-timezone";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEBSchedulerEventInput } from "@models/interfaces/Reminders";
import { CustomError } from "@helpers/custom-error";
import { WebSocketService } from "@functions/websocket/service";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { NotificationService } from "@functions/notifications/service";
import { INotification } from "@models/Notification";
import { IReminderInterface } from "@models/interfaces/Activity";

export interface IReminderService {}

export interface ReminderEBSchedulerPayload {
  reminderTime: string;
  eventType: string; //ReminderType;
  name: string;
  data?: any;
}

@injectable()
export class ReminderService implements IReminderService {
  schedulerClient: SchedulerClient = null;
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(WebSocketService)
    private readonly websocketService: WebSocketService,
    @inject(NotificationService)
    private readonly notificationService: NotificationService
  ) {
    this.initializeScheduler();
  }

  initializeScheduler() {
    this.schedulerClient = new SchedulerClient({
      region: process.env.AWS_SCHEDULER_REGION,
    });
  }

  /** DEV Endpoints */
  async createReminder(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    const { dueDate, minutes, tableRowId, tableName, type } = payload;
    return this.scheduleReminders(
      dueDate,
      minutes,
      employee.sub,
      tableRowId,
      tableName,
      type || "popup"
    );
  }
  /**
   * Endpoint
   * @param body
   * @returns
   */
  async updateScheduleReminder(body) {
    const payload = JSON.parse(body);
    const { Name, GroupName, ScheduleExpression, Arn } = payload;
    return this.updateEBScheduledItem(Name, GroupName, ScheduleExpression);
  }
  /**
   * Endpoint
   * @param body
   * @returns
   */
  async deleteScheduleReminder(body) {
    const payload = JSON.parse(body);
    const { Name, GroupName } = payload;
    return this.deleteEBScheduledItem(Name, GroupName);
  }
  async getScheduleRemindersFromGroup(
    body
  ): Promise<ListSchedulesCommandOutput> {
    const { GroupName, NextToken, MaxResults } = body;
    return this.getAllSchedulers(
      GroupName || process.env.REMINDER_SCHEDULER_GROUP_NAME,
      NextToken,
      MaxResults
    );
  }
  async getScheduleReminderGroups(body) {
    const { NamePrefix, NextToken, MaxResults } = body;
    return this.getScheduleGroups(NamePrefix, NextToken, MaxResults);
  }

  async deleteAllReminders(body) {
    let NextToken = null;
    let GroupName = body.GroupName || process.env.REMINDER_SCHEDULER_GROUP_NAME;
    do {
      const resp = await this.getScheduleRemindersFromGroup({
        GroupName,
        NextToken,
        MaxResults: 10,
      });
      NextToken = resp.NextToken;
      for (let i = 0; i < resp.Schedules.length; i++) {
        await this.sendEBCommand(
          new DeleteScheduleCommand({
            GroupName,
            Name: resp.Schedules[i].Name,
          })
        );
      }
    } while (NextToken);
  }

  // for internal service
  async handleEBSchedulerInvoke(event: IEBSchedulerEventInput) {
    console.log("scheduler event", event);
    const { tableName, tableRowId } = event.data;
    if (tableName !== ReminderModel.tableName) {
      throw new CustomError("No implementation found", 500);
    }
    const reminder: IReminder = await this.docClient
      .getKnexClient()(tableName)
      .where({ id: tableRowId })
      .first();

    if (!reminder) {
      throw new CustomError(
        `${tableName.toUpperCase()} item with Id: ${tableRowId} doesn't exists`,
        404
      );
    }
    console.log("reminder", reminder);
    // const { method } = reminder.data;

    // if (method === "popup") {
    const notification: INotification = {
      title: `[${tableName.toUpperCase()}]: Notification`,
      subtitle: `Scheduled at ${reminder.reminderTime}`,
      senderEmployee: reminder.createdBy,
      receiverEmployee: reminder.createdBy,
      extraData: {
        tableRowId: reminder.tableRowId,
        tableName: reminder.tableName, // PENDING APPROVAL
        reminderId: reminder.id,
        // infoType: INFO_TYPE;
        infoType: null, // @TODO it is same as title for now
        senderEmployeeName: reminder.createdBy,
        avatar: null,
        reminderTime: reminder.reminderTime,
      },
      notificationType: "REMINDER_ALERT_NOTIFICATION",
      readStatus: false,
      isScheduled: false,
    };
    await this.notificationService.createNotification(notification);
    await this.websocketService.sendPayloadByEmployeeId(
      reminder.createdBy,
      reminder
    );
    // } else {
    //   console.log("No implementation other than popup");
    // }
  }

  async scheduleReminders(
    dueDate: string,
    minutes: number,
    createdBy: string,
    tableRowId: string,
    tableName: string,
    method: "popup" | "email"
  ) {
    const reminderTime = moment(dueDate)
      .utc()
      .subtract(minutes, "minutes")
      .format("YYYY-MM-DDTHH:mm:ss");
    const schedulerExpression = `at(${reminderTime})`;
    const reminderResp = [];
    let data: any = { method, minutes };
    try {
      console.log("before reminder create");
      const reminderObj: IReminder = await ReminderModel.query().insert({
        tableRowId,
        tableName,
        reminderTime,
        schedulerExpression,
        method,
        createdBy,
        minutesDiff: minutes,
        data,
      });
      console.log("after reminder create", reminderObj);
      const awsEBSItemId = randomUUID();
      const params: IEBSchedulerEventInput = {
        schedulerExpression,
        name: `Reminder-${awsEBSItemId}`,
        idClientToken: awsEBSItemId,
        eventType: "REMINDER",
        data: {
          tableName: ReminderModel.tableName,
          tableRowId: reminderObj.id,
          method,
          minutes,
        },
      };

      console.log("before output create");
      const output = await this.createEBSchedulerHelper(params);
      console.log("after output create", output);
      data = { method, minutes, jobData: output };
      reminderResp.push(data);

      await ReminderModel.query().patchAndFetchById(reminderObj.id, {
        executionArn: output.ScheduleArn,
        reminderName: params.name,
        reminderGroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME,
        reminderTime: schedulerExpression,
        data,
        statusCode: output.$metadata.httpStatusCode,
        status: ReminderStatus.SCHEDULED,
      });
    } catch (e) {
      reminderResp.push(e);
    } finally {
      return reminderResp;
    }
  }
  async dailyReminderCleanup() {
    const errorLogsPath = `logs/reminder-cleanup/${randomUUID()}.json`;
    const errorDoc: object[] = [];
    let errorIndex = 0;
    try {
      const reminders: IReminder[] = await ReminderModel.query()
        .whereIn("status", [
          ReminderStatus.SENT,
          ReminderStatus.CANCELLED,
          ReminderStatus.ERROR_CLEANUP,
        ])
        .andWhere("reminderTime", "<", moment().utc().format());
      const reminderDeleteArr = reminders.map(
        async (x: IReminder) =>
          await this.deleteEBScheduledItem(x.reminderName, x.reminderGroupName)
      );
      const settledPromises = await Promise.allSettled(reminderDeleteArr);
      errorDoc[errorIndex++] = settledPromises.map((x, i) => {
        return { ...x, rowId: reminders[i].id };
      });

      const dbUpdateResponse = settledPromises.map(
        async (x: PromiseSettledResult<any>, index: number) => {
          const patchObject: Partial<IReminder> = {
            status: ReminderStatus.DONE,
          };
          if (x.status === "rejected") {
            patchObject.data = reminders[index].data;
            patchObject.data["error"] = x.reason;
          }
          return ReminderModel.query()
            .patch(patchObject)
            .where({ id: reminders[index].id });
        }
      );

      const dbSettledPromises = await Promise.allSettled(dbUpdateResponse);
      if (dbSettledPromises.filter((x) => x.status === "rejected").length > 0) {
        errorDoc[errorIndex++] = dbSettledPromises;
      }
    } catch (error) {
      errorDoc[errorIndex++] = error;
    } finally {
      if (errorIndex > 0) {
        const resp = await this.uploadToS3(errorLogsPath, errorDoc);
        console.log("s3resp", resp);
        return resp;
      }
    }
  }
  updateEBScheduledItem(
    Name: string,
    GroupName: string = process.env.REMINDER_SCHEDULER_GROUP_NAME,
    ScheduleExpression: string
  ) {
    const Target: Target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN!,
      Arn: process.env.REMINDER_TARGET_LAMBDA!,
    };

    const input: UpdateScheduleCommandInput = {
      Name,
      ScheduleExpression,
      GroupName,
      Target,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
    };

    const command = new UpdateScheduleCommand(input);
    return this.sendEBCommand(command);
  }
  async deleteEBScheduledItem(
    Name: string,
    GroupName: string = process.env.REMINDER_SCHEDULER_GROUP_NAME!
  ) {
    const input: DeleteScheduleCommandInput = {
      Name,
      GroupName,
    };

    const command = new DeleteScheduleCommand(input);

    return this.sendEBCommand(command);
  }

  async getScheduleGroups(
    NamePrefix = process.env.REMINDER_SCHEDULER_GROUP_NAME,
    NextToken: string = null,
    MaxResults: number = 20
  ) {
    const input: ListScheduleGroupsCommandInput = {
      NamePrefix,
      MaxResults,
      NextToken,
    };
    const command = new ListScheduleGroupsCommand(input);
    return this.sendEBCommand(command);
  }

  async getAllSchedulers(
    GroupName: string = process.env.REMINDER_SCHEDULER_GROUP_NAME,
    NextToken: string = null,
    MaxResults: number = 20
  ): Promise<ListSchedulesCommandOutput> {
    const input: ListSchedulesCommandInput = {
      GroupName,
      // NamePrefix: "STRING_VALUE",
      // State: "STRING_VALUE",
      NextToken,
      MaxResults,
    };
    const command = new ListSchedulesCommand(input);
    return this.sendEBCommand(command);
  }

  async findAndUpdateReminders(tableName: string, tableRowId: string) {
    const reminders: IReminder[] = await ReminderModel.query().where({
      tableName,
      tableRowId,
    });

    const deletePromises = reminders.map((reminder: IReminder) => {
      return this.deleteEBScheduledItem(
        reminder.reminderName,
        reminder.reminderGroupName
      );
    });

    return Promise.all(deletePromises);
  }

  async reminderUpdateHelper(
    tableName: string,
    oldRowData: any,
    updatePayload: any,
    createdBy: IEmployeeJwt
  ) {
    const isScheduled =
      updatePayload?.details?.isScheduled ?? oldRowData.details.isScheduled;
    const isScheduledUpdated = isScheduled !== oldRowData.details?.isScheduled;

    const newReminderOverrides: IReminderInterface["overrides"] =
      updatePayload.reminders?.overrides;
    const isDueDateUpdated =
      moment(oldRowData.dueDate).format() !== updatePayload.dueDate;
    const currentDueDate = isDueDateUpdated
      ? updatePayload.dueDate
      : oldRowData.dueDate;

    const oldIReminders: IReminderInterface["overrides"] =
      oldRowData.reminders.overrides;
    const remindersToBeRemoved: IReminder[] = [];
    const remindersToBeAdded: IReminderInterface["overrides"] = [];
    const remindersToBeUpdated: {
      id: string;
      dueDate: string;
      minutes: number;
      method: "popup" | "email";
      reminderName: string;
      reminderGroupName: string;
      executionArn: string;
    }[] = [];
    const reminders: IReminder[] = await ReminderModel.query().where({
      tableName,
      tableRowId: oldRowData.id,
    });

    let syncedAll = true;
    reminders.forEach((x) => {
      if (x.data.jobData?.["$metadata"]?.httpStatusCode !== 200) {
        syncedAll = false;
      }
    });

    if (isScheduledUpdated && !isScheduled) {
      // delete reminder
      await this.findAndDeleteReminders(tableName, oldRowData.id);
    } else if (newReminderOverrides || isDueDateUpdated || !syncedAll) {
      oldIReminders.forEach((oldIReminder) => {
        const reminderObj: IReminder = reminders.find(
          (x) => x.minutesDiff === oldIReminder.minutes
        );

        const existing =
          (newReminderOverrides
            ? newReminderOverrides?.find(
                (x) => x.minutes === oldIReminder.minutes
              )
            : oldIReminder) && reminderObj;

        const synced =
          reminderObj?.data?.jobData?.["$metadata"]?.httpStatusCode === 200;

        const shouldBeUpdated = existing?.method
          ? existing.method !== oldIReminder.method ||
            isDueDateUpdated ||
            !synced
          : false;

        if (existing) {
          if (shouldBeUpdated) {
            remindersToBeUpdated.push({
              id: reminderObj.id,
              dueDate: currentDueDate,
              minutes: reminderObj.minutesDiff,
              method: existing.method === "email" ? "email" : "popup",
              reminderGroupName: reminderObj.reminderGroupName,
              reminderName: reminderObj.reminderName,
              executionArn: reminderObj.executionArn,
            });
          }
        } else {
          if (reminderObj) {
            remindersToBeRemoved.push(reminderObj);
          } else {
            // this is the case where reminders payload was
            // added in activity, but due to some reasons it
            // couldn't added to reminder
            remindersToBeAdded.push({
              minutes: oldIReminder.minutes,
              method: oldIReminder.method,
            });
          }
        }
      });
      newReminderOverrides?.map((newReminder) => {
        const { method, minutes } = newReminder;
        const found = oldIReminders.find((x) => x.minutes === minutes);
        if (!found) {
          remindersToBeAdded.push({ minutes, method });
        }
      });

      const remindersToBeAddedPromises = remindersToBeAdded.map(
        async (x) =>
          await this.scheduleReminders(
            currentDueDate,
            x.minutes,
            createdBy.sub,
            oldRowData.id,
            tableName,
            x.method
          )
      );
      const resp = await Promise.all(remindersToBeAddedPromises);
      await this.deleteReminders(remindersToBeRemoved);
      await this.updateReminders(remindersToBeUpdated);
    }
  }

  getReminderUpdateItem(
    reminderObj: IReminder,
    oldReminder: {
      minutes: number;
    },
    dueDate: string,
    method: "popup" | "email"
  ) {
    return {
      id: reminderObj.id,
      dueDate,
      minutes: oldReminder.minutes,
      method,
      reminderGroupName: reminderObj.reminderGroupName,
      reminderName: reminderObj.reminderName,
    };
  }

  async findAndDeleteReminders(tableName: string, tableRowId: string) {
    const reminders: IReminder[] = await ReminderModel.query().where({
      tableName,
      tableRowId,
    });
    await this.deleteReminders(reminders);
  }

  async updateReminders(
    reminders: {
      id: string;
      dueDate: string;
      minutes: number;
      method: "popup" | "email";
      reminderName: string;
      reminderGroupName: string;
      executionArn: string;
    }[]
  ): Promise<any> {
    if (!(reminders?.length > 0)) return;
    const ebPromises: Promise<any>[] = [];
    let errorMessage = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        const dbQueries = reminders.map((reminder) => {
          const {
            id,
            dueDate,
            minutes,
            method,
            reminderGroupName,
            reminderName,
          } = reminder;

          const reminderTime = moment(dueDate)
            .utc()
            .subtract(minutes, "minutes")
            .format("YYYY-MM-DDTHH:mm:ss");
          const schedulerExpression = `at(${reminderTime})`;

          ebPromises.push(
            this.updateEBScheduledItem(
              reminderName,
              reminderGroupName,
              schedulerExpression
            )
          );
          return ReminderModel.query(trx).patchAndFetchById(id, {
            reminderTime,
            minutesDiff: minutes,
            method,
            schedulerExpression,
          });
        });
        await Promise.all(dbQueries);
        await Promise.all(ebPromises);
        await trx.commit();
      } catch (e) {
        await trx.rollback();
        errorMessage = e.message;
      }
    });

    if (errorMessage) throw new CustomError(errorMessage, 500);
    // As it is only update reminder query, we are not making sure if it was updated first in
    // db or not
  }

  async deleteReminders(reminders: IReminder[]) {
    if (!(reminders?.length > 0)) return;
    const deleteEBPromises = reminders.map(async (reminder: IReminder) => {
      return this.deleteEBScheduledItem(
        reminder.reminderName,
        reminder.reminderGroupName
      );
    });
    let errorMessage = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        await ReminderModel.query(trx)
          .whereIn(
            "id",
            reminders.map((x) => x.id)
          )
          .del();

        await Promise.all(deleteEBPromises);
        await trx.commit();
      } catch (e) {
        errorMessage = e.message;
        await trx.rollback();
      }
    });

    if (errorMessage) {
      throw new CustomError(errorMessage, 500);
    }
  }

  async SendReminderEmail() {}

  async SendReminderSMS() {}

  async SendReminderWebPushNotification() {}

  async enqueueJobsForReminders() {
    /**
     * We have to enqueue jobs
     * tasks, phone calls, email, meetings, cleanup
     *
     */
  }

  private async sendEBCommand(command): Promise<any> {
    try {
      return this.schedulerClient.send(command);
    } catch (error) {
      const { requestId, cfId, extendedRequestId, httpStatusCode } =
        error.$metadata;
      console.log({ requestId, cfId, extendedRequestId, httpStatusCode });
      return {
        status: "Error",
        details: {
          statusName: error.name,
          statusMessage: error.specialKeyInException,
          statusCode: httpStatusCode,
        },
      };
    }
  }

  private async createEBSchedulerHelper(
    params: IEBSchedulerEventInput
  ): Promise<CreateScheduleCommandOutput> {
    const target: Target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN!,
      Arn: process.env.REMINDER_TARGET_LAMBDA!,
      Input: JSON.stringify(params),
    };

    const input: CreateScheduleCommandInput = {
      Name: params.name,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      Target: target,
      ScheduleExpression: params.schedulerExpression,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
      ClientToken: params.idClientToken,
    };

    const command: CreateScheduleCommand = new CreateScheduleCommand(input);
    const output = await this.sendEBCommand(command);

    return output;
  }
}
