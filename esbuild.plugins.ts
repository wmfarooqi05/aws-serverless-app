import esbuildPluginTsc from "@emarketeer/esbuild-plugin-tsc";

const esbuildPluginTscInitialized = esbuildPluginTsc({
  force: false,
});

module.exports = [esbuildPluginTscInitialized];
