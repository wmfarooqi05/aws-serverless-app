import { handlerPath } from "@libs/handler-resolver";

const cognitoOAuthHandler: any = {
  handler: `${handlerPath(__dirname)}/handler.preTokenGenerationHandler`,
  events: [
    {
      cognitoUserPool: {
        pool: "ca-central-1_0BjGZxtC1",
        trigger: "PreTokenGeneration" as COGNITO_TRIGGER,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

if (process.env.NODE_ENV === "local") {
  cognitoOAuthHandler.events.push({
    http: {
      method: "post",
      path: "/token-generation",
      cors: true,
    },
  });
}

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
