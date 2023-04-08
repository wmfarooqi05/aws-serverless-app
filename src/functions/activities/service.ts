import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateCreateActivity,
  validateGetActivities,
  validateGetActivitiesByCompany,
  validateGetEmployeeStaleActivities,
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
import { ACTIVITIES_TABLE } from "src/models/commons";
import { unionAllResults } from "./queries";

import { injectable, inject } from "tsyringe";
import { GoogleCalendarService } from "@functions/google/calendar/service";
import { GoogleGmailService } from "@functions/google/gmail/service";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { formatGoogleErrorBody } from "@libs/api-gateway";
import { GaxiosResponse } from "gaxios";
import {
  createUpdateQueries,
} from "@common/json_helpers";
import {
  addFiltersToQueryBuilder,
  addStaleActivityFilters,
  attachManagerRestrictions,
  // addStaleActivityFilters,
  createDetailsPayload,
  sortedTags,
} from "./helpers";
import { ReminderService } from "@functions/reminders/service";
import {
  checkManagerPermissions,
} from "@functions/employees/helpers";
import { getPaginateClauseObject } from "@common/query";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import UpdateHistoryModel from "@models/UpdateHistory";

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
      .getKnexClient()(this.TableName)
      .modify(function (queryBuilder) {
        queryBuilder = addFiltersToQueryBuilder(queryBuilder, body);
        queryBuilder.where({ companyId });
      })
      .paginate(getPaginateClauseObject(body))
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
      tags: sortedTags(payload.tags),
      reminders: payload.reminders || {
        overrides: [{ method: "popup", minutes: 15 }],
      },
      dueDate: payload.dueDate,
      status: payload.status ?? ACTIVITY_STATUS.NOT_STARTED,
    };
    activityObj.statusShort = this.getStatusShort(activityObj.status);
    if (activityObj.details?.isScheduled) {
      activityObj.statusShort = ACTIVITY_STATUS_SHORT.SCHEDULED;
    }

    let activity: IActivity = null;
    try {
      activity = await ActivityModel.query().insert(activityObj);
      const updatedDetailObject: IACTIVITY_DETAILS = await this.runSideJobs(
        createdBy.sub,
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

    // if (payload.status) {
    //   payload.statusShort = this.getStatusShort(payload.status);
    // }

    // if (payload.details?.isScheduled) {
    //   payload.statusShort = ACTIVITY_STATUS_SHORT.SCHEDULED;
    // }
    const oldActivity: IActivity = await ActivityModel.query().findById(
      activityId
    );

    // @TODO add validations for detail object
    // payload.details.jobData = {};
    // const updatedActivity: IActivity =
    //   await ActivityModel.query().patchAndFetchById(activityId, payload);
    // if (!updatedActivity || Object.keys(updatedActivity).length === 0) {
    //   throw new CustomError("Object not found", 404);
    // }
    // // Due date updated,
    let errorMessage = false;

    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        const finalQueries = await createUpdateQueries(
          PendingApprovalType.UPDATE,
          activityId,
          employee.sub,
          ActivityModel.tableName,
          this.docClient.getKnexClient(),
          payload
        );
        finalQueries.map(
          async (finalQuery) => await trx.raw(finalQuery.toString())
        );
        await this.runUpdateSideJobs(oldActivity, payload, employee);

        // If everything is successful, commit the transaction
        await trx.commit();
      } catch (error) {
        // If there's any error, rollback the transaction
        await trx.rollback();
        errorMessage = error.message;
      }
    });

    if (errorMessage) {
      throw new CustomError(errorMessage, 500);
    } else {
      return {
        activity: {
          ...oldActivity,
          ...payload,
        },
      };
    }
  }

  getStatusShort(status: ACTIVITY_STATUS): ACTIVITY_STATUS_SHORT {
    switch (status) {
      case ACTIVITY_STATUS.COMPLETED:
        return ACTIVITY_STATUS_SHORT.CLOSED;
      case ACTIVITY_STATUS.DEFERRED:
        return ACTIVITY_STATUS_SHORT.CLOSED;
      case ACTIVITY_STATUS.IN_PROGRESS:
        return ACTIVITY_STATUS_SHORT.OPEN;
      case ACTIVITY_STATUS.NEED_APPROVAL:
        return ACTIVITY_STATUS_SHORT.OPEN;
      case ACTIVITY_STATUS.NOT_STARTED:
        return ACTIVITY_STATUS_SHORT.OPEN;
      case ACTIVITY_STATUS.WAITING_FOR_SOMEONE_ELSE:
        return ACTIVITY_STATUS_SHORT.OPEN;
      default:
        return ACTIVITY_STATUS_SHORT.OPEN;
    }
  }

  async updateStatusOfActivity(
    employee: IEmployeeJwt,
    activityId: string,
    status: string
  ) {
    await validateUpdateStatus(employee.sub, activityId, status);
    const activity: IActivity = await ActivityModel.query().findById(
      activityId
    );

    if (!activity) throw new CustomError("Activity not found", 404);

    if (activity?.status === status) {
      throw new CustomError("Activity has already same status", 400);
    }

    let updatedActivity: IActivity = null;
    await ActivityModel.transaction(async (trx) => {
      updatedActivity = await ActivityModel.query(trx).patchAndFetchById(
        activityId,
        {
          status,
        }
      );
      await UpdateHistoryModel.query(trx).insert({
        tableName: ActivityModel.tableName,
        tableRowId: activity.id,
        actionType: PendingApprovalType.UPDATE,
        updatedBy: employee.sub,
        field: "status",
        newValue: status,
        oldValue: activity?.status,
      });
    });
    return updatedActivity;
  }

  async deleteActivity(id: string): Promise<any> {
    // @ADD some query to find index of id directly
    const deleted = await ActivityModel.query().deleteById(id);

    if (!deleted) {
      throw new CustomError("Activity not found", 404);
    }
  }

  async getMyStaleActivities(employee: IEmployeeJwt, body: any) {
    // await validateGetMyStaleActivities(body);

    // const knex = this.docClient.getKnexClient();
    // return knex("update_history as u")
    //   .distinctOn("u.table_row_id")
    //   .select("u.table_row_id")
    //   .where("u.table_name", "activities")
    //   .where("u.field", "status")
    //   // // .where("u.updated_at", "<=", knex.raw("now() - interval '10 days')"))
    //   .orderBy("u.table_row_id")
    //   .orderBy("u.updated_at", "desc");
    // return knex(`${this.TableName} as a`)
    //   .modify(function (subquery) {
    //     subquery
    //       .whereIn("a.id", function () {
    //         this.distinctOn("u.table_row_id")
    //           .select("u.table_row_id")
    //           .from("update_history as u")
    //           .where("u.table_name", "activities")
    //           .where("u.field", "status")
    //           .orderBy("u.table_row_id")
    //           .orderBy("u.updated_at", "desc")
    //         // .orderBy(['u.table_row_id', { column: 'u.updated_at', order: 'desc' }])
    //         // .where('u.updated_at', '<=', knex.raw("now() - interval '10 days')"))
    //         // .orderBy('u.updated_at','desc')
    //       })
    //       .whereIn("a.status", ["IN_PROGRESS", "WAITING_FOR_SOMEONE_ELSE"])
    //       .whereIn("a.priority", ["NORMAL"]);
    //   })
    //   .select(['id', 'status', 'status_short']);

    return this.docClient
      .get(`${this.TableName} as a`)
      .modify(function (qb) {
        qb = addStaleActivityFilters(qb, body);
        qb.where("a.createdBy", employee.sub);
      })
      .paginate(getPaginateClauseObject(body));
  }

  async getEmployeeStaleActivityByStatus(manager: IEmployeeJwt, body: any) {
    await validateGetEmployeeStaleActivities(body);
    const createdByIds = body?.createdByIds?.split(",");
    if (createdByIds) {
      const employees: IEmployee[] = await EmployeeModel.query().findByIds(
        createdByIds
      );

      // @TODO add validation for manager permissions
      employees.map((employee) => checkManagerPermissions(manager, employee));
    }

    return this.docClient
      .get(`${this.TableName} as a`)
      .modify(function (qb) {
        qb = addStaleActivityFilters(qb, body);
        if (body?.createdByIds?.split(",").length > 0) {
          qb.whereIn("a.createdBy", createdByIds);
        } else {
          qb = attachManagerRestrictions(qb, manager, "a.createdBy");
        }
      })
      .paginate(getPaginateClauseObject(body));
  }

  // Helper
  private async runSideJobs(
    createdBy: string,
    activity: IActivity
  ): Promise<IACTIVITY_DETAILS> {
    if (
      activity.activityType === ACTIVITY_TYPE.EMAIL ||
      activity.activityType === ACTIVITY_TYPE.MEETING
    ) {
      activity.details = await this.runSideGoogleJob(activity);
    } else if (
      (activity.activityType === ACTIVITY_TYPE.TASK ||
        activity.activityType === ACTIVITY_TYPE.CALL) &&
      activity.details?.isScheduled
    ) {
      // AWS EB Scheduler Case
      activity.details.jobData = await this.scheduleEb(
        createdBy,
        activity.reminders,
        activity.dueDate,
        activity.id
      );
    }

    return activity.details;
  }

  private async runSideGoogleJob(
    activity: IActivity
  ): Promise<IActivity["details"]> {
    try {
      let response: GaxiosResponse<any> = null;
      if (activity.activityType === ACTIVITY_TYPE.EMAIL) {
        response =
          await this.emailService.createAndSendEmailFromActivityPayload(
            activity
          );
      } else if (activity.activityType === ACTIVITY_TYPE.MEETING) {
        response = await this.calendarService.createGoogleMeetingFromActivity(
          activity
        );
      }

      activity.details.jobData = {
        status: response?.status || 424,
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

    return activity.details;
  }

  private async scheduleEb(
    createdBy,
    reminder: IReminderInterface,
    dueDate: string,
    originalRowId: any
  ) {
    try {
      // if (reminder.useDefault) {
      //   // Get From user's settings
      // } else
      const reminders = [];
      if (reminder.overrides) {
        for (let i = 0; i < reminder.overrides.length; i++) {
          const { minutes, method } = reminder.overrides[0];

          const reminderObject = await this.reminderService.scheduleReminders(
            dueDate,
            minutes,
            createdBy,
            originalRowId,
            ActivityModel.tableName,
            method
          );
          reminders.push(reminderObject);
        }
      }
      return reminders;
    } catch (e) {
      return {
        stack: e.stack,
        message: e.message,
        status: 500,
      };
    }
  }

  /**
   *
   * @param createdBy
   * @param oldActivity
   * @param newPayload
   * @returns
   */
  private async runUpdateSideJobs(
    oldActivity: IActivity,
    newPayload: any,
    createdBy: IEmployeeJwt
  ): Promise<void> {
    // We only have to worry about dueDate, isScheduled and reminders
    const { activityType } = oldActivity;
    if (
      activityType === ACTIVITY_TYPE.EMAIL ||
      activityType === ACTIVITY_TYPE.MEETING
    ) {
      // activity.details = await this.runSideGoogleJob(activity);
    } else if (
      activityType === ACTIVITY_TYPE.TASK ||
      activityType === ACTIVITY_TYPE.CALL
    ) {
      await this.reminderService.reminderUpdateHelper(
        ActivityModel.tableName,
        oldActivity,
        newPayload,
        createdBy
      );
    }
  }

  private async updateSideGoogleJob(
    activity: IActivity
  ): Promise<IActivity["details"]> {
    try {
      let response: GaxiosResponse<any> = null;
      if (activity.activityType === ACTIVITY_TYPE.EMAIL) {
        response =
          await this.emailService.createAndSendEmailFromActivityPayload(
            activity
          );
      } else if (activity.activityType === ACTIVITY_TYPE.MEETING) {
        response = await this.calendarService.createGoogleMeetingFromActivity(
          activity
        );
      }

      activity.details.jobData = {
        status: response?.status || 424,
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

    return activity.details;
  }

  // private async updateScheduledEb(
  //   createdBy,
  //   reminder: IReminderInterface,
  //   dueDate: string,
  //   originalRowId: any,
  //   reminderTimeType: ReminderTimeType
  // ) {
  //   try {
  //     // if (reminder.useDefault) {
  //     //   // Get From user's settings
  //     // } else
  //     const reminders = [];
  //     if (reminder.overrides) {
  //       for (let i = 0; i < reminder.overrides.length; i++) {
  //         const { minutes, method } = reminder.overrides[0];

  //         const reminderTime = moment(dueDate)
  //           .utc()
  //           .subtract(minutes, "minutes")
  //           .format("YYYY-MM-DDTHH:mm:ss");

  //         const reminderObject = await this.reminderService.scheduleReminders(
  //           `at(${reminderTime})`,
  //           reminderTime,
  //           createdBy,
  //           originalRowId,
  //           ActivityModel.tableName,
  //           reminderTimeType,
  //           method
  //         );
  //         reminders.push(reminderObject);
  //       }
  //     }
  //     return reminders;
  //   } catch (e) {
  //     return {
  //       stack: e.stack,
  //       message: e.message,
  //       status: 500,
  //     };
  //   }
  // }
}
