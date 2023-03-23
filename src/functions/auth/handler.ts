import "reflect-metadata";

import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";

export const callback: ValidatedEventAPIGatewayProxyEvent<any> =
  async (event) => {
    console.log('event callback', event);
    return formatJSONResponse({}, 200);
  };
