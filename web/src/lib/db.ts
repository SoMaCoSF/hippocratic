// ==============================================================================
// file_id: SOM-LIB-0001-v1.0.0
// name: db.ts
// description: Database client singleton for embedded/cloud SQLite
// project_id: HIPPOCRATIC
// category: library
// tags: [database, turso, sqlite, libsql, embedded]
// created: 2026-01-28
// modified: 2026-01-28
// version: 1.1.0
// ==============================================================================

import { createClient, type Client } from "@libsql/client";
import path from "path";

let dbClient: Client | null = null;

export function getDb(): Client {
  if (!dbClient) {
    // Use Turso cloud if configured, otherwise use embedded local database
    if (process.env.TURSO_DATABASE_URL) {
      // Cloud mode (Turso)
      dbClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      // Embedded mode (local SQLite file)
      // In production (Vercel), the file is in the deployment root
      // In development, it's relative to the project
      const dbPath = path.join(process.cwd(), 'local.db');
      dbClient = createClient({
        url: `file:${dbPath}`,
      });
    }
  }
  return dbClient;
}
