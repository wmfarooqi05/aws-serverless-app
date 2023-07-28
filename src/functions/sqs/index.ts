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
    // "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:image-layer-v1:3",
  ],
  // timeout: 5,
};

const imageVariationJob = {
  handler: `${handlerPath(__dirname)}/jobs/imageVariationJob.handler`,
  events: [
    {
      sqs: {
        arn:
          "arn:aws:sqs:${self:provider.region}:${aws:accountId}:media_queue_" +
          process.env.NODE_ENV,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:image-layer-v1:4",
  ],
  timeout: 10,
};

if (process.env.NODE_ENV === "local") {
  sqsJobQueueInvokeHandler.events.push({
    http: {
      method: "post",
      path: "sqs-invoke-handler",
      cors: true,
    },
  } as any);

  imageVariationJob.events.push({
    http: {
      method: "post",
      path: "image-variation",
      cors: true,
    },
  } as any);
}

export { sqsJobQueueInvokeHandler, imageVariationJob };
