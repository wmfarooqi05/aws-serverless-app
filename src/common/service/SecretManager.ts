import { singleton } from "tsyringe";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

@singleton()
export class SecretManager {
  secretManager: SecretsManagerClient;
  constructor() {
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
