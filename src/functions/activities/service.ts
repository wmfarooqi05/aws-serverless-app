import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateCreateActivity,
  validateGetActivities,
  validateGetActivitiesByCompany,
  validateGetEmployeeStaleActivities,
  validateGetMyStaleActivities,
  validateUpdateActivity,
  validateUpdateStatus,
} from "./schema";

import EmployeeModel from "src/models/Employees";
import CompanyModel from "src/models/Company";
import ActivityModel, {
  IActivityModel,
  IActivityPaginated,
} from "src/models/Activity";
import {
  ACTIVITY_PRIORITY,
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_SHORT,
  ACTIVITY_TYPE,
  IActivity,
  IACTIVITY_DETAILS,
  IReminderInterface,
} from "src/models/interfaces/Activity";
import { CustomError } from "src/helpers/custom-error";
import { ACTIVITIES_TABLE, ModuleTitles } from "src/models/commons";
import { unionAllResults } from "./queries";

import { injectable, inject } from "tsyringe";
import { GoogleCalendarService } from "@functions/google/calendar/service";
import { GoogleGmailService } from "@functions/google/gmail/service";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { formatGoogleErrorBody } from "@libs/api-gateway";
import { GaxiosResponse } from "gaxios";
import { addJsonbObjectHelper } from "@common/json_helpers";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import {
  addFiltersToQueryBuilder,
  addStaleActivityFilters,
  // addStaleActivityFilters,
  createDetailsPayload,
  createStatusHistory,
  sortedTags,
} from "./helpers";
import { ReminderService } from "@functions/reminders/service";
import { IReminder, ReminderTimeType } from "@models/Reminders";
import {
  checkManagerPermissions,
  getEmployeeFilter,
} from "@functions/employees/helpers";
import { getPaginateClauseObject } from "@common/query";

export interface IActivityService {
  createActivity(employeeId: string, body: any): Promise<IActivityPaginated>;
  addConcernedPerson(): Promise<IActivityModel>;
  addRemarksToActivity(
    employeeId: string,
    activityId: string,
    body: any
  ): Promise<ActivityModel>;
  updateRemarksInActivity(
    employeeId: string,
    activityId: string,
    remarksId: string,
    body: any
  ): Promise<IActivityModel>;
  deleteActivity(id: string): Promise<any>;
}

@injectable()
export class ActivityService implements IActivityService {
  private TableName: string = ACTIVITIES_TABLE;

  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService,
    // @TODO replace this with generic service (in case of adding multiple calendar service)
    @inject(GoogleCalendarService)
    private readonly calendarService: GoogleCalendarService,
    // @TODO replace this with generic service (in case of adding multiple email service)
    @inject(GoogleGmailService)
    private readonly emailService: GoogleGmailService,
    @inject(ReminderService)
    private readonly reminderService: ReminderService
  ) {}

  async getMyActivities(
    createdBy: string, // jwt payload
    body: any
  ): Promise<IActivityPaginated> {
    /**
     * My Tasks
     * My Open Tasks
     * My Closed Tasks
     * My Today's Tasks
     * My Tomorrow's Tasks
     * My Overdue Tasks
     * My Today + Overdue Tasks
     */
    await validateGetActivitiesByCompany(createdBy, body);

    return this.docClient
      .get(this.TableName)
      .modify(function (queryBuilder) {
        queryBuilder = addFiltersToQueryBuilder(queryBuilder, body);
        if (body.createdByIds)
          queryBuilder.whereIn("createdBy", body?.createdByIds?.split(","));
      })
      .paginate(getPaginateClauseObject(body));
  }

  // Limit this only for admin
  async getAllActivities(user: IEmployeeJwt, body: any) {
    await validateGetActivities(body);
    // if manager, get employees else return everything in case of above employee
    return this.docClient
      .get(this.TableName)
      .modify(function (queryBuilder) {
        queryBuilder = addFiltersToQueryBuilder(queryBuilder, body);
        // @TODO complete this incomplete line
        // queryBuilder.whereIn(createdBy);
      })
      .paginate(getPaginateClauseObject(body));
  }

  // @TODO fix this
  async getAllActivitiesByCompany(
    employee: any, // jwt payload
    companyId: string,
    body: any
  ) {
    await validateGetActivitiesByCompany(companyId, body);

    return this.docClient
      .get(this.TableName)
      .modify(function (queryBuilder) {
        queryBuilder = addFiltersToQueryBuilder(queryBuilder, body);
      })
      .paginate(getPaginateClauseObject(body))
      .where({ companyId });
  }

  async getTopActivities(employeeId: string, companyId: string) {
    const company = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company doesn't exists", 404);
    }
    const result: any = await this.docClient.knexClient.raw(
      unionAllResults(companyId, 10)
    );
    const camelCaseArray =
      result?.rows?.map((item) => {
        const tmp = {};
        Object.keys(item).forEach((key: string) => {
          const camelCase = key
            .toLowerCase()
            .replace(/(?:_)([a-z])/g, (_, group1) => group1.toUpperCase());
          tmp[camelCase] = item[key];
        });
        return tmp;
      }) || [];

    const result2 = {};
    Object.keys(ACTIVITY_STATUS_SHORT).forEach((key: string) => {
      const temp = camelCaseArray.filter((x) => x.statusShort === key);
      result2[key] = {};
      Object.keys(ACTIVITY_TYPE).forEach((key2) => {
        result2[key][key2] = temp?.filter((x) => x.activityType === key2);
      });
    });

    return result2;
  }

  async getActivityById(
    employeeId: string,
    activityId: string
  ): Promise<IActivityModel> {
    const activities: IActivity[] = await this.docClient
      .get(ACTIVITIES_TABLE)
      .where({ id: activityId });

    if (activities.length === 0) {
      throw new CustomError("Activity not found", 404);
    }

    // @TODO add authorization check

    return activities[0];
  }

  async createActivity(createdBy: IEmployeeJwt, body: any): Promise<any> {
    const payload = JSON.parse(body);
    await validateCreateActivity(createdBy.sub, payload);
    const employee: IEmployee = await EmployeeModel.query().findById(
      createdBy.sub
    );
    if (!employee) {
      throw new CustomError("Employee not found", 400);
    }

    const company = await CompanyModel.query().findById(payload.companyId);
    if (!company) {
      throw new CustomError("Company not found", 400);
    }
    const details = createDetailsPayload(
      employee,
      payload.activityType,
      payload.details
    );

    const status = payload.status ?? ACTIVITY_STATUS.NOT_STARTED;
    // @TODO add validations for detail object
    const activityObj: IActivity = {
      summary: payload.summary,
      details,
      companyId: payload.companyId,
      createdBy: createdBy.sub,
      concernedPersonDetails: [payload.concernedPersonDetails],
      activityType: payload.activityType,
      priority: payload.priority || ACTIVITY_PRIORITY.NORMAL,
      // @TODO remove this
      statusHistory: [createStatusHistory(status, createdBy.sub)],
      tags: sortedTags(payload.tags),
      reminders: payload.reminders || {
        overrides: [{ method: "popup", minutes: 15 }],
      },
      scheduled: details.isScheduled ? true : false,
      dueDate: payload.dueDate,
    };
    let activity: IActivity = null;
    try {
      activity = await ActivityModel.query().insert(activityObj);
      const updatedDetailObject: IACTIVITY_DETAILS = await this.runSideJobs(
        activity
      );
      return await ActivityModel.query().patchAndFetchById(activity.id, {
        details: updatedDetailObject,
      });
    } catch (e) {
      if (activity) {
        return activity;
      }
      if (e.name === "ForeignKeyViolationError") {
        // @TODO: check maybe employee doesn't exists
        throw new CustomError("Company doesn't exists", 404);
      } else {
        throw new CustomError(e.message, 502);
      }
    }
  }

  async scheduleEb(
    reminder: IReminderInterface,
    dueDate: string,
    originalRowId: any,
    reminderTimeType: ReminderTimeType
  ) {
    // if (reminder.useDefault) {
    //   // Get From user's settings
    // } else
    const reminders = [];
    if (reminder.overrides) {
      for (let i = 0; i < reminder.overrides.length; i++) {
        const { minutes, method } = reminder.overrides[0];

        const reminderTime = moment(dueDate)
          .utc()
          .subtract(minutes, "minutes")
          .format("YYYY-MM-DDTHH:mm:ss");

        const reminderObject = await this.reminderService.scheduleReminders(
          `at(${reminderTime})`,
          originalRowId,
          ActivityModel.tableName,
          reminderTimeType,
          method,
        );
        reminders.push(reminderObject);
      }
    }
  }

  /**
   * We do not need this endpoint
   * We will handle its params in their own endpoints
   */
  async updateActivity(employee: IEmployeeJwt, activityId: string, body: any) {
    const payload = JSON.parse(body);
    await validateUpdateActivity(employee.sub, activityId, payload);

    if (payload.dueDate && moment.utc(payload.dueDate).isBefore(moment.utc())) {
      throw new CustomError("Due date has already passed", 400);
    }

    // @TODO add validations for detail object
    const updatedActivity: IActivity =
      await ActivityModel.query().patchAndFetchById(activityId, payload);
    if (!updatedActivity || Object.keys(updatedActivity).length === 0) {
      throw new CustomError("Object not found", 404);
    }

    return updatedActivity;
  }

  async updateStatusOfActivity(
    employee: IEmployeeJwt,
    activityId: string,
    status: string
  ) {
    await validateUpdateStatus(employee.sub, activityId, status);
    const activity = await ActivityModel.query().findById(activityId);

    if (!activity) throw new CustomError("Activity not found", 404);

    if (activity?.status === status) {
      throw new CustomError("Activity has already same status", 400);
    }

    const addQuery = addJsonbObjectHelper(
      "statusHistory",
      this.docClient.knexClient,
      createStatusHistory(status, employee.sub)
    );
    return ActivityModel.query().patchAndFetchById(activityId, {
      ...addQuery,
      status,
    });
    // }
  }

  async deleteActivity(id: string): Promise<any> {
    // @ADD some query to find index of id directly
    const deleted = await ActivityModel.query().deleteById(id);

    if (!deleted) {
      throw new CustomError("Activity not found", 404);
    }
  }

  async getMyStaleActivities(employee: IEmployeeJwt, body: any) {
    await validateGetMyStaleActivities(body);
    return this.docClient.get(this.TableName).modify(function (qb) {
      qb = addStaleActivityFilters(qb, body);
      qb.where({ createdBy: employee.sub });
    });
  }

  async getEmployeeStaleActivityByStatus(manager: IEmployeeJwt, body: any) {
    await validateGetEmployeeStaleActivities(body);
    const { createdByIds } = body;
    const _a = createdByIds?.split(",");
    const employees: IEmployee[] = await EmployeeModel.query().findByIds(_a);

    // @TODO add validation for manager permissions
    employees.map((employee) => checkManagerPermissions(manager, employee));

    return this.docClient.get(this.TableName).modify(function (qb) {
      qb = addStaleActivityFilters(qb, body);
      if (createdByIds) qb.whereIn("createdBy", createdByIds?.split(","));
    });
  }
  async runSideJobs(activity: IActivity): Promise<IACTIVITY_DETAILS> {
    if (
      activity.activityType === ACTIVITY_TYPE.EMAIL ||
      activity.activityType === ACTIVITY_TYPE.MEETING
    ) {
      try {
        const resp = await this.runSideGoogleJob(activity);
        activity.details.jobData = {
          status: resp?.status || 424,
        };
      } catch (e) {
        activity.details.jobData = {
          status: 500,
        };
        if (e.config && e.headers) {
          activity.details.jobData.errorStack = formatGoogleErrorBody(e);
        } else {
          activity.details.jobData.errorStack = {
            message: e.message,
            stack: e.stack,
          };
        }
      }
    } else if (
      (activity.activityType === ACTIVITY_TYPE.TASK ||
        activity.activityType === ACTIVITY_TYPE.CALL) &&
      activity.details?.isScheduled
    ) {
      try {
        // AWS EB Scheduler Case
        const response = await this.scheduleEb(
          activity.reminders,
          activity.dueDate,
          activity.id,
          ReminderTimeType.CUSTOM
        );
        activity[0].details.jobData = response;
      } catch (e) {
        activity[0].details.jobData = {
          stack: e.stack,
          message: e.message,
          status: 500,
        };
      }
    }

    return activity.details;
  }

  async runSideGoogleJob(activity: IActivity): Promise<GaxiosResponse> {
    if (activity.activityType === ACTIVITY_TYPE.EMAIL) {
      return this.emailService.createAndSendEmailFromActivityPayload(activity);
    } else if (activity.activityType === ACTIVITY_TYPE.MEETING) {
      return this.calendarService.createGoogleMeetingFromActivity(activity);
    }
  }
}
