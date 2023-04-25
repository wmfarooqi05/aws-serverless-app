export const processPendingJobs = async (event: any) => {
  const records = event.Records;
  console.log("records", records);
  for (const record of records) {
    // const job = await dynamodb.get({
    //   TableName: 'Jobs',
    //   Key: {
    //     jobId: record.dynamodb.NewImage.jobId.S,
    //   },
    // }).promise();
    // job.Item.
    // await container.resolve(SQSService).enqueueItems()
  }
};
