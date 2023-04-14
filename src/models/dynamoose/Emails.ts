import { Schema, model } from "dynamoose";

// Define the schema for the first table
const EmailSchema = new Schema({
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
  sentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  serviceProvider: {
    type: String,
    required: true,
  },
  updatedBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, {
  timestamps: {
    createdAt: ["createDate", "creation"],
    updatedAt: ["updateDate", "updated"]
  }
});

// Create the first table model
export const EmailModel = model("Emails", EmailSchema);
