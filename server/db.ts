import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({ 
  connectionString,
  ssl: true,
  connectionTimeoutMillis: 30000, // Increased timeout
  idleTimeoutMillis: 30000, // Increased idle timeout
  max: 20, // Maximum pool size
  keepAlive: true, // Enable keepalive
  keepAliveInitialDelayMillis: 10000 // Keepalive delay
});

// Add comprehensive error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Attempt to reconnect rather than exit
  setTimeout(() => {
    console.log('Attempting to reconnect...');
    pool.connect().catch(console.error);
  }, 5000);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

export const db = drizzle({ client: pool, schema });