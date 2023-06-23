//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const sqsJobQueueInvokeHandler = {
  handler: `${handlerPath(__dirname)}/handler.sqsJobQueueInvokeHandler`,
  events: [
    {
      sqs: {
        arn: "arn:aws:sqs:${self:provider.region}:${aws:accountId}:job_queue_dev",
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:jobs-packages:5",
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
    // "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:image-layer-v1:2",
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
