import "reflect-metadata";
import { inject, singleton } from "tsyringe";
import { Auth, calendar_v3, google } from "googleapis";
import { GoogleOAuthService } from "../oauth/service";
import { randomUUID } from "crypto";
import { IActivity, IMEETING_DETAILS } from "@models/interfaces/Activity";
import { DatabaseService } from "@libs/database/database-service-objection";
import { CustomError } from "@helpers/custom-error";

@singleton()
export class GoogleCalendarService {
  client: Auth.OAuth2Client;
  constructor(
    @inject(DatabaseService) private readonly _: DatabaseService,
    @inject(GoogleOAuthService)
    private readonly googleOAuthService: GoogleOAuthService
  ) {}

  async getAuthenticatedCalendarClient(
    employeeId: string
  ): Promise<calendar_v3.Calendar> {
    const client = await this.googleOAuthService.getOAuth2Client(employeeId);
    if (!client) {
      throw new CustomError("Token expired or not found", 400);
    }

    return google.calendar({ version: "v3", auth: client });
  }

  async getAllMeetings() {}

  async getMeetingById(
    employeeId: string,
    calendarId: string,
    eventId: string
  ) {
    const client = await this.getAuthenticatedCalendarClient(employeeId);
    // 12 minute after 9 [9:32]
    return client.events.get({
      calendarId,
      eventId,
    });
  }
  async createMeeting(employeeId: string, calendarId: string, body: string) {
    const payload = JSON.parse(body);
    const client = await this.getAuthenticatedCalendarClient(employeeId);
    // @TODO add joi validator

    const event: calendar_v3.Schema$Event = {
      summary: payload.summary,
      attendees: payload.attendees,
      description: payload.description,
      location: payload.createVideoLink ? "Online" : payload.location,
      start: {
        dateTime: payload.startDateTime,
        timeZone: payload.timezone,
      },
      end: {
        dateTime: payload.endDateTime,
        timeZone: payload.timezone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "email",
            minutes: 60,
          },
        ],
      },
    };

    if (payload.createVideoLink) {
      console.log("adding conference data");
      event.conferenceData = {
        createRequest: {
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
          requestId: randomUUID(),
        },
      };
    }

    const calendarItem: calendar_v3.Params$Resource$Events$Insert = {
      calendarId, //: "classroom103310098131703645703@group.calendar.google.com",
      requestBody: event,
      conferenceDataVersion: payload.createVideoLink ? 1 : 0,
      // sendUpdates: payload.sendUpdates,
    };
    // @TODO add joi validation
    return client.events.insert(calendarItem);
  }

  async createGoogleMeetingFromActivity(activity: IActivity) {
    const {
      attendees,
      createVideoLink,
      description,
      end,
      location,
      sendUpdates,
      start,
      summary,
      reminders,
      calendarId,
    } = activity.details as IMEETING_DETAILS;

    const client = await this.getAuthenticatedCalendarClient(
      activity.createdBy
    );

    const event: calendar_v3.Schema$Event = {
      summary,
      attendees,
      description: description,
      location: createVideoLink ? "Online" : location,
      start,
      end,
      reminders,
    };

    if (createVideoLink) {
      console.log("adding conference data");
      event.conferenceData = {
        createRequest: {
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
          requestId: randomUUID(),
        },
      };
    }

    const calendarItem: calendar_v3.Params$Resource$Events$Insert = {
      calendarId, //: "classroom103310098131703645703@group.calendar.google.com",
      requestBody: event,
      conferenceDataVersion: createVideoLink ? 1 : 0,
      sendUpdates,
      // sendUpdates: payload.sendUpdates,
    };
    // @TODO add joi validation
    return client.events.insert(calendarItem);
  }

  async deleteGoogleMeeting(meetingId, createdBy) {
    const client = await this.getAuthenticatedCalendarClient(createdBy);
    return client.events.delete({
      eventId: meetingId,
    });
  }

  getDateTime() {}

  async getAllCalendars(employeeId: string, nextSyncToken: string | null) {
    const client = await this.getAuthenticatedCalendarClient(employeeId);
    const params: calendar_v3.Params$Resource$Calendarlist$List = {};
    if (nextSyncToken) {
      params.syncToken = nextSyncToken;
    }
    const listResponse = await client.calendarList.list(params);
    return listResponse.data;
  }
}
