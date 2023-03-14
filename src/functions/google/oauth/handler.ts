import "reflect-metadata";

import {
  INotificationModel,
  INotificationPaginated,
} from "@models/Notification";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";
import { GoogleOAuthService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import jwtMiddlewareWrapper from "@libs/middlewares/jwtMiddleware";

export const oauthHandlerWithUser: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  try {
    const response = await container
      .resolve(GoogleOAuthService)
      .getGoogleOauthRequestTokenByUser(event.headers.Origin, event.user?.sub);
    return formatJSONResponse(response, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const googleOauthCallbackHandler: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event, _context) => {
  try {
    const { code, state } = event.queryStringParameters;
    console.log("code", code);
    console.log("state", state);
    const returningUrl = JSON.parse(state)?.origin || "http://localhost:3000";
    const script: any = `<script type="text/javascript">
    window.opener.location.href='${returningUrl}/signin-successfull';
    window.close();
  </script>`;
    await container
      .resolve(GoogleOAuthService)
      .exchangeAuthCodeForAccessToken(code, state);
    const response = {
      statusCode: 200,
      body: script,
      headers: {
        "Content-Type": "text/html",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    };
    return response;
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const googleOauthExtendRefreshTokenHandler = async (event) => {
  try {
    await container
      .resolve(GoogleOAuthService)
      .googleOauthExtendRefreshTokenHandler(event.user?.sub);
    return formatJSONResponse({ message: "Token updated successfully" }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const googleOauthTokenScopeHandler = async (event) => {
  try {
    const resp = await container
      .resolve(GoogleOAuthService)
      .googleOauthTokenScope(event.user?.sub);
    return formatJSONResponse({ resp }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const oauthHandler = jwtMiddlewareWrapper(oauthHandlerWithUser);
export const googleOauthExtendRefreshToken = jwtMiddlewareWrapper(
  googleOauthExtendRefreshTokenHandler
);

export const googleOauthTokenScope = jwtMiddlewareWrapper(
  googleOauthTokenScopeHandler
);
