const conectar = require("./db");

async function createIndexes() {
  const db = await conectar();
  const restaurantes = db.collection("restaurantes");

  await restaurantes.createIndex({ "platos.ingredientes": 1 });
  await restaurantes.createIndex({
    "platos.tipo": 1,
    "platos.familia": 1,
    "platos.vegano": 1,
    "platos.sin_gluten": 1
  });
  await restaurantes.createIndex({ "platos.precio": 1 });
  await restaurantes.createIndex({ "platos.nombre": 1 }); // reemplazo del text
  await restaurantes.createIndex({ _id: 1 });

  console.log("✅ Índices creados correctamente.");
}

createIndexes();
