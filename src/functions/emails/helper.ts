import {
  SESClient,
  SendBulkTemplatedEmailCommand,
  SendBulkTemplatedEmailCommandInput,
  SendEmailCommandInput,
  SendBulkTemplatedEmailRequest,
} from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "us-west-2" }); // replace with your desired region

const params = {
  Source: "admin@elywork.com",
  Template: "your_template_name",
  DefaultTemplateData: JSON.stringify({ name: "John", product: "XYZ" }),
  Destinations: [
    {
      Destination: { ToAddresses: ["john@example.com"] },
      ReplacementTemplateData: JSON.stringify({ name: "John", product: "XYZ" }),
    },
    {
      Destination: { ToAddresses: ["jane@example.com"] },
      ReplacementTemplateData: JSON.stringify({ name: "Jane", product: "ABC" }),
    },
  ],
};

const sendBulkEmail = async () => {
  try {
    const param1: SendBulkTemplatedEmailCommandInput = {
      Template: "",
    }
    const command = new SendBulkTemplatedEmailCommand(params);
    const result = await ses.send(command);
    console.log(result);
  } catch (error) {
    console.error(error);
  }
};

sendBulkEmail();
