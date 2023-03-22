import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { google, Auth, calendar_v3 } from "googleapis";
import { EnvironmentVariableValidator } from "@common/utils/EnvironmentVariableValidator";
import moment from "moment-timezone";
import { CustomError } from "@helpers/custom-error";
import Joi from "joi";
import AuthTokenModel, { IAuthToken } from "@models/AuthToken";
import { DatabaseService } from "@libs/database/database-service-objection";

const SCOPE_FOR_AUTH = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

@injectable()
export class GoogleOAuthService {
  client: Auth.OAuth2Client;
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {
    this.initializeGoogleClient();
  }
  async initializeGoogleClient() {
    if (!this.client) {
      this.client = new google.auth.OAuth2({
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri: `${process.env.APP_BASE_URL}/${process.env.STAGE}/google/oauth/callback`, //this.getApUrl("/google/oauth-callback"),
      });
    }
  }

  async getAuthenticatedCalendarClient(
    employeeId: string
  ): Promise<calendar_v3.Calendar> {
    const client: Auth.OAuth2Client = await this.getOAuth2Client(employeeId);
    if (!client) {
      throw new CustomError("Token expired or not found", 400);
    }

    return google.calendar({ version: "v3", auth: client });
  }

  async googleOauthTokenScope(employeeId: string) {
    const token = await this.getRefreshedAccessToken(employeeId);

    const tokenInfo = await google.oauth2("v2").tokeninfo({
      access_token: token.accessToken,
    });
    return tokenInfo.data;
  }
  async getOAuth2Client(employeeId: string): Promise<Auth.OAuth2Client | null> {
    const token = await this.getRefreshedAccessToken(employeeId);
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

  async getGoogleOauthRequestTokenByEmployee(
    origin: string,
    employeeId: string
  ) {
    const response: any = { origin };
    const token: IAuthToken = await this.getGoogleOauthRequestTokenFromDB(
      employeeId
    );
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

  async getGoogleOauthRequestTokenFromDB(
    employeeId: string,
    checkExpired: boolean = true
  ): Promise<IAuthToken | null> {
    if (!employeeId) {
      throw new Error("EmployeeId not provided");
    }
    const token: IAuthToken = await AuthTokenModel.query().findOne({
      employeeId,
    });
    if (checkExpired && !this.isTokenValid(token?.expiryDate)) {
      return null;
    }
    return token;
  }

  async generateGoogleAuthenticationUrl(origin: string, employeeId: string) {
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

  deleteGoogleOAuthTokenByEmployeeId() {
    // delete from db
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

  async googleOauthExtendRefreshTokenHandler(employeeId: string) {
    await this.getRefreshedAccessToken(employeeId);
  }

  async getRefreshedAccessToken(
    employeeId,
    storeTokenInDB: boolean = true
  ): Promise<IAuthToken> {
    let token: IAuthToken = await this.getGoogleOauthRequestTokenFromDB(
      employeeId,
      false
    );
    if (!token) {
      throw new CustomError("Google OAuth Token doesn't exists", 400);
    }

    if (!this.isTokenValid(token.expiryDate)) {
      this.client.setCredentials({
        refresh_token: token.refreshToken,
      });
      const newToken = await this.client.refreshAccessToken();
      if (storeTokenInDB) {
        token = await this.storeTokenInDB(newToken.credentials, employeeId);
      } else {
        return {
          ...token,
          accessToken: newToken.credentials.access_token,
          expiryDate: moment.utc(newToken.credentials.expiry_date).format(),
        } as IAuthToken;
      }
    }
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
    const newToken: IAuthToken = await AuthTokenModel.query()
      .insert(tokenObj)
      .onConflict("employeeId")
      .merge();
    return newToken;
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
    EnvironmentVariableValidator.ensureConfigs("CLIENT_BASE_URL");
    return `${process.env.CLIENT_BASE_URL}${url}`;
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
}
