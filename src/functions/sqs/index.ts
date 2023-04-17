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
};

export { sqsJobQueueInvokeHandler };
