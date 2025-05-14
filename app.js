const express = require("express");
const conectar = require("./db");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.post("/buscar", async (req, res) => {
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
  
    const hayFiltros =
      nombreRestaurante.trim() !== "" ||
      incluir.length > 0 ||
      excluir.length > 0 ||
      tipo.length > 0 ||
      familia.length > 0 ||
      vegano ||
      sinGluten ||
      ordenPrecio;
  
    // Si no hay filtros, devolver todos los restaurantes y platos
    if (!hayFiltros) {
      const resultado = await restaurantes.find({}).toArray();
      return res.json(resultado);
    }
  
    const pipeline = [
      ...(nombreRestaurante
        ? [{ $match: { _id: { $regex: new RegExp(nombreRestaurante, "i") } } }]
        : []),
      { $unwind: "$platos" },
      {
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
        $addFields: {
          "platos.ingredientesExcluidos": {
            $setIntersection: ["$platos.ingredientes", excluir]
          }
        }
      },
      {
        $match: {
          "platos.ingredientesExcluidos": { $size: 0 }
        }
      },
      ...(ordenPrecio === "asc"
        ? [{ $sort: { "platos.precio": 1 } }]
        : ordenPrecio === "desc"
        ? [{ $sort: { "platos.precio": -1 } }]
        : []),
      {
        $group: {
          _id: "$_id",
          platos: { $push: "$platos" }
        }
      },
      {
        $match: {
          "platos": { $ne: [] }
        }
      }
    ];
  
    const resultado = await restaurantes.aggregate(pipeline).toArray();
    res.json(resultado);
  });
  
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

  app.get("/restaurantes", async (req, res) => {
    const db = await conectar();
    const restaurantes = await db.collection("restaurantes").distinct("_id");
    res.json(restaurantes);
  });  
  
  app.listen(3000, () => {
    console.log("✅ Servidor corriendo en http://localhost:3000");
  });