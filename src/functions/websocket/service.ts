import "reflect-metadata";
import {
  inject,
  injectable,
  // injectable
} from "tsyringe";
import {
  PostToConnectionCommand,
  ApiGatewayManagementApiClient,
  PostToConnectionCommandInput,
  ApiGatewayManagementApiClientConfig,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { CustomError } from "@helpers/custom-error";
import { CacheService } from "@common/service/CacheService";
import axios from "axios";
import { INotification } from "@models/Notification";

export interface IWebSocketService {}

// let endpoint = "http://localhost:3001";
// if (process.env.STAGE !== "local") {
const endpoint = `https://${process.env.APIG_WS_API_ID}.execute-api.${process.env.REGION}.amazonaws.com/${process.env.STAGE}`;
// }

const config: ApiGatewayManagementApiClientConfig = {
  region: process.env.REGION,
  endpoint,
};

@injectable()
export class WebSocketService implements IWebSocketService {
  tableName: string = process.env.ConnectionTableName;
  partitionKeyName: string = process.env.ConnectionTablePartitionKey;
  apiGateway: ApiGatewayManagementApiClient = null;
  constructor(
    @inject(CacheService)
    private readonly cacheService: CacheService
  ) {
    this.apiGateway = new ApiGatewayManagementApiClient(config);
  }

  async handle(
    employeeId: string,
    body: any,
    connectionId: string,
    routeKey: string
  ) {
    try {
      console.log("[websocket] handle: ", employeeId, connectionId, routeKey);
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
          await this.cacheService.deleteItem(employeeId);
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

  async sendMessage(data: string) {
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

  async sendSimpleMessage(connectionId, payload) {
    console.log("[Websocket] sendSimpleMessage", connectionId, payload);
    const encodingPayload = JSON.stringify({
      ...payload,
      connectionId,
      message: "new message",
      type: "inbox",
    });

    const resEncodedMessage = new TextEncoder().encode(encodingPayload);

    const requestParams: PostToConnectionCommandInput = {
      ConnectionId: connectionId,
      Data: resEncodedMessage,
    };

    const command = new PostToConnectionCommand(requestParams);

    try {
      if (process.env.STAGE === "local") {
        return {
          messsage: "[websocket] local connection",
          connectionId,
          encodingPayload: JSON.parse(encodingPayload),
        };
      }
      console.log("command", command);
      // @TODO remove on Prod
      const resp1 = await axios.get("https://www.google.com");
      console.log("resp1", resp1.status);

      const resp = await this.apiGateway.send(command);
      console.log("resp?.$metadata", resp?.$metadata);
      return { ...resp.$metadata, connectionId };
    } catch (error) {
      console.error("error", error);
      return {
        ...error,
        _stack: error.stack,
      };
    }
  }

  private async getConnectionId(employeeId: string): Promise<string> {
    try {
      const payloadString = await this.cacheService.getItem(employeeId);
      const connectionPayload = JSON.parse(payloadString);
      if (!connectionPayload?.connectionId) {
        throw new CustomError("Connection Id not found", 404);
      }

      console.log(
        "[Websocket], getConnectionId, connectionId",
        connectionPayload?.connectionId
      );
      return connectionPayload.connectionId;
    } catch (e) {
      console.error("getConnectionId, employeeId", employeeId, e);
    }
  }

  async sendNotifications(notifications: INotification[]) {
    console.log("[WebSockets] sendNotifications", notifications);
    for (let i = 0; i < notifications.length; i++) {
      const connectionId = await this.getConnectionId(
        notifications[i].receiverEmployee
      );
      console.log("Index:", i, ", connectionId: ", connectionId);

      if (connectionId) {
        await this.sendSimpleMessage(
          connectionId,
          JSON.stringify({
            type: "NOTIFICATION",
            senderName: notifications[i].extraData.senderEmployeeName,
            module: notifications[i].extraData.infoType,
            payload: notifications[i],
          })
        );
      }
    }
  }
}
