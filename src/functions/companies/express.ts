import express from "express";
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
  getContactsByCompanyForEmailList,
  uploadOrReplaceAvatar,
} from "./handler";

import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";
import { contactEndpoints } from "./contacts/express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");

app.use(expressInputParseMiddleware);

app.get("/companies", async (req, res) => {
  const resp = await getCompanies(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/company/:companyId", async (req, res) => {
  const resp = await getCompanyById(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/company", async (req, res) => {
  const resp = await createCompany(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/:companyId", async (req, res) => {
  const resp = await updateCompany(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/:companyId/avatar", async (req, res) => {
  const resp = await uploadOrReplaceAvatar(req, {} as any);
  expressResponseHelper(res, resp);
});

app.delete("/company/:companyId", async (req, res) => {
  const resp = await deleteCompany(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/companies/employee/:employeeId", async (req, res) => {
  const resp = await getCompaniesByEmployeeId(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/companies/email-list-contacts", async (req, res) => {
  const resp = await getContactsByCompanyForEmailList(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/:companyId/assign", async (req, res) => {
  const resp = await updateCompanyAssignedEmployee(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/assign", async (req, res) => {
  const resp = await updateCompaniesAssignedEmployee(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/:companyId/employee-interactions", async (req, res) => {
  const resp = await updateCompanyInteractions(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/:companyId/convert", async (req, res) => {
  const resp = await convertCompany(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/company/:companyId/notes", async (req, res) => {
  const resp = await getNotes(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/company/:companyId/notes", async (req, res) => {
  const resp = await createNotes(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/company/:companyId/notes/:notesId", async (req, res) => {
  const resp = await updateNotes(req, {} as any);
  expressResponseHelper(res, resp);
});

app.delete("/company/:companyId/notes/:notesId", async (req, res) => {
  const resp = await deleteNotes(req, {} as any);
  expressResponseHelper(res, resp);
});

contactEndpoints(app);

exports.handler = awsSlsExpress({ app });
