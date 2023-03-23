import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateCreateActivity,
  validateGetActivities,
  validateGetActivitiesByCompany,
  validateGetMyActivities,
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
import { addFiltersToQueryBuilder, createDetailsPayload, createStatusHistory } from "./helpers";

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
    private readonly emailService: GoogleGmailService
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
      })
      .where({ createdBy });
  }

  // Limit this only for admin
  async getAllActivities(user: IEmployeeJwt, body: any) {
    await validateGetActivities(body);
    // if manager, get employees else return everything in case of above employee
    return this.docClient.get(this.TableName).modify(function (queryBuilder) {
      queryBuilder = addFiltersToQueryBuilder(queryBuilder, body);
    });
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

    const status = payload.status
      ? payload.status
      : ACTIVITY_STATUS.NOT_STARTED;
    // @TODO add validations for detail object
    const activityObj = {
      summary: payload.summary,
      details,
      companyId: payload.companyId,
      createdBy: createdBy.sub,
      concernedPersonDetails: JSON.stringify([payload.concernedPersonDetails]),
      activityType: payload.activityType,
      priority: payload.priority || ACTIVITY_PRIORITY.NORMAL,
      statusHistory: JSON.stringify([
        createStatusHistory(status, createdBy.sub),
      ]),
      tags: sortedTags(payload.tags),
      reminders: payload.reminders || JSON.stringify([]),
      repeatReminders: payload.repeatReminders || JSON.stringify([]),
      // createdAt: payload.createdAt,
      // updatedAt: payload.createdAt,

      scheduled: details.isScheduled ? true : false,
      dueDate: payload.dueDate,
    };

    if (
      activityObj.activityType === ACTIVITY_TYPE.EMAIL ||
      activityObj.activityType === ACTIVITY_TYPE.MEETING
    ) {
      try {
        const resp = await this.runSideGoogleJob(activityObj);
        activityObj.details.jobData = {
          status: resp?.status || 424,
        };
      } catch (e) {
        activityObj.details.jobData = {
          status: 500,
        };
        if (e.config && e.headers) {
          activityObj.details.jobData.errorStack = formatGoogleErrorBody(e);
        } else {
          activityObj.details.jobData.errorStack = {
            message: e.message,
            stack: e.stack,
          };
        }
      }
    } else {
      // AWS EB Scheduler Case
    }

    try {
      const activity: IActivity[] = await this.docClient
        .get(this.TableName)
        .insert(activityObj)
        .returning("*");

      return activity[0];
    } catch (e) {
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

    // @TODO add validations for detail object
    const updatedActivity: IActivity =
      await ActivityModel.query().patchAndFetchById(activityId, payload);
    if (!updatedActivity || Object.keys(updatedActivity).length === 0) {
      throw new CustomError("Object not found", 404);
    }

    // @TODO add logic to update job
    // if (updatedActivity.activityType !== ACTIVITY_TYPE.EMAIL) {
    //   await this.runSideGoogleJob(updatedActivity);
    // }

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

    //@TODO add checks like if this employee can change, or his manager etc
    // @TODO validate status type

    // Before making it pending item, we need to write helper for mix normal and json key
    // const isPermitted = true;
    // if (!isPermitted) {
    //   return this.createPendingActivity(
    //     employee,
    //     activityId,
    //     PendingApprovalType.UPDATE,
    //     payload
    //   );
    // } else {
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

  async createPendingActivity(
    employee: IEmployeeJwt,
    activityId: string,
    type: PendingApprovalType,
    payload: any
  ) {
    return this.pendingApprovalService.createPendingApproval(
      employee.sub,
      activityId,
      ModuleTitles.ACTIVITY,
      ActivityModel.tableName,
      type,
      payload
    );
  }

  async getMyStaleActivityByStatus(employee: IEmployeeJwt, body: any) {
    const { status, daysAgo } = body;

    const sevenDaysAgo = moment()
      .subtract(parseInt(daysAgo), "days")
      .startOf("day")
      .utc()
      .format();

    const result = await ActivityModel.query()
      .whereNotNull("status_history")
      .where("createdBy", employee.sub)
      .where((builder) => {
        builder
          .whereRaw(`jsonb_array_length(status_history) > 0`)
          .whereRaw(`((status_history->>-1)::jsonb)->>'status' = ?`, status)
          .whereRaw(
            `(((status_history->>-1)::jsonb)->>'updatedAt')::timestamp < ?`,
            sevenDaysAgo
          );
      })
      .orderByRaw(
        "(((status_history->> -1)::jsonb)->>'updatedAt')::timestamp DESC"
      );
    return result;
  }

  // @TODO re-write with help of jwt payload,
  // manager will be there and also role
  // if role is above manager, he can see,
  // else either employeeId === activityEmployeeId OR this employee's manager should be activity employee
  // async checkEmployeeAuthorization(
  //   requestingEmployeeId: string,
  //   activityEmployeeId: string
  // ) {
  //   // @TODO add getEmployees who is allowed to see this company
  //   const requestingEmployee: IEmployee = await this.docClient
  //     .get(EMPLOYEES_TABLE_NAME)
  //     .where({
  //       id: requestingEmployeeId,
  //     })[0];

  //   if (
  //     !(
  //       activity.employeeId === employeeId ||
  //       employeeManager.reportingManager === employeeId
  //     )
  //   ) {
  //     throw new CustomError("Employee not allowed to access this data", 403);
  //   }
  // }

  async runSideGoogleJob(activity: IActivity): Promise<GaxiosResponse> {
    if (activity.activityType === ACTIVITY_TYPE.EMAIL) {
      return this.emailService.createAndSendEmailFromActivityPayload(activity);
    } else if (activity.activityType === ACTIVITY_TYPE.MEETING) {
      return this.calendarService.createGoogleMeetingFromActivity(activity);
    }
  }
}
