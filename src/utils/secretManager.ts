import axios from "axios";

const AWS_SECRETS_EXTENSION_HTTP_PORT = 4566; //2773;
const AWS_SECRETS_EXTENSION_SERVER_ENDPOINT = `http://localhost:${AWS_SECRETS_EXTENSION_HTTP_PORT}/secretsmanager/get?secretId=`;

export const getSecretValueFromSecretManager = async (
  secretName: string
): Promise<string> => {
  try {
    const url = `${AWS_SECRETS_EXTENSION_SERVER_ENDPOINT}${secretName}`;
    const response = await axios.get(url, {
      headers: {
        "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN!,
      },
    });
    // const response = await fetch(url, {
    //   method: "GET",
    //   headers: {
    //     "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN!,
    //   },
    // });
    console.log(response);

    // if (!response.ok) {
    //   throw new Error(
    //     `Error occurred while requesting secret ${secretName}. Responses status was ${response.status}`
    //   );
    // }

    // const secretContent = (await response.json()) as { SecretString: string };
    // return secretContent.SecretString;
  } catch (e) {
    console.error(e);
  }
};

// cloudfront/dev/signing-key-z5T6PD

// aws secretsmanager get-secret-value --endpoint-url http://localhost:4566 --region ca-central-1 cloudfront/dev/signing-key-z5T6PD --secret-string file://my-secret.json

// aws secretsmanager create-secret --endpoint-url http://localhost:4566 --region ca-central-1 --name cloudfront/dev/signing-key-z5T6PD --secret-string file:///Users/waleedfarooqi/projects/qasid/staffing/cdn_secrets.json

// aws secretsmanager get-secret-value --endpoint-url http://localhost:4566 --region ca-central-1 --secret-id cloudfront/dev/signing-key-z5T6PD

// aws secretsmanager delete-secret --endpoint-url http://localhost:4566 --region ca-central-1 --secret-id cloudfront/dev/signing-key-z5T6PD
