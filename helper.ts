import { ensureConfigs } from "src/utils/EnvVarsUtil";

export const ensureEnvConfigs = () => {
  ensureConfigs([
    "STAGE",
    "REGION",
    "TIMEOUT",

    "DB_HOSTNAME",
    "DB_NAME",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_PORT",

    "EMPLOYEES_TABLE",
    "ACTIVITIES_TABLE",
    "COMPANIES_TABLE",
    "PENDING_APPROVAL_TABLE",
    "NOTIFICATIONS_TABLE",
    "REMINDERS_TABLE",
    "AUTH_TOKENS",
    "JOBS_RESULTS",
    "UPDATE_HISTORY_TABLE",

    "DEPLOYMENT_BUCKET",
    "ELASTIC_CACHE_SERVER",

    "APIG_WS_API_ID",

    "AWS_SCHEDULER_REGION",
    "REMINDER_TARGET_ROLE_ARN",
    "REMINDER_SCHEDULER_GROUP_ARN",
    "REMINDER_SCHEDULER_GROUP_NAME",
    "REMINDER_TARGET_LAMBDA",

    "ConnectionTableName",
    "ConnectionTablePartitionKey",

    "APP_BASE_URL",

    "VPC_ID",
    "PRIVATE_SUBNET_1",
    "PRIVATE_SUBNET_2",
    "PRIVATE_SUBNET_3",
    "PUBLIC_SUBNET_1",
    "PUBLIC_SUBNET_2",
    "VPC_SECURITY_GROUP",

    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",

    "JOBS_FOLDER",
    "AWS_ACCOUNT_ID",
    "USER_POOL_ID",
  ]);
};