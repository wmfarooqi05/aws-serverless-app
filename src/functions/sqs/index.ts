//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const sqsJobQueueInvokeHandler = {
  handler: `${handlerPath(__dirname)}/handler.sqsJobQueueInvokeHandler`,
  events: [
    {
      sqs: {
        arn: `arn:aws:sqs:ca-central-1:524073432557:job-queue-dev`,
      },
    },
    {
      http: {
        method: "post",
        path: "job-queue",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export { sqsJobQueueInvokeHandler };
