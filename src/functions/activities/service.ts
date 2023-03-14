import "reflect-metadata";
import { DatabaseService } from "../../libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateCreateActivity,
  validateGetActivities,
  validateGetActivitiesByCompany,
  validateGetMyActivities,
  validateRemarks,
  validateUpdateActivity,
  validateUpdateRemarks,
} from "./schema";

import UserModel, { IUser } from "src/models/User";
import CompanyModel from "src/models/Company";
import { randomUUID } from "crypto";
import ActivityModel, {
  IActivityModel,
  IActivityPaginated,
} from "src/models/Activity";
import {
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_SHORT,
  ACTIVITY_TYPE,
  IActivity,
  IACTIVITY_DETAILS,
  IEMAIL_DETAILS,
  IRemarks,
} from "src/models/interfaces/Activity";
import { CustomError } from "src/helpers/custom-error";
import { ACTIVITIES_TABLE, USERS_TABLE_NAME } from "src/models/commons";
import { unionAllResults } from "./queries";

import { injectable, inject } from "tsyringe";
import { GoogleCalendarService } from "@functions/google/calendar/service";
import { GoogleGmailService } from "@functions/google/gmail/service";
import { IUserJwt } from "@models/interfaces/User";
import { formatGoogleErrorBody } from "@libs/api-gateway";
import { GaxiosResponse } from "gaxios";
import { calendar_v3 } from "googleapis";

// @TODO fix this
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
    private readonly emailService: GoogleGmailService
  ) {}

  async getMyActivities(
    createdBy: string, // jwt payload
    body: any
  ): Promise<IActivityPaginated> {
    if (body) {
      await validateGetMyActivities(createdBy, body);
    }

    const { page, pageSize, returningFields, type } = body;
    const whereClause: any = { createdBy };
    const sortBy = body.sortBy || "updatedAt";
    const sortAscending = body.sortAscending || "desc";
    if (type) {
      whereClause.activityType = type;
    }
    return (
      this.docClient
        .get(this.TableName)
        .where(whereClause)
        // .whereIn("employee_id", employeeIds)
        .select(this.sanitizeActivitiesColumnNames(returningFields))
        .orderBy(sortBy, sortAscending ? "asc" : "desc")
        .paginate({
          perPage: pageSize ? parseInt(pageSize) : 12,
          currentPage: page ? parseInt(page) : 1,
        })
    );
  }

  async getAllActivities(
    userId: string, // jwt payload
    body: any
  ) {
    await validateGetActivities(body);

    const { page, pageSize, returningFields, type } = body;
    const whereClause: any = {};
    const sortBy = body.sortBy || "updatedAt";
    const sortAscending = body.sortAscending || "desc";

    const paginateClause: any = {
      perPage: pageSize ? parseInt(pageSize) : 12,
      currentPage: page ? parseInt(page) : 1,
    };

    if (type) {
      whereClause.activityType = type;
    }

    // if manager, get employees else return everything in case of above user
    return this.docClient
      .get(this.TableName)
      .where(whereClause)
      .select(this.sanitizeActivitiesColumnNames(returningFields))
      .orderBy(sortBy, sortAscending)
      .paginate(paginateClause);
  }

  // @TODO fix this
  async getAllActivitiesByCompany(
    user: any, // jwt payload
    companyId: string,
    body: any
  ) {
    await validateGetActivitiesByCompany(companyId, body);

    const { page, pageSize, returningFields, type } = body;
    const whereClause: any = { companyId };
    const sortBy = body.sortBy || "updatedAt";
    const sortAscending = body.sortAscending || "desc";

    const paginateClause: any = {
      perPage: pageSize ? parseInt(pageSize) : 12,
      currentPage: page ? parseInt(page) : 1,
    };

    if (type) {
      whereClause.activityType = type;
    }

    // if manager, get employees else return everything in case of above user
    return this.docClient
      .get(this.TableName)
      .where(whereClause)
      .select(this.sanitizeActivitiesColumnNames(returningFields))
      .orderBy(sortBy, sortAscending)
      .paginate(paginateClause);
  }

  async getTopActivities(userId: string, companyId: string) {
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

  async getMyActivitiesByDay(userId: string) {
    const resp = await this.emailService.send(
      "wmfarooqi05@gmail.com",
      "Testing Email",
      "<p>this is a test email</p>"
    );
    return resp;
  }

  async getActivityById(
    userId: string,
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

  async createActivity(createdBy: IUserJwt, body: any): Promise<any> {
    const payload = JSON.parse(body);
    await validateCreateActivity(createdBy.sub, payload);
    const user: IUser = await UserModel.query().findById(createdBy.sub);
    if (!user) {
      throw new CustomError("User not found", 400);
    }

    // @TODO add validations for detail object
    const activityObj = {
      summary: payload.summary,
      details: this.createDetailsPayload(
        user,
        payload.activityType,
        payload.details
      ),
      companyId: payload.companyId,
      createdBy: createdBy.sub,
      concernedPersonDetails: payload.concernedPersonDetails,
      activityType: payload.activityType,
      status: payload.status || ACTIVITY_STATUS.BACKLOG,
      tags: payload.tags || JSON.stringify([]),
      reminders: payload.reminders || JSON.stringify([]),
      createdAt: payload.createdAt,
      updatedAt: payload.createdAt,
      remarks: [],
    };

    if (
      activityObj.activityType === ACTIVITY_TYPE.EMAIL ||
      activityObj.activityType === ACTIVITY_TYPE.MEETING
    ) {
      try {
        const resp = await this.runSideGoogleJob(activityObj);
        activityObj.details.status = resp.status;
      } catch (e) {
        activityObj.details.status = 500;
        if (e.config && e.headers) {
          activityObj.details.errorStack = formatGoogleErrorBody(e);
        } else {
          activityObj.details.errorStack = {
            message: e.message,
            stack: e.stack,
          };
        }
      }
    } else {
      // AWS EB Scheduler Case
    }

    try {
      const activity: IActivity = await this.docClient
        .get(this.TableName)
        .insert(activityObj)
        .returning("*");

      return activity;
    } catch (e) {
      if (e.name === "ForeignKeyViolationError") {
        // @TODO: check maybe user doesn't exists
        throw new CustomError("Company doesn't exists", 404);
      } else {
        throw new CustomError(e.message, 502);
      }
    }
  }

  async updateActivity(createdBy: string, activityId: string, body: any) {
    const payload = JSON.parse(body);
    await validateUpdateActivity(createdBy, activityId, payload);

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

  async deleteActivity(id: string): Promise<any> {
    // @ADD some query to find index of id directly
    const deleted = await ActivityModel.query().deleteById(id);

    if (!deleted) {
      throw new CustomError("Activity not found", 404);
    }
  }

  async addRemarksToActivity(
    employeeId: string,
    activityId: string,
    body: any
  ): Promise<ActivityModel> {
    const payload = JSON.parse(body);
    await validateRemarks(employeeId, activityId, payload);

    const { companyId }: { companyId: string } = payload;

    delete payload.activityId;
    delete payload.companyId;

    const remarks = await this.createRemarksHelper(
      employeeId,
      activityId,
      payload
    );

    const activity = await ActivityModel.query()
      .patch({
        remarks: ActivityModel.raw(
          `remarks || ?::jsonb`,
          JSON.stringify(remarks)
        ),
      })
      .where({ id: activityId, companyId })
      .returning("*")
      .first();

    if (!activity) {
      throw new CustomError("Activity not found", 404);
    }
    // @TODO: check if activity doens't exist
    return activity;
  }

  async updateRemarksInActivity(
    employeeId: string,
    activityId: string,
    remarksId: string,
    body: any
  ) {
    const payload = JSON.parse(body);
    await validateUpdateRemarks(employeeId, activityId, remarksId, payload);

    const { companyId }: { companyId: string } = payload;

    delete payload.companyId;

    // @TODO: validate first by fetching remark and activity

    const activity: IActivity = await ActivityModel.query().findById(
      activityId
    );

    if (!activity) {
      throw new CustomError("Activity not found", 404);
    }

    if (activity.companyId !== companyId) {
      throw new CustomError("This activity doesn't belong to the Company", 400);
    }

    // @TODO add user checks

    const index = activity?.remarks?.findIndex((x) => x.id === remarksId);

    if (index === -1 || index === undefined) {
      throw new CustomError("Remarks doesn't exist", 404);
    }

    return ActivityModel.query().patchAndFetchById(activityId, {
      remarks: ActivityModel.raw(
        `
          jsonb_set(remarks, 
            '{
              ${index},
              remarksText
            }', '"${payload.remarksText}"', 
            true
          )
        `
      ),
    });
  }

  private async createRemarksHelper(
    employeeId: string,
    activityId: string,
    payload: any
  ): Promise<IRemarks> {
    // @TODO there is not check here if person's manager doesn't exists
    const users: IUser[] = await this.docClient
      .knexClient(USERS_TABLE_NAME)
      .table(`${USERS_TABLE_NAME} as u`)
      .leftJoin(`${USERS_TABLE_NAME} as m`, "u.reporting_manager", "m.id")
      .select("u.*", "m.id as managerId", "m.name as managerName")
      .where({ "u.id": employeeId });

    return {
      id: randomUUID(),
      activityId,
      remarksText: payload.remarksText,
      employeeDetails: {
        name: users[0].name,
        id: users[0].id,
      },
      reportingManager: users[0]?.managerId!
        ? {
            id: users[0]?.managerId!,
            name: users[0]?.managerName!,
          }
        : null,
      createdAt: moment().utc().format(),
      updatedAt: moment().utc().format(),
    } as IRemarks;
  }

  async deleteRemarkFromActivity(activityId: string, remarksId: string) {
    // @ADD some query to find index of id directly
    const activity: IActivity = await ActivityModel.query().findOne({
      id: activityId,
    });

    const index = activity?.remarks?.findIndex((x) => x.id === remarksId);

    if (index === -1 || index === undefined) {
      throw new CustomError("Remark doesn't exist in this activity", 404);
    }

    await ActivityModel.query().patchAndFetchById(activityId, {
      remarks: ActivityModel.raw(`remarks - ${index}`),
    });

    return activity.remarks[index];
  }

  sanitizeActivitiesColumnNames(fields: string): string | string[] {
    if (!fields) return "*";
    const columnNames = Object.keys(ActivityModel.jsonSchema.properties);
    const returningFields = fields
      .split(",")
      .filter((x) => columnNames.includes(x));

    if (returningFields.length === 0) {
      return "*";
    }
    return returningFields;
  }

  // @TODO re-write with help of jwt payload,
  // manager will be there and also role
  // if role is above manager, he can see,
  // else either userId === activityEmployeeId OR this user's manager should be activity user
  // async checkUserAuthorization(
  //   requestingUserId: string,
  //   activityEmployeeId: string
  // ) {
  //   // @TODO add getEmployees who is allowed to see this company
  //   const requestingUser: IUser = await this.docClient
  //     .get(USERS_TABLE_NAME)
  //     .where({
  //       id: requestingUserId,
  //     })[0];

  //   if (
  //     !(
  //       activity.employeeId === userId ||
  //       userManager.reportingManager === userId
  //     )
  //   ) {
  //     throw new CustomError("User not allowed to access this data", 403);
  //   }
  // }

  async runSideGoogleJob(activity: IActivity): Promise<GaxiosResponse> {
    if (activity.activityType === ACTIVITY_TYPE.EMAIL) {
      return this.emailService.createAndSendEmailFromActivityPayload(activity);
    } else if (activity.activityType === ACTIVITY_TYPE.MEETING) {
      return this.calendarService.createMeetingFromActivityPayload(activity);
    }
  }

  private createDetailsPayload(
    user: IUser,
    activityType: ACTIVITY_TYPE,
    details: IACTIVITY_DETAILS
  ) {
    switch (activityType) {
      case ACTIVITY_TYPE.EMAIL:
        return this.createEmailPayload(user, details);
      case ACTIVITY_TYPE.CALL:
        return this.createCallPayload(details);
      case ACTIVITY_TYPE.MEETING:
        return this.createMeetingPayload(details);
      case ACTIVITY_TYPE.TASK:
        return this.createTaskPayload(details);
    }
  }

  createEmailPayload(user: IUser, payload): IEMAIL_DETAILS {
    const { body, isScheduled, subject, timezone, date } = payload;
    const newDate = isScheduled
      ? moment.tz(date, timezone).utc()
      : moment.utc();

    if (isScheduled && newDate.diff(moment.utc()) < 0) {
      throw new Error("Scheduled date has already passed");
    }

    let toStr = "";
    payload.to.forEach((item) => {
      if (item.name) {
        toStr += `${item.name} <${item.email}>, `;
      } else {
        toStr += item.email;
      }
    });

    return {
      to: toStr,
      from: `${user.name} <${user.email}>`,
      body: body,
      date: newDate.format(),
      messageId: randomUUID(),
      fromEmail: user.email,
      isScheduled: isScheduled || false,
      subject,
    };
  }

  createCallPayload(payload) {
    return payload;
  }

  createMeetingPayload(payload) {
    const {
      summary,
      attendees,
      description,
      location,
      createVideoLink,
      startDateTime,
      endDateTime,
      timezone,
      reminders,
      calendarId,
      sendUpdates,
    } = payload;

    const event: calendar_v3.Schema$Event = {
      summary: summary,
      attendees: attendees,
      description: description,
      location: createVideoLink ? "Online" : location,
      start: {
        dateTime: startDateTime,
        timeZone: timezone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: timezone,
      },
      reminders: reminders,
      id: randomUUID(),
    };

    event["createVideoLink"] = createVideoLink;
    event["calendarId"] = calendarId;
    event["sendUpdates"] = sendUpdates;
    return event;
  }

  createTaskPayload(payload) {
    return payload;
  }
}
