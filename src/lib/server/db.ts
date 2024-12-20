import { MongoClient } from "mongodb";
import { MONGODB_URL } from "$env/static/private";

const client = new MongoClient(MONGODB_URL);
await client.connect();

export const jpaDB = client.db("test");
export const jpaClanUsers = jpaDB.collection("cocs");