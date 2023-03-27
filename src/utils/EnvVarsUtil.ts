export const ensureConfigs = (configs: string[]): void => {
  configs.forEach((config) => {
    if (!process.env[config]) {
      throw new Error(`Environment variable '${config}' missing`);
    }
  });
};
