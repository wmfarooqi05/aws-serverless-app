import "reflect-metadata";
import { DatabaseService } from "src/libs/database/database-service-objection";
import PendingApprovalModel from "src/models/PendingApprovals";
import {
  IPendingApprovals,
  PendingApprovalType,
  PendingApprovalsStatus,
  APPROVAL_ACTION_JSONB_PAYLOAD,
  IOnApprovalActionRequired,
} from "src/models/interfaces/PendingApprovals";
import { PENDING_APPROVAL_TABLE } from "src/models/commons";
import { injectable, inject } from "tsyringe";
import { CustomError } from "src/helpers/custom-error";
import {
  addJsonbObject,
  deleteJsonbObject,
  findIndexFromJsonbArray,
  transformJSONKeys,
  updateJsonbObject,
} from "src/common/json_helpers";
import { pendingApprovalKnexHelper } from "./helper";
import { validateCreatePendingApproval } from "./schema";

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
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async createPendingApproval(
    payload: IPendingApprovals
  ) {
    await validateCreatePendingApproval(payload);
    return PendingApprovalModel.query().insert(payload);
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
  async approvePendingApprovalWithQuery(requestId: string) {
    // try {
    //   return pendingApprovalKnexHelper(entry, this.docClient);
    // } catch (e) {
    //   throw new CustomError(e, 502);
    // }
    let error = {};
    let errorCount = 0;
    let resultPayload = {};
    let entry: IPendingApprovals | null = null;

    try {
      entry = await PendingApprovalModel.query().findById(requestId);
      if (!entry) {
        // Case 3
        throw new CustomError(
          `Pending Approval entry doesn\'t exists. ${requestId}`,
          404
        );
      }
      resultPayload = await pendingApprovalKnexHelper(entry, this.docClient);

      if (resultPayload === 0) {
        throw new CustomError("Item doesn't exists", 404);
      } // update and delete original row doesnt exist }
      if (!resultPayload) {
        // Case 5
        throw new CustomError("Query failed", 502);
      }

      await PendingApprovalModel.query().patchAndFetchById(requestId, {
        resultPayload,
        status: PendingApprovalsStatus.SUCCESS,
      });
    } catch (e) {
      error[errorCount++] = e;
      if (!entry) {
        // Push to SQS because no data entry exists;
        // Case 3
        // SQS.push({ entryId: id, payload: error, type: 'PENDING_APPROVAL_ERROR' });
      } else {
        // Case 4
        await PendingApprovalModel.query().patchAndFetchById(requestId, {
          retryCount: entry.retryCount + 1,
          resultPayload: error,
          status: PendingApprovalsStatus.FAILED,
        });
      }
    } finally {
      // Do if something is required
    }
  }
}
