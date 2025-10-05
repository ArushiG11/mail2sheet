import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
export async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB || "autojobtrack");
}

export async function appsCol() {
  const db = await getDb();
  return db.collection(process.env.MONGODB_COLLECTION || "applications");
}

export async function usersCol() {
  const db = await getDb();
  return db.collection("users"); 
}