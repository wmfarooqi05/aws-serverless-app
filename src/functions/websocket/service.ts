import "reflect-metadata";
import {
  injectable,
  injectable,
  // injectable
} from "tsyringe";
import {
  PostToConnectionCommand,
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommandInput,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { formatJSONResponse } from "@libs/api-gateway";
import { CustomError } from "@helpers/custom-error";
// import { ElasticCacheService } from "@common/service/ElasticCache";
// import { ElasticCacheService } from "@common/service/ElasticCache";

export interface IWebSocketService {}

const url = `https://${process.env.APIG_WS_API_ID}.execute-api.${process.env.REGION}.amazonaws.com/${process.env.STAGE}`;
@injectable()
export class WebSocketService implements IWebSocketService {
  apigwManagementApi;
  constructor() {
    this.apigwManagementApi = new ApiGatewayManagementApiClient({ endpoint: url });

    // // private readonly elasticCache: ElasticCacheService // @injectable(ElasticCacheService)
    // this.apigwManagementApi = new ApiGatewayManagementApiClient({
    //   endpoint: `https://${process.env.APIG_WS_API_ID}.execute-api.${process.env.REGION}.amazonaws.com/${process.env.STAGE}`,
    //   region: process.env.REGION,
    // });
  }

  async handle(
    userId: string,
    body: any,
    connectionId: string,
    routeKey: string
  ) {

    switch (routeKey) {
      case "$connect":
        console.log('$connect', connectionId, body, routeKey);
        // await this.sendMessage(connectionId, `Received on connect: ${body}`);
        // await dynamodb.put({
        //   TableName: connectionTable,
        //   Item: {
        //     connectionId,
        //     // Expire the connection an hour later. This is optional, but recommended.
        //     // You will have to decide how often to time out and/or refresh the ttl.
        //     ttl: parseInt((Date.now() / 1000) + 3600)
        //   }
        // }).promise();
        break;

      case "$disconnect":
        console.log('$disconnect', connectionId, body, routeKey);
        await this.sendMessage(connectionId, `Received on disconnect: ${body}`)
        // await dynamodb.delete({
        //   TableName: connectionTable,
        //   Key: { connectionId }
        // }).promise();
        break;

      case "routeA":
          console.log('routeA', connectionId, body, routeKey);
          await this.sendMessage(connectionId, `Received on routeA: ${body}`)
        // await apiGateway
        //   .postToConnection({
        //     ConnectionId: connectionId,
        //     Data: `Received on routeA: ${body}`,
        //   })
        //   .promise();
        break;

      case "$default":
        console.log('$default', connectionId, body, routeKey);
        // await this.sendMessage(connectionId, `Received on $default: ${body}`)
      default:
        console.log('default', connectionId, body, routeKey);
        // await this.sendMessage(connectionId, `Received on default: ${body}`);
      // await apiGateway
      //   .postToConnection({
      //     ConnectionId: connectionId,
      //     Data: `Received on $default: ${body}`,
      //   })
      //   .promise();
    }

    // Return a 200 status to tell API Gateway the message was processed
    // successfully.
    // Otherwise, API Gateway will return a 500 to the client.
    return formatJSONResponse({ statusCode: 200 });
  }

  async sendMessage(connectionId: string, data: any = {}) {
    const a: Uint8Array = [];
    const input: PostToConnectionCommandInput = {
      ConnectionId: connectionId,
      Data: a,
    };
    const command = new PostToConnectionCommand(input);
    // async/await.

    try {
      const res = await this.apigwManagementApi.send(command)!;
      console.log("res", res);
    } catch (error) {
      // error handling.
      if (error.statusCode === 410) {
        console.log(`[ERROR] Connection ${connectionId} not found.`);
      } else {
        console.error(error);
      }
    } finally {
      // finally.
    }
  }

  async getAllConnections() {
    try {
      // Get Connections from DB
    } catch (e) {
      throw new CustomError(e.message, e.statusCode, e);
    }
  }
}
