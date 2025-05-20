const conectar = require("./db");

// Este script se encarga de crear varios índices en la colección 'restaurantes'.
// Los índices ayudan a que las búsquedas y filtrados sean mucho más rápidos y eficientes.

async function createIndexes() {
  const db = await conectar();
  const restaurantes = db.collection("restaurantes");

  // Índice para buscar rápidamente platos por ingredientes
  await restaurantes.createIndex({ "platos.ingredientes": 1 });

  // Índice compuesto para filtrar platos por tipo, familia, si son veganos y si no tienen gluten
  await restaurantes.createIndex({
    "platos.tipo": 1,
    "platos.familia": 1,
    "platos.vegano": 1,
    "platos.sin_gluten": 1
  });

  // Índice para ordenar o buscar platos por precio
  await restaurantes.createIndex({ "platos.precio": 1 });

  // Índice para buscar platos por nombre (útil para búsquedas rápidas por nombre)
  await restaurantes.createIndex({ "platos.nombre": 1 });

  // Índice en el campo _id, que normalmente es el nombre del restaurante
  await restaurantes.createIndex({ _id: 1 });

  console.log("✅ Índices creados correctamente.");
}

// Ejecuta la función para crear los índices
createIndexes();
