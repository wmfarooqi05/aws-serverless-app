import "reflect-metadata";
import { inject, singleton } from "tsyringe";
import { google, Auth, calendar_v3 } from "googleapis";
import { ensureConfigs } from "@utils/EnvVarsUtil";
import moment from "moment-timezone";
import { CustomError } from "@helpers/custom-error";
import Joi from "joi";
import AuthTokenModel, { IAuthToken } from "@models/AuthToken";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployee } from "@models/interfaces/Employees";
import EmployeeModel from "@models/Employees";

const SCOPE_FOR_AUTH = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

@singleton()
export class GoogleOAuthService {
  client: Auth.OAuth2Client;
  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {
    this.initializeGoogleClient();
  }
  async initializeGoogleClient() {
    if (!this.client) {
      this.client = new google.auth.OAuth2({
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri: this.getApUrl("/google/oauth/callback"),
      });
    }
  }

  async getOAuth2Client(employeeId: string): Promise<Auth.OAuth2Client | null> {
    const token = await this.getGoogleOauthRequestTokenFromDB(employeeId);
    if (token) {
      const credentials: Auth.Credentials = {
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
      };
      this.client.setCredentials(credentials);
      return this.client;
    }

    return null;
  }

  /**
   * This method will take an employeeId and
   * - First find its Googoel OAuth2.0 token in DB
   * - If no token exists in DB, it will return null
   * - In case token exists in DB, it will check if its expired
   * - In case of expiry, it will check if it has refresh token
   * - If Refresh token exists, it will try to get an updated token or return it
   *    otherwise it will return null;
   * @param employeeId
   * @returns
   */
  async getGoogleOauthRequestTokenFromDB(
    employeeId: string
  ): Promise<IAuthToken | null> {
    try {
      if (!employeeId) {
        throw new Error("EmployeeId not provided");
      }
      const token: IAuthToken = await AuthTokenModel.query().findOne({
        employeeId,
      });

      if (this.isTokenValid(token?.expiryDate)) {
        return token;
      } else if (token.refreshToken) {
        // Get a new token using Refresh Token
        const updatedToken = await this.getUpdatedTokenFromRefreshToken(
          token.refreshToken
        );
        await this.storeTokenInDB(updatedToken, employeeId);
        return {
          ...updatedToken,
          expiryDate: moment.utc(updatedToken.expiry_date).format(),
        } as IAuthToken;
      }
    } catch (e) {
      return null;
    } finally {
      return null;
    }
  }

  async getUpdatedTokenFromRefreshToken(refresh_token: string) {
    this.client.setCredentials({ refresh_token });
    try {
      // Use the OAuth2 client to refresh the access token
      const { credentials } = await this.client.refreshAccessToken();

      // Return the new access token
      return credentials;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to refresh access token");
    }
  }

  async exchangeAuthCodeForAccessToken(code: string, state: string) {
    const payload = JSON.parse(state);
    if (!payload.employeeId) {
      throw new Error("EmployeeId not found");
    }
    const token = await this.getAccessTokenByCode(code);
    console.log("[exchange] token", token);
    if (!token) {
      throw new Error("no token");
      // return;
    }
    // now store this token using employeeId
    await this.storeTokenInDB(token, payload.employeeId);
    return token;
  }

  // Move all these in helper class file
  async storeTokenInDB(
    token: Auth.Credentials,
    employeeId: string,
    tokenIssuer: string = "GOOGLE"
  ): Promise<IAuthToken> {
    const tokenObj: IAuthToken = {
      accessToken: token.access_token,
      expiryDate: moment.utc(token.expiry_date).format(),
      refreshToken: token.refresh_token,
      idToken: token.id_token,
      tokenIssuer,
      employeeId,
      tokenType: token.token_type,
    };

    /** @NOTES this will check if cognito email and google oauth email are same
    const tokenInfo = await this.getTokenInfo(token.access_token);
    const employee: IEmployee = await EmployeeModel.query().findById(employeeId);
    if (employee.email !== tokenInfo.email) {
      throw new CustomError(
        "The selected email does not match the logged-in employee's email.",
        400
      );
    }
   */

    // @TODO: Add check here
    // Get Employee Object, and compare if scope has same email as employee object
    const newToken: IAuthToken = await AuthTokenModel.query()
      .insert(tokenObj)
      .onConflict("employeeId")
      .merge();
    return newToken;
  }

  async getProfile(token: Auth.Credentials) {
    this.client.setCredentials(token);
  }

  async getAccessTokenByCode(code: string) {
    try {
      const tokens = await this.client.getToken(code);
      // @TODO validate token using joi
      console.log("[getAccessTokenByCode] token", tokens);
      await this.validateGoogleAccessTokens(tokens.tokens);
      return tokens.tokens;
    } catch (e) {
      console.log("[getAccessTokenByCode] error", e);
      if (e instanceof Error) {
        throw new CustomError(`[getAccessTokenByCode] ${e.message}`, 400);
      }
    }
  }

  isTokenValid(expiresAt: string | undefined): boolean {
    const expiresAtMoment = moment(expiresAt);
    return expiresAtMoment.isValid() && moment().diff(expiresAtMoment) < 0
      ? true
      : false;
  }
  getApUrl(url: string): string {
    ensureConfigs(["APP_BASE_URL", "STAGE"]);
    return `${process.env.APP_BASE_URL}/${process.env.STAGE}${url}`;
  }

  async validateGoogleAccessTokens(token: Auth.Credentials) {
    await Joi.object({
      refresh_token: Joi.string(),
      expiry_date: Joi.number().required(),
      access_token: Joi.string().required(),
      token_type: Joi.string().required(),
      id_token: Joi.string().required(),
      scope: Joi.string(),
    }).validateAsync(token, {
      abortEarly: true,
    });
  }

  async getGoogleOauthRequestTokenByEmployee(
    origin: string,
    employeeId: string
  ) {
    const response: any = { origin };
    const token: IAuthToken = await this.getGoogleOauthRequestTokenFromDB(
      employeeId
    );

    // Here, it will return either a token or null
    // In case of n

    if (!token) {
      const authUrl = await this.generateGoogleAuthenticationUrl(
        origin,
        employeeId
      );
      response.authUrl = authUrl;
    } else {
      response.isSignedIn = true;
      response.expiryDate = token.expiryDate;
    }

    return response;
  }

  private async generateGoogleAuthenticationUrl(
    origin: string,
    employeeId: string
  ) {
    const payload = { employeeId, origin }; // any payload we want to keep in token
    if (!this.client) {
      throw new Error("no client found");
      // await this.getAuthenticatedCalendarClient(employeeId);
    }
    return this.client.generateAuthUrl({
      access_type: "offline",
      state: JSON.stringify(payload),
      scope: SCOPE_FOR_AUTH,
    });
  }

  async getTokenInfo(access_token: Auth.Credentials["access_token"]) {
    return this.client.getTokenInfo(access_token);
  }

  /*** DEV ENDPOINTS */

  async googleOauthTokenScope(employeeId: string) {
    const token = await this.getGoogleOauthRequestTokenFromDB(employeeId);

    const tokenInfo = await google.oauth2("v2").tokeninfo({
      access_token: token.accessToken,
    });
    return tokenInfo.data;
  }
}
