import { expressResponseHelper } from "@utils/express";
import { Express } from "express";
import {
  addEmail,
  createContacts,
  deleteContact,
  deleteEmail,
  getAllContacts,
  getContactById,
  getContactsByCompany,
  updateContact,
  uploadOrReplaceAvatar,
} from "./handler";

export const contactEndpoints = (app: Express) => {
  app.post("/company/:companyId/contact", async (req, res) => {
    const resp = await createContacts(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.put("/company/:companyId/contact/:contactId", async (req, res) => {
    const resp = await updateContact(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.put("/company/:companyId/contact/:contactId/avatar", async (req, res) => {
    const resp = await uploadOrReplaceAvatar(req, {} as any);
    expressResponseHelper(res, resp);
  });


  app.delete("/company/:companyId/contact/:contactId", async (req, res) => {
    const resp = await deleteContact(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.post("/company/:companyId/contact/:contactId/email", async (req, res) => {
    const resp = await addEmail(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.delete(
    "/company/:companyId/contact/:contactId/email/:emailId",
    async (req, res) => {
      const resp = await deleteEmail(req, {} as any);
      expressResponseHelper(res, resp);
    }
  );

  app.get("/contact", async (req, res) => {
    const resp = await getAllContacts(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.get("/company/:companyId/contact", async (req, res) => {
    const resp = await getContactsByCompany(req, {} as any);
    expressResponseHelper(res, resp);
  });

  app.get("/contact/:contactId", async (req, res) => {
    const resp = await getContactById(req, {} as any);
    expressResponseHelper(res, resp);
  });
};
  