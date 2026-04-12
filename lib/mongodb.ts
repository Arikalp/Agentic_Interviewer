import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'agentic_interviewer';

const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

async function connectMongoClient(): Promise<MongoClient> {
  if (!mongoUri || !mongoUri.trim()) {
    throw new Error('Missing MongoDB configuration. Set MONGODB_URI.');
  }

  const client = new MongoClient(mongoUri.trim(), {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[MongoDB] Connection successful');
  }

  return client;
}

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise() {
  if (globalForMongo.mongoClientPromise) {
    return globalForMongo.mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = connectMongoClient().catch((error) => {
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

export async function getMongoDb() {
  const client = await getClientPromise();
  return client.db(mongoDbName);
}
