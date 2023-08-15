import { Express } from "express";
import {
  googleOauthCallbackHandler,
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,
  oauthHandlerWithEmployee,
} from "./oauth/handler";
import { expressResponseHelper } from "@utils/express";
import { getAllCalendars } from "./calendar/handler";

export const integrateGoogleEndpoints = (app: Express) => {
  app.post("/google/oauth", async (req, res) => {
    const resp = await oauthHandlerWithEmployee(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.post("/google/oauth/extendToken", async (req, res) => {
    const resp = await googleOauthExtendRefreshToken(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.post("/google/oauth/googleOauthTokenScope", async (req, res) => {
    const resp = await googleOauthTokenScope(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.get("/google/oauth/callback", async (req, res) => {
    const resp = await googleOauthCallbackHandler(req);
    expressResponseHelper(res, resp);
  });

  app.get("/google/calendars", async (req, res) => {
    const resp = await getAllCalendars(req, {} as any);
    expressResponseHelper(res, resp);
  });
};
