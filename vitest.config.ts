import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@indra/contracts': path.resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@indra/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
      '@indra/spi-adapters': path.resolve(__dirname, 'packages/spi-adapters/src/index.ts'),
      '@indra/policy-engine': path.resolve(__dirname, 'packages/policy-engine/src/index.ts'),
      '@indra/event-bus': path.resolve(__dirname, 'packages/event-bus/src/index.ts'),
      '@indra/capability-engine': path.resolve(__dirname, 'packages/capability-engine/src/index.ts'),
      '@indra/workflow-engine': path.resolve(__dirname, 'packages/workflow-engine/src/index.ts'),
      '@indra/intent-engine': path.resolve(__dirname, 'packages/intent-engine/src/index.ts'),
    },
  },
});
