import { invokeLambdaProcedure } from "../migrations/20230716163543_invoke_lambda_on_trigger";
import { tableName } from "../tables";

const invokeLambdaOnInsertTrigger = "invoke_lambda_on_insert_trigger";
// const defaultArn = `arn:aws:lambda:${process.env.REGION}:${process.env.ACCOUNT_ID}:function:global-employment-dev-handleDynamoStreamRecords`;

const defaultArn =
  "arn:aws:lambda:ca-central-1:524073432557:function:http-crud-tutorial-function";

const defaultRegion = process.env.REGION || "ca-central-1";

export const onInsertLambdaTrigger = (
  lambdaArn: string = defaultArn,
  region: string = defaultRegion
) =>
  `
    DROP TRIGGER IF EXISTS ${invokeLambdaOnInsertTrigger} ON ${tableName.jobs};

    CREATE TRIGGER ${invokeLambdaOnInsertTrigger}
    AFTER
    INSERT
    ON ${tableName.jobs} FOR EACH ROW EXECUTE PROCEDURE ${invokeLambdaProcedure}("${lambdaArn}", "${region}");
  `;
