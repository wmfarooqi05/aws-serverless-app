//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

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

export { sendEmail };
