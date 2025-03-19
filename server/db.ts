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
  connectionTimeoutMillis: 60000, 
  idleTimeoutMillis: 60000, 
  max: 50, 
  min: 5, 
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000, 
  acquireTimeoutMillis: 30000, 
  retryIntervalMillis: 1000, 
  maxRetries: 5 
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

// Add connection acquisition error handling
pool.on('acquire', () => {
  console.log('Client acquired from pool');
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

export const db = drizzle({ client: pool, schema });