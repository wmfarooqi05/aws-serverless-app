import "reflect-metadata";
import {
  inject,
  singleton,
  // singleton
} from "tsyringe";
import {
  PostToConnectionCommand,
  ApiGatewayManagementApiClient,
  PostToConnectionCommandInput,
  ApiGatewayManagementApiClientConfig,
  PostToConnectionCommandOutput,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { CustomError } from "@helpers/custom-error";
import { CacheService } from "@common/service/cache/CacheService";
import { INotification } from "@models/Notification";

export interface IWebSocketService {}

export interface PostToConnectionOutput extends PostToConnectionCommandOutput {
  connectionId: string;
  notificationId: string;
}

@singleton()
export class WebSocketService implements IWebSocketService {
  tableName: string = process.env.ConnectionTableName;
  partitionKeyName: string = process.env.ConnectionTablePartitionKey;
  apiGateway: ApiGatewayManagementApiClient = null;
  constructor(
    @inject(CacheService)
    private readonly cacheService: CacheService
  ) {
    let endpoint = null;
    if (process.env.STAGE === "local") {
      endpoint = "http://localhost:4510";
    } else {
      endpoint = process.env.APIG_WS_ENDPOINT;
    }
    const config: ApiGatewayManagementApiClientConfig = {
      region: process.env.REGION,
      endpoint,
    };

    this.apiGateway = new ApiGatewayManagementApiClient(config);
  }

  async handle(
    employeeId: string,
    body: any,
    connectionId: string,
    routeKey: string
  ) {
    try {
      const payload = {
        message: `Received on ${routeKey}: ${body}`,
        employeeId,
        connectionId,
      };
      let item = null;
      await this.cacheService.initiateConnection();
      switch (routeKey) {
        case "$connect":
          console.log("connected, $connect: ", connectionId);
          await this.cacheService.storeKey(employeeId, connectionId);
          await this.sendSimpleMessage(connectionId, {
            message: `connected on ${connectionId}`,
          });
          break;

        case "$disconnect":
          console.log(
            "$disconnect: ",
            connectionId,
            "employeeId: ",
            employeeId
          );
          await this.cacheService.deleteItem(connectionId);
          break;

        case "messageRoute":
          // await this.sendSimpleMessage(connectionId, payload);
          break;

        case "$default":
          console.log("[Websocket] $default");
          await this.sendSimpleMessage(connectionId, payload);
          break;
        default:
          console.log("[Websocket] default");
          await this.sendSimpleMessage(connectionId, payload);
          break;
      }

      // Return a 200 status to tell API Gateway the message was processed
      // successfully.
      // Otherwise, API Gateway will return a 500 to the client.
      return formatJSONResponse({ statusCode: 200, item });
    } catch (e) {
      console.error("[Websocket] error", e);
      return formatErrorResponse(e);
    }
  }

  async sendTestMessage(data: string) {
    try {
      console.log("[Websocket] sendMessage, data", data);
      const payload = JSON.parse(data);
      // const connectionId = payload.connectionId;
      const employeeId = payload.employeeId;
      let connectionId = payload.connectionId;
      delete payload.employeeId;
      delete payload.connectionId;
      // @TODO add joi validations on payload

      if (!connectionId) {
        connectionId = await this.getConnectionId(employeeId);
      }
      console.log("[Websocket] sendMessage: connectionID found ", connectionId);

      return this.sendSimpleMessage(connectionId, payload);
    } catch (error) {
      // error handling.
      if (error?.$metadata?.statusCode === 410) {
        console.error(`[ERROR] Connection $ {connectionId} not found.`);
      } else {
        console.error(error);
      }
      return error;
    }
  }

  async getAllConnections() {
    try {
      return this.cacheService.getAllItems();
    } catch (e) {
      throw new CustomError(e.message, e.statusCode, e);
    }
  }

  async sendSimpleMessage(
    connectionId: string | null,
    payload: Object
  ): Promise<PostToConnectionOutput | { message: string }> {
    console.log("[Websocket] sendSimpleMessage", connectionId, payload);
    if (!connectionId) {
      console.log("no connectionId");
      return { message: "No connection id found" };
    }
    const encodingPayload = JSON.stringify({
      ...payload,
      connectionId,
    });

    const resEncodedMessage = new TextEncoder().encode(encodingPayload);

    const requestParams: PostToConnectionCommandInput = {
      ConnectionId: connectionId,
      Data: resEncodedMessage,
    };

    const command = new PostToConnectionCommand(requestParams);

    try {
      const resp = await this.apiGateway.send(command);
      console.log("resp?.$metadata", resp?.$metadata);
      return { ...resp, connectionId };
    } catch (error) {
      console.error("websocket sendSimpleMessage error", error);
      return {
        ...error,
        _stack: error.stack,
      };
    }
  }

  private async getConnectionId(employeeId: string): Promise<string | null> {
    try {
      const payloadString = await this.cacheService.getItem(employeeId);
      if (payloadString) {
        const connectionPayload = JSON.parse(payloadString);
        if (!connectionPayload?.connectionId) {
          throw new CustomError("Connection Id not found", 404);
        }

        console.log(
          "[Websocket], getConnectionId, connectionId",
          connectionPayload?.connectionId
        );
        return connectionPayload.connectionId;
      }
    } catch (e) {
      console.error("getConnectionId, employeeId", employeeId, e);
    }
  }

  async sendPayloadByEmployeeId(employeeId: string, payload: Object) {
    console.log("employeeId", employeeId);
    const connectionId = await this.getConnectionId(employeeId);
    console.log("connectionId", connectionId);
    if (connectionId) {
      await this.sendSimpleMessage(connectionId, payload);
    }
  }

  async sendNotifications(
    notifications: INotification[]
  ): Promise<
    PostToConnectionOutput[] | { message: string; notificationId: string }[]
  > {
    console.log("[WebSockets] sendNotifications", notifications);
    for (let i = 0; i < notifications.length; i++) {
      const connectionId = await this.getConnectionId(
        notifications[i].receiverEmployee
      );

      console.log(
        "NotificationId: ",
        notifications[i].id,
        ", connectionId: ",
        connectionId
      );
      const resp = await this.sendSimpleMessage(
        connectionId,
        JSON.stringify({
          type: "NOTIFICATION",
          senderName: notifications[i].extraData.senderEmployeeName,
          module: notifications[i].extraData.infoType,
          payload: notifications[i],
        })
      );
      return {
        ...resp,
        notificationId: notifications[i].id,
      };
    }
  }
}
