import { decode } from "jsonwebtoken";
import { APIGatewayProxyResult } from "aws-lambda";
import express from "express";

// import awsSlsExpress from '@vendia/serverless-express';
const app = express();
// import awsSlsExpress from 'aws-serverless-express';
const awsSlsExpress = require("@vendia/serverless-express");
import {
  createCompany,
  deleteCompany,
  getCompanyById,
  getCompanies,
  // getMyCompanies,
  getCompaniesByEmployeeId,
  updateCompany,
  updateCompanyInteractions,
  convertCompany,
  updateCompanyAssignedEmployee,
  updateCompaniesAssignedEmployee,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,
} from "./handler";

import {
  createContacts,
  updateContact,
  deleteContact,
  addEmail,
  deleteEmail,
  getAllContacts,
  getContactsByCompany,
  getContactById,
} from "./contacts/handler";
import {
  addContactEmailToEmailList,
  addEmailList,
  deleteContactEmailFromEmailList,
  deleteEmailList,
  getAllEmailLists,
  updateEmailList,
} from "./emailLists/handler";

app.use((req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
});

app.get("/companies", async (req, res) => {
  const resp = await getCompanies(req, {} as any);
  resHelper(res, resp);
});

app.get("/company/:companyId", async (req, res) => {
  const resp = await getCompanyById(req, {} as any);
  resHelper(res, resp);
});

app.post("/company", async (req, res) => {
  const resp = await createCompany(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId", async (req, res) => {
  const resp = await updateCompany(req, {} as any);
  resHelper(res, resp);
});

app.delete("/company/:companyId", async (req, res) => {
  const resp = await deleteCompany(req, {} as any);
  resHelper(res, resp);
});

app.get("/companies/employee/:employeeId", async (req, res) => {
  const resp = await getCompaniesByEmployeeId(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId/assign", async (req, res) => {
  const resp = await updateCompanyAssignedEmployee(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/assign", async (req, res) => {
  const resp = await updateCompaniesAssignedEmployee(req, {} as any);
  resHelper(res, resp);
});

app.post("/company/:companyId/contact", async (req, res) => {
  const resp = await createContacts(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId/contact/:contactId", async (req, res) => {
  const resp = await updateContact(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId/employee-interactions", async (req, res) => {
  const resp = await updateCompanyInteractions(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId/convert", async (req, res) => {
  const resp = await convertCompany(req, {} as any);
  resHelper(res, resp);
});

app.delete("/company/:companyId/contact/:contactId", async (req, res) => {
  const resp = await deleteContact(req, {} as any);
  resHelper(res, resp);
});

app.post("/company/:companyId/contact/:contactId/email", async (req, res) => {
  const resp = await addEmail(req, {} as any);
  resHelper(res, resp);
});

app.delete(
  "/company/:companyId/contact/:contactId/email/:emailId",
  async (req, res) => {
    const resp = await deleteEmail(req, {} as any);
    resHelper(res, resp);
  }
);

app.get("/company/:companyId/notes", async (req, res) => {
  const resp = await getNotes(req, {} as any);
  resHelper(res, resp);
});

app.post("/company/:companyId/notes", async (req, res) => {
  const resp = await createNotes(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId/notes/:notesId", async (req, res) => {
  const resp = await updateNotes(req, {} as any);
  resHelper(res, resp);
});

app.delete("/company/:companyId/notes/:notesId", async (req, res) => {
  const resp = await deleteNotes(req, {} as any);
  resHelper(res, resp);
});

// Email Lists

app.get("/email-list", async (req, res) => {
  const resp = await getAllEmailLists(req, {} as any);
  resHelper(res, resp);
});

app.post("/email-list", async (req, res) => {
  const resp = await addEmailList(req, {} as any);
  resHelper(res, resp);
});

app.put("/email-list/:emailListId", async (req, res) => {
  const resp = await updateEmailList(req, {} as any);
  resHelper(res, resp);
});

app.delete("/email-list/:emailListId", async (req, res) => {
  const resp = await deleteEmailList(req, {} as any);
  resHelper(res, resp);
});

app.post(
  "/email-list/:emailListId/contact-email/:contactEmailId",
  async (req, res) => {
    const resp = await addContactEmailToEmailList(req, {} as any);
    resHelper(res, resp);
  }
);

app.delete(
  "/email-list/:emailListId/contact-email/:contactEmailId",
  async (req, res) => {
    const resp = await deleteContactEmailFromEmailList(req, {} as any);
    resHelper(res, resp);
  }
);

app.get("/contact", async (req, res) => {
  const resp = await getAllContacts(req, {} as any);
  resHelper(res, resp);
});

app.get("/company/:companyId/contact", async (req,res)=>{
  const resp = await getContactsByCompany(req, {} as any);
  resHelper(res, resp);
});

app.get("/contact/:contactId", async (req,res)=>{
  const resp = await getContactById(req, {} as any);
  resHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

const resHelper = (res, apiResponse) => {
  res
    .status(apiResponse.statusCode || 200)
    .set(apiResponse.headers)
    .set("Content-Type", "application/json")
    .send(apiResponse.body);
};
