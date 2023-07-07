import { injectable } from "tsyringe";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

@injectable()
export class SecretManager {
  secretManager: SecretsManagerClient;
  constructor() {
    console.log("process.env.AWS_REGION", process.env.AWS_REGION);
    this.secretManager = new SecretsManagerClient({
      region: process.env.AWS_REGION,
    });
  }
  async getValueFromSecretManager(SecretId: string) {
    const response = await this.secretManager.send(
      new GetSecretValueCommand({
        SecretId,
        VersionStage: "AWSCURRENT",
      })
    );
    return response.SecretString;
  }
}
