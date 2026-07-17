const path = require('node:path');
const {
  prepareOutputDir,
  runDashboardExtraction,
  getWorkspaceRoot,
  startEsbuildWatch,
  startStaticServer,
} = require('./esbuild-utils.cjs');

async function main() {
  const outputDir = path.join(getWorkspaceRoot(), '.dev-dist');
  runDashboardExtraction();
  await prepareOutputDir(outputDir);

  const esbuildProcess = await startEsbuildWatch(outputDir);
  const server = startStaticServer(outputDir, 5174);

  const shutdown = () => {
    server.close();
    if (!esbuildProcess.killed) {
      esbuildProcess.kill('SIGTERM');
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
