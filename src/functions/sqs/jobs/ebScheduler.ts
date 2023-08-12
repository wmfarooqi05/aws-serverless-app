import { ReminderService } from "@functions/reminders/service";
import { CustomError } from "@helpers/custom-error";
import ActivityModel from "@models/Activity";
import EmployeeModel from "@models/Employees";
import { IJob } from "@models/Jobs";
import ReminderModel, { IReminder } from "@models/Reminders";
import { ACTIVITIES_TABLE } from "@models/commons";
import {
  IActivity,
  IReminderInterface,
  defaultReminders,
} from "@models/interfaces/Activity";
import { IEmployee } from "@models/interfaces/Employees";
import { isMatch } from "lodash";
import { container } from "@common/container";

interface SchedulingInput extends IReminderInterface {
  dueDate: string;
  createdBy: string;
}

export const createEBScheduler = async (jobItem: IJob) => {
  const {
    details: { tableRowId, tableName },
  } = jobItem;
  try {
    const schedulingInputs: SchedulingInput = await mapTableToSchedulingInputs(
      tableRowId,
      tableName
    );

    let finalOverrides: IReminderInterface["overrides"] = [];
    const { dueDate, overrides, createdBy, useDefault } = schedulingInputs;
    if (useDefault) {
      finalOverrides = await getEmployeeDefaultReminderOverrides(createdBy);
    } else {
      finalOverrides = overrides;
    }

    const response = await container
      .resolve(ReminderService)
      .scheduleReminders(
        dueDate,
        finalOverrides,
        createdBy,
        tableRowId,
        tableName
      );
    return { response };
  } catch (e) {
    return {
      stack: e.stack,
      message: e.message,
      status: 500,
    };
  }
};

/**
 * This is cleanup method, when a user will delete an activity
 * or some other related table, this method will look for it's
 * reminders and eventually cleanup everything
 * @param jobItem
 */
export const deleteEbScheduler = async (jobItem: IJob) => {
  const {
    details: { tableRowId, tableName },
  } = jobItem;

  // The row has been deleted so we cannot query it
  const reminders: IReminder[] = await ReminderModel.query().where({
    tableName,
    tableRowId,
  });

  const response = await container
    .resolve(ReminderService)
    .deleteReminders(reminders);
  return { response };
};

/**
 * This function simply maps a table's column to
 * variables required for scheduling
 * Let's say Activity has column `due_date` while
 * tomorrow we will have another table on basis of which
 * we need to create reminders, and it has column `reminder_date`
 * so basically this function will take care of this mapping
 */
const mapTableToSchedulingInputs = async (
  tableRowId: string,
  tableName: string
): Promise<SchedulingInput> => {
  if (tableName === ACTIVITIES_TABLE) {
    const activity: IActivity = await ActivityModel.query().findById(
      tableRowId
    );
    const {
      createdBy,
      dueDate,
      reminders: { overrides, useDefault },
    } = activity;

    return {
      createdBy: createdBy,
      dueDate: dueDate,
      overrides,
      useDefault,
    };
  } else {
    const message = `We don't support table ${tableName} in createEBScheduler Job`;
    console.error(message);
    throw new CustomError(message, 500);
  }
};

export const getEmployeeDefaultReminderOverrides = async (
  employeeId: string
): Promise<IReminderInterface["overrides"]> => {
  const employee: IEmployee = await EmployeeModel.query().findById(employeeId);
  const userReminders = employee?.details?.reminders;
  if (isMatch(userReminders, defaultReminders.overrides)) {
    return userReminders as IReminderInterface["overrides"];
  } else {
    return defaultReminders.overrides;
  }
};
