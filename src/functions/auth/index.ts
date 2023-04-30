import { handlerPath } from "@libs/handler-resolver";

const cognitoOAuthHandler = {
  handler: `${handlerPath(__dirname)}/handler.preTokenGenerationHandler`,
  events: [
    {
      http: {
        method: "post",
        path: "/token-generation",
        cors: true,
      },
    },
    {
      cognitoUserPool: {
        pool: "ca-central-1_0BjGZxtC1",
        trigger: "PreTokenGeneration" as COGNITO_TRIGGER,
      },
    },
  ],
};

type COGNITO_TRIGGER =
  | "PreSignUp"
  | "PostConfirmation"
  | "PreAuthentication"
  | "PostAuthentication"
  | "PreTokenGeneration"
  | "CustomMessage"
  | "DefineAuthChallenge"
  | "CreateAuthChallenge"
  | "VerifyAuthChallengeResponse"
  | "UserMigration"
  | "CustomSMSSender"
  | "CustomEmailSender";

export { cognitoOAuthHandler };
