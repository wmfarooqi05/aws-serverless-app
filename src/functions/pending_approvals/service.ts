import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import PendingApprovalModel from "@models/PendingApprovals";
import {
  IPendingApprovals,
  PendingApprovalType,
  PendingApprovalsStatus,
  IOnApprovalActionRequired,
  APPROVAL_ACTION_JSONB_PAYLOAD,
  APPROVAL_ACTION_SIMPLE_KEY,
} from "@models/interfaces/PendingApprovals";
import { injectable, inject } from "tsyringe";
import { CustomError } from "src/helpers/custom-error";
import {
  pendingApprovalKnexHelper,
  validatePendingApprovalObject,
} from "./helper";
import {
  validateCreatePendingApproval,
  validatePendingApprovalBeforeJob,
} from "./schema";
// import { WebSocketService } from "@functions/websocket/service";
import { NotificationService } from "@functions/notifications/service";
import { INotification } from "@models/Notification";
import { message } from "./strings";
import { randomUUID } from "crypto";
import Employee from "@models/Employees";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import Joi from "joi";
import {
  convertPayloadToArray,
  createKnexTransactionsWithPendingPayload,
} from "@common/json_helpers";

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

  /**@TODO remove this */
  async sendWebSocketNotification(body: string) {
    this.notificationService.sendWebSocketNotification(body);
  }

  async getMyPendingApprovals(employee: IEmployeeJwt, body) {
    // return PendingApprovalModel.query().whereRaw(
    //   "approvers @> ?",
    //   JSON.stringify([employee.sub])
    // );
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
        })
        .first();

    delete updatedPendingObject.onApprovalActionRequired;
    return updatedPendingObject;
  }
  /**
   * @deprecated
   * @param employeeId
   * @param rowId
   * @param title
   * @param tableName
   * @param type
   * @param payload
   * @returns
   */
  async createPendingApproval(
    employeeId: string,
    rowId: string,
    title: string,
    tableName: string,
    type: PendingApprovalType,
    payload?: APPROVAL_ACTION_SIMPLE_KEY[] | APPROVAL_ACTION_JSONB_PAYLOAD[]
  ) {
    // await validateCreatePendingApproval(payload);

    const pendingApprovalItem: IPendingApprovals =
      await this.createPendingApprovalItem(
        employeeId,
        rowId,
        tableName,
        type,
        payload
      );

    // This will move to job maybe
    await this.createPendingApprovalNotifications(pendingApprovalItem);
    return pendingApprovalItem;
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

      // if (!entry) {
      //   // Push to SQS because no data entry exists;
      //   // Case 3
      //   // SQS.push({ entryId: id, payload: error, type: 'PENDING_APPROVAL_ERROR' });
      // } else {
      // Case 4
      return {
        ...entry,
        retryCount: entry.retryCount + 1,
        resultPayload: [error],
        status: taskDone
          ? PendingApprovalsStatus.SUCCESS // make it success with partially error
          : PendingApprovalsStatus.FAILED,
      };
      // }
    } finally {
      // Do if something is required
    }
  }
  /**
   * @deprecated
   * Cases
   * Case 1: Entry has query, and will call raw to execute, update status
   * Case 2: Entry is without query, so call knex, update status
   * Case 3: Entry doesn't exists, so push to SQS
   * Case 4: Push to DB, push error record, increment entry count, and update status
   * Case 5: Not decided, if resultPayload is empty after success, maybe due to some error
   * @param id
   */
  async approvePendingApprovalWithQuery(
    employee: IEmployeeJwt,
    requestId: string
  ) {
    return requestId;
    // try {
    //   return pendingApprovalKnexHelper(entry, this.docClient);
    // } catch (e) {
    //   throw new CustomError(e, 502);
    // }
    let error = {};
    let errorCount = 0;
    let resultPayload = {};
    let entry: IPendingApprovals | null = null;
    let taskDone = false; // in case task is done, but something crashes after that,
    // in that case, either we will do something like rollback(in future) or make pending_approval as done
    try {
      entry = await PendingApprovalModel.query().findById(requestId);
      console.log("entry", entry);
      if (!entry) {
        // Case 3
        throw new CustomError(
          `Pending Approval entry doesn\'t exists. ${requestId}`,
          404
        );
      } else if (entry.status === PendingApprovalsStatus.SUCCESS) {
        return;
        // throw new CustomError("Pending Approval already completed", 400);
      }
      resultPayload = await pendingApprovalKnexHelper(
        entry,
        this.docClient.getKnexClient()
      );
      taskDone = true;
      // if (resultPayload === 0) {
      //   throw new CustomError("Item doesn't exists", 404);
      // } // update and delete original row doesnt exist }
      // if (!resultPayload) {
      //   // Case 5
      //   throw new CustomError("Query failed", 502);
      // } else if (resultPayload === 1) {
      //   resultPayload = [{ result: "1" }];
      // } else if (typeof resultPayload === "object") {
      //   resultPayload = [resultPayload];
      // }

      // await PendingApprovalModel.query().patchAndFetchById(requestId, {
      //   resultPayload: resultPayload,
      //   status: PendingApprovalsStatus.SUCCESS,
      // });
    } catch (e) {
      error[errorCount] = e;
      error[errorCount]._stack = e.stack;
      error[errorCount]._message = e.message;
      errorCount++;
      if (!entry) {
        // Push to SQS because no data entry exists;
        // Case 3
        // SQS.push({ entryId: id, payload: error, type: 'PENDING_APPROVAL_ERROR' });
      } else {
        // Case 4
        await PendingApprovalModel.query().patchAndFetchById(requestId, {
          retryCount: entry.retryCount + 1,
          resultPayload: [error],
          status: taskDone
            ? PendingApprovalsStatus.SUCCESS // make it success with partially error
            : PendingApprovalsStatus.FAILED,
        });
      }
    } finally {
      // Do if something is required
    }
  }

  private async sendNotification(notifItem: string) {
    console.log("sendNotification", notifItem.id);
    // @Web Socket
    this.sendWebSocketNotificationHelper(notifItem);
    // @Email

    // @SMS

    // SNS
  }

  async createPendingApprovalRequest(
    actionType: PendingApprovalType,
    tableRowId: string,
    createdBy: string,
    tableName: string,
    payload: object = null,
    jsonActionType: string = null,
    jsonbItemId: string = null
  ): Promise<{ pendingApproval: IPendingApprovals }> {
    const { onApprovalActionRequired } = convertPayloadToArray(
      actionType,
      tableRowId,
      tableName,
      payload,
      jsonActionType,
      jsonbItemId
    );
    const employeeItem: IEmployee = await Employee.query().findById(createdBy);

    if (!employeeItem.reportingManager) {
      throw new CustomError("User do not have any reporting manager", 400);
    }

    const item: IPendingApprovals = {
      tableRowId,
      tableName,
      approvers: [employeeItem.reportingManager],
      createdBy,
      onApprovalActionRequired,
      status: PendingApprovalsStatus.PENDING,
      retryCount: 0,
      resultPayload: [],
    };
    if (actionType === PendingApprovalType.CREATE) {
      delete item.tableRowId;
    }
    const pendingApproval: IPendingApprovals =
      await PendingApprovalModel.query().insert(item);
    return { pendingApproval };
  }
  /**
   * @deprecated
   * @param employeeId
   * @param rowId
   * @param tableName
   * @param actionType
   * @param payload
   * @returns
   */
  private async createPendingApprovalItem(
    employeeId: string,
    rowId: string,
    tableName: string,
    actionType: PendingApprovalType,
    payload?: APPROVAL_ACTION_SIMPLE_KEY[] | APPROVAL_ACTION_JSONB_PAYLOAD[]
  ): Promise<IPendingApprovals> {
    const onApprovalActionRequired: IOnApprovalActionRequired = {
      tableName,
      actionType,
      actionsRequired: payload,
    };

    const employeeItem: IEmployee = await Employee.query().findById(employeeId);

    if (!employeeItem.reportingManager) {
      throw new CustomError("User do not have any reporting manager", 400);
    }

    const item: IPendingApprovals = {
      tableName,
      tableRowId: rowId,
      //  `${actionType}_${title.toUpperCase()}_${randomUUID()}`,
      approvers: [employeeItem.reportingManager],
      createdBy: employeeId,
      onApprovalActionRequired,
      status: PendingApprovalsStatus.PENDING,
      retryCount: 0,
      resultPayload: [],
    };

    const pendingApproval: IPendingApprovals =
      await PendingApprovalModel.query().insert(item);
    return pendingApproval;
  }

  private async createPendingApprovalNotifications(
    pendingApprovalItem: IPendingApprovals
  ) {
    // get Employee's connectionId
    // if connectionId exists
    //this.webSocketService.sendMessage(connectionId, payload);

    let notifArray = [];
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
        title: pendingApprovalItem.activityName,
        subtitle: message.PendingApprovalCreate(
          pendingApprovalItem.activityName,
          pendingApprovalItem.onApprovalActionRequired.actionType
        ),
        extraData: {
          module: "PENDING_APPROVALS",
          rowId: pendingApprovalItem["id"],
          infoType: pendingApprovalItem.activityName,
        },
      };
      const notifItem: INotification =
        await this.notificationService.createNotification(notification);
      await this.sendNotification(JSON.stringify(notifItem));
      notifArray.push(notifItem);
    }
  }

  private async sendWebSocketNotificationHelper(notifItem: string) {
    // Here we will decide which notifications should be invoked
    this.notificationService.sendWebSocketNotification(notifItem);
  }

  ///helper
}
