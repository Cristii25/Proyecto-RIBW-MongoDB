const conectar = require("./db");

async function testIndexes() {
    const db = await conectar();
    const restaurantes = db.collection("restaurantes");

    const pruebas = [
        {
            descripcion: "Filtrar por ingredientes (index: platos.ingredientes_1)",
            filtro: { "platos.ingredientes": "Arroz" },
        },
        {
            descripcion: "Filtrar por tipo, familia, vegano, sin_gluten (index compuesto)",
            filtro: {
                "platos.tipo": "Segundo plato",
                "platos.familia": "Carne",
                "platos.vegano": false,
                "platos.sin_gluten": true,
            },
        },
        {
            descripcion: "Ordenar por precio (index: platos.precio_1)",
            filtro: {},
            orden: { "platos.precio": 1 },
        },
        {
            descripcion: "Buscar por nombre de plato (regex en platos.nombre)",
            filtro: { "platos.nombre": { $regex: "Paella", $options: "i" } },
        }
    ];

    for (const prueba of pruebas) {
        console.log(`\n📌 ${prueba.descripcion}`);
        const resultado = await restaurantes
            .find(prueba.filtro)
            .sort(prueba.orden || {})
            .explain("executionStats");

        const plan = resultado.queryPlanner.winningPlan;
        const index = plan.inputStage?.indexName || "❌ No index usado";
        console.log("   🔍 Índice usado:", index);
        console.log("   📦 Documentos examinados:", resultado.executionStats.totalDocsExamined);
        console.log("   🔑 Claves examinadas:", resultado.executionStats.totalKeysExamined);
    }

    process.exit();
}

testIndexes().catch(console.error);
