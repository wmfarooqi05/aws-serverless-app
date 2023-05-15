import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import PendingApprovalModel from "@models/PendingApprovals";
import {
  IPendingApprovals,
  PendingApprovalType,
  PendingApprovalsStatus,
} from "@models/interfaces/PendingApprovals";
import { injectable, inject } from "tsyringe";
import { CustomError } from "src/helpers/custom-error";
import {
  pendingApprovalKnexHelper,
  validatePendingApprovalObject,
} from "./helper";
import { validatePendingApprovalBeforeJob } from "./schema";
// import { WebSocketService } from "@functions/websocket/service";
import { NotificationService } from "@functions/notifications/service";
import NotificationModel, { INotification } from "@models/Notification";
import { message } from "./strings";
import Employee from "@models/Employees";
import {
  IEmployee,
  IEmployeeJwt,
  RolesArray,
  RolesEnum,
} from "@models/interfaces/Employees";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import Joi from "joi";
import { convertPayloadToArray, transformJSONKeys } from "@common/json_helpers";
import { throwUnAuthorizedError } from "@common/errors";
import { SQSService } from "@functions/sqs/service";
import { NOTIFICATIONS_TABLE_NAME } from "@models/commons";
import EmployeeModel from "@models/Employees";

export interface IPendingApprovalService {}

export interface PendingApprovalEBSchedulerPayload {
  pendingApprovalTime: string;
  eventType: PendingApprovalType;
  name: string;
  data?: any;
}

@injectable()
export class PendingApprovalService implements IPendingApprovalService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(NotificationService)
    private readonly notificationService: NotificationService
  ) {}

  async getMyPendingApprovals(employee: IEmployeeJwt, body) {
    return this.docClient
      .getKnexClient()(PendingApprovalModel.tableName)
      .modify((qb) => {
        qb.whereRaw("approvers @> ?", JSON.stringify([employee.sub]));
        qb.orderBy(...getOrderByItems(body));
      })
      .paginate(getPaginateClauseObject(body));
  }

  async approveOrRejectRequest(
    requestId: string,
    employee: IEmployeeJwt,
    body
  ) {
    const payload = JSON.parse(body);
    await Joi.object({
      approved: Joi.boolean().required(),
    }).validateAsync(payload);
    const pendingApproval: IPendingApprovals =
      await PendingApprovalModel.query().findById(requestId);

    if (!pendingApproval.approvers.find((x) => x === employee.sub)) {
      throwUnAuthorizedError();
    }

    switch (pendingApproval.status) {
      case PendingApprovalsStatus.SUCCESS:
        throw new CustomError("It is already completed", 400);
      case PendingApprovalsStatus.REJECTED:
        throw new CustomError("It is already rejected", 400);
    }

    await PendingApprovalModel.query().patchAndFetchById(pendingApproval.id, {
      status: payload.approved
        ? PendingApprovalsStatus.SUBMITTED
        : PendingApprovalsStatus.REJECTED,
    });

    await validatePendingApprovalBeforeJob(pendingApproval);
    const updatedEntry = await this.postApproval(employee.sub, pendingApproval);

    const updatedPendingObject: IPendingApprovals =
      await PendingApprovalModel.query()
        .patchAndFetchById(updatedEntry.id, {
          retryCount: updatedEntry.retryCount + 1,
          resultPayload: updatedEntry.resultPayload,
          status: updatedEntry.status,
          // Add merged it key in approvalDetails
        })
        .first();

    delete updatedPendingObject.onApprovalActionRequired;
    return updatedPendingObject;
  }
  /**
   *
   * Cases
   * Case 1: Entry has query, and will call raw to execute, update status
   * Case 2: Entry is without query, so call knex, update status
   * Case 3: Entry doesn't exists, so push to SQS
   * Case 4: Push to DB, push error record, increment entry count, and update status
   * Case 5: Not decided, if resultPayload is empty after success, maybe due to some error
   * @param id
   */
  async postApproval(updatedBy: string, entry: IPendingApprovals) {
    const error = {};
    let errorCount = 0;
    let taskDone = false; // in case task is done, but something crashes after that,
    // in that case, either we will do something like rollback(in future) or make pending_approval as done
    try {
      // write joi validator, loop through each payload and check that key must be one of schema keys
      validatePendingApprovalObject(entry);

      const response = await pendingApprovalKnexHelper(
        updatedBy,
        entry,
        this.docClient.getKnexClient()
      );

      taskDone = true;
      const returningObject = {
        ...entry,
        resultPayload: [],
        status: PendingApprovalsStatus.SUCCESS,
      };

      if (response) {
        returningObject.resultPayload.push(response);
      }

      return returningObject;
    } catch (e) {
      error[errorCount] = e;
      error[errorCount]._stack = e.stack;
      error[errorCount]._message = e.message;
      errorCount++;

      return {
        ...entry,
        retryCount: entry.retryCount + 1,
        resultPayload: [error],
        status: taskDone
          ? PendingApprovalsStatus.SUCCESS // make it success with partially error
          : PendingApprovalsStatus.FAILED,
      };
    } finally {
      // Do if something is required
    }
  }

  /**
   *
   * @param actionType
   * @param tableRowId
   * @param createdBy
   * @param tableName
   * @param payload
   * @param jsonActionType
   * @param jsonbItemId
   * @param batchApprovalKey - If we are running operations on multiple rows,
   * we can add this key to all rows
   * @returns
   */
  async createPendingApprovalRequest(
    actionType: PendingApprovalType,
    tableRowId: string,
    createdBy: IEmployeeJwt,
    tableName: string,
    payload: object = null,
    jsonActionType: string = null,
    jsonbItemId: string = null,
    batchApprovalKey: string = null
  ): Promise<{ pendingApproval: IPendingApprovals }> {
    const { onApprovalActionRequired } = convertPayloadToArray(
      actionType,
      tableRowId,
      tableName,
      payload,
      jsonActionType,
      jsonbItemId
    );
    const employeeItem: IEmployee = await Employee.query().findById(
      createdBy.sub
    );

    if (!employeeItem) {
      throw new CustomError("Employee does not exists", 400);
    }

    const approvers = [];
    if (!employeeItem.reportingManager) {
      //      @TODO assign this to some admin guy
      const managers: IEmployee[] = await Employee.query().where({
        teamId: employeeItem.teamId,
        role: RolesArray[RolesEnum.SALES_MANAGER_GROUP],
      });
      managers.forEach((x) => approvers.push(x.id));
    } else {
      approvers.push(employeeItem.reportingManager);
    }

    const item: IPendingApprovals = {
      tableRowId,
      tableName,
      approvers,
      createdBy: createdBy.sub,
      onApprovalActionRequired,
      status: PendingApprovalsStatus.PENDING,
      retryCount: 0,
      resultPayload: [],
    };
    if (actionType === PendingApprovalType.CREATE) {
      delete item.tableRowId;
    }
    let senderName; // remove this
    if (createdBy["name"]) {
      senderName = createdBy["name"];
    } else {
      senderName = employeeItem.name;
    }
    let pendingApproval: IPendingApprovals = null;
    let notifObjects: INotification[] = [];
    const knexClient = this.docClient.getKnexClient();
    // pendingApproval = await PendingApprovalModel.query().insert(item);
    await knexClient.transaction(async (trx) => {
      try {
        pendingApproval = await PendingApprovalModel.query(trx).insert(item);
        const notifItems = this.createNotificationItems(
          pendingApproval,
          employeeItem
        );
        notifObjects = await NotificationModel.query(trx).insert(notifItems);
        await trx.commit();
      } catch (e) {
        await trx.rollback();
      }
    });

    try {
      await this.sendNotification(notifObjects);
    } catch (e) {
      console.log("[SEND_NOTIFICATION] error: ", e);
    }
    return { pendingApproval };
  }

  private createNotificationItems(
    pendingApprovalItem: IPendingApprovals,
    employee: IEmployee
  ) {
    let notifArray: INotification[] = [];
    for (let i = 0; i < pendingApprovalItem.approvers.length; i++) {
      // Now we have to create a notification for this
      // And then send it to employees via different transports
      // Ideally a job should run and send it but here we are sending it from here for now

      // @TODO Put this in job, SQS and SNS
      const notification: INotification = {
        isScheduled: false,
        notificationType: "ACTIONABLE_ITEM",
        readStatus: false,
        receiverEmployee: pendingApprovalItem.approvers[0],
        senderEmployee: pendingApprovalItem.createdBy,
        title: pendingApprovalItem.onApprovalActionRequired.actionType,
        subtitle: message.PendingApprovalCreate(
          pendingApprovalItem.tableName,
          pendingApprovalItem.onApprovalActionRequired.actionType
        ),
        extraData: {
          module: "PENDING_APPROVALS",
          rowId: pendingApprovalItem["id"],
          senderEmployeeName: employee.name,
          avatar: employee.picture,
        },
      };

      notifArray.push(notification);
    }
    // const notifItems: INotification[] =
    //   await this.notificationService.createNotifications(notifArray);
    // await this.sqsService.enqueueNotifications(notifItems);
    return notifArray;
  }

  /**
   * @TODO replace this function with SQS in future
   * SQS will enqueue request, and then send websocket notification
   * @param notifObjects
   */
  private async sendNotification(notifObjects: INotification[]) {
    await this.notificationService.sendWebSocketNotification(notifObjects);
  }

  // private async sendWebSocketNotificationHelper(notifItem: string) {
  //   // Here we will decide which notifications should be invoked
  //   this.notificationService.sendWebSocketNotification(notifItem);
  // }

  ///helper
}
