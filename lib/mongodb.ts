/**
 * ============================================================
 * FILE: mongodb.ts
 * PURPOSE: MongoDB singleton connection manager
 * ============================================================
 *
 * WHY A SINGLETON?
 * In a serverless environment (like Next.js API routes), each
 * incoming request can spin up a new function instance. Without
 * connection pooling, each instance would create a brand-new
 * MongoClient connection, quickly exhausting the Atlas connection
 * limit.
 *
 * SOLUTION: Cache a single MongoClient Promise in module scope
 * (and optionally on `globalThis` in development to survive
 * hot-reloads). All API routes share the same live connection.
 *
 * ENVIRONMENT VARIABLES:
 *  - MONGODB_URI     : Full MongoDB Atlas connection string (required)
 *  - MONGODB_DB_NAME : Database name override (optional,
 *                      defaults to 'agentic_interviewer')
 *
 * USAGE:
 *   import { getMongoDb } from '@/lib/mongodb';
 *   const db = await getMongoDb();
 *   const doc = await db.collection('resumeInsights').findOne({ userId });
 * ============================================================
 */

import { MongoClient } from 'mongodb';

// Read configuration from environment. `MONGODB_DB_NAME` can be set
// to override the default database name used by helpers below.
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'agentic_interviewer';

// In serverless environments (like Next.js API routes or edge runtimes)
// we want to reuse a single MongoClient across invocations to avoid
// creating many concurrent connections. `globalThis` is used as a
// safe place to cache the promise during development. In production the
// runtime typically manages the process lifecycle.
const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

/**
 * connectMongoClient
 * ------------------
 * Creates a fresh MongoClient and connects to MongoDB Atlas.
 * This is a private function — callers should use `getMongoDb()`
 * which handles caching and avoids duplicate connections.
 *
 * WHY serverSelectionTimeoutMS: 10000?
 * The default MongoDB driver timeout is 30 seconds. Reducing it
 * to 10 seconds causes API routes to fail fast when the DB is
 * unreachable (e.g., wrong URI, network firewall) instead of
 * keeping the user waiting for 30 seconds.
 *
 * @throws Error if MONGODB_URI is missing or blank.
 */
// Create and connect a new MongoClient instance.
async function connectMongoClient(): Promise<MongoClient> {
  if (!mongoUri || !mongoUri.trim()) {
    throw new Error('Missing MongoDB configuration. Set MONGODB_URI.');
  }

  const client = new MongoClient(mongoUri.trim(), {
    // Short server selection timeout to fail fast when DB is unreachable.
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[MongoDB] Connection successful');
  }

  return client;
}

let clientPromise: Promise<MongoClient> | undefined;

/**
 * getClientPromise
 * ----------------
 * Returns a cached promise that resolves to a connected MongoClient.
 *
 * CACHING STRATEGY:
 *  - Production: Uses a module-level `clientPromise` variable.
 *    The module persists for the life of the Node.js process.
 *  - Development: Additionally stores the promise on `globalThis`
 *    so Next.js hot-reloads (which re-evaluate modules) don't
 *    spawn duplicate client instances.
 *
 * ERROR HANDLING:
 *  If the connection attempt fails, `clientPromise` is cleared
 *  so the next call will attempt a fresh connection (retry logic).
 */
// Return a promise that resolves to a connected MongoClient, reusing
// cached promises when available. During development we also store the
// promise on `globalThis` so hot reloads don't spawn duplicate clients.
function getClientPromise() {
  // Development: reuse the globalThis-cached promise if present
  if (globalForMongo.mongoClientPromise) {
    return globalForMongo.mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = connectMongoClient().catch((error) => {
      // Clear the cached reference on error so subsequent calls may retry.
      clientPromise = undefined;

      if (process.env.NODE_ENV !== 'production') {
        delete globalForMongo.mongoClientPromise;
      }

      throw error;
    });

    // Cache on globalThis in development to survive hot-reloads
    if (process.env.NODE_ENV !== 'production') {
      globalForMongo.mongoClientPromise = clientPromise;
    }
  }

  return clientPromise;
}

/**
 * getMongoDb (EXPORTED)
 * ----------------------
 * The main public API of this module. Returns a connected `Db`
 * instance using the configured database name.
 *
 * This should be the only import needed by API routes:
 *   const db = await getMongoDb();
 *   await db.collection('users').findOne({ ... });
 *
 * Internally reuses the cached MongoClient via `getClientPromise()`.
 *
 * @returns A connected MongoDB `Db` instance.
 * @throws  If MONGODB_URI is missing or the connection fails.
 */
// Public helper to obtain a connected `Db` instance using the configured
// database name. Consumers should `await getMongoDb()` before using it.
export async function getMongoDb() {
  const client = await getClientPromise();
  return client.db(mongoDbName);
}
