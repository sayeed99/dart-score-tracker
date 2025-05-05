import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// Define the Drizzle configuration
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
