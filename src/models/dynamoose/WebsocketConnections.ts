import { Schema, model } from "dynamoose";
import moment from "moment-timezone";
import { WEBSOCKET_CONNECTIONS_TABLE } from ".";

export type CONNECTION_STATUS =
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "UNKNOWN"
  | "CLOSED";
export interface IWebsocketConnection {
  employeeId: string;
  connectionId: string;
  connectedAt: string;
  connectionStatus: CONNECTION_STATUS;
  createdAt?: string;
  updatedAt?: string;
}

// Define the schema for the first table
export const WebsocketConnectionSchema = new Schema(
  {
    employeeId: {
      type: String,
      hashKey: true,
    },
    connectionId: {
      required: true,
      type: String,
      index: {
        global: true,
        name: "ConnectionIdIndex",
        rangeKey: "employeeId",
      },
    },
    connectedAt: {
      required: true,
      type: String,
    },
    connectionStatus: {
      required: true,
      type: String,
    },
    createdAt: {
      type: String,
      default: moment().utc().format(),
    },
    updatedAt: {
      type: String,
      default: moment().utc().format(),
    },
  },
  {
    saveUnknown: true,
  }
);

// Create the first table model
export const WebsocketConnectionModel = model(
  WEBSOCKET_CONNECTIONS_TABLE,
  WebsocketConnectionSchema
);

export default WebsocketConnectionModel;
