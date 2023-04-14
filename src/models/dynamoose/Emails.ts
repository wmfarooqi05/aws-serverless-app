import { Schema, model } from "dynamoose";
import moment from "moment-timezone";

// Define the schema for the first table
export const EmailSchema = new Schema(
  {
    id: {
      type: String,
      hashKey: true,
    },
    emailData: {
      type: Object,
      schema: {
        secondaryId: String,
        subject: {
          required: true,
          type: String,
        },
        body: {
          required: true,
          type: String,
        },
      },
    },
    senderId: {
      required: true,
      type: String,
    },
    senderEmail: {
      required: true,
      type: String,
    },
    ccList: String,
    bccList: String,
    recipientId: String,
    recipientEmail: {
      type: String,
      required: true,
    },
    companyId: String,
    serviceProvider: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
    createdAt: {
      type: String,
      default: moment().utc().format(),
    },
    updatedAt: {
      type: String,
      default: moment().utc().format(),
    },
  },
);

// Create the first table model
export const EmailModel = model("Emails", EmailSchema);

export default EmailModel;
