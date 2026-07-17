const path = require('node:path');
const {
  prepareOutputDir,
  runDashboardExtraction,
  runEsbuildOnce,
  getWorkspaceRoot,
} = require('./esbuild-utils.cjs');

async function main() {
  const outputDir = path.join(getWorkspaceRoot(), 'dist');
  runDashboardExtraction();
  await prepareOutputDir(outputDir);
  await runEsbuildOnce(outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
