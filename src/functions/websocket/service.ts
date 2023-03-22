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
import axios from 'axios';

export interface IWebSocketService {}

let endpoint = "http://localhost:3001";
if (process.env.STAGE !== "local") {
  endpoint = `https://${process.env.APIG_WS_API_ID}.execute-api.${process.env.REGION}.amazonaws.com/${process.env.STAGE}`;
}

const config: ApiGatewayManagementApiClientConfig = {
  region: process.env.REGION,
  endpoint,
};

@injectable()
export class WebSocketService implements IWebSocketService {
  apigwManagementApi: ApiGatewayManagementApiClient;
  tableName: string = process.env.ConnectionTableName;
  partitionKeyName: string = process.env.ConnectionTablePartitionKey;

  constructor(
    @inject(CacheService)
    private readonly cacheService: CacheService
  ) {}

  async handle(
    employeeId: string = '28758dac-a6a2-4f90-96ed-0a42a37d3fb3',
    body: any,
    connectionId: string,
    routeKey: string
  ) {
    try {
      console.log("[websocket] handle: ", connectionId, routeKey);
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
          console.log("$disconnect: ", connectionId);
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
      console.log("websocket deployed 28 Feb 2:41AM");
      console.log("[Websocket] sendMessage, data", data);
      const payload = JSON.parse(data);
      // const connectionId = payload.connectionId;
      const employeeId = payload.employeeId;
      delete payload.employeeId;
      // @TODO add joi validations on payload

      const connectionId = await this.getConnectionId(employeeId);
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
      // @TODO move this client to global scope
      const resp1 = await axios.get('https://www.google.com');
      console.log('resp1', resp1.status);
      const apiGateway = new ApiGatewayManagementApiClient(config);
      console.log("config", apiGateway.config);
      const resp = await apiGateway.send(command);
      console.log("resp?.$metadata", resp?.$metadata);
      return resp.$metadata;
    } catch (error) {
      console.error("error", error);
      return {
        ...error,
        _stack: error.stack,
      };
    }
  }

  private async getConnectionId(employeeId: string) {
    try {
      // console.log("[Websocket], getConnectionId, calling getItem");
      // const connectionItem = await this.dynamoService.getItem(
      //   this.tableName,
      //   this.partitionKeyName,
      //   employeeId
      // );

      // console.log(
      //   "[Websocket], getConnectionId, connectionItem",
      //   connectionItem
      // );
      // const connectionPayload = JSON.parse(connectionItem.Item?.data?.S);
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
}
