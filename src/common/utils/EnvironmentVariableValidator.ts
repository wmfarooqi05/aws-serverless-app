export class EnvironmentVariableValidator {
  static ensureConfigs(...configs: string[]) {
    configs.forEach((config) => {
      if (!process.env[config]) {
        throw new Error(`Environment Variable '${config}' missing`);
      }
    });
  }
}
