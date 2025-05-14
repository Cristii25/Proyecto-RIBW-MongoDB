const express = require("express");
const conectar = require("./db");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (HTML)
app.use(express.static(path.join(__dirname, "public")));

app.post("/buscar", async (req, res) => {
    const { incluir = [], excluir = [], vegano = false, sinGluten = false } = req.body;
  
    const db = await conectar();
    const restaurantes = db.collection("restaurantes");
  
    const pipeline = [
      { $unwind: "$platos" },
  
      // Filtrar por ingredientes a incluir (si hay)
      {
        $match: {
          ...(incluir.length > 0 && {
            "platos.ingredientes": { $elemMatch: { $in: incluir } }
          }),
          ...(vegano && {
            "platos.vegano": true
          }),
          ...(sinGluten && {
            "platos.sin_gluten": true
          })
        }
      },
  
      // Añadir campo temporal con ingredientes prohibidos encontrados
      {
        $addFields: {
          "platos.ingredientesExcluidos": {
            $setIntersection: ["$platos.ingredientes", excluir]
          }
        }
      },
  
      // Excluir platos que tienen alguno de los ingredientes prohibidos
      {
        $match: {
          "platos.ingredientesExcluidos": { $size: 0 }
        }
      },
  
      // Agrupar platos válidos por restaurante
      {
        $group: {
          _id: "$_id",
          platos: { $push: "$platos" }
        }
      },
  
      // Solo restaurantes con al menos un plato válido
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
    { $group: { _id: null, ingredientes: { $addToSet: "$platos.ingredientes" } } },
    { $project: { _id: 0, ingredientes: 1 } }
  ]).toArray();

  const lista = ingredientes[0]?.ingredientes || [];
  lista.sort((a, b) => a.localeCompare(b));
  res.json(lista);
});

app.listen(3000, () => {
  console.log("✅ Servidor corriendo en http://localhost:3000");
});
