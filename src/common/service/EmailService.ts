import { testEmailTemplate } from "@functions/activities/testemail";
import "reflect-metadata";
var SibApiV3Sdk = require('sib-api-v3-sdk');
import { injectable } from "tsyringe";

@injectable()
export class EmailService {
  client;
  constructor() {}

  async send(
    to: string,
    subject: string,
    html: string,
    from: string = process.env.DEFAULT_EMAIL_SENDER
  ) {
    // send grid add api key
    // const client = SIB.ApiClient.instance;
    // const apiKey = client.authentications["api-key"];
    // apiKey.apiKey = process.env.SEND_IN_BLUE_API_KEY;
    // const tranEmailApi = new SIB.TransactionalEmailsApi();
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    var apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.SEND_IN_BLUE_API_KEY;
    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: "wmfarooqi05@gmail.com",
      name: "Waleed Farooqi",
    };
    const receivers = [
      {
        email: "wmfarooqi70@gmail.com",
      },
    ];

    tranEmailApi
      .sendTransacEmail({
        sender,
        to: receivers,
        subject: "Subscribe to Cules Coding to become a developer",
        textContent: `
        Cules Coding will teach you how to become {{params.role}} a developer.
        `,
        htmlContent: testEmailTemplate,
        params: {
          role: "Frontend",
        },
      })
      .then((data) => console.log('then', data))
      .catch((data) => console.log('catch', data));
  }
}
