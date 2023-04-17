import { validateRequestByEmployeeRole } from "@common/helpers/permissions";
import { CustomError } from "@helpers/custom-error";
import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { container } from "tsyringe";

// PUT SOME COMMENTS TO UNDERSTAND
export const getParamKeyValueFromEvent = (event, key: string) => {
  if (event?.queryStringParameters?.[key]) {
    return event?.queryStringParameters?.[key];
  } else if (event.pathParameters) {
    // why company id?
    // const { companyId } = event.pathParameters;
    if (event.pathParameters[key]) {
      return event.pathParameters[key];
    }
  } else if (event.body) {
    const payload = JSON.parse(event.body);
    if (payload[key]) {
      return payload[key];
    }
  }

  throw new CustomError("Param key not found", 400);
};

export const checkIfPermittedWithSpecialPermission = async (
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
