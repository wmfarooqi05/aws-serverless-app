import { sanitizeColumnNames } from "@common/query";
import CompanyModel from "@models/Company";
import EmployeeCompanyInteractionsModel from "@models/EmployeeCompanyInteractions";
import TeamCompanyInteractionsModel from "@models/TeamCompanyInteractions";
import {
  COMPANY_PRIORITY,
  COMPANY_STAGES,
  COMPANY_STATUS,
} from "@models/interfaces/Company";

export const getSelectKeys = (returningFields) => {
  const companyKeys = sanitizeColumnNames(
    CompanyModel.columnNames,
    returningFields,
    "c"
  );

  const employeeToCompanyKeys = sanitizeColumnNames(
    EmployeeCompanyInteractionsModel.validSchemaKeys,
    returningFields,
    "ec",
    true
  );

  const teamToCompanyKeys = sanitizeColumnNames(
    TeamCompanyInteractionsModel.validSchemaKeys,
    returningFields,
    "tc",
    true
  );

  const companyArray = Array.isArray(companyKeys) ? companyKeys : [companyKeys];
  const teamToCompanyArray = Array.isArray(teamToCompanyKeys)
    ? teamToCompanyKeys
    : [teamToCompanyKeys];
  const employeeToCompanyArray = Array.isArray(employeeToCompanyKeys)
    ? employeeToCompanyKeys
    : [employeeToCompanyKeys];

  return [...companyArray, ...teamToCompanyArray, ...employeeToCompanyArray];
};

export const validateCompanyWithInteractions = (companyItem) => {
  return {
    ...companyItem,
    priority: companyItem?.priority ?? COMPANY_PRIORITY.NO_PRIORITY,
    status: companyItem?.status ?? COMPANY_STATUS.NONE,
    notes: companyItem?.notes ?? [],
    employeeInteractionDetails: companyItem?.employeeInteractionDetails ?? {},
    stage: companyItem?.stage ?? COMPANY_STAGES.LEAD,
    teamInteractionDetails: companyItem?.teamInteractionDetails ?? {},
  };
};
