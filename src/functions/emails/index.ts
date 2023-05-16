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
  ],
  layers: ["arn:aws:lambda:ca-central-1:524073432557:layer:jobs-packages:2"],
};

const sendEmail = {
  handler: `${handlerPath(__dirname)}/handler.sendEmail`,
  events: [
    {
      http: {
        method: "post",
        path: "email",
        cors: true,
      },
    },
  ],
};

const sendBulkEmails = {
  handler: `${handlerPath(__dirname)}/handler.sendBulkEmails`,
  events: [
    {
      http: {
        method: "post",
        path: "bulk-email",
        cors: true,
      },
    },
  ],
};

const sendEmailText = {
  handler: `${handlerPath(__dirname)}/handler.sendEmailText`,
  events: [
    {
      http: {
        method: "post",
        path: "send-email-test",
        cors: true,
      },
    },
  ],
};

const receiveEmailHandler = {
  handler: `${handlerPath(__dirname)}/handler.receiveEmailHandler`,
  events: [
    {
      http: {
        method: "post",
        path: "receive-email-test",
        cors: true,
      },
    },
  ],
};

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
  sendEmail,
  sendBulkEmails,
  sendEmailText,
  receiveEmailHandler,
  // handleEmailEvent
};
