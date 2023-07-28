//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";
//@ts-ignore

const emailHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "emails/template",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "emails/send-bulk",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "emails/template/{templateId}/content",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "emails/template/{templateId}",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "emails/templates",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "emails/template",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "send-email",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "emails-by-contact/{contactEmail}",
        cors: true,
      },
    },
    // Email Lists
    {
      http: {
        method: "get",
        path: "email-list",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "email-list",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "email-list/{emailListId}/add-emails",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "email-list/{emailListId}/delete-emails",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "sync-emails",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "bulk-email",
        cors: true,
      },
    },
    // Email Apis
    {
      http: {
        method: "get",
        path: "email/get-my-emails",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "email/{emailId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "email/{emailId}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "email/move-to-folder",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:jobs-packages:5",
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:image-layer-v1:3",
  ],
};

const receiveEmailHandler = {
  handler: `${handlerPath(__dirname)}/handler.emailQueueInvokeHandler`,
  events: [
    {
      sqs: {
        arn: "arn:aws:sqs:${self:provider.region}:${aws:accountId}:EmailQueue",
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:jobs-packages:5",
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:image-layer-v1:3",
  ],
};

if (process.env.NODE_ENV === "local") {
  receiveEmailHandler.events.push({
    http: {
      method: "post",
      path: "receive-email-test",
      cors: true,
    },
  } as any);
}

// const handleEmailEvent = {
//   handler: `${handlerPath(__dirname)}/handler.handleEmailEvent`,
//   events: [
//     {
//       s3: {
//         bucket: "gel-api-dev-serverlessdeploymentbucket-d34v77eas9bz", // process.env.DEPLOYMENT_BUCKET,
//         event: "s3:ObjectCreated:*",
//         existing: true,
//         rules: [
//           {
//             prefix: "emails/", // Specify the subfolder path
//           },
//         ],
//       },
//     },
//   ],
// };

// const getEmails = {
//   handler: `${handlerPath(__dirname)}/handler.getEmails`,
//   events: [
//     {
//       http: {
//         method: "get",
//         path: "teams",
//         cors: true,
//       },
//     },
//   ],
// };

// const getEmailById = {
//   handler: `${handlerPath(__dirname)}/handler.getEmailById`,
//   events: [
//     {
//       http: {
//         method: "get",
//         path: "team/{teamId}",
//         cors: true,
//       },
//     },
//   ],
// };

// const updateEmail = {
//   handler: `${handlerPath(__dirname)}/handler.updateEmail`,
//   events: [
//     {
//       http: {
//         method: "put",
//         path: "team/{teamId}",
//         cors: true,
//       },
//     },
//   ],
// };

// const deleteEmail = {
//   handler: `${handlerPath(__dirname)}/handler.deleteEmail`,
//   events: [
//     {
//       http: {
//         method: "delete",
//         path: "team/{teamId}",
//         cors: true,
//       },
//     },
//   ],
// };

export {
  emailHandler,
  // sendEmail,
  // sendBulkEmails,
  receiveEmailHandler,
  // handleEmailEvent
};
