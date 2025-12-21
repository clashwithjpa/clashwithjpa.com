import { execSync } from 'child_process';
import { renameSync } from 'fs';
import 'dotenv/config';

console.log('Running drizzle-kit pull...');
execSync('drizzle-kit pull', { stdio: 'inherit' });

console.log('drizzle-kit pull completed successfully.');

// Define source and destination paths
const SOURCE_DIR = process.env.DRIZZLE_MIGRATIONS_PATH || './drizzle';
const DEST_DIR = process.env.DRIZZLE_SCHEMA_PATH || './src/lib/server/db/schema';

// // Ensure destination directory exists
// mkdirSync(DEST_DIR, { recursive: true });

// Move files
renameSync(`${SOURCE_DIR}/coc.ts`, `${DEST_DIR}/coc.ts`);
renameSync(`${SOURCE_DIR}/relations.ts`, `${DEST_DIR}/relations.ts`);

console.log(`Files moved to ${DEST_DIR}`);

// Delete Files
// unlinkSync(`${SOURCE_DIR}/schema.ts`);
// unlinkSync(`${SOURCE_DIR}/relations.ts`);

// console.log('Files deleted');
