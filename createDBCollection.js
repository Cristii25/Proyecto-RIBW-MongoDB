const conectar = require("./db");
const fs = require("fs");
const path = require("path");

// Importa la colección de restaurantes
async function importDataAndCreateIndexes() {
  const db = await conectar();
  const coleccion = db.collection("restaurantes");

  // Leer archivo JSON
  const ruta = path.join(__dirname, "restaurantes.json");
  const datos = JSON.parse(fs.readFileSync(ruta, "utf-8"));

  // Insertar datos solo si la colección está vacía
  const existe = await coleccion.countDocuments();
  if (existe === 0) {
    await coleccion.insertMany(datos);
    console.log("✅ Datos JSON importados correctamente.");
  } else {
    console.log("ℹ️ La colección ya contiene datos. No se insertó nada nuevo.");
  }

  // Creación de índices para optimizar las consultas

  // Crear índice para buscar por ingredientes de los platos
  await coleccion.createIndex({ "platos.ingredientes": 1 });

  // Crear índice para buscar por tipo, familia, vegano y sin_gluten
  await coleccion.createIndex({
    "platos.tipo": 1,
    "platos.familia": 1,
    "platos.vegano": 1,
    "platos.sin_gluten": 1
  });

  // Crear índice para buscar por precio de plato
  await coleccion.createIndex({ "platos.precio": 1 });

  // Crear índice compuesto para buscar por tipo, familia, vegano y sin_gluten
  await coleccion.createIndex({ "platos.nombre": 1 });

  // Crear índice de texto para buscar por nombre de plato -> NO SE UTILIZA
  await restaurantes.createIndex({ "platos.nombre": "text" });

  console.log("✅ Índices creados correctamente.");
}

// Ejecutar la función de importación y creación de índices

importDataAndCreateIndexes()
  .then(() => process.exit())
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
