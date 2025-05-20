const conectar = require("./db");

// Este script sirve para comprobar qué índices utiliza MongoDB al hacer diferentes tipos de búsquedas.
// Así puedes ver si tus consultas están aprovechando los índices que has creado.

async function testIndexes() {
    const db = await conectar();
    const restaurantes = db.collection("restaurantes");

    // Lista de pruebas que simulan diferentes búsquedas y filtrados
    const pruebas = [
        {
            // Busca platos que tengan un ingrediente concreto
            descripcion: "Filtrar por ingredientes (index: platos.ingredientes_1)",
            filtro: { "platos.ingredientes": "Arroz" },
        },
        {
            // Busca platos por tipo, familia, si son veganos y sin gluten (aprovecha el índice compuesto)
            descripcion: "Filtrar por tipo, familia, vegano, sin_gluten (index compuesto)",
            filtro: {
                "platos.tipo": "Segundo plato",
                "platos.familia": "Carne",
                "platos.vegano": false,
                "platos.sin_gluten": true,
            },
        },
        {
            // Ordena los platos por precio (aprovecha el índice de precio)
            descripcion: "Ordenar por precio (index: platos.precio_1)",
            filtro: {},
            orden: { "platos.precio": 1 },
        },
        {
            // Busca platos cuyo nombre contenga una palabra (usa regex, no siempre usa índice)
            descripcion: "Buscar por nombre de plato (regex en platos.nombre)",
            filtro: { "platos.nombre": { $regex: "Paella", $options: "i" } },
        }
    ];

    // Ejecuta cada prueba y muestra información sobre el índice que se ha usado
    for (const prueba of pruebas) {
        console.log(`\n📌 ${prueba.descripcion}`);
        const resultado = await restaurantes
            .find(prueba.filtro)
            .sort(prueba.orden || {})
            .explain("executionStats");

        // Extrae el nombre del índice utilizado en la consulta
        const plan = resultado.queryPlanner.winningPlan;
        const index = plan.inputStage?.indexName || "❌ No index usado";
        console.log("   🔍 Índice usado:", index);
        // Muestra cuántos documentos y claves ha tenido que examinar MongoDB
        console.log("   📦 Documentos examinados:", resultado.executionStats.totalDocsExamined);
        console.log("   🔑 Claves examinadas:", resultado.executionStats.totalKeysExamined);
    }

    // Termina el proceso cuando acaban las pruebas
    process.exit();
}

// Llama a la función para ejecutar las pruebas de índices
testIndexes().catch(console.error);
