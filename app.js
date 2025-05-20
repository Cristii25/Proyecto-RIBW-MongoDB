const express = require("express");
const conectar = require("./db");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, "public")));

// Endpoint principal para buscar restaurantes y platos según filtros
app.post("/buscar", async (req, res) => {
  // Extrae los filtros enviados desde el cliente
  const {
    nombreRestaurante = "",
    incluir = [],
    excluir = [],
    tipo = [],
    familia = [],
    vegano = false,
    sinGluten = false,
    ordenPrecio = null
  } = req.body;

  const db = await conectar();
  const restaurantes = db.collection("restaurantes");

  // Determina si se ha aplicado algún filtro
  const hayFiltros =
    nombreRestaurante.trim() !== "" ||
    incluir.length > 0 ||
    excluir.length > 0 ||
    tipo.length > 0 ||
    familia.length > 0 ||
    vegano ||
    sinGluten ||
    ordenPrecio;

  // Si no hay filtros, devuelve todos los restaurantes ordenados por su _id
  if (!hayFiltros) {
    const resultado = await restaurantes.find({}).sort({ _id: 1 }).toArray();
    return res.json(resultado);
  }

  // Construye el pipeline de agregación para aplicar los filtros
  const pipeline = [
    // Si se ha indicado un nombre de restaurante, filtra por ese nombre (insensible a mayúsculas/minúsculas)
    ...(nombreRestaurante
      ? [{ $match: { _id: { $regex: new RegExp(nombreRestaurante, "i") } } }]
      : []),
    // Descompone el array de platos para trabajar con cada plato individualmente
    { $unwind: "$platos" },
    {
      // Aplica los filtros seleccionados por el usuario
      $match: {
        ...(incluir.length > 0 && {
          "platos.ingredientes": { $elemMatch: { $in: incluir } }
        }),
        ...(tipo.length > 0 && {
          "platos.tipo": { $in: tipo }
        }),
        ...(familia.length > 0 && {
          "platos.familia": { $in: familia }
        }),
        ...(vegano && {
          "platos.vegano": true
        }),
        ...(sinGluten && {
          "platos.sin_gluten": true
        })
      }
    },
    {
      // Añade un campo temporal con los ingredientes excluidos que aparecen en el plato
      $addFields: {
        "platos.ingredientesExcluidos": {
          $setIntersection: ["$platos.ingredientes", excluir]
        }
      }
    },
    {
      // Filtra los platos que no contienen ninguno de los ingredientes a excluir
      $match: {
        "platos.ingredientesExcluidos": { $size: 0 }
      }
    },
    // Ordena los platos por precio si se ha seleccionado una opción
    ...(ordenPrecio === "asc"
      ? [{ $sort: { "platos.precio": 1 } }]
      : ordenPrecio === "desc"
        ? [{ $sort: { "platos.precio": -1 } }]
        : []),
    {
      // Agrupa los platos de nuevo por restaurante
      $group: {
        _id: "$_id",
        platos: { $push: "$platos" }
      }
    },
    {
      // Elimina los restaurantes que no tienen platos tras aplicar los filtros
      $match: {
        "platos": { $ne: [] }
      }
    },
    // Ordena los restaurantes por su _id
    {
      $sort: { _id: 1 }
    }
  ];

  // Ejecuta el pipeline y devuelve los resultados
  const resultado = await restaurantes.aggregate(pipeline).toArray();
  res.json(resultado);
});

// Devuelve la lista de ingredientes únicos de todos los platos
app.get("/ingredientes", async (req, res) => {
  const db = await conectar();
  const restaurantes = db.collection("restaurantes");

  const ingredientes = await restaurantes.aggregate([
    { $unwind: "$platos" },
    { $unwind: "$platos.ingredientes" },
    {
      $group: {
        _id: null,
        ingredientes: { $addToSet: "$platos.ingredientes" }
      }
    },
    { $project: { _id: 0, ingredientes: 1 } }
  ]).toArray();

  const lista = ingredientes[0]?.ingredientes || [];
  lista.sort((a, b) => a.localeCompare(b));
  res.json(lista);
});

// Devuelve la lista de nombres de restaurantes
app.get("/restaurantes", async (req, res) => {
  const db = await conectar();
  const restaurantes = await db.collection("restaurantes").distinct("_id");
  res.json(restaurantes);
});

// Devuelve la lista de familias de platos únicas
app.get("/familias", async (req, res) => {
  const db = await conectar();
  const restaurantes = db.collection("restaurantes");

  const familias = await restaurantes.aggregate([
    { $unwind: "$platos" },
    {
      $group: {
        _id: null,
        familias: { $addToSet: "$platos.familia" }
      }
    },
    { $project: { _id: 0, familias: 1 } }
  ]).toArray();

  const lista = familias[0]?.familias || [];
  lista.sort((a, b) => a.localeCompare(b));
  res.json(lista);
});

// Devuelve la lista de tipos de platos únicos
app.get("/tipos", async (req, res) => {
  const db = await conectar();
  const restaurantes = await db.collection("restaurantes").find().toArray();

  const tipos = new Set();
  restaurantes.forEach(r => r.platos.forEach(p => tipos.add(p.tipo)));
  res.json([...tipos].sort());
});

// Busca platos por nombre (búsqueda parcial, insensible a mayúsculas/minúsculas)
app.post("/buscar-plato", async (req, res) => {
  const { nombrePlato = "" } = req.body;

  // Si no se proporciona un nombre, devuelve un error
  if (!nombrePlato.trim()) {
    return res.status(400).json({ error: "El nombre del plato es obligatorio." });
  }

  const db = await conectar();
  const restaurantes = db.collection("restaurantes");

  // Pipeline para buscar platos cuyo nombre contenga el texto introducido
  const pipeline = [
    { $unwind: "$platos" },
    {
      $match: {
        "platos.nombre": { $regex: new RegExp(nombrePlato, "i") } // Búsqueda parcial con regex
      }
    },
    {
      $project: {
        _id: 0,
        restaurante: "$_id",
        plato: "$platos"
      }
    }
  ];

  // Devuelve los platos encontrados junto con el restaurante al que pertenecen
  const resultado = await restaurantes.aggregate(pipeline).toArray();
  res.json(resultado);
});

// Inicia el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("✅ Servidor corriendo en http://localhost:3000");
});