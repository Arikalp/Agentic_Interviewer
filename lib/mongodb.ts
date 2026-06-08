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

// Return a promise that resolves to a connected MongoClient, reusing
// cached promises when available. During development we also store the
// promise on `globalThis` so hot reloads don't spawn duplicate clients.
function getClientPromise() {
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

    if (process.env.NODE_ENV !== 'production') {
      globalForMongo.mongoClientPromise = clientPromise;
    }
  }

  return clientPromise;
}

// Public helper to obtain a connected `Db` instance using the configured
// database name. Consumers should `await getMongoDb()` before using it.
export async function getMongoDb() {
  const client = await getClientPromise();
  return client.db(mongoDbName);
}
