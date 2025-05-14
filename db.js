const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

let db;

async function conectar() {
  if (!db) {
    await client.connect();
    db = client.db("restaurantes"); // nombre de tu base de datos
  }
  return db;
}

module.exports = conectar;
