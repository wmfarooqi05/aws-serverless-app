import { validateRequestByEmployeeRole } from "@common/helpers/permissions";
import { CustomError } from "@helpers/custom-error";
import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { container } from "tsyringe";

export const getParamKeyValueFromEvent = (event, key: string) => {
  if (event?.queryStringParameters?.[key]) {
    return event?.queryStringParameters?.[key];
  } else if (event.pathParameters) {
    const { companyId } = event.pathParameters;
    if (companyId) {
      return companyId;
    }
  } else if (event.body) {
    const payload = JSON.parse(event.body);
    if (payload[key]) {
      return payload[key];
    }
  }

  throw new CustomError("Param key not found", 400);
};

export const validateForSpecialPermission = async (
  event: any,
  tableName: string = null,
  urlParamKey: string = null,
  employeeRelationKey: string = null
): Promise<boolean> => {
  if (!tableName || !employeeRelationKey || !urlParamKey) {
    return false;
  }
  try {
    const value = getParamKeyValueFromEvent(event, urlParamKey);
    const knexClient = container.resolve(DatabaseService).getKnexClient();
    return validateRequestByEmployeeRole(
      event.employee as IEmployeeJwt,
      tableName,
      value,
      employeeRelationKey,
      knexClient
    );
  } catch (e) {
    return false;
  }
};
