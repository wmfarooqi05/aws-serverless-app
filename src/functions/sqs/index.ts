//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const sqsJobQueueInvokeHandler = {
  handler: `${handlerPath(__dirname)}/handler.sqsJobQueueInvokeHandler`,
  events: [
    {
      sqs: {
        arn: `arn:aws:sqs:ca-central-1:524073432557:job_queue_dev`,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:jobs-packages:5",
    "arn:aws:lambda:ca-central-1:524073432557:layer:chromium-layer:1",
  ],
  timeout: 30,
};

if (process.env.NODE_ENV === "local") {
  sqsJobQueueInvokeHandler.events.push({
    http: {
      method: "post",
      path: "sqs-invoke-handler",
      cors: true,
    },
  } as any);
}

export { sqsJobQueueInvokeHandler };
