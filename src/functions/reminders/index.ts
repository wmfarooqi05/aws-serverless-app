//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const createReminder = {
  handler: `${handlerPath(__dirname)}/handler.createReminder`,
  events: [
    {
      http: {
        method: "post",
        path: "reminder",
        cors: true,
      },
    },
  ],
};

const getReminders = {
  handler: `${handlerPath(__dirname)}/handler.getReminders`,
  events: [
    {
      http: {
        method: "get",
        path: "reminders",
        cors: true,
        // authorizer: {
        //   type: "COGNITO_EMPLOYEE_POOLS",
        //   authorizerId: {
        //     Ref: "ApiGatewayAuthorizer"
        //   }
        // },
      },
    },
  ],
};

const getReminderById = {
  handler: `${handlerPath(__dirname)}/handler.getReminderById`,
  events: [
    {
      http: {
        method: "get",
        path: "reminder/{reminderId}",
        cors: true,
      },
    },
  ],
};

const updateReminder = {
  handler: `${handlerPath(__dirname)}/handler.updateReminder`,
  events: [
    {
      http: {
        method: "put",
        path: "reminder/{reminderId}",
        cors: true,
      },
    },
  ],
};
// Should be private, only to be accessed by services
const deleteReminder = {
  handler: `${handlerPath(__dirname)}/handler.deleteReminder`,
  events: [
    {
      http: {
        method: "delete",
        path: "reminder/{reminderId}",
        cors: true,
      },
    },
  ],
};

const dailyReminderCleanup = {
  handler: `${handlerPath(__dirname)}/handler.dailyReminderCleanup`,
  events: [
    {
      http: {
        method: "post",
        path: "reminder/cleanup",
        cors: true,
      },
    },
  ],
};

export {
  getReminders,
  createReminder,
  getReminderById,
  updateReminder,
  deleteReminder,
  dailyReminderCleanup,
};
