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
import ReminderModel, {
  IReminder,
  ReminderStatus,
  ReminderTimeType,
} from "src/models/Reminders";
import moment from "moment-timezone";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEBSchedulerEventInput } from "@models/interfaces/Reminders";
import { CustomError } from "@helpers/custom-error";
import { WebSocketService } from "@functions/websocket/service";
import { IEmployeeJwt } from "@models/interfaces/Employees";

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
    private readonly websocketService: WebSocketService
  ) {
    this.initializeScheduler();
  }

  initializeScheduler() {
    this.schedulerClient = new SchedulerClient({
      region: process.env.AWS_SCHEDULER_REGION,
    });
  }

  /** DEV Endpoints */
  async scheduleReminder(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    const { schedulerExpression, tableRowId, tableName, type } = payload;
    return this.scheduleReminders(
      schedulerExpression,
      employee.sub,
      tableRowId,
      tableName,
      ReminderTimeType.CUSTOM,
      type || "popup"
    );
  }
  async updateScheduleReminder(body) {
    const payload = JSON.parse(body);
    const { Name, GroupName, dueDate } = payload;
    return this.updateScheduledReminder(Name, GroupName, dueDate);
  }
  async deleteScheduleReminder(body) {
    const payload = JSON.parse(body);
    const { Name, GroupName } = payload;
    return this.deleteScheduledReminder(Name, GroupName);
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
        await this.sendFromSchedulerClient(
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
    console.log("tableName", tableName, ", tableRowId", tableRowId);
    if (tableName !== ReminderModel.tableName) {
      throw new CustomError("No implementation found", 500);
    }
    const reminder: IReminder = await ReminderModel.query().findById(
      tableRowId
    );
    console.log("reminder", reminder);
    const { method } = reminder.data;
    console.log("method", method);

    // if (method === "popup") {
    await this.websocketService.sendPayloadByEmployeeId(
      reminder.createdBy,
      reminder
    );
    // } else {
    //   console.log("No implementation other than popup");
    // }
  }

  async scheduleReminders(
    schedulerExpression: string,
    createdBy: string,
    tableRowId: string,
    tableName: string,
    type: ReminderTimeType,
    method: "popup" | "email"
  ) {
    const reminderResp = [];
    try {
      const reminderObj: IReminder = await ReminderModel.query().insert({
        tableRowId,
        tableName,
        reminderTime: schedulerExpression,
        type,
        createdBy,
        data: { method, type },
      });
      const awsEBSItemId = randomUUID();
      const params: IEBSchedulerEventInput = {
        schedulerExpression,
        name: `Reminder-${awsEBSItemId}`,
        idClientToken: awsEBSItemId,
        eventType: "REMINDER",
        data: {
          tableName: ReminderModel.tableName,
          tableRowId: reminderObj.id,
          type,
          method,
        },
      };

      const output = await this.createEBSchedulerHelper(params);
      reminderResp.push(output);

      await ReminderModel.query().patchAndFetchById(reminderObj.id, {
        executionArn: output.ScheduleArn,
        reminderAwsId: awsEBSItemId,
        reminderTime: schedulerExpression,
        type,
        data: { ...data, jobData: output },
        statusCode: output.$metadata.httpStatusCode.toString(),
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
      const reminderDeleteArr = reminders.map((x: IReminder) =>
        this.deleteScheduledReminder(x.reminderAwsId)
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
            patchObject.status = ReminderStatus.ERROR_CLEANUP;
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
  updateScheduledReminder(
    Name: string,
    ScheduleExpression: string,
    GroupName: string = process.env.REMINDER_SCHEDULER_GROUP_NAME
  ) {
    const input: UpdateScheduleCommandInput = {
      Name,
      ScheduleExpression,
      GroupName,
      Target: undefined,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
    };

    const command = new UpdateScheduleCommand(input);
    return this.sendFromSchedulerClient(command);
  }
  async deleteScheduledReminder(
    Name: string,
    GroupName: string = process.env.REMINDER_SCHEDULER_GROUP_NAME!
  ) {
    const input: DeleteScheduleCommandInput = {
      Name,
      GroupName,
    };

    const command = new DeleteScheduleCommand(input);

    return this.sendFromSchedulerClient(command);
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
    return this.sendFromSchedulerClient(command);
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
    return this.sendFromSchedulerClient(command);
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

  private async sendFromSchedulerClient(command): Promise<any> {
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
    const output = await this.sendFromSchedulerClient(command);

    return output;
  }

  private getRegionFromArn(arn: string) {
    try {
      return arn.split(":")[3];
    } catch (e) {
      console.log("Could not get region from ARN. ", e);
    }
  }
}
