//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

// remove this
// const createAndSendEmail = {
//   handler: `${handlerPath(__dirname)}/handler.createAndSendEmail`,
//   events: [
//     {
//       http: {
//         method: "post",
//         path: "google/gmail/create-and-send-email",
//         cors: true,
//       },
//     },
//   ],
//   layers: [
//     "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
//   ],
// };

// remove this

// const scrapeGmail = {
//   handler: `${handlerPath(__dirname)}/handler.scrapeGmail`,
//   events: [
//     {
//       http: {
//         method: "post",
//         path: "google/gmail/scrape",
//         cors: true,
//       },
//     },
//   ],
//   layers: [
//     "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
//   ],
// };

