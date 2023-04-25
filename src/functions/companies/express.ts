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
  createConcernedPersons,
  updateConcernedPerson,
  deleteConcernedPerson,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,
} from "./handler";

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

app.post("/company/:companyId/concerned-person", async (req, res) => {
  const resp = await createConcernedPersons(req, {} as any);
  resHelper(res, resp);
});

app.put(
  "/company/:companyId/concerned-person/:concernedPersonId",
  async (req, res) => {
    const resp = await updateConcernedPerson(req, {} as any);
    resHelper(res, resp);
  }
);

app.put("/company/:companyId/employee-interactions", async (req, res) => {
  const resp = await updateCompanyInteractions(req, {} as any);
  resHelper(res, resp);
});

app.put("/company/:companyId/convert", async (req, res) => {
  const resp = await convertCompany(req, {} as any);
  resHelper(res, resp);
});

app.delete(
  "/company/:companyId/concerned-person/:concernedPersonId",
  async (req, res) => {
    const resp = await deleteConcernedPerson(req, {} as any);
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

exports.handler = awsSlsExpress({ app });

const resHelper = (res, apiResponse) => {
  res
    .status(apiResponse.statusCode || 200)
    .set(apiResponse.headers)
    .set("Content-Type", "application/json")
    .send(apiResponse.body);
};