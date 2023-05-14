import { randomUUID } from "crypto";
import { Schema, model } from "dynamoose";
import moment from "moment-timezone";

// Define the schema for the first table
export const EmailRecordsSchema = new Schema({
  id: {
    type: String,
    hashKey: true,
    default: randomUUID(),
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
  emailType: {
    type: String,
    required: true,
    enum: ["SENDING", "SENT", "INCOMING", "DRAFT", "SENDING_FAILED"],
    default: "SENDING",
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
});

// Create the first table model
export const EmailRecordsModel = model("EmailRecords", EmailRecordsSchema);

export default EmailRecordsModel;
