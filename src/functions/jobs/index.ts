//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const importData = {
  handler: `${handlerPath(__dirname)}/import.importData`,
  events: [
    {
      http: {
        method: "post",
        path: "/jobs/importData",
        cors: true,
      },
    },
  ],
};

// const uploadCompanyData = {
//   handler: `${handlerPath(__dirname)}/import.uploadCompanyData`,
//   events: [
//     {
//       http: {
//         method: "get",
//         path: "/upload-company-data",
//         cors: true,
//       },
//     },
//   ],
// };
export { importData };
