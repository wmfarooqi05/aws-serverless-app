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
import jwtMiddlewareWrapper from "@middlewares/jwtMiddleware";

export const oauthHandlerWithEmployeeHandler: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  try {
    const response = await container
      .resolve(GoogleOAuthService)
      .getGoogleOauthRequestTokenByEmployee(
        event.headers.origin,
        event.employee?.sub
      );
    return formatJSONResponse(response, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const googleOauthCallbackHandler = async (event) => {
  try {
    const { code, state } = event.query;
    const returningUrl = JSON.parse(state)?.origin;
    const script: any = `
    <script type="text/javascript">
      if (window.opener) {
        window.opener.location.href = "${returningUrl}/signin-successfull";
        window.close();
      } else {
        window.location.href = "${returningUrl}/signin-successfull";
      }
    </script>
    `;
    await container
      .resolve(GoogleOAuthService)
      .exchangeAuthCodeForAccessToken(code, state);
    return {
      statusCode: 200,
      body: script,
      contentType: "text/html",
    };
    // return response;
    // return formatJSONResponse(script);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// check if we want this, or already covered in get token
export const googleOauthExtendRefreshTokenHandler = async (event) => {
  try {
    const updatedToken = container
      .resolve(GoogleOAuthService)
      .getGoogleOauthRequestTokenFromDB(event.employee?.sub);
    return formatJSONResponse(updatedToken, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// @DEV
export const googleOauthTokenScopeHandler = async (event) => {
  try {
    const resp = await container
      .resolve(GoogleOAuthService)
      .googleOauthTokenScope(event.employee?.sub);
    return formatJSONResponse({ resp }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const oauthHandlerWithEmployee = jwtMiddlewareWrapper(
  oauthHandlerWithEmployeeHandler
);
export const googleOauthExtendRefreshToken = jwtMiddlewareWrapper(
  googleOauthExtendRefreshTokenHandler
);

export const googleOauthTokenScope = jwtMiddlewareWrapper(
  googleOauthTokenScopeHandler
);
