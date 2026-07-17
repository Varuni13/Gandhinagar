const path = require('node:path');
const {
  getWorkspaceRoot,
  startStaticServer,
} = require('./esbuild-utils.cjs');

function main() {
  const outputDir = path.join(getWorkspaceRoot(), 'dist');
  const server = startStaticServer(outputDir, 4173);

  const shutdown = () => {
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
