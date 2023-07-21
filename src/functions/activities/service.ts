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
import CompanyModel from "@models/Company";
import ActivityModel, {
  IActivityModel,
  IActivityPaginated,
} from "src/models/Activity";
import {
  ACTIVITY_PRIORITY,
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_SHORT,
  ACTIVITY_TYPE,
  defaultReminders,
  IActivity,
  IReminderInterface,
} from "src/models/interfaces/Activity";
import { CustomError } from "src/helpers/custom-error";
import { ACTIVITIES_TABLE } from "src/models/commons";
import { unionAllResults } from "./queries";

import { injectable, inject } from "tsyringe";
import {
  IEmployee,
  IEmployeeJwt,
  IEmployeeWithTeam,
} from "@models/interfaces/Employees";
import { createKnexTransactionQueries } from "@common/json_helpers";
import {
  addFiltersToQueryBuilder,
  addStaleActivityFilters,
  attachManagerRestrictions,
  // addStaleActivityFilters,
  createDetailsPayload,
  sortedTags,
} from "./helpers";
import { checkManagerPermissions } from "@functions/employees/helpers";
import { getPaginateClauseObject } from "@common/query";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import UpdateHistoryModel from "@models/UpdateHistory";
import { SQSEventType } from "@models/interfaces/Reminders";
import { JobService } from "@functions/jobs/service";
import { capitalize } from "lodash";

export interface IActivityService {
  createActivity(employeeId: string, body: any): Promise<IActivityPaginated>;
  addContact(): Promise<IActivityModel>;
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
    // @TODO replace this with generic service (in case of adding multiple calendar service) // @inject(GoogleCalendarService) // private readonly calendarService: GoogleCalendarService, // @TODO replace this with generic service (in case of adding multiple email service) // @inject(ReminderService) // private readonly reminderService: ReminderService
    @inject(JobService) private readonly jobService: JobService
  ) {}

  async getMyActivities(
    employee: IEmployeeJwt, // jwt payload
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
    await validateGetActivitiesByCompany(employee.sub, body);

    return this.docClient
      .get(this.TableName)
      .modify(function (queryBuilder) {
        queryBuilder = addFiltersToQueryBuilder(queryBuilder, {
          ...body,
          createdBy: employee.sub,
        });
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
      .paginate(getPaginateClauseObject(body));
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
    const details = createDetailsPayload(payload.activityType, payload.details);

    const reminders = this.getRemindersFromPayload(
      payload.reminders,
      employee.details?.defaultReminders
    );

    // @TODO add validations for detail object
    const activityObj: IActivity = {
      title: payload.title || `Untitled ${capitalize(payload.activityType)}`,
      summary: payload.summary,
      details,
      companyId: payload.companyId,
      createdBy: createdBy.sub,
      contactDetails: [payload.contactDetails],
      activityType: payload.activityType,
      priority: payload.priority || ACTIVITY_PRIORITY.NORMAL,
      // @TODO remove this
      tags: sortedTags(payload.tags),
      reminders,
      dueDate: payload.dueDate,
      status: payload.status ?? ACTIVITY_STATUS.NOT_STARTED,
      // statusShort is calculated in afterUpdate hook
    };

    const activity: IActivity = await ActivityModel.query().insert(activityObj);

    if (!activity) {
      // most probably it will not reach here
      throw new CustomError("Activity not created", 400);
    }

    await this.jobService.createAndEnqueueJob(
      {
        uploadedBy: employee.id,
        jobType: (activity.activityType === ACTIVITY_TYPE.MEETING
          ? "ADD_GOOGLE_MEETING"
          : "CREATE_EB_SCHEDULER") as SQSEventType,
        details: {
          activityId: activity.id,
          activityType: activity.activityType,
        },
      },
      process.env.JOB_QUEUE_URL
    );

    return activity;

    // sideJobResponse = await this.runSideJobs(createdBy.sub, activity);
    // await ActivityModel.query().patchAndFetchById(activity.id, {
    //   details: sideJobResponse,
    // });
    // activity = {
    //   ...activity,
    //   details: sideJobResponse,
    // };

    // if (errorMessage) {
    //   throw new CustomError(errorMessage, 500);
    // }
    // return activity;
  }

  getRemindersFromPayload(
    reminderPayload,
    employeeDefaultReminders
  ): IReminderInterface {
    let reminders = defaultReminders;
    if (reminderPayload?.overrides?.length) {
      reminders.overrides = reminderPayload.overrides;
    }

    if (
      reminderPayload?.useDefault &&
      employeeDefaultReminders?.overrides?.length
    ) {
      reminders = employeeDefaultReminders;
    }

    return reminders;
  }

  /**
   * We do not need this endpoint
   * We will handle its params in their own endpoints
   * UPDATE: This contains working code for updating side jobs
   */
  async updateActivity(employee: IEmployeeJwt, activityId: string, body: any) {
    const payload = JSON.parse(body);
    await validateUpdateActivity(employee.sub, activityId, payload);

    if (payload.dueDate && moment.utc(payload.dueDate).isBefore(moment.utc())) {
      throw new CustomError("Due date has already passed", 400);
    }
    const oldActivity: IActivity = await ActivityModel.query().findById(
      activityId
    );

    let activityCombined = {
      ...oldActivity,
      ...payload,
    };
    let errorMessage = false;
    let jobData = [];
    let oldJobData = oldActivity.details?.jobData;
    jobData = await this.runUpdateSideJobs(oldActivity, payload, employee);
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        const finalQueries = await createKnexTransactionQueries(
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
        if (jobData?.length > 0) {
          oldJobData = jobData;
        }
        await ActivityModel.query(trx).patchAndFetchById(activityId, {
          details: { ...oldActivity.details, jobData: oldJobData },
        });
        activityCombined = {
          ...activityCombined,
          details: { ...oldActivity.details, jobData: oldJobData },
        };

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
        activity: activityCombined,
      };
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

  async deleteActivity(createdBy: IEmployeeJwt, id: string): Promise<any> {
    // @ADD some query to find index of id directly
    const finalQueries = await createKnexTransactionQueries(
      PendingApprovalType.DELETE,
      id,
      createdBy.sub,
      ActivityModel.tableName,
      this.docClient.getKnexClient()
    );
    let resp = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        const updatePromises = finalQueries.map((finalQuery) =>
          trx.raw(finalQuery.toString())
        );
        await Promise.all(updatePromises);

        resp = await this.reminderService.findAndDeleteReminders(
          ActivityModel.tableName,
          id
        );

        resp.push({ message: "Activity deleted successfully" });
        await trx.commit();
      } catch (e) {
        await trx.rollback();
      }
    });

    return resp;
  }

  async getMyStaleActivities(employee: IEmployeeJwt, body: any) {
    await validateGetMyStaleActivities(body);

    return this.docClient
      .get(`${this.TableName} as a`)
      .modify(function (qb) {
        qb = addStaleActivityFilters(qb, body);
        qb.where("a.createdBy", employee.sub);
      })
      .paginate(getPaginateClauseObject(body));
  }

  /**
   * the requirements have changed a lot, maybe we dont need that much permissions
   * @deprecated
   * @param manager
   * @param body
   * @returns
   */
  async getEmployeeStaleActivityByStatus(manager: IEmployeeJwt, body: any) {
    await validateGetEmployeeStaleActivities(body);
    const createdByIds = body?.createdByIds?.split(",");
    if (createdByIds) {
      const employees: IEmployeeWithTeam[] = await EmployeeModel.query()
        .findByIds(createdByIds)
        .withGraphFetched("teams");

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
  // private async runSideJobs(
  //   createdBy: string,
  //   activity: IActivity
  // ): Promise<IACTIVITY_DETAILS> {
  //   if (activity.activityType === ACTIVITY_TYPE.MEETING) {
  //     activity.details = await this.runSideGoogleJob(activity);
  //   } else if (
  //     (activity.activityType === ACTIVITY_TYPE.TASK ||
  //       activity.activityType === ACTIVITY_TYPE.CALL) &&
  //     activity.details?.isScheduled
  //   ) {
  //     // AWS EB Scheduler Case
  //     activity.details.jobData = await this.scheduleEb(
  //       createdBy,
  //       activity.reminders,
  //       activity.dueDate,
  //       activity.id
  //     );
  //   }

  //   return activity.details;
  // }

  // private async runSideGoogleJob(
  //   activity: IActivity
  // ): Promise<IActivity["details"]> {
  //   try {
  //     let response: GaxiosResponse<any> = null;
  //     response = await this.calendarService.createGoogleMeetingFromActivity(
  //       activity
  //     );

  //     activity.details.jobData = [
  //       {
  //         status: response?.status || 424,
  //         data: response?.data || {},
  //       },
  //     ];
  //   } catch (e) {
  //     activity.details.jobData = {
  //       status: 500,
  //     };
  //     if (e.config && e.headers) {
  //       activity.details.jobData.errorStack = formatGoogleErrorBody(e);
  //     } else {
  //       activity.details.jobData.errorStack = {
  //         message: e.message,
  //         stack: e.stack,
  //       };
  //     }
  //   }

  //   return activity.details;
  // }

  // private async scheduleEb(
  //   createdBy,
  //   reminder: IReminderInterface,
  //   dueDate: string,
  //   originalRowId: any
  // ) {
  //   try {
  //     return this.reminderService.scheduleReminders(
  //       dueDate,
  //       reminder.overrides,
  //       createdBy,
  //       originalRowId,
  //       ActivityModel.tableName
  //     );
  //   } catch (e) {
  //     return {
  //       stack: e.stack,
  //       message: e.message,
  //       status: 500,
  //     };
  //   }
  // }

  // /**
  //  *
  //  * @param createdBy
  //  * @param oldActivity
  //  * @param newPayload
  //  * @returns
  //  */
  // private async runUpdateSideJobs(
  //   oldActivity: IActivity,
  //   newPayload: any,
  //   createdBy: IEmployeeJwt
  // ): Promise<any> {
  //   // We only have to worry about dueDate, isScheduled and reminders
  //   const { activityType } = oldActivity;
  //   if (activityType === ACTIVITY_TYPE.MEETING) {
  //     // activity.details = await this.runSideGoogleJob(activity);
  //   } else if (
  //     activityType === ACTIVITY_TYPE.TASK ||
  //     activityType === ACTIVITY_TYPE.CALL
  //   ) {
  //     const response = await this.reminderService.reminderUpdateHelper(
  //       ActivityModel.tableName,
  //       oldActivity,
  //       newPayload,
  //       createdBy
  //     );
  //     return response;
  //   }
  // }

  // private async updateSideGoogleJob(
  //   activity: IActivity
  // ): Promise<IActivity["details"]> {
  //   try {
  //     let response: GaxiosResponse<any> =
  //       await this.calendarService.createGoogleMeetingFromActivity(activity);

  //     activity.details.jobData = {
  //       status: response?.status || 424,
  //     };
  //   } catch (e) {
  //     activity.details.jobData = {
  //       status: 500,
  //     };
  //     if (e.config && e.headers) {
  //       activity.details.jobData.errorStack = formatGoogleErrorBody(e);
  //     } else {
  //       activity.details.jobData.errorStack = {
  //         message: e.message,
  //         stack: e.stack,
  //       };
  //     }
  //   }

  //   return activity.details;
  // }

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
