import { Knex } from "knex";

export const invokeLambdaProcedure = "invoke_lambda_procedure";

// #CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE; permission issue, installed manually

const CREATE_INVOKE_LAMBDA_PROCEDURE = `
  CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;
  
  CREATE
  OR REPLACE FUNCTION ${invokeLambdaProcedure}() 
    RETURNS TRIGGER 
    LANGUAGE PLPGSQL 
    AS 
  $$ 
  BEGIN 
    IF cardinality(TG_ARGV) != 2 THEN 
      RAISE EXCEPTION 'Expected 2 parameters to respond_with_lambda function but got %', cardinality(TG_ARGV);
    ELSEIF TG_ARGV [0] = '' 
      THEN RAISE EXCEPTION 'Lambda name is empty';
    ELSEIF TG_ARGV [1] = '' 
      THEN RAISE EXCEPTION 'Lambda region is empty';
    ELSE 
      PERFORM * FROM aws_lambda.invoke(
            aws_commons.create_lambda_function_arn(TG_ARGV [0], TG_ARGV [1]),
            CONCAT(
              '{"jobId": "',
              NEW.jobId,
              '", "jobType": "',
              NEW.jobType,
              '", "created_at": "',
              TO_CHAR(NOW() :: timestamp, 'YYYY-MM-DD"T"HH24:MI:SS'),
              '"}'
            ) :: json,
            'Event'
        );
      RETURN NEW;
    END IF;
  END 
  $$;
`;

const DROP_INVOKE_LAMBDA_PROCEDURE = `DROP FUNCTION IF EXISTS ${invokeLambdaProcedure}`;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(CREATE_INVOKE_LAMBDA_PROCEDURE);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(DROP_INVOKE_LAMBDA_PROCEDURE);
}
