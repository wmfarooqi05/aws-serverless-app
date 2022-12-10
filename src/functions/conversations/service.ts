import "reflect-metadata";
import { DatabaseService } from "../../libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateCreateConversation,
  validateRemarks,
  validateUpdateRemarks,
} from "./schema";

import { injectable, inject } from "tsyringe";
import UserModel, { IUser, USERS_TABLE_NAME } from "src/models/User";
import { randomUUID } from "crypto";
import ConversationModel, {
  CONVERSATIONS_TABLE_NAME,
  IConversation,
  IConversationModel,
  IConversationPaginated,
  IRemarks,
} from "src/models/Conversation";

export interface IConversationService {
  addConversation(
    employeeId: string,
    body: any
  ): Promise<IConversationPaginated>;
  addConcernedPerson(): Promise<IConversationModel>;
  addRemarksToConversation(
    employeeId: string,
    body: any
  ): Promise<ConversationModel>;
  updateRemarksInConversation(
    employeeId: string,
    body: any
  ): Promise<IConversationModel>;
  deleteConversation(id: string): Promise<any>;
}

@injectable()
export class ConversationService implements IConversationService {
  private Tablename: string = CONVERSATIONS_TABLE_NAME;

  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {}
  deleteConversation(id: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async addConversation(employeeId: string, body: any): Promise<any> {
    const payload = JSON.parse(body);
    await validateCreateConversation(employeeId, payload);

    const conversationId = randomUUID();

    const remarks = await this.createRemarksHelper(
      employeeId,
      conversationId,
      payload
    );

    const conversationObj: IConversation = {
      id: conversationId,
      leadId: payload.leadId,
      employeeId,
      reportingManagerId: remarks.reportingManager.id,
      concernedPersonDetails: payload.concernedPersonDetails,
      callDetails: payload.callDetails ? payload.callDetails : null,
      emailDetails: payload.emailDetails ? payload.emailDetails : null,
      remarks: [remarks],
      createdAt: payload.createdAt,
      updatedAt: payload.createdAt,
    };

    return ConversationModel.query().insert(conversationObj).returning("*");
  }

  // @TODO updateRemark

  async addConcernedPerson(): Promise<any> {}

  async addRemarksToConversation(
    employeeId: string,
    body: any
  ): Promise<ConversationModel> {
    const payload = JSON.parse(body);
    await validateRemarks(employeeId, payload);

    const {
      conversationId,
      leadId,
    }: { conversationId: string; leadId: string } = payload;

    delete payload.conversationId;
    delete payload.leadId;

    const remarks = await this.createRemarksHelper(
      employeeId,
      conversationId,
      payload
    );

    const conversation = await ConversationModel.query()
      .patch({
        remarks: ConversationModel.raw(
          `remarks || ?::jsonb`,
          JSON.stringify(remarks)
        ),
      })
      .where({ id: conversationId, leadId })
      .returning("*")
      .first();

    return conversation;
  }

  async updateRemarksInConversation(employeeId: string, body: any) {
    const payload = JSON.parse(body);
    await validateUpdateRemarks(employeeId, payload);


    const {
      conversationId,
      leadId,
    }: { conversationId: string; leadId: string } = payload;

    delete payload.conversationId;
    delete payload.leadId;

    // @TODO: validate first by fetching remark and conversation

    const conversation: IConversation = await ConversationModel.query().findOne(
      {
        id: conversationId,
        leadId,
      }
    );

    const index = conversation.remarks.findIndex(
      (x) => x.id === payload.remarksId
    );

    if (index === -1) {
      throw new Error("Remarks doesn't exist");
    }

    return ConversationModel.query().patchAndFetchById(conversationId, {
      remarks: ConversationModel.raw(
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
    conversationId: string,
    payload: any
  ): Promise<IRemarks> {
    const [user]: IUser[] = await UserModel.knex()
      .table(`${USERS_TABLE_NAME} as u`)
      .join(`${USERS_TABLE_NAME} as m`, "u.reporting_manager", "m.id")
      .select("u.*", "m.id as managerId", "m.name as managerName")
      .where({ "u.id": employeeId });

    return {
      id: randomUUID(),
      conversationId,
      remarksText: payload.remarksText,
      employeeDetails: {
        name: user.name,
        id: user.id,
      },
      reportingManager: user?.managerId!
        ? {
            id: user?.managerId!,
            name: user?.managerName!,
          }
        : null,
      createdAt: moment().format(),
      updatedAt: moment().format(),
    } as IRemarks;
  }
}
